/**
 * PDF Compressor API
 *
 * POST /api/tools/pdf-compressor
 *
 * Compresses PDF files
 */

import { type NextRequest, NextResponse } from "next/server";
import { processUpload, DEFAULT_UPLOAD_CONFIGS, type UploadResult } from "@/lib/security/upload";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";

const TOOL_ID = "pdf-compressor";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.document,
  allowedMimeTypes: ["application/pdf"],
  allowedExtensions: ["pdf"],
  uploadDir: "./tmp/uploads/pdf-compressor",
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: { code: "MISSING_FILE", message: "No PDF file provided" } }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let uploadResult: UploadResult;
    try {
      uploadResult = await processUpload({ name: file.name, type: file.type, size: file.size, buffer }, UPLOAD_CONFIG);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        return NextResponse.json({ success: false, error: { code: (error as { code?: string }).code ?? "UPLOAD_ERROR", message: (error as { message?: string }).message ?? "Upload validation failed" } }, { status: 400 });
      }
      throw error;
    }

    const outputDir = "./tmp/processed/pdf-compressor";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputFilename = `${randomUUID()}.pdf`;
    const outputPath = join(outputDir, outputFilename);

    // Use pdf-lib for compression
    const { PDFDocument } = await import("pdf-lib");
    const { readFile, writeFile } = await import("fs/promises");

    const pdfBytes = await readFile(uploadResult.filepath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Compress by removing unnecessary data and using object streams
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    await writeFile(outputPath, compressedBytes);

    const { stat } = await import("fs/promises");
    let outputSize = 0;
    try {
      const stats = await stat(outputPath);
      outputSize = stats.size;
    } catch { /* ignore */ }

    const compressionRatio = outputSize > 0
      ? `${Math.round((1 - outputSize / uploadResult.size) * 100)}%`
      : "N/A";

    // Clean up input
    try { await unlink(uploadResult.filepath); } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      compression: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/pdf-compressor/${outputFilename}`,
          size: outputSize,
          compressionRatio,
        },
      },
    });
  } catch (error) {
    console.error("PDF compression error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during compression" } }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to compress PDFs" } }, { status: 405 });
}
