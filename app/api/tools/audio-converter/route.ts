/**
 * Audio Converter API
 *
 * POST /api/tools/audio-converter
 *
 * Converts audio files between formats (MP3, WAV, AAC, OGG, FLAC)
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

const TOOL_ID = "audio-converter";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.audio,
  allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/aac", "audio/ogg", "audio/flac", "audio/x-m4a"],
  allowedExtensions: ["mp3", "wav", "aac", "ogg", "flac", "m4a"],
  uploadDir: "./tmp/uploads/audio-converter",
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
};

const SUPPORTED_FORMATS = ["mp3", "wav", "aac", "ogg", "flac"] as const;
type OutputFormat = typeof SUPPORTED_FORMATS[number];

const FORMAT_CODECS: Record<OutputFormat, { codec: string; bitrate?: string }> = {
  mp3: { codec: "libmp3lame", bitrate: "192k" },
  wav: { codec: "pcm_s16le" },
  aac: { codec: "aac", bitrate: "192k" },
  ogg: { codec: "libvorbis", bitrate: "192k" },
  flac: { codec: "flac" },
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  outputFormat?: OutputFormat;
  bitrate?: string;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const outputFormat = formData.get("outputFormat")?.toString() as OutputFormat | undefined;
  const bitrate = formData.get("bitrate")?.toString();

  return {
    file: file instanceof File ? file : null,
    outputFormat: outputFormat && SUPPORTED_FORMATS.includes(outputFormat) ? outputFormat : "mp3",
    bitrate: bitrate && /^\d+[kMG]?$/.test(bitrate) ? bitrate : "192k",
  };
}

// ============================================================================
// POST - CONVERT AUDIO
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } },
      { status: 403 }
    );
  }

  try {
    const { file, outputFormat, bitrate } = await parseFormData(request);

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

    const format = outputFormat ?? "mp3";
    const codecConfig = FORMAT_CODECS[format];

    const outputDir = "./tmp/processed/audio-converter";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputFilename = `${randomUUID()}.${format}`;
    const outputPath = join(outputDir, outputFilename);

    const ffmpegArgs = ["-y", "-i", uploadResult.filepath, "-c:a", codecConfig.codec];

    if (codecConfig.bitrate) {
      ffmpegArgs.push("-b:a", bitrate ?? codecConfig.bitrate);
    }

    ffmpegArgs.push(outputPath);

    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 3 * 60 * 1000,
      workDir: "/app",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "CONVERSION_FAILED", message: result.timedOut ? "Conversion timed out" : result.error || "FFmpeg conversion failed" } },
        { status: 500 }
      );
    }

    const { stat } = await import("fs/promises");
    let outputSize = 0;
    try {
      const stats = await stat(outputPath);
      outputSize = stats.size;
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      conversion: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/audio-converter/${outputFilename}`,
          format: format,
          size: outputSize,
        },
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error("Audio conversion error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during conversion" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to convert files" } },
    { status: 405 }
  );
}
