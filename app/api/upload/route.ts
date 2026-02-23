/**
 * Generic Upload API Route
 *
 * This is a demonstration route. In production, each tool should have
 * its own upload route with specific configuration.
 *
 * POST /api/upload
 * Content-Type: multipart/form-data
 * Body: file=<File>
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  processUpload,
  DEFAULT_UPLOAD_CONFIGS,
  type UploadConfig,
  type UploadError,
} from "@/lib/security/upload";

// ============================================================================
// HELPER TO PARSE MULTIPART FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{ file: File | null }> {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return { file: null };
  }

  return { file };
}

// ============================================================================
// ERROR STATUS CODES
// ============================================================================

function getErrorStatusCode(code: string): number {
  const statusCodes: Record<string, number> = {
    FILE_TOO_LARGE: 413,
    INVALID_MIME_TYPE: 415,
    INVALID_EXTENSION: 415,
    EMPTY_FILE: 400,
    MISSING_FILENAME: 400,
    UPLOAD_FAILED: 500,
    SANDBOX_VIOLATION: 400,
  };
  return statusCodes[code] ?? 500;
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse form data
    const { file } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FILE",
            message: "No file provided in request",
          },
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine upload config based on content type or query param
    const uploadType = request.nextUrl.searchParams.get("type") ?? "image";
    const config = getConfigForType(uploadType);

    // Process upload with security validations
    const result = await processUpload(
      {
        name: file.name,
        type: file.type,
        size: file.size,
        buffer,
      },
      config
    );

    return NextResponse.json({
      success: true,
      file: {
        filename: result.filename,
        size: result.size,
        mimeType: result.mimeType,
      },
    });
  } catch (error) {
    // Handle known upload errors
    if (error && typeof error === "object" && "code" in error) {
      const uploadError = error as UploadError;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: uploadError.code,
            message: uploadError.message,
            ...(uploadError.details ?? {}),
          },
        },
        { status: getErrorStatusCode(uploadError.code) }
      );
    }

    // Handle unexpected errors
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// CONFIG HELPER
// ============================================================================

function getConfigForType(type: string): UploadConfig {
  switch (type) {
    case "video":
      return DEFAULT_UPLOAD_CONFIGS.video;
    case "audio":
      return DEFAULT_UPLOAD_CONFIGS.audio;
    case "document":
      return DEFAULT_UPLOAD_CONFIGS.document;
    case "image":
    default:
      return DEFAULT_UPLOAD_CONFIGS.image;
  }
}

// ============================================================================
// METHOD NOT ALLOWED
// ============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use POST to upload files",
      },
    },
    { status: 405 }
  );
}
