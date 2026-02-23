/**
 * Image Cropper API
 *
 * POST /api/tools/image-cropper
 *
 * Crops images with specified dimensions
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

const TOOL_ID = "image-cropper";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  uploadDir: "./tmp/uploads/image-cropper",
  maxSizeBytes: 20 * 1024 * 1024, // 20MB
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  outputFormat?: string;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const x = formData.get("x")?.toString();
  const y = formData.get("y")?.toString();
  const width = formData.get("width")?.toString();
  const height = formData.get("height")?.toString();
  const outputFormat = formData.get("outputFormat")?.toString();

  return {
    file: file instanceof File ? file : null,
    x: x ? parseInt(x, 10) : 0,
    y: y ? parseInt(y, 10) : 0,
    width: width ? parseInt(width, 10) : undefined,
    height: height ? parseInt(height, 10) : undefined,
    outputFormat: outputFormat && ["jpeg", "png", "webp"].includes(outputFormat) ? outputFormat : "png",
  };
}

// ============================================================================
// POST - CROP IMAGE
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
    const { file, x, y, width, height, outputFormat } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "No image file provided" } },
        { status: 400 }
      );
    }

    if (width === undefined || height === undefined) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_DIMENSIONS", message: "Width and height are required" } },
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

    const outputDir = "./tmp/processed/image-cropper";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
    const outputFilename = `${randomUUID()}.${ext}`;
    const outputPath = join(outputDir, outputFilename);

    // Use sharp for image cropping
    const sharp = (await import("sharp")).default;

    let sharpInstance = sharp(uploadResult.filepath)
      .extract({ left: x ?? 0, top: y ?? 0, width, height });

    switch (outputFormat) {
      case "jpeg":
        sharpInstance = sharpInstance.jpeg({ quality: 90 });
        break;
      case "png":
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
        break;
      case "webp":
        sharpInstance = sharpInstance.webp({ quality: 90 });
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

    // Clean up input file
    if (tempInputPath) {
      try { await unlink(tempInputPath); } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      crop: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        settings: { x, y, width, height },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/image-cropper/${outputFilename}`,
          format: outputFormat,
          size: outputSize,
          dimensions: `${width}x${height}`,
        },
      },
    });
  } catch (error) {
    console.error("Image crop error:", error);
    if (tempInputPath) {
      try { await unlink(tempInputPath); } catch { /* ignore */ }
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during cropping" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to crop images" } },
    { status: 405 }
  );
}
