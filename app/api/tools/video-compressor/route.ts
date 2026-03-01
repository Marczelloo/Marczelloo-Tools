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
import { isToolEnabled } from "@/lib/featureFlags";
import {
  createCombinedRateLimiter,
  RATE_LIMIT_CONFIGS,
  addRateLimitHeaders,
} from "@/lib/rate-limit";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
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

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  quality?: QualityPreset;
  bitrate?: string;
  outputFormat?: string;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const quality = formData.get("quality")?.toString() as QualityPreset | undefined;
  const bitrate = formData.get("bitrate")?.toString();
  const outputFormat = formData.get("outputFormat")?.toString();

  return {
    file: file instanceof File ? file : null,
    quality: quality && QUALITY_PRESETS[quality] ? quality : "medium",
    bitrate: bitrate && /^\d+[kMG]?$/.test(bitrate) ? bitrate : undefined,
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
    const { file, quality, bitrate, outputFormat } = await parseFormData(request);

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

    // Get quality preset
    const preset = QUALITY_PRESETS[quality ?? "medium"];
    const targetBitrate = bitrate ?? preset.maxBitrate;

    // Estimate output size
    const estimatedSize = estimateCompressedSize(
      videoInfo,
      targetBitrate,
      preset.audioBitrate
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

    // Build FFmpeg arguments
    const ffmpegArgs: string[] = [
      "-y",
      "-i",
      uploadResult.filepath,
      "-c:v",
      "libx264",
      "-crf",
      preset.crf.toString(),
      "-preset",
      preset.preset,
      "-maxrate",
      targetBitrate,
      "-bufsize",
      (parseInt(targetBitrate) * 2).toString() + (targetBitrate.includes("M") ? "M" : "k"),
      "-c:a",
      "aac",
      "-b:a",
      preset.audioBitrate,
      "-movflags",
      "+faststart",
      "-f",
      format,
      outputPath,
    ];

    // Run compression
    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 5 * 60 * 1000, // 5 minutes
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMPRESSION_FAILED",
            message: result.timedOut
              ? "Compression timed out"
              : result.error || "FFmpeg compression failed",
          },
        },
        { status: 500 }
      );
    }

    // Get actual output size
    const { stat } = await import("fs/promises");
    let actualSize = 0;
    try {
      const stats = await stat(outputPath);
      actualSize = stats.size;
    } catch {
      // Ignore stat errors
    }

    return addRateLimitHeaders(
      NextResponse.json({
        success: true,
        compression: {
          input: {
            filename: uploadResult.originalName,
            size: uploadResult.size,
            duration: videoInfo.duration,
            resolution: videoInfo.width && videoInfo.height
              ? `${videoInfo.width}x${videoInfo.height}`
              : "Unknown",
            codec: videoInfo.codec,
          },
          settings: {
            quality: quality,
            bitrate: targetBitrate,
            preset: preset.preset,
          },
          output: {
            filename: outputFilename,
            downloadUrl: `/api/download/video-compressor/${outputFilename}`,
            format: outputFormat,
            estimatedSize: estimatedSize,
            actualSize: actualSize,
            compressionRatio: actualSize > 0
              ? `${Math.round((1 - actualSize / uploadResult.size) * 100)}%`
              : "N/A",
          },
          duration: result.duration,
        },
      }),
      RATE_LIMIT_CONFIGS.heavy,
      rateLimit.result
    );
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
