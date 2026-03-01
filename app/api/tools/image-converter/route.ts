/**
 * Image Format Converter API
 *
 * POST /api/tools/image-converter
 *
 * Flow:
 * 1. Upload image in any supported format
 * 2. Convert to selected output format using FFmpeg
 * 3. Return download URL
 * 4. File auto-deleted after download
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

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "image-converter";

// Supported image formats
export const INPUT_FORMATS = ["png", "webp", "jpeg", "jpg", "gif", "bmp", "tiff", "tif"] as const;
export const OUTPUT_FORMATS = ["png", "webp", "jpeg", "gif", "bmp", "tiff"] as const;

export type InputFormat = (typeof INPUT_FORMATS)[number];
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

// MIME type mappings
const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
};

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  allowedMimeTypes: Object.values(MIME_TYPES),
  allowedExtensions: [...INPUT_FORMATS],
  uploadDir: "./tmp/uploads/image-converter",
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  outputFormat: OutputFormat;
  quality: number;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const outputFormatStr = formData.get("outputFormat")?.toString();
  const qualityStr = formData.get("quality")?.toString();

  const outputFormat = OUTPUT_FORMATS.includes(outputFormatStr as OutputFormat)
    ? (outputFormatStr as OutputFormat)
    : "png";

  const quality = qualityStr ? parseInt(qualityStr, 10) : 90;

  return {
    file: file instanceof File ? file : null,
    outputFormat,
    quality: quality >= 1 && quality <= 100 ? quality : 90,
  };
}

// ============================================================================
// HELPER: BUILD FFMPEG ARGS
// ============================================================================

function buildFFmpegArgs(
  inputPath: string,
  outputPath: string,
  outputFormat: OutputFormat,
  quality: number
): string[] {
  const baseArgs = ["-y", "-i", inputPath];

  switch (outputFormat) {
    case "webp":
      return [
        ...baseArgs,
        "-c:v",
        "libwebp",
        "-quality",
        quality.toString(),
        "-compression_level",
        "4",
        outputPath,
      ];

    case "jpeg":
      return [
        ...baseArgs,
        "-c:v",
        "mjpeg",
        "-q:v",
        Math.round((100 - quality) / 100 * 31).toString(), // Convert 1-100 to 1-31 ffmpeg scale
        outputPath,
      ];

    case "png":
      return [
        ...baseArgs,
        "-c:v",
        "png",
        "-compression_level",
        "6",
        outputPath,
      ];

    case "gif":
      return [
        ...baseArgs,
        "-c:v",
        "gif",
        "-filter:v",
        "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        outputPath,
      ];

    case "bmp":
      return [...baseArgs, "-c:v", "bmp", outputPath];

    case "tiff":
      return [
        ...baseArgs,
        "-c:v",
        "tiff",
        "-compression_algo",
        "lzw",
        outputPath,
      ];

    default:
      return [...baseArgs, outputPath];
  }
}

// ============================================================================
// POST - CONVERT IMAGE
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
    const { file, outputFormat, quality } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FILE",
            message: "No image file provided",
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

    // Generate output filename with proper extension
    const originalNameWithoutExt = uploadResult.originalName.replace(/\.[^.]+$/, "");
    const outputFilename = `${originalNameWithoutExt}.${outputFormat}`;
    const safeOutputFilename = `${randomUUID()}.${outputFormat}`;
    const outputPath = join("./tmp/processed/image-converter", safeOutputFilename);

    // Build FFmpeg arguments for conversion
    const ffmpegArgs = buildFFmpegArgs(
      uploadResult.filepath,
      outputPath,
      outputFormat,
      quality
    );

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
              : result.error || "Image conversion failed",
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

    // Calculate size change
    const sizeChange = outputSize > 0
      ? ((outputSize - uploadResult.size) / uploadResult.size * 100).toFixed(1)
      : "0";

    // Return success with download info
    return NextResponse.json({
      success: true,
      conversion: {
        input: {
          filename: uploadResult.originalName,
          size: uploadResult.size,
          mimeType: uploadResult.mimeType,
          format: uploadResult.originalName.split(".").pop()?.toLowerCase() ?? "unknown",
        },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/image-converter/${safeOutputFilename}`,
          format: outputFormat,
          quality: outputFormat === "png" || outputFormat === "gif" || outputFormat === "bmp" || outputFormat === "tiff" ? null : quality,
          size: outputSize,
          sizeChange: `${sizeChange}%`,
        },
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error("Image converter error:", error);
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
