/**
 * Volume Booster API
 *
 * POST /api/tools/volume-booster
 *
 * Increases or decreases audio volume levels
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

const TOOL_ID = "volume-booster";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.audio,
  uploadDir: "./tmp/uploads/volume-booster",
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  volumeMultiplier?: number;
  normalize?: boolean;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const volumeStr = formData.get("volume")?.toString();
  const normalizeStr = formData.get("normalize")?.toString();

  const volume = volumeStr ? parseFloat(volumeStr) : 1.5;

  return {
    file: file instanceof File ? file : null,
    volumeMultiplier: Math.min(Math.max(volume, 0.1), 5), // Clamp between 0.1x and 5x
    normalize: normalizeStr === "true",
  };
}

// ============================================================================
// POST - BOOST VOLUME
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } },
      { status: 403 }
    );
  }

  try {
    const { file, volumeMultiplier, normalize } = await parseFormData(request);

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

    const outputDir = "./tmp/processed/volume-booster";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputFilename = `${randomUUID()}.mp3`;
    const outputPath = join(outputDir, outputFilename);

    // Build audio filter
    let audioFilter = `volume=${volumeMultiplier}`;

    if (normalize) {
      // Add loudnorm filter for normalization
      audioFilter += `,loudnorm=I=-14:TP=-1:LRA=11`;
    }

    const ffmpegArgs = [
      "-y",
      "-i", uploadResult.filepath,
      "-af", audioFilter,
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      outputPath,
    ];

    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 3 * 60 * 1000,
      workDir: "/app",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "VOLUME_ADJUST_FAILED", message: result.timedOut ? "Processing timed out" : result.error || "FFmpeg volume adjustment failed" } },
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
      volumeBoost: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        settings: {
          volumeMultiplier: `${volumeMultiplier}x`,
          normalized: normalize,
        },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/volume-booster/${outputFilename}`,
          format: "mp3",
          size: outputSize,
        },
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error("Volume boost error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during volume adjustment" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to adjust volume" } },
    { status: 405 }
  );
}
