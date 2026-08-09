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
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

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

    const { readFile } = await import("fs/promises");

    const pdfBytes = await readFile(uploadResult.filepath);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes), useWorkerFetch: false }).promise;
    const paragraphs: Paragraph[] = [
      new Paragraph({ text: `Converted from: ${uploadResult.originalName}`, heading: HeadingLevel.HEADING_1 }),
    ];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: `Page ${pageNumber}`, bold: true })] }));
      paragraphs.push(new Paragraph(text || "[No extractable text on this page]"));
    }

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const docxBytes = await Packer.toBuffer(doc);
    const outputFilename = `${randomUUID()}.docx`;
    const outputPath = join(outputDir, outputFilename);
    await writeFile(outputPath, docxBytes);

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
        input: { filename: uploadResult.originalName, size: uploadResult.size, pages: pdf.numPages },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/pdf-to-word/${outputFilename}`,
          format: "docx",
          size: outputSize,
        },
        note: "Text and page structure were extracted. Complex visual formatting, images and embedded fonts may not be preserved.",
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
