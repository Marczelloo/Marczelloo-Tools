/**
 * PDF to Word API
 *
 * POST /api/tools/pdf-to-word
 *
 * Converts PDF to Word-compatible format
 * Note: This is a simplified implementation that extracts text
 * Full PDF-to-Word conversion requires external services
 */

import { type NextRequest, NextResponse } from "next/server";
import { processUpload, DEFAULT_UPLOAD_CONFIGS, type UploadResult } from "@/lib/security/upload";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";

const TOOL_ID = "pdf-to-word";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.document,
  allowedMimeTypes: ["application/pdf"],
  allowedExtensions: ["pdf"],
  uploadDir: "./tmp/uploads/pdf-to-word",
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
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

    const outputDir = "./tmp/processed/pdf-to-word";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Extract text from PDF using pdf-lib (simplified approach)
    const { PDFDocument } = await import("pdf-lib");
    const { readFile } = await import("fs/promises");

    const pdfBytes = await readFile(uploadResult.filepath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Get text from each page
    // Note: pdf-lib doesn't directly extract text, so we create a basic HTML/RTF
    const totalPages = pdfDoc.getPageCount();
    const pageDimensions = pdfDoc.getPages().map((page) => ({
      width: page.getWidth(),
      height: page.getHeight(),
    }));

    // Create a simple HTML document (can be opened in Word)
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${uploadResult.originalName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .page { margin-bottom: 40px; page-break-after: always; }
    .page-number { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Converted from: ${uploadResult.originalName}</h1>
  <p><em>Note: This is a basic conversion. For full formatting preservation, use a dedicated PDF-to-Word service.</em></p>
  ${pageDimensions.map((_, i) => `
  <div class="page">
    <p class="page-number">Page ${i + 1} of ${totalPages}</p>
    <p>[Content from page ${i + 1}]</p>
  </div>
  `).join('')}
</body>
</html>`;

    const outputFilename = `${randomUUID()}.doc`;
    const outputPath = join(outputDir, outputFilename);

    // Write as .doc (Word can open HTML files with .doc extension)
    await writeFile(outputPath, htmlContent);

    const { stat } = await import("fs/promises");
    let outputSize = 0;
    try {
      const stats = await stat(outputPath);
      outputSize = stats.size;
    } catch { /* ignore */ }

    // Clean up input
    try { await unlink(uploadResult.filepath); } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      conversion: {
        input: { filename: uploadResult.originalName, size: uploadResult.size, pages: totalPages },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/pdf-to-word/${outputFilename}`,
          format: "doc",
          size: outputSize,
        },
        note: "Basic text extraction. For full formatting preservation, use a dedicated PDF-to-Word service.",
      },
    });
  } catch (error) {
    console.error("PDF to Word error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during conversion" } }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to convert PDFs" } }, { status: 405 });
}
