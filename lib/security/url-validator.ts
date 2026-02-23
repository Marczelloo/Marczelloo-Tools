/**
 * URL Downloader API (Safe Mode)
 *
 * Per CLAUDE.md Section 8:
 * - UI must say "Download media from public URL"
 * - Must NOT mention specific platforms
 * - Must include "You must have rights to download this content."
 * - No SEO targeting specific platforms
 *
 * POST /api/tools/url-downloader
 */

import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "url-downloader";

const BLOCKED_PATTERNS = [
  /youtube\.com/i,
  /youtu\.be/i,
  /vimeo\.com/i,
  /tiktok\.com/i,
  /instagram\.com/i,
  /facebook\.com/i,
  /twitter\.com/i,
  /x\.com/i,
  /twitch\.tv/i,
  /dailymotion\.com/i,
];

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

// ============================================================================
// URL VALIDATION
// ============================================================================

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isBlockedUrl(url: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(url));
}

function getFilenameFromUrl(url: string, contentType?: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const filename = pathname.split("/").pop() || "download";

    // If no extension, try to add one from content type
    if (!filename.includes(".") && contentType) {
      const ext = getExtensionFromMimeType(contentType);
      if (ext) {
        return `${filename}.${ext}`;
      }
    }

    // Sanitize filename
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  } catch {
    return "download";
  }
}

function getExtensionFromMimeType(mimeType: string): string | null {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };

  const clean = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return map[clean] ?? null;
}

async function fetchHead(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarczellooTools/1.0)",
      },
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// POST - DOWNLOAD
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
    const body = await request.json();
    const url = body.url as string | undefined;

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_URL",
            message: "Please provide a URL to download",
          },
        },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_URL",
            message: "Please enter a valid HTTP or HTTPS URL",
          },
        },
        { status: 400 }
      );
    }

    // Block specific platforms per CLAUDE.md
    if (isBlockedUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BLOCKED_PLATFORM",
            message: "This platform is not supported. Please use a direct media URL.",
          },
        },
        { status: 400 }
      );
    }

    // Fetch HEAD first to check size and type
    const headResponse = await fetchHead(url);

    if (!headResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FETCH_FAILED",
            message: `Failed to access URL (HTTP ${headResponse.status})`,
          },
        },
        { status: 400 }
      );
    }

    // Check content length
    const contentLength = headResponse.headers.get("content-length");
    const size = contentLength ? parseInt(contentLength, 10) : 0;

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: `File is too large (${Math.round(size / 1024 / 1024)}MB). Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
          },
        },
        { status: 413 }
      );
    }

    // Get content type
    const contentType = headResponse.headers.get("content-type") ?? "application/octet-stream";
    const filename = getFilenameFromUrl(url, contentType);

    // For now, return the direct URL info (actual download would require more infrastructure)
    // In production, you'd fetch the file, save to tmp, and return download URL
    return NextResponse.json({
      success: true,
      media: {
        url: url,
        filename: filename,
        size: size,
        mimeType: contentType,
        canDownload: true,
        disclaimer: "You must have rights to download this content.",
      },
    });
  } catch (error) {
    console.error("URL download error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TIMEOUT",
            message: "Request timed out. The URL may be too slow to respond.",
          },
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process the URL",
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
        message: "Use POST to download from URL",
      },
    },
    { status: 405 }
  );
}
