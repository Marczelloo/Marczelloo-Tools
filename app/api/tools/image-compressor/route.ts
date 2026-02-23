/**
 * Image Compressor API
 *
 * POST /api/tools/image-compressor
 *
 * Compresses images with configurable quality
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  processUpload,
  DEFAULT_UPLOAD_CONFIGS,
  type UploadResult,
} from "@/lib/security/upload";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "image-compressor";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  uploadDir: "./tmp/uploads/image-compressor",
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  quality?: number;
  outputFormat?: string;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const qualityStr = formData.get("quality")?.toString();
  const outputFormat = formData.get("outputFormat")?.toString();

  return {
    file: file instanceof File ? file : null,
    quality: qualityStr ? Math.min(100, Math.max(1, parseInt(qualityStr, 10))) : 85,
    outputFormat: outputFormat && ["jpeg", "png", "webp"].includes(outputFormat) ? outputFormat : "jpeg",
  };
}

// ============================================================================
// POST - COMPRESS IMAGE
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } },
      { status: 403 }
    );
  }

  let tempInputPath: string | null = null;

  try {
    const { file, quality, outputFormat } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "No image file provided" } },
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

    tempInputPath = uploadResult.filepath;

    const outputDir = "./tmp/processed/image-compressor";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
    const outputFilename = `${randomUUID()}.${ext}`;
    const outputPath = join(outputDir, outputFilename);

    // Use sharp for image compression
    const sharp = (await import("sharp")).default;

    let sharpInstance = sharp(uploadResult.filepath);

    switch (outputFormat) {
      case "jpeg":
        sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
        break;
      case "png":
        sharpInstance = sharpInstance.png({ compressionLevel: 9, quality });
        break;
      case "webp":
        sharpInstance = sharpInstance.webp({ quality });
        break;
    }

    await sharpInstance.toFile(outputPath);

    // Get output size
    const { stat } = await import("fs/promises");
    let outputSize = 0;
    try {
      const stats = await stat(outputPath);
      outputSize = stats.size;
    } catch { /* ignore */ }

    const compressionRatio = outputSize > 0
      ? `${Math.round((1 - outputSize / uploadResult.size) * 100)}%`
      : "N/A";

    // Clean up input file
    if (tempInputPath) {
      try { await unlink(tempInputPath); } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      compression: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        settings: { quality, format: outputFormat },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/image-compressor/${outputFilename}`,
          format: outputFormat,
          size: outputSize,
          compressionRatio,
        },
      },
    });
  } catch (error) {
    console.error("Image compression error:", error);
    if (tempInputPath) {
      try { await unlink(tempInputPath); } catch { /* ignore */ }
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during compression" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to compress images" } },
    { status: 405 }
  );
}
