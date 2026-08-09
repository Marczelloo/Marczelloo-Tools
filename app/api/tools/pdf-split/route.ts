/**
 * PDF Split API
 *
 * POST /api/tools/pdf-split
 *
 * Splits a PDF into separate pages or page ranges
 */

import { type NextRequest, NextResponse } from "next/server";
import { processUpload, DEFAULT_UPLOAD_CONFIGS, type UploadResult } from "@/lib/security/upload";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";

const TOOL_ID = "pdf-split";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.document,
  allowedMimeTypes: ["application/pdf"],
  allowedExtensions: ["pdf"],
  uploadDir: "./tmp/uploads/pdf-split",
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = formData.get("mode")?.toString() || "all"; // "all", "range", "single"
    const pageRange = formData.get("pageRange")?.toString(); // e.g., "1-3" or "1,3,5"

    if (mode !== "all" && mode !== "range") {
      return NextResponse.json({ success: false, error: { code: "INVALID_MODE", message: "Unsupported split mode" } }, { status: 400 });
    }
    if (mode === "range" && (!pageRange || !/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(pageRange))) {
      return NextResponse.json({ success: false, error: { code: "INVALID_PAGE_RANGE", message: "Use a range like 1-3 or a list like 1,3,5" } }, { status: 400 });
    }

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

    const outputDir = "./tmp/processed/pdf-split";
    const sessionId = randomUUID();
    const sessionDir = join(outputDir, sessionId);
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    // Use pdf-lib for splitting
    const { PDFDocument } = await import("pdf-lib");
    const { readFile } = await import("fs/promises");

    const pdfBytes = await readFile(uploadResult.filepath);
    const pdf = await PDFDocument.load(pdfBytes);
    const totalPages = pdf.getPageCount();

    const outputFiles: { filename: string; pages: string; downloadUrl: string }[] = [];

    if (mode === "all") {
      // Split each page into separate file
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(page);

        const newPdfBytes = await newPdf.save();
        const filename = `page-${i + 1}.pdf`;
        const outputPath = join(sessionDir, filename);
        await writeFile(outputPath, newPdfBytes);

        outputFiles.push({
          filename,
          pages: `Page ${i + 1}`,
          downloadUrl: `/api/download/pdf-split/${sessionId}/${filename}`,
        });
      }
    } else if (mode === "range" && pageRange) {
      // Parse page range (e.g., "1-3" or "1,3,5")
      const ranges = pageRange.split(",").map((r) => r.trim());
      for (const range of ranges) {
        let pages: number[] = [];
        if (range.includes("-")) {
          const parts = range.split("-");
          const startStr = parts[0] ?? "1";
          const endStr = parts[1] ?? "1";
          const start = parseInt(startStr.trim(), 10) - 1;
          const end = parseInt(endStr.trim(), 10) - 1;
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end && i < totalPages; i++) {
              if (i >= 0) pages.push(i);
            }
          }
        } else {
          const p = parseInt(range, 10) - 1;
          if (p >= 0 && p < totalPages) pages = [p];
        }

        if (pages.length > 0) {
          const newPdf = await PDFDocument.create();
          const copiedPages = await newPdf.copyPages(pdf, pages);
          copiedPages.forEach((page) => newPdf.addPage(page));

          const newPdfBytes = await newPdf.save();
          const filename = `split-${range.replace("-", "-to-")}.pdf`;
          const outputPath = join(sessionDir, filename);
          await writeFile(outputPath, newPdfBytes);

          outputFiles.push({
            filename,
            pages: `Pages ${range}`,
            downloadUrl: `/api/download/pdf-split/${sessionId}/${filename}`,
          });
        }
      }
    }

    if (outputFiles.length === 0) {
      return NextResponse.json({ success: false, error: { code: "EMPTY_PAGE_RANGE", message: "The selected page range contains no valid pages" } }, { status: 400 });
    }

    // Clean up input
    try { await unlink(uploadResult.filepath); } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      split: {
        input: { filename: uploadResult.originalName, size: uploadResult.size, totalPages },
        output: { files: outputFiles, sessionId },
      },
    });
  } catch (error) {
    console.error("PDF split error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during split" } }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to split PDFs" } }, { status: 405 });
}
