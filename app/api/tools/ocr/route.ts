/**
 * OCR API
 *
 * POST /api/tools/ocr
 *
 * Extracts text from images using Tesseract.js
 */

import { type NextRequest, NextResponse } from "next/server";
import { processUpload, DEFAULT_UPLOAD_CONFIGS, type UploadResult } from "@/lib/security/upload";
import { isToolEnabled } from "@/lib/featureFlags";
import { mkdir, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

const TOOL_ID = "ocr";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp"],
  allowedExtensions: ["png", "jpg", "jpeg", "webp", "bmp"],
  uploadDir: "./tmp/uploads/ocr",
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
};

const PDF_UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.document,
  allowedMimeTypes: ["application/pdf"],
  allowedExtensions: ["pdf"],
  uploadDir: "./tmp/uploads/ocr",
  maxSizeBytes: 50 * 1024 * 1024,
};

const SUPPORTED_LANGUAGES = new Set(["eng", "spa", "fra", "deu", "ita", "chi_sim", "jpn"]);

async function runPdfToPng(inputPath: string, outputPrefix: string, page: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PDFTOPPM_PATH || "pdftoppm", [
      "-f", page.toString(), "-l", page.toString(), "-png", "-r", "150", inputPath, outputPrefix,
    ], { shell: false });
    let stderr = "";
    child.stderr?.on("data", (data: Buffer) => { stderr += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `pdftoppm exited with code ${code}`));
      resolve(`${outputPrefix}-${page}.png`);
    });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language")?.toString() || "eng";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: { code: "MISSING_FILE", message: "No image file provided" } }, { status: 400 });
    }

    if (!SUPPORTED_LANGUAGES.has(language)) {
      return NextResponse.json({ success: false, error: { code: "UNSUPPORTED_LANGUAGE", message: "Unsupported OCR language" } }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const uploadConfig = isPdf ? PDF_UPLOAD_CONFIG : UPLOAD_CONFIG;

    let uploadResult: UploadResult;
    try {
      uploadResult = await processUpload({ name: file.name, type: file.type, size: file.size, buffer }, uploadConfig);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        return NextResponse.json({ success: false, error: { code: (error as { code?: string }).code ?? "UPLOAD_ERROR", message: (error as { message?: string }).message ?? "Upload validation failed" } }, { status: 400 });
      }
      throw error;
    }

    const Tesseract = await import("tesseract.js");
    let text = "";
    let confidence = 0;
    let pages = 1;
    const temporaryPngs: string[] = [];

    try {
      if (isPdf) {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false }).promise;
        pages = pdf.numPages;
        const extractedPages: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          extractedPages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" ").trim());
        }
        text = extractedPages.join("\n\n").trim();

        if (!text) {
          const tempDir = "./tmp/ocr";
          await mkdir(tempDir, { recursive: true });
          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const prefix = join(tempDir, randomUUID());
            const pngPath = await runPdfToPng(uploadResult.filepath, prefix, pageNumber);
            temporaryPngs.push(pngPath);
            const result = await Tesseract.recognize(pngPath, language, { logger: () => {} });
            text += `${text ? "\n\n" : ""}${result.data.text.trim()}`;
            confidence += result.data.confidence;
          }
          confidence = pages > 0 ? confidence / pages : 0;
        } else {
          confidence = 100;
        }
      } else {
        const result = await Tesseract.recognize(uploadResult.filepath, language, { logger: () => {} });
        text = result.data.text;
        confidence = result.data.confidence;
      }
    } finally {
      await Promise.all(temporaryPngs.map((path) => unlink(path).catch(() => {})));
    }

    // Clean up input
    try { await unlink(uploadResult.filepath); } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      ocr: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        output: {
          text,
          confidence: Math.round(confidence),
          language,
          pages,
          wordCount: text.split(/\s+/).filter(Boolean).length,
        },
      },
    });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during OCR" } }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to perform OCR" } }, { status: 405 });
}
