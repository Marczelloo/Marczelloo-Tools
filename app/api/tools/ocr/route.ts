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
import { unlink } from "fs/promises";

const TOOL_ID = "ocr";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp"],
  allowedExtensions: ["png", "jpg", "jpeg", "webp", "bmp"],
  uploadDir: "./tmp/uploads/ocr",
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
};

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

    // Use Tesseract.js for OCR
    const Tesseract = await import("tesseract.js");

    const result = await Tesseract.recognize(uploadResult.filepath, language, {
      logger: () => {}, // Silence progress
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

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
