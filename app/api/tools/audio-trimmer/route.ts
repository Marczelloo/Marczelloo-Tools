/**
 * Audio Trimmer API
 *
 * POST /api/tools/audio-trimmer
 *
 * Trims audio clips between start and end times
 */

import { type NextRequest, NextResponse } from "next/server";

// Route segment config for large file uploads and long processing
export const runtime = "nodejs";
export const maxDuration = 180; // 3 minutes for audio processing
export const dynamic = "force-dynamic";
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

const TOOL_ID = "audio-trimmer";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.audio,
  uploadDir: "./tmp/uploads/audio-trimmer",
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
};

// ============================================================================
// HELPER: PARSE TIME STRING
// ============================================================================

function parseTimeToSeconds(timeStr: string): number {
  const clean = timeStr.replace(/s$/i, "");

  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }

  const parts = clean.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 2) {
    return parts[0]! * 60 + parts[1]!;
  }
  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  }

  return 0;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  startTime: number;
  endTime?: number;
  outputFormat: string;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const startTimeStr = formData.get("startTime")?.toString();
  const endTimeStr = formData.get("endTime")?.toString();
  const outputFormat = formData.get("outputFormat")?.toString();

  return {
    file: file instanceof File ? file : null,
    startTime: startTimeStr ? parseTimeToSeconds(startTimeStr) : 0,
    endTime: endTimeStr ? parseTimeToSeconds(endTimeStr) : undefined,
    outputFormat: outputFormat && ["mp3", "wav", "aac"].includes(outputFormat) ? outputFormat : "mp3",
  };
}

// ============================================================================
// POST - TRIM AUDIO
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } },
      { status: 403 }
    );
  }

  try {
    const { file, startTime, endTime, outputFormat } = await parseFormData(request);

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
    const codec = format === "wav" ? "pcm_s16le" : format === "aac" ? "aac" : "libmp3lame";

    const outputDir = "./tmp/processed/audio-trimmer";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputFilename = `${randomUUID()}.${format}`;
    const outputPath = join(outputDir, outputFilename);

    const ffmpegArgs = ["-y", "-ss", startTime.toString(), "-i", uploadResult.filepath];

    if (endTime && endTime > startTime) {
      const duration = endTime - startTime;
      ffmpegArgs.push("-t", duration.toString());
    }

    ffmpegArgs.push("-c:a", codec);

    if (format === "mp3") {
      ffmpegArgs.push("-b:a", "192k");
    }

    ffmpegArgs.push(outputPath);

    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 3 * 60 * 1000,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "TRIM_FAILED", message: result.timedOut ? "Trim timed out" : result.error || "FFmpeg trim failed" } },
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
      trim: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        settings: {
          startTime: formatTime(startTime),
          endTime: endTime ? formatTime(endTime) : "End",
        },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/audio-trimmer/${outputFilename}`,
          format: format,
          size: outputSize,
        },
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error("Audio trim error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during trimming" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to trim audio" } },
    { status: 405 }
  );
}
