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

    // Helper functions to detect video/audio presence more reliably
    const hasVideo = (f: typeof formats[0]) => f.has_video || (f.vcodec && f.vcodec !== "none");
    const hasAudio = (f: typeof formats[0]) => f.has_audio || (f.acodec && f.acodec !== "none");
    const supportedVideoExt = ["mp4", "webm", "mkv", "mov"];
    const supportedAudioExt = ["mp3", "m4a", "webm", "opus", "aac"];

    // Organize formats by type
    // NOTE: For platforms like Twitter/X, video+audio are often separate streams.
    // We include video-only formats in "video+audio" since yt-dlp will merge audio during download.
    const formats = ytdlpResult.info.formats;

    // Video + Audio: Include actual combined formats AND video-only formats (yt-dlp will add audio)
    const videoAndAudio = formats.filter(f =>
      supportedVideoExt.includes(f.ext) &&
      hasVideo(f) &&
      f.height // Has resolution = is a video format
    );

    // Audio Only: Pure audio formats only
    const audioOnly = formats.filter(f =>
      supportedAudioExt.includes(f.ext) &&
      !hasVideo(f) &&
      hasAudio(f)
    );

    // Video Only (No Audio): For users who explicitly want video without audio
    const videoOnly = formats.filter(f =>
      supportedVideoExt.includes(f.ext) &&
      hasVideo(f) &&
      !hasAudio(f) &&
      !f.height // Only show weird edge cases here (video without resolution info)
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
