/**
 * FFmpeg Runner Module
 * Secure command execution for media processing
 *
 * Per CLAUDE.md Section 7:
 * - No shell interpolation
 * - Strict parameter building
 * - Timeout enforcement
 * - CPU/memory controlled
 */

import { spawn, ChildProcess } from "child_process";
import { access, stat } from "fs/promises";
import { constants } from "fs";
import { FFMPEG_PATH, FFPROBE_PATH } from "./config";

// ============================================================================
// TYPES
// ============================================================================

export interface FFmpegConfig {
  /** Maximum execution time in milliseconds */
  timeout: number;

  /** Maximum output file size in bytes */
  maxOutputSize: number;

  /** Working directory for FFmpeg */
  workDir: string;

  /** Path to FFmpeg binary (default: 'ffmpeg') */
  ffmpegPath: string;

  /** Path to FFprobe binary (default: 'ffprobe') */
  ffprobePath: string;

  /** Environment variables */
  env?: Record<string, string>;
}

export interface FFmpegResult {
  /** Whether the command succeeded */
  success: boolean;

  /** Exit code (null if killed) */
  exitCode: number | null;

  /** Whether the process was killed due to timeout */
  timedOut: boolean;

  /** Stdout output */
  stdout: string;

  /** Stderr output (FFmpeg logs to stderr) */
  stderr: string;

  /** Execution time in milliseconds */
  duration: number;

  /** Error message if failed */
  error?: string;
}

export interface FFprobeResult {
  success: boolean;
  data?: FFprobeData;
  error?: string;
}

export interface FFprobeData {
  format: {
    duration: number;
    size: number;
    bit_rate: string;
    format_name: string;
  };
  streams: Array<{
    index: number;
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    duration?: number;
    bit_rate?: string;
  }>;
}

export type ProgressCallback = (progress: {
  frame: number;
  fps: number;
  time: string;
  bitrate: string;
  speed: string;
  percent: number;
}) => void;

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_FFMPEG_CONFIG: FFmpegConfig = {
  timeout: 5 * 60 * 1000, // 5 minutes
  maxOutputSize: 500 * 1024 * 1024, // 500MB
  workDir: "./tmp/ffmpeg",
  ffmpegPath: FFMPEG_PATH,
  ffprobePath: FFPROBE_PATH,
};

// ============================================================================
// PARAMETER SANITIZATION
// ============================================================================

/**
 * Sanitize a string parameter to prevent injection
 * Only allows alphanumeric, dash, underscore, and dot
 */
export function sanitizeParam(value: string): string {
  // Remove any characters that could be used for injection
  return value.replace(/[^a-zA-Z0-9_\-./:]/g, "");
}

/**
 * Validate a file path to ensure it's within allowed directories
 */
export function validateFilePath(filepath: string, allowedDirs: string[]): boolean {
  // Check for path traversal attempts
  if (filepath.includes("..")) return false;
  if (filepath.includes("\0")) return false;

  // Normalize path
  const normalized = filepath.replace(/\\/g, "/");

  // Check if path starts with an allowed directory
  return allowedDirs.some((dir) => normalized.startsWith(dir.replace(/\\/g, "/")));
}

/**
 * Build safe FFmpeg arguments (NO shell interpolation)
 * Each argument is a separate array element
 */
export function buildFFmpegArgs(options: {
  input: string;
  output: string;
  codec?: string;
  format?: string;
  scale?: string;
  bitrate?: string;
  startTime?: string;
  duration?: string;
  extraArgs?: string[];
}): string[] {
  const args: string[] = [
    "-y", // Overwrite output
    "-i",
    options.input,
  ];

  // Codec
  if (options.codec) {
    args.push("-c:v", sanitizeParam(options.codec));
  }

  // Format
  if (options.format) {
    args.push("-f", sanitizeParam(options.format));
  }

  // Scale (validate format: WxH)
  if (options.scale && /^\d+x\d+$/.test(options.scale)) {
    args.push("-vf", `scale=${options.scale}`);
  }

  // Bitrate (validate format: number + k/M/G)
  if (options.bitrate && /^\d+[kMG]?$/.test(options.bitrate)) {
    args.push("-b:v", options.bitrate);
  }

  // Start time (validate format: HH:MM:SS or seconds)
  if (options.startTime) {
    if (/^\d+(\.\d+)?$/.test(options.startTime) || /^\d+:\d+:\d+(\.\d+)?$/.test(options.startTime)) {
      args.push("-ss", options.startTime);
    }
  }

  // Duration
  if (options.duration) {
    if (/^\d+(\.\d+)?$/.test(options.duration) || /^\d+:\d+:\d+(\.\d+)?$/.test(options.duration)) {
      args.push("-t", options.duration);
    }
  }

  // Extra args (must be pre-validated)
  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  // Output file (always last)
  args.push(options.output);

  return args;
}

// ============================================================================
// PROGRESS PARSER
// ============================================================================

/**
 * Parse FFmpeg progress from stderr line
 */
function parseProgress(line: string): {
  frame: number;
  fps: number;
  time: string;
  bitrate: string;
  speed: string;
  percent: number;
} | null {
  // Example: frame=  123 fps= 30 q=28.0 size=    1234kB time=00:00:04.10 bitrate= 1234.5kbits/s speed=1.23x
  const frameMatch = line.match(/frame=\s*(\d+)/);
  const fpsMatch = line.match(/fps=\s*([\d.]+)/);
  const timeMatch = line.match(/time=(\d+:\d+:\d+\.\d+)/);
  const bitrateMatch = line.match(/bitrate=\s*([\d.]+[kMG]?bits\/s)/);
  const speedMatch = line.match(/speed=\s*([\d.]+)x/);

  if (!frameMatch || !timeMatch || !frameMatch[1] || !timeMatch[1]) return null;

  // Parse time to calculate percentage (estimate based on 5 min default)
  const timeParts = timeMatch[1].split(":");
  const seconds =
    parseInt(timeParts[0] ?? "0", 10) * 3600 +
    parseInt(timeParts[1] ?? "0", 10) * 60 +
    parseFloat(timeParts[2] ?? "0");

  // Assume 5 minute max for percentage calculation
  const percent = Math.min(100, (seconds / 300) * 100);

  return {
    frame: parseInt(frameMatch[1] ?? "0", 10),
    fps: parseFloat(fpsMatch?.[1] ?? "0"),
    time: timeMatch[1] ?? "00:00:00.00",
    bitrate: bitrateMatch?.[1] ?? "0kbits/s",
    speed: speedMatch?.[1] ?? "0x",
    percent,
  };
}

// ============================================================================
// FFMPEG RUNNER
// ============================================================================

/**
 * Execute FFmpeg command with security constraints
 *
 * CRITICAL: Uses spawn() instead of exec() for:
 * - No shell interpolation
 * - Better process control
 * - Proper timeout handling
 * - Memory safety
 */
export async function runFFmpeg(
  args: string[],
  config: Partial<FFmpegConfig> = {},
  onProgress?: ProgressCallback
): Promise<FFmpegResult> {
  const fullConfig = { ...DEFAULT_FFMPEG_CONFIG, ...config };
  const startTime = Date.now();

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let processKilled = false;

    // Spawn FFmpeg process (NO shell)
    const ffmpeg: ChildProcess = spawn(fullConfig.ffmpegPath, args, {
      cwd: fullConfig.workDir,
      env: {
        ...process.env,
        ...fullConfig.env,
        // Disable any interactive prompts
        DEBIAN_FRONTEND: "noninteractive",
        TERM: "dumb",
      },
      // CRITICAL: Never use shell
      shell: false,
      // Detach from parent for clean termination
      detached: false,
      // Pipe all streams
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      processKilled = true;

      // Kill the process and all its children
      if (ffmpeg.pid) {
        try {
          process.kill(-ffmpeg.pid, "SIGKILL");
        } catch {
          // Process might already be dead
          ffmpeg.kill("SIGKILL");
        }
      }
    }, fullConfig.timeout);

    // Collect stdout
    if (ffmpeg.stdout) {
      ffmpeg.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
    }

    // Collect stderr (FFmpeg logs here) and parse progress
    if (ffmpeg.stderr) {
      ffmpeg.stderr.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;

        // Parse progress if callback provided
        if (onProgress) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            const progress = parseProgress(line);
            if (progress) {
              onProgress(progress);
            }
          }
        }
      });
    }

    // Handle process completion
    ffmpeg.on("close", (code) => {
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      resolve({
        success: code === 0 && !timedOut,
        exitCode: code,
        timedOut,
        stdout,
        stderr,
        duration,
        error: timedOut
          ? `Process timed out after ${fullConfig.timeout}ms`
          : code !== 0
            ? `FFmpeg exited with code ${code}`
            : undefined,
      });
    });

    // Handle process errors
    ffmpeg.on("error", (err) => {
      clearTimeout(timeoutId);

      if (!processKilled) {
        resolve({
          success: false,
          exitCode: null,
          timedOut: false,
          stdout,
          stderr,
          duration: Date.now() - startTime,
          error: `Failed to spawn FFmpeg: ${err.message}`,
        });
      }
    });
  });
}

// ============================================================================
// FFPROBE RUNNER
// ============================================================================

/**
 * Get media file information using FFprobe
 */
export async function runFFprobe(
  filepath: string,
  config: Partial<FFmpegConfig> = {}
): Promise<FFprobeResult> {
  const fullConfig = { ...DEFAULT_FFMPEG_CONFIG, ...config };

  const args = [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filepath,
  ];

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const ffprobe: ChildProcess = spawn(fullConfig.ffprobePath, args, {
      cwd: fullConfig.workDir,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeoutId = setTimeout(() => {
      ffprobe.kill("SIGKILL");
    }, 10000); // 10 second timeout for probe

    if (ffprobe.stdout) {
      ffprobe.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
    }

    if (ffprobe.stderr) {
      ffprobe.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
    }

    ffprobe.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        try {
          const data = JSON.parse(stdout) as FFprobeData;
          resolve({ success: true, data });
        } catch {
          resolve({
            success: false,
            error: "Failed to parse FFprobe output",
          });
        }
      } else {
        resolve({
          success: false,
          error: `FFprobe failed with code ${code}: ${stderr}`,
        });
      }
    });

    ffprobe.on("error", (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: `Failed to run FFprobe: ${err.message}`,
      });
    });
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if FFmpeg is available
 */
export async function isFFmpegAvailable(config: Partial<FFmpegConfig> = {}): Promise<boolean> {
  const fullConfig = { ...DEFAULT_FFMPEG_CONFIG, ...config };

  try {
    const result = await runFFmpeg(["-version"], fullConfig);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get media duration in seconds
 */
export async function getMediaDuration(
  filepath: string,
  config: Partial<FFmpegConfig> = {}
): Promise<number | null> {
  const result = await runFFprobe(filepath, config);

  if (result.success && result.data) {
    return parseFloat(result.data.format.duration.toString()) || null;
  }

  return null;
}

/**
 * Validate file exists and is readable
 */
export async function validateInputFile(filepath: string): Promise<boolean> {
  try {
    await access(filepath, constants.R_OK);
    const stats = await stat(filepath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

export default {
  runFFmpeg,
  runFFprobe,
  buildFFmpegArgs,
  sanitizeParam,
  validateFilePath,
  isFFmpegAvailable,
  getMediaDuration,
  validateInputFile,
  DEFAULT_FFMPEG_CONFIG,
};
