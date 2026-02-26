/**
 * MP4 to MP3 Conversion API
 *
 * POST /api/tools/mp4-to-mp3
 *
 * Flow:
 * 1. Upload MP4 file (validated)
 * 2. Convert to MP3 using FFmpeg
 * 3. Return download URL
 * 4. File auto-deleted after 20 minutes
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  processUpload,
  DEFAULT_UPLOAD_CONFIGS,
  type UploadResult,
} from "@/lib/security/upload";
import {
  runFFmpeg,
  buildFFmpegArgs,
  validateInputFile,
} from "@/lib/ffmpeg/runner";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "mp4-to-mp3";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.video,
  allowedMimeTypes: ["video/mp4"],
  allowedExtensions: ["mp4"],
  uploadDir: "./tmp/uploads/mp4-to-mp3",
  maxSizeBytes: 200 * 1024 * 1024, // 200MB
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  bitrate?: string;
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const bitrate = formData.get("bitrate")?.toString();

  return {
    file: file instanceof File ? file : null,
    bitrate: bitrate && /^\d+[kMG]?$/.test(bitrate) ? bitrate : "192k",
  };
}

// ============================================================================
// POST - CONVERT MP4 TO MP3
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
    const { file, bitrate } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FILE",
            message: "No MP4 file provided",
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
      // Handle upload validation errors
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
    const outputFilename = `${randomUUID()}.mp3`;
    const outputPath = join("./tmp/processed/mp4-to-mp3", outputFilename);

    // Build FFmpeg arguments for MP4 to MP3 conversion
    const ffmpegArgs = buildFFmpegArgs({
      input: uploadResult.filepath,
      output: outputPath,
      codec: "libmp3lame",
      format: "mp3",
      bitrate: bitrate,
    });

    // Run conversion
    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 5 * 60 * 1000, // 5 minutes max
      workDir: "/app",
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
            details: result.stderr.slice(-500), // Last 500 chars of FFmpeg output
          },
        },
        { status: 500 }
      );
    }

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
          downloadUrl: `/api/download/mp4-to-mp3/${outputFilename}`,
          format: "mp3",
          bitrate: bitrate,
        },
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error("MP4 to MP3 conversion error:", error);
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
