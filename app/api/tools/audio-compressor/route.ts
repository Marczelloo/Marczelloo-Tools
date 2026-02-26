/**
 * Audio Compressor API
 *
 * POST /api/tools/audio-compressor
 *
 * Compresses audio files with configurable quality
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  processUpload,
  DEFAULT_UPLOAD_CONFIGS,
  type UploadResult,
} from "@/lib/security/upload";
import { runFFmpeg, validateInputFile } from "@/lib/ffmpeg/runner";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "audio-compressor";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.audio,
  uploadDir: "./tmp/uploads/audio-compressor",
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
};

const QUALITY_PRESETS = {
  low: { bitrate: "64k", sampleRate: "22050" },
  medium: { bitrate: "128k", sampleRate: "44100" },
  high: { bitrate: "192k", sampleRate: "48000" },
} as const;

type QualityPreset = keyof typeof QUALITY_PRESETS;

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  quality?: QualityPreset;
  bitrate?: string;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const quality = formData.get("quality")?.toString() as QualityPreset | undefined;
  const bitrate = formData.get("bitrate")?.toString();

  return {
    file: file instanceof File ? file : null,
    quality: quality && QUALITY_PRESETS[quality] ? quality : "medium",
    bitrate: bitrate && /^\d+[kMG]?$/.test(bitrate) ? bitrate : undefined,
  };
}

// ============================================================================
// POST - COMPRESS AUDIO
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } },
      { status: 403 }
    );
  }

  try {
    const { file, quality, bitrate } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "No audio file provided" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let uploadResult: UploadResult;
    try {
      uploadResult = await processUpload(
        { name: file.name, type: file.type, size: file.size, buffer },
        UPLOAD_CONFIG
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        return NextResponse.json(
          { success: false, error: { code: (error as { code?: string }).code ?? "UPLOAD_ERROR", message: (error as { message?: string }).message ?? "Upload validation failed" } },
          { status: 400 }
        );
      }
      throw error;
    }

    if (!(await validateInputFile(uploadResult.filepath))) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_NOT_FOUND", message: "Uploaded file not found" } },
        { status: 500 }
      );
    }

    const preset = QUALITY_PRESETS[quality ?? "medium"];
    const targetBitrate = bitrate ?? preset.bitrate;

    const outputDir = "./tmp/processed/audio-compressor";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputFilename = `${randomUUID()}.mp3`;
    const outputPath = join(outputDir, outputFilename);

    const ffmpegArgs = [
      "-y",
      "-i", uploadResult.filepath,
      "-c:a", "libmp3lame",
      "-b:a", targetBitrate,
      "-ar", preset.sampleRate,
      "-ac", "2",
      outputPath,
    ];

    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 3 * 60 * 1000,
      workDir: "/app",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "COMPRESSION_FAILED", message: result.timedOut ? "Compression timed out" : result.error || "FFmpeg compression failed" } },
        { status: 500 }
      );
    }

    const { stat } = await import("fs/promises");
    let outputSize = 0;
    try {
      const stats = await stat(outputPath);
      outputSize = stats.size;
    } catch { /* ignore */ }

    const compressionRatio = outputSize > 0
      ? `${Math.round((1 - outputSize / uploadResult.size) * 100)}%`
      : "N/A";

    return NextResponse.json({
      success: true,
      compression: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        settings: { quality, bitrate: targetBitrate },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/audio-compressor/${outputFilename}`,
          format: "mp3",
          size: outputSize,
          compressionRatio,
        },
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error("Audio compression error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during compression" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to compress files" } },
    { status: 405 }
  );
}
