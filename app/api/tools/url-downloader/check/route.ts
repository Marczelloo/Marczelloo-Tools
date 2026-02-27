/**
 * URL Downloader Check API
 *
 * POST /api/tools/url-downloader/check
 *
 * Analyzes a URL and returns available download options:
 * - Direct files: Returns file info with conversion options
 * - Page URLs: Returns available formats from yt-dlp
 */

import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";
import { detectUrlType } from "@/lib/security/url-validator";
import { getYtdlpFormats } from "@/lib/yt-dlp/runner";

const TOOL_ID = "url-downloader";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
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

function getFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const filename = pathname.split("/").pop() || "download";
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  } catch {
    return "download";
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: { code: "TOOL_DISABLED", message: "Tool disabled" } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const url = body.url as string | undefined;

    if (!url) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_URL", message: "URL required" } },
        { status: 400 }
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_URL", message: "Invalid URL" } },
        { status: 400 }
      );
    }

    const urlType = await detectUrlType(url);

    if (urlType === "direct") {
      const headResponse = await fetchHead(url);

      if (!headResponse.ok) {
        return NextResponse.json(
          { success: false, error: { code: "FETCH_FAILED", message: `HTTP ${headResponse.status}` } },
          { status: 400 }
        );
      }

      const contentType = headResponse.headers.get("content-type") ?? "application/octet-stream";
      const contentLength = headResponse.headers.get("content-length");
      const size = contentLength ? parseInt(contentLength, 10) : 0;
      const filename = getFilenameFromUrl(url);

      const isVideo = contentType.includes("video/mp4") || filename.toLowerCase().endsWith(".mp4");

      return NextResponse.json({
        success: true,
        type: "direct",
        direct: {
          filename,
          size,
          mimeType: contentType,
          canConvertToMp3: isVideo,
        },
      });
    }

    // Page URL - use yt-dlp
    const ytdlpResult = await getYtdlpFormats(url);

    if (!ytdlpResult.success || !ytdlpResult.info) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FORMATS", message: ytdlpResult.error ?? "No formats found" } },
        { status: 400 }
      );
    }

    const formats = ytdlpResult.info.formats
      .filter(f => f.ext === "mp4" || f.ext === "mp3" || f.ext === "webm" || f.ext === "m4a")
      .map(f => ({
        id: f.format_id,
        ext: f.ext,
        quality: f.height ? `${f.height}p` : (f.abr ? `${Math.round(f.abr)}k` : "unknown"),
        filesize: f.filesize,
        hasVideo: f.has_video,
        hasAudio: f.has_audio,
        vcodec: f.vcodec,
        acodec: f.acodec,
      }));

    return NextResponse.json({
      success: true,
      type: "formats",
      formats: {
        title: ytdlpResult.info.title,
        thumbnail: ytdlpResult.info.thumbnail,
        duration: ytdlpResult.info.duration,
        formats,
      },
    });

  } catch (error) {
    console.error("URL check error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to check URL" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } },
    { status: 405 }
  );
}
