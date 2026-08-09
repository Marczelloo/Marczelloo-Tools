/**
 * Background Remover API
 *
 * POST /api/tools/background-remover
 *
 * Removes background from images using @imgly/background-removal
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
import { mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "background-remover";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  uploadDir: "./tmp/uploads/background-remover",
  maxSizeBytes: 20 * 1024 * 1024, // 20MB
};

// ============================================================================
// POST - REMOVE BACKGROUND
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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
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

    const outputDir = "./tmp/processed/background-remover";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputFilename = `${randomUUID()}.png`;
    const outputPath = join(outputDir, outputFilename);

    const removeBackground = await import("@imgly/background-removal").then((module) => module.removeBackground);
    const imageBlob = await removeBackground(uploadResult.filepath, { progress: () => {} });
    await writeFile(outputPath, Buffer.from(await imageBlob.arrayBuffer()));

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
      removal: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/background-remover/${outputFilename}`,
          format: "png",
          size: outputSize,
        },
      },
    });
  } catch (error) {
    console.error("Background removal error:", error);
    if (tempInputPath) {
      try { await unlink(tempInputPath); } catch { /* ignore */ }
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during background removal" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to remove backgrounds" } },
    { status: 405 }
  );
}
