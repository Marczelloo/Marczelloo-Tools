/**
 * Image Converter API (PNG → WEBP)
 *
 * POST /api/tools/png-to-webp
 *
 * Flow:
 * 1. Upload PNG image (validated)
 * 2. Convert to WEBP using FFmpeg
 * 3. Return download URL
 * 4. File auto-deleted after 20 minutes
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  processUpload,
  DEFAULT_UPLOAD_CONFIGS,
  type UploadResult,
} from "@/lib/security/upload";
import { runFFmpeg, validateInputFile } from "@/lib/ffmpeg/runner";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "png-to-webp";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  allowedMimeTypes: ["image/png"],
  allowedExtensions: ["png"],
  uploadDir: "./tmp/uploads/png-to-webp",
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  quality?: number;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const qualityStr = formData.get("quality")?.toString();
  const quality = qualityStr ? parseInt(qualityStr, 10) : 85;

  return {
    file: file instanceof File ? file : null,
    quality: quality >= 1 && quality <= 100 ? quality : 85,
  };
}

// ============================================================================
// POST - CONVERT PNG TO WEBP
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check if tool is enabled
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TOOL_DISABLED",
          message: "This tool is currently disabled",
        },
      },
      { status: 403 }
    );
  }

  try {
    // Parse request
    const { file, quality } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FILE",
            message: "No PNG file provided",
          },
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process and validate upload
    let uploadResult: UploadResult;
    try {
      uploadResult = await processUpload(
        {
          name: file.name,
          type: file.type,
          size: file.size,
          buffer,
        },
        UPLOAD_CONFIG
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: (error as { code?: string }).code ?? "UPLOAD_ERROR",
              message: (error as { message?: string }).message ?? "Upload validation failed",
            },
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Validate input file exists
    if (!(await validateInputFile(uploadResult.filepath))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "Uploaded file not found",
          },
        },
        { status: 500 }
      );
    }

    // Generate output filename
    const outputFilename = `${randomUUID()}.webp`;
    const outputDir = "./tmp/processed/png-to-webp";
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, outputFilename);

    // Build FFmpeg arguments for PNG to WEBP conversion
    // Using libwebp with quality setting
    const qualityValue = quality ?? 85;
    const ffmpegArgs = [
      "-y",
      "-i",
      uploadResult.filepath,
      "-c:v",
      "libwebp",
      "-quality",
      qualityValue.toString(),
      "-compression_level",
      "4", // Good balance between speed and compression
      outputPath,
    ];

    // Run conversion
    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 2 * 60 * 1000, // 2 minutes max for images
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONVERSION_FAILED",
            message: result.timedOut
              ? "Conversion timed out"
              : result.error || "FFmpeg conversion failed",
            details: result.stderr.slice(-500),
          },
        },
        { status: 500 }
      );
    }

    // Get output file size
    const { stat } = await import("fs/promises");
    let outputSize = 0;
    try {
      const stats = await stat(outputPath);
      outputSize = stats.size;
    } catch {
      // Ignore stat errors
    }

    // Calculate compression ratio
    const compressionRatio = outputSize > 0
      ? ((1 - outputSize / uploadResult.size) * 100).toFixed(1)
      : "0";

    // Return success with download info
    return NextResponse.json({
      success: true,
      conversion: {
        input: {
          filename: uploadResult.originalName,
          size: uploadResult.size,
          mimeType: uploadResult.mimeType,
        },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/png-to-webp/${outputFilename}`,
          format: "webp",
          quality: quality,
          size: outputSize,
          compressionRatio: `${compressionRatio}%`,
        },
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error("PNG to WEBP conversion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred during conversion",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - METHOD NOT ALLOWED
// ============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST to convert files",
      },
    },
    { status: 405 }
  );
}
