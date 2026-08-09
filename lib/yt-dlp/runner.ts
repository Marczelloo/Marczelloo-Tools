/**
 * yt-dlp Runner
 *
 * Wrapper for yt-dlp CLI to extract formats and download media
 */

import { spawnYtdlp } from "./command";
import { type YtdlpInfo, type YtdlpResult, type StreamOptions } from "./types";

const TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface RunOptions {
  timeout?: number;
  args: string[];
}

async function runYtdlp(options: RunOptions): Promise<YtdlpResult> {
  const { args, timeout = TIMEOUT } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return new Promise(async (resolve) => {
    try {
      const proc = await spawnYtdlp(args, {
        signal: controller.signal as AbortSignal,
        shell: false,
      });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        try {
          const info = JSON.parse(stdout) as YtdlpInfo;
          resolve({ success: true, info });
        } catch (e) {
          resolve({
            success: false,
            error: `Failed to parse yt-dlp output: ${e}`,
          });
        }
      } else {
        resolve({
          success: false,
          error: stderr || "yt-dlp failed",
        });
      }
    });

      proc.on("error", (err) => {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          resolve({ success: false, timedOut: true, error: "Timeout" });
        } else {
          resolve({ success: false, error: err.message });
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: error instanceof Error ? error.message : "yt-dlp is unavailable",
      });
    }
  });
}

export async function getYtdlpFormats(url: string): Promise<YtdlpResult> {
  return runYtdlp({
    args: [
      "--dump-json",
      "--no-playlist",
      "--flat-playlist",
      url,
    ],
  });
}

/**
 * Universal yt-dlp extraction with maximum compatibility
 * Uses additional flags for broader site support
 */
export async function getYtdlpFormatsUniversal(url: string): Promise<YtdlpResult> {
  return runYtdlp({
    args: [
      "--dump-json",
      "--no-playlist",
      "--flat-playlist",                    // Faster extraction, works on more sites
      "--no-check-certificates",            // Handle HTTPS certificate issues
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      url,
    ],
    timeout: 60000,  // 60 second timeout for info extraction
  });
}

export function streamYtdlp(options: StreamOptions): ReadableStream<Uint8Array> {
  const { url, formatId } = options;

  // For YouTube and similar sites, many formats are video-only or audio-only.
  // We need to use format selector syntax to combine them if needed.
  // The formatId from our API is the video format; we append +bestaudio for merging.
  // Also use --merge-output-format to ensure proper container format.
  const formatSelector = formatId.includes("+")
    ? formatId
    : `${formatId}+bestaudio`;

  let proc: Awaited<ReturnType<typeof spawnYtdlp>> | null = null;

  return new ReadableStream({
    async start(controller) {
      try {
        proc = await spawnYtdlp([
          "-f",
          formatSelector,
          "-o",
          "-",
          "--no-playlist",
          "--merge-output-format",
          "mp4",
          url,
        ]);
      } catch (error) {
        controller.error(error);
        return;
      }

      proc.stdout?.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      proc.stderr?.on("data", (data) => {
        // Parse progress: [download] 23.4MB of 45.6MB
        const match = data.toString().match(/\[download\]\s+(\d+\.?\d*)% of/);
        if (match && options.onProgress) {
          // TODO: emit progress event
          void parseFloat(match[1]);
        }
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          controller.error(new Error(`yt-dlp exited with code ${code}`));
        } else {
          controller.close();
        }
      });

      proc.on("error", (err) => {
        controller.error(err);
      });
    },

    cancel() {
      proc?.kill();
    },
  });
}

export async function isYtdlpAvailable(): Promise<boolean> {
  try {
    const result = await runYtdlp({ args: ["--version"] });
    return result.success;
  } catch {
    return false;
  }
}
