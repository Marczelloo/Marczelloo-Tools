/**
 * URL Downloader Check API
 *
 * POST /api/tools/url-downloader/check
 *
 * Analyzes a URL and returns available download options:
 * - First tries yt-dlp (supports 1000+ sites)
 * - Falls back to direct file detection for raw media URLs
 */

import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";
import { getYtdlpFormatsUniversal } from "@/lib/yt-dlp/runner";

const TOOL_ID = "url-downloader";

// Media extensions that indicate a direct file
const DIRECT_MEDIA_EXTENSIONS = [
  ".mp4", ".webm", ".mkv", ".avi", ".mov", ".m4v",
  ".mp3", ".m4a", ".ogg", ".wav", ".flac", ".aac",
  ".gif", ".webp", ".jpg", ".jpeg", ".png",
];

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeDirectMedia(url: string): boolean {
  const urlLower = url.toLowerCase();
  return DIRECT_MEDIA_EXTENSIONS.some(ext =>
    urlLower.includes(ext + "?") || urlLower.endsWith(ext)
  );
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

async function tryDirectDownload(url: string): Promise<NextResponse> {
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

    // Strategy: Try yt-dlp first (supports 1000+ sites)
    // Fall back to direct download only if yt-dlp fails AND URL looks like direct media

    const ytdlpResult = await getYtdlpFormatsUniversal(url);

    if (ytdlpResult.success && ytdlpResult.info) {
      // yt-dlp succeeded - return formats
      const formats = ytdlpResult.info.formats;

      // Helper functions to detect video/audio presence
      const hasVideo = (f: typeof formats[0]) =>
        f.has_video || (f.vcodec && f.vcodec !== "none") || f.height || f.width;
      const hasAudio = (f: typeof formats[0]) =>
        f.has_audio || (f.acodec && f.acodec !== "none") || f.abr;
      const supportedVideoExt = ["mp4", "webm", "mkv", "mov"];
      const supportedAudioExt = ["mp3", "m4a", "webm", "opus", "aac"];

      // Video + Audio: Include video formats (yt-dlp will merge audio if needed)
      // Be more inclusive - check for video by height, width, vcodec, or has_video
      const videoAndAudio = formats.filter(f =>
        supportedVideoExt.includes(f.ext) &&
        hasVideo(f)
      );

      // Audio Only: Pure audio formats
      const audioOnly = formats.filter(f =>
        supportedAudioExt.includes(f.ext) &&
        !hasVideo(f) &&
        hasAudio(f)
      );

      // Video Only (No Audio): Edge cases - video without audio
      const videoOnly = formats.filter(f =>
        supportedVideoExt.includes(f.ext) &&
        hasVideo(f) &&
        !hasAudio(f)
      );

      return NextResponse.json({
        success: true,
        type: "formats",
        formats: {
          title: ytdlpResult.info.title,
          thumbnail: ytdlpResult.info.thumbnail,
          duration: ytdlpResult.info.duration,
          videoAndAudio: videoAndAudio.map(f => ({
            id: f.format_id,
            ext: f.ext,
            quality: f.height ? `${f.height}p` : (f.abr ? `${Math.round(f.abr)}k` : "unknown"),
            filesize: f.filesize,
            vcodec: f.vcodec,
            acodec: f.acodec,
          })).sort((a, b) => {
            const aRes = parseInt(a.quality) || 0;
            const bRes = parseInt(b.quality) || 0;
            return bRes - aRes;
          }),
          audioOnly: audioOnly.map(f => ({
            id: f.format_id,
            ext: f.ext,
            quality: f.abr ? `${Math.round(f.abr)}k` : f.format_note || "unknown",
            filesize: f.filesize,
            acodec: f.acodec,
          })).sort((a, b) => {
            const aRes = parseInt(a.quality) || 0;
            const bRes = parseInt(b.quality) || 0;
            return bRes - aRes;
          }),
          videoOnly: videoOnly.map(f => ({
            id: f.format_id,
            ext: f.ext,
            quality: f.height ? `${f.height}p` : "unknown",
            filesize: f.filesize,
            vcodec: f.vcodec,
          })).sort((a, b) => {
            const aRes = parseInt(a.quality) || 0;
            const bRes = parseInt(b.quality) || 0;
            return bRes - aRes;
          }),
        },
      });
    }

    // yt-dlp failed - check if URL looks like a direct media file
    if (looksLikeDirectMedia(url)) {
      return await tryDirectDownload(url);
    }

    // Neither worked - return error with yt-dlp error message
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNSUPPORTED_URL",
          message: ytdlpResult.error ?? "This URL is not supported. Try a direct media link instead.",
        },
      },
      { status: 400 }
    );

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
