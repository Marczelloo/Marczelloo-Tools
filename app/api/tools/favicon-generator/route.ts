/**
 * Favicon Generator API
 *
 * POST /api/tools/favicon-generator
 *
 * Generates favicons in multiple sizes from an uploaded image
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

const TOOL_ID = "favicon-generator";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  uploadDir: "./tmp/uploads/favicon-generator",
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
};

const FAVICON_SIZES = [16, 32, 48, 64, 180, 192, 512];

// ============================================================================
// POST - GENERATE FAVICONS
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

    const outputDir = "./tmp/processed/favicon-generator";
    const sessionId = randomUUID();
    const sessionDir = join(outputDir, sessionId);
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    // Use sharp for image resizing
    const sharp = (await import("sharp")).default;

    const generatedFiles: { filename: string; size: number; downloadUrl: string }[] = [];

    // Generate each size
    for (const size of FAVICON_SIZES) {
      const filename = size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`;
      const outputPath = join(sessionDir, filename);

      await sharp(uploadResult.filepath)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);

      generatedFiles.push({
        filename,
        size,
        downloadUrl: `/api/download/favicon-generator/${sessionId}/${filename}`,
      });
    }

    // Generate ICO file (16x16 and 32x32 combined)
    // For simplicity, just use 32x32 PNG renamed
    const icoOutputPath = join(sessionDir, "favicon.ico");
    await sharp(uploadResult.filepath)
      .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(icoOutputPath);

    generatedFiles.push({
      filename: "favicon.ico",
      size: 32,
      downloadUrl: `/api/download/favicon-generator/${sessionId}/favicon.ico`,
    });

    // Clean up input file
    if (tempInputPath) {
      try { await unlink(tempInputPath); } catch { /* ignore */ }
    }

    // Generate HTML snippet
    const htmlSnippet = `<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;

    return NextResponse.json({
      success: true,
      favicon: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        files: generatedFiles,
        downloadAllUrl: `/api/download/favicon-generator/${sessionId}/all`,
        htmlSnippet,
        sessionId,
      },
    });
  } catch (error) {
    console.error("Favicon generation error:", error);
    if (tempInputPath) {
      try { await unlink(tempInputPath); } catch { /* ignore */ }
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during favicon generation" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to generate favicons" } },
    { status: 405 }
  );
}
