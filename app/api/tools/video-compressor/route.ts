/**
 * Video Compressor API
 *
 * POST /api/tools/video-compressor
 *
 * Features:
 * - Bitrate selection (1Mbps - 20Mbps)
 * - Quality preset (low, medium, high)
 * - Size estimation
 * - Format output selection
 * - Rate limiting (heavy tool)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  processUpload,
  DEFAULT_UPLOAD_CONFIGS,
  type UploadResult,
} from "@/lib/security/upload";
import {
  runFFmpeg,
  runFFprobe,
  validateInputFile,
} from "@/lib/ffmpeg/runner";
import {
  createJob,
  updateJob,
  completeJob,
  errorJob,
  createProgressCallback,
} from "@/lib/ffmpeg/progress-store";
import { isToolEnabled } from "@/lib/featureFlags";
import {
  createCombinedRateLimiter,
  RATE_LIMIT_CONFIGS,
  addRateLimitHeaders,
} from "@/lib/rate-limit";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir, stat } from "fs/promises";
import { existsSync } from "fs";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "video-compressor";

// Rate limiter for heavy tool (5 req/min) + IP default (60 req/min)
const rateLimiter = createCombinedRateLimiter(
  RATE_LIMIT_CONFIGS.default,
  RATE_LIMIT_CONFIGS.heavy,
  TOOL_ID
);

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.video,
  uploadDir: "./tmp/uploads/video-compressor",
  maxSizeBytes: 200 * 1024 * 1024, // 200MB
};

// Quality presets
const QUALITY_PRESETS = {
  low: {
    crf: 28,
    preset: "faster",
    maxBitrate: "2M",
    audioBitrate: "96k",
  },
  medium: {
    crf: 23,
    preset: "medium",
    maxBitrate: "5M",
    audioBitrate: "128k",
  },
  high: {
    crf: 18,
    preset: "slow",
    maxBitrate: "10M",
    audioBitrate: "192k",
  },
} as const;

type QualityPreset = keyof typeof QUALITY_PRESETS;

// Codec configuration for different output formats
const CODEC_CONFIG = {
  mp4: {
    videoCodec: "libx264",
    audioCodec: "aac",
    extraArgs: ["-movflags", "+faststart"],
  },
  webm: {
    videoCodec: "libvpx-vp9",
    audioCodec: "libopus",
    extraArgs: ["-row-mt", "1"],
  },
} as const;

// Simple mode presets
const SIMPLE_PRESETS = {
  smallest: {
    crf: 35,           // Very aggressive compression (0-51 scale)
    preset: "medium",  // Better compression algorithms than "faster"
    maxBitrate: "1M",
    audioBitrate: "64k", // Lower audio bitrate for smaller files
    maxResolution: "720p", // Scale down to 720p max
    label: "Smallest File",
  },
  balanced: {
    crf: 28,
    preset: "medium",
    maxBitrate: "3M",
    audioBitrate: "128k",
    maxResolution: "1080p",
    label: "Balanced",
  },
  best: {
    crf: 20,
    preset: "slow",
    maxBitrate: "8M",
    audioBitrate: "192k",
    maxResolution: null, // Keep original resolution
    label: "Best Quality",
  },
} as const;

type SimplePreset = keyof typeof SIMPLE_PRESETS;

// Resolution presets
const RESOLUTION_PRESETS: Record<string, { width: number; height: number }> = {
  "4k": { width: 3840, height: 2160 },
  "1080p": { width: 1920, height: 1080 },
  "720p": { width: 1280, height: 720 },
  "480p": { width: 854, height: 480 },
  "360p": { width: 640, height: 360 },
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  mode: "simple" | "advanced";
  // Simple mode
  preset?: SimplePreset;
  // Advanced mode
  quality?: QualityPreset;
  bitrate?: string;
  compressionLevel?: number;
  fps?: number;
  resolution?: string;
  twoPass?: boolean;
  // Common
  outputFormat?: "mp4" | "webm";
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode")?.toString() as "simple" | "advanced" | undefined;

  // Simple mode params
  const preset = formData.get("preset")?.toString() as SimplePreset | undefined;

  // Advanced mode params
  const quality = formData.get("quality")?.toString() as QualityPreset | undefined;
  const bitrate = formData.get("bitrate")?.toString();
  const compressionLevelStr = formData.get("compressionLevel")?.toString();
  const fpsStr = formData.get("fps")?.toString();
  const resolution = formData.get("resolution")?.toString();
  const twoPassStr = formData.get("twoPass")?.toString();

  // Common params
  const outputFormat = formData.get("outputFormat")?.toString() as "mp4" | "webm" | undefined;

  return {
    file: file instanceof File ? file : null,
    mode: mode === "advanced" ? "advanced" : "simple",
    preset: preset && SIMPLE_PRESETS[preset] ? preset : "balanced",
    quality: quality && QUALITY_PRESETS[quality] ? quality : undefined,
    bitrate: bitrate && /^\d+[kMG]?$/.test(bitrate) ? bitrate : undefined,
    compressionLevel: compressionLevelStr
      ? Math.min(100, Math.max(0, parseInt(compressionLevelStr, 10)))
      : undefined,
    fps: fpsStr ? parseInt(fpsStr, 10) : undefined,
    resolution: resolution && RESOLUTION_PRESETS[resolution] ? resolution : undefined,
    twoPass: twoPassStr === "true",
    outputFormat: outputFormat && ["mp4", "webm"].includes(outputFormat)
      ? outputFormat
      : "mp4",
  };
}

// ============================================================================
// HELPER: ESTIMATE SIZE
// ============================================================================

interface VideoInfo {
  duration: number;
  currentBitrate: number;
  currentSize: number;
  width?: number;
  height?: number;
  codec?: string;
}

function estimateCompressedSize(
  info: VideoInfo,
  targetBitrate: string,
  audioBitrate: string
): number {
  // Parse target bitrate
  const bitrateMatch = targetBitrate.match(/^(\d+)([kMG])?$/);
  if (!bitrateMatch) return info.currentSize * 0.5; // Default 50% reduction

  let targetKbps = parseInt(bitrateMatch[1] ?? "0", 10);
  const unit = bitrateMatch[2];

  if (unit === "M") targetKbps *= 1000;
  if (unit === "G") targetKbps *= 1000000;

  // Parse audio bitrate
  const audioMatch = audioBitrate.match(/^(\d+)/);
  const audioKbps = audioMatch ? parseInt(audioMatch[1] ?? "0", 10) : 128;

  // Calculate: (video bitrate + audio bitrate) * duration / 8
  const totalKbps = targetKbps + audioKbps;
  const estimatedBytes = (totalKbps * 1000 * info.duration) / 8;

  return Math.round(estimatedBytes);
}

// ============================================================================
// HELPER: FFMPEG COMMAND BUILDER
// ============================================================================

/**
 * Map compression level (0-100) to CRF (51-0)
 * 0 = no compression (CRF 51, worst quality)
 * 100 = max compression (CRF 0, best quality, lossless)
 */
function compressionLevelToCrf(level: number): number {
  // Invert: higher compression level = lower CRF = better quality
  return Math.round(51 - (level / 100) * 51);
}

/**
 * Build FFmpeg arguments based on mode and settings
 */
function buildFFmpegArgs(options: {
  inputPath: string;
  outputPath: string;
  outputFormat: "mp4" | "webm";
  videoInfo: VideoInfo;
  // Simple mode
  preset?: SimplePreset;
  // Advanced mode
  quality?: QualityPreset;
  bitrate?: string;
  compressionLevel?: number;
  fps?: number;
  resolution?: string;
  twoPass?: boolean;
}): string[] {
  const {
    inputPath,
    outputPath,
    outputFormat,
    videoInfo,
    preset,
    quality,
    bitrate,
    compressionLevel,
    fps,
    resolution,
    twoPass: _twoPass, // Used in POST handler for 2-pass encoding logic
  } = options;

  const codecConfig = CODEC_CONFIG[outputFormat];
  const args: string[] = ["-y", "-i", inputPath];

  // Determine CRF and preset
  let crf: number;
  let presetName: string;
  let targetBitrate: string;
  let audioBitrate: string;
  let maxResolution: string | null = null;

  if (preset && SIMPLE_PRESETS[preset]) {
    // Simple mode
    const p = SIMPLE_PRESETS[preset];
    crf = p.crf;
    presetName = p.preset;
    targetBitrate = p.maxBitrate;
    audioBitrate = p.audioBitrate;
    maxResolution = p.maxResolution;
  } else {
    // Advanced mode or backward compatibility
    const qualityPreset = quality && QUALITY_PRESETS[quality]
      ? QUALITY_PRESETS[quality]
      : QUALITY_PRESETS.medium;
    crf = compressionLevel !== undefined
      ? compressionLevelToCrf(compressionLevel)
      : qualityPreset.crf;
    presetName = qualityPreset.preset;
    targetBitrate = bitrate ?? qualityPreset.maxBitrate;
    audioBitrate = qualityPreset.audioBitrate;
  }

  // Video codec
  args.push("-c:v", codecConfig.videoCodec);
  args.push("-crf", crf.toString());
  args.push("-preset", presetName);

  // Bitrate control
  args.push("-maxrate", targetBitrate);
  const bufsizeUnit = targetBitrate.includes("M") ? "M" : "k";
  const bufsizeValue = parseInt(targetBitrate) * 2;
  args.push("-bufsize", `${bufsizeValue}${bufsizeUnit}`);

  // FPS
  if (fps && [24, 30, 60].includes(fps)) {
    args.push("-r", fps.toString());
  }

  // Resolution - check advanced mode first, then simple mode maxResolution
  const resolutionToUse = resolution || maxResolution;
  if (resolutionToUse && RESOLUTION_PRESETS[resolutionToUse]) {
    const res = RESOLUTION_PRESETS[resolutionToUse];
    // Only scale down, not up
    if (videoInfo.width && videoInfo.height) {
      if (res.width < videoInfo.width || res.height < videoInfo.height) {
        args.push("-vf", `scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease`);
      }
    }
  }

  // Audio codec
  args.push("-c:a", codecConfig.audioCodec);
  args.push("-b:a", audioBitrate);

  // Format-specific args
  args.push(...codecConfig.extraArgs);

  // Pixel format for compatibility
  args.push("-pix_fmt", "yuv420p");

  // Output format
  args.push("-f", outputFormat);

  // Output file
  args.push(outputPath);

  return args;
}

// ============================================================================
// BACKGROUND COMPRESSION PROCESSOR
// ============================================================================

interface CompressionContext {
  jobId: string;
  ffmpegArgs: string[];
  outputPath: string;
  outputFilename: string;
  outputFormat?: "mp4" | "webm";
  twoPass?: boolean;
  videoInfo: VideoInfo;
  uploadResult: { filepath: string; originalName: string; size: number };
  mode: "simple" | "advanced";
  preset?: SimplePreset;
  quality?: QualityPreset;
  bitrate: string;
  compressionLevel?: number;
  fps?: number;
  resolution?: string;
  estimatedSize: number;
}

async function runCompressionInBackground(ctx: CompressionContext): Promise<void> {
  const { jobId, ffmpegArgs, outputPath, outputFilename, outputFormat, twoPass, videoInfo } = ctx;

  try {
    let result: { success: boolean; timedOut: boolean; error?: string; stderr: string; duration: number };

    if (twoPass) {
      // First pass (analyzes video, no output)
      const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
      const pass1Args = [...ffmpegArgs.slice(0, -1), "-pass", "1", "-f", outputFormat ?? "mp4", nullDevice];

      updateJob(jobId, { status: "processing", message: "First pass: Analyzing video..." });
      const pass1Result = await runFFmpeg(
        pass1Args,
        { timeout: 5 * 60 * 1000 },
        (progress) => {
          updateJob(jobId, {
            progress: progress.percent / 2,
            message: `First pass: ${progress.percent.toFixed(1)}%`,
            speed: progress.speed,
          });
        },
        videoInfo.duration
      );

      if (!pass1Result.success) {
        errorJob(jobId, pass1Result.error || "First pass failed");
        return;
      }

      // Second pass (actual encoding)
      const pass2Args = [...ffmpegArgs.slice(0, -1), "-pass", "2", outputPath];

      updateJob(jobId, { message: "Second pass: Encoding video..." });
      const pass2Result = await runFFmpeg(
        pass2Args,
        { timeout: 5 * 60 * 1000 },
        (progress) => {
          updateJob(jobId, {
            progress: 50 + progress.percent / 2,
            message: `Second pass: ${progress.percent.toFixed(1)}%`,
            speed: progress.speed,
          });
        },
        videoInfo.duration
      );

      if (!pass2Result.success) {
        errorJob(jobId, pass2Result.error || "Second pass failed");
        return;
      }

      result = pass2Result;
    } else {
      // Single pass encoding
      updateJob(jobId, { status: "processing", message: "Compressing video..." });
      result = await runFFmpeg(
        ffmpegArgs,
        { timeout: 5 * 60 * 1000 },
        createProgressCallback(jobId),
        videoInfo.duration
      );
    }

    if (!result.success) {
      errorJob(jobId, result.error || "Compression failed");
      return;
    }

    // Get actual output size
    let actualSize = 0;
    try {
      const stats = await stat(outputPath);
      actualSize = stats.size;
    } catch {
      // Ignore stat errors
    }

    const downloadUrl = `/api/download/video-compressor/${outputFilename}`;

    // Mark job as completed
    completeJob(jobId, outputPath, actualSize, downloadUrl, outputFilename);

    console.log(`[Video Compressor] Job ${jobId} completed. Output: ${actualSize} bytes`);
  } catch (err) {
    console.error(`[Video Compressor] Job ${jobId} error:`, err);
    errorJob(jobId, err instanceof Error ? err.message : "Unknown compression error");
  }
}

// ============================================================================
// POST - COMPRESS VIDEO
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check if tool is enabled
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TOOL_DISABLED",
          message: "This tool is currently disabled",
        },
      },
      { status: 403 }
    );
  }

  // Rate limiting check
  const rateLimit = rateLimiter(request);
  if (!rateLimit.allowed) {
    return rateLimit.response!;
  }

  try {
    const {
      file,
      mode,
      preset,
      quality,
      bitrate,
      compressionLevel,
      fps,
      resolution,
      twoPass,
      outputFormat,
    } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FILE",
            message: "No video file provided",
          },
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process upload
    let uploadResult: UploadResult;
    try {
      uploadResult = await processUpload(
        {
          name: file.name,
          type: file.type,
          size: file.size,
          buffer,
        },
        UPLOAD_CONFIG
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: (error as { code?: string }).code ?? "UPLOAD_ERROR",
              message: (error as { message?: string }).message ?? "Upload validation failed",
            },
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Validate input file
    if (!(await validateInputFile(uploadResult.filepath))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "Uploaded file not found",
          },
        },
        { status: 500 }
      );
    }

    // Get video info using FFprobe
    const probeResult = await runFFprobe(uploadResult.filepath);

    if (!probeResult.success || !probeResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROBE_FAILED",
            message: "Failed to analyze video file",
          },
        },
        { status: 500 }
      );
    }

    const videoStream = probeResult.data.streams.find(
      (s) => s.codec_type === "video"
    );

    if (!videoStream) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_VIDEO_STREAM",
            message: "No video stream found in file",
          },
        },
        { status: 400 }
      );
    }

    const videoInfo: VideoInfo = {
      duration: parseFloat(probeResult.data.format.duration.toString()) || 0,
      currentBitrate: parseInt(probeResult.data.format.bit_rate) || 0,
      currentSize: probeResult.data.format.size,
      width: videoStream.width,
      height: videoStream.height,
      codec: videoStream.codec_name,
    };

    // Get quality preset for estimation
    const qualityPreset = QUALITY_PRESETS[quality ?? "medium"];
    const targetBitrate = bitrate ?? qualityPreset.maxBitrate;

    // Estimate output size
    const estimatedSize = estimateCompressedSize(
      videoInfo,
      targetBitrate,
      qualityPreset.audioBitrate
    );

    // Ensure output directory exists
    const outputDir = "./tmp/processed/video-compressor";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Generate output filename
    const format = outputFormat ?? "mp4";
    const outputFilename = `${randomUUID()}.${format}`;
    const outputPath = join(outputDir, outputFilename);

    // Build FFmpeg arguments using the new builder
    const ffmpegArgs = buildFFmpegArgs({
      inputPath: uploadResult.filepath,
      outputPath,
      outputFormat: outputFormat as "mp4" | "webm",
      videoInfo,
      preset: mode === "simple" ? preset : undefined,
      quality,
      bitrate,
      compressionLevel,
      fps,
      resolution,
      twoPass,
    });

    // Debug: log the FFmpeg command
    console.log("[Video Compressor] Mode:", mode);
    console.log("[Video Compressor] Preset:", preset);
    console.log("[Video Compressor] Output format:", outputFormat);
    console.log("[Video Compressor] FFmpeg args:", ffmpegArgs.join(" "));

    // Create job for progress tracking
    const jobId = randomUUID();
    createJob(jobId, TOOL_ID, uploadResult.filepath, file.size, videoInfo.duration);

    // Store all the data needed for background processing
    const compressionContext = {
      jobId,
      ffmpegArgs,
      outputPath,
      outputFilename,
      outputFormat,
      twoPass,
      videoInfo,
      uploadResult,
      mode,
      preset,
      quality,
      bitrate: targetBitrate,
      compressionLevel,
      fps,
      resolution,
      estimatedSize,
    };

    // Return immediately with jobId so frontend can connect to SSE
    const response = addRateLimitHeaders(
      NextResponse.json({
        success: true,
        jobId,
        message: "Compression started",
        estimatedSize,
      }),
      RATE_LIMIT_CONFIGS.heavy,
      rateLimit.result
    );

    // Run compression in background (don't await)
    runCompressionInBackground(compressionContext).catch((err) => {
      console.error("[Video Compressor] Background error:", err);
      errorJob(jobId, err instanceof Error ? err.message : "Unknown error");
    });

    return response;
  } catch (error) {
    console.error("Video compression error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during compression",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - METHOD NOT ALLOWED
// ============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST to compress videos",
      },
    },
    { status: 405 }
  );
}
