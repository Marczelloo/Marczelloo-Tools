/**
 * PDF Merge API
 *
 * POST /api/tools/pdf-merge
 *
 * Merges multiple PDF files into one
 */

import { type NextRequest, NextResponse } from "next/server";
import { processUpload, DEFAULT_UPLOAD_CONFIGS, type UploadResult } from "@/lib/security/upload";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";

const TOOL_ID = "pdf-merge";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.document,
  allowedMimeTypes: ["application/pdf"],
  allowedExtensions: ["pdf"],
  uploadDir: "./tmp/uploads/pdf-merge",
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length < 2) {
      return NextResponse.json({ success: false, error: { code: "NEED_MORE_FILES", message: "Please select at least 2 PDF files to merge" } }, { status: 400 });
    }

    const outputDir = "./tmp/processed/pdf-merge";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Use pdf-lib for merging
    const { PDFDocument } = await import("pdf-lib");

    const mergedPdf = await PDFDocument.create();
    const uploadResults: UploadResult[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

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

      uploadResults.push(uploadResult);

      // Load and copy pages
      const { readFile } = await import("fs/promises");
      const pdfBytes = await readFile(uploadResult.filepath);
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));

      // Clean up
      try { await unlink(uploadResult.filepath); } catch { /* ignore */ }
    }

    const mergedPdfBytes = await mergedPdf.save();
    const outputFilename = `${randomUUID()}.pdf`;
    const outputPath = join(outputDir, outputFilename);
    await writeFile(outputPath, mergedPdfBytes);

    const { stat } = await import("fs/promises");
    let outputSize = 0;
    try {
      const stats = await stat(outputPath);
      outputSize = stats.size;
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      merge: {
        input: { fileCount: uploadResults.length, totalSize: uploadResults.reduce((acc, r) => acc + r.size, 0) },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/pdf-merge/${outputFilename}`,
          size: outputSize,
        },
      },
    });
  } catch (error) {
    console.error("PDF merge error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during merge" } }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to merge PDFs" } }, { status: 405 });
}
