/**
 * File Download API
 *
 * GET /api/download/[tool]/[filename]
 *
 * Serves processed files for download
 * Files are deleted after download or after timeout
 */

import { type NextRequest, NextResponse } from "next/server";
import { readFile, stat, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// ============================================================================
// TYPES
// ============================================================================

interface DownloadParams {
  params: Promise<{
    tool: string;
    filename: string;
  }>;
}

// ============================================================================
// ALLOWED DIRECTORIES
// ============================================================================

const TOOL_DIRECTORIES: Record<string, string> = {
  "mp4-to-mp3": "./tmp/processed/mp4-to-mp3",
  "png-to-webp": "./tmp/processed/png-to-webp",
  "image-converter": "./tmp/processed/image-converter",
  "video-compressor": "./tmp/processed/video-compressor",
  // Add more tools as needed
};

// ============================================================================
// GET - DOWNLOAD FILE
// ============================================================================

export async function GET(_request: NextRequest, { params }: DownloadParams): Promise<NextResponse> {
  const { tool, filename } = await params;

  // Validate tool
  const directory = TOOL_DIRECTORIES[tool];
  if (!directory) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_TOOL",
          message: "Unknown tool",
        },
      },
      { status: 400 }
    );
  }

  // Validate filename (prevent path traversal)
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_FILENAME",
          message: "Invalid filename",
        },
      },
      { status: 400 }
    );
  }

  // Build file path
  const filepath = join(directory, filename);

  // Check if file exists
  if (!existsSync(filepath)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "File not found or has expired",
        },
      },
      { status: 404 }
    );
  }

  try {
    // Read file
    const fileBuffer = await readFile(filepath);
    const stats = await stat(filepath);

    // Determine content type based on extension
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      webm: "video/webm",
      wav: "audio/wav",
      ogg: "audio/ogg",
      pdf: "application/pdf",
      zip: "application/zip",
      png: "image/png",
      webp: "image/webp",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      gif: "image/gif",
      bmp: "image/bmp",
      tiff: "image/tiff",
      tif: "image/tiff",
    };

    const contentType = contentTypes[ext ?? ""] ?? "application/octet-stream";

    // Create response with file
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

    // Schedule file deletion (don't await)
    setTimeout(async () => {
      try {
        await unlink(filepath);
      } catch {
        // File already deleted or doesn't exist
      }
    }, 1000);

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DOWNLOAD_FAILED",
          message: "Failed to read file",
        },
      },
      { status: 500 }
    );
  }
}
