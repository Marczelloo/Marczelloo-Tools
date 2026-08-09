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
import { getContentType, getDownloadPath, downloadExists } from "@/lib/downloads";

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
// GET - DOWNLOAD FILE
// ============================================================================

export async function GET(_request: NextRequest, { params }: DownloadParams): Promise<NextResponse> {
  const { tool, filename } = await params;

  const filepath = getDownloadPath(tool, [filename]);
  if (!filepath) {
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

  // Check if file exists
  if (!downloadExists(filepath)) {
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

    const contentType = getContentType(filename);

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
