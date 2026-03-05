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

const SIMPLE_PRESETS = {
  smallest: { bitrate: "64k", sampleRate: "22050" },
  balanced: { bitrate: "128k", sampleRate: "44100" },
  best: { bitrate: "192k", sampleRate: "48000" },
} as const;

type SimplePreset = keyof typeof SIMPLE_PRESETS;

const OUTPUT_FORMATS = {
  mp3: { codec: "libmp3lame", extension: "mp3" },
  aac: { codec: "aac", extension: "m4a" },
  ogg: { codec: "libvorbis", extension: "ogg" },
} as const;

type OutputFormat = keyof typeof OUTPUT_FORMATS;

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  mode: "simple" | "advanced";
  preset: SimplePreset;
  outputFormat: OutputFormat;
  bitrate?: string;
  sampleRate?: string;
  channels?: string;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode")?.toString();
  const preset = formData.get("preset")?.toString() as SimplePreset | undefined;
  const outputFormat = formData.get("outputFormat")?.toString() as OutputFormat | undefined;
  const bitrate = formData.get("bitrate")?.toString();
  const sampleRate = formData.get("sampleRate")?.toString();
  const channels = formData.get("channels")?.toString();

  return {
    file: file instanceof File ? file : null,
    mode: mode === "advanced" ? "advanced" : "simple",
    preset: preset && SIMPLE_PRESETS[preset] ? preset : "balanced",
    outputFormat: outputFormat && OUTPUT_FORMATS[outputFormat] ? outputFormat : "mp3",
    bitrate: bitrate && /^\d+[kK]?$/ ? bitrate : undefined,
    sampleRate: sampleRate && ["22050", "44100", "48000"].includes(sampleRate) ? sampleRate : undefined,
    channels: channels && ["1", "2"].includes(channels) ? channels : undefined,
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
    const params = await parseFormData(request);

    if (!params.file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "No audio file provided" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await params.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let uploadResult: UploadResult;
    try {
      uploadResult = await processUpload(
        { name: params.file.name, type: params.file.type, size: params.file.size, buffer },
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

    // Determine output format
    const format = OUTPUT_FORMATS[params.outputFormat];

    // Determine compression settings based on mode
    let targetBitrate: string;
    let targetSampleRate: string;
    let targetChannels: string;

    if (params.mode === "simple") {
      const preset = SIMPLE_PRESETS[params.preset];
      targetBitrate = preset.bitrate;
      targetSampleRate = preset.sampleRate;
      targetChannels = "2";
    } else {
      targetBitrate = params.bitrate ?? "128k";
      targetSampleRate = params.sampleRate ?? "44100";
      targetChannels = params.channels ?? "2";
    }

    const outputDir = "./tmp/processed/audio-compressor";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputFilename = `${randomUUID()}.${format.extension}`;
    const outputPath = join(outputDir, outputFilename);

    const ffmpegArgs = [
      "-y",
      "-i", uploadResult.filepath,
      "-c:a", format.codec,
      "-b:a", targetBitrate,
      "-ar", targetSampleRate,
      "-ac", targetChannels,
      outputPath,
    ];

    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 3 * 60 * 1000,
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
        settings: { mode: params.mode, preset: params.preset, bitrate: targetBitrate },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/audio-compressor/${outputFilename}`,
          format: params.outputFormat,
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
