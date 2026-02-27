/**
 * URL Downloader Download API
 *
 * POST /api/tools/url-downloader/download
 *
 * Downloads media from a URL:
 * - Direct files: Fetch and optionally convert to MP3
 * - Page URLs: Stream using yt-dlp with selected format
 */

import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";
import { detectUrlType } from "@/lib/security/url-validator";
import { getYtdlpFormats } from "@/lib/yt-dlp/runner";
import { runFFmpeg } from "@/lib/ffmpeg/runner";
import { spawn } from "child_process";

const TOOL_ID = "url-downloader";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    let filename = pathname.split("/").pop() || "download";
    // Replace invalid chars with underscore, but strip trailing underscores
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+$/, "");
    return filename || "download";
  } catch {
    return "download";
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: "Tool disabled" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const url = body.url as string | undefined;
    const formatId = body.formatId as string | undefined;
    const convertToMp3 = body.convertToMp3 as boolean | undefined;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL required" },
        { status: 400 }
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { success: false, error: "Invalid URL" },
        { status: 400 }
      );
    }

    const urlType = await detectUrlType(url);

    if (urlType === "direct") {
      return await handleDirectDownload(url, convertToMp3);
    }

    // Page URL - use yt-dlp
    if (!formatId) {
      return NextResponse.json(
        { success: false, error: "Format ID required" },
        { status: 400 }
      );
    }

    return await handleYtdlpDownload(url, formatId);
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { success: false, error: "Download failed" },
      { status: 500 }
    );
  }
}

async function handleDirectDownload(url: string, convertToMp3?: boolean): Promise<NextResponse> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MarczellooTools/1.0)" },
  });

  if (!response.ok) {
    return NextResponse.json(
      { success: false, error: `HTTP ${response.status}` },
      { status: 400 }
    );
  }

  const filename = getFilenameFromUrl(url);
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";

  // If convertToMp3 requested, pipe through FFmpeg
  if (convertToMp3) {
    const tmpDir = "./tmp/downloads";
    const { writeFile, unlink, mkdir } = await import("fs/promises");
    await mkdir(tmpDir, { recursive: true });

    const inputPath = `${tmpDir}/${Date.now()}.${filename.split(".").pop()}`;
    const outputPath = `${tmpDir}/${Date.now()}.mp3`;

    // Download input file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(inputPath, buffer);

    // Convert to MP3
    const ffmpegResult = await runFFmpeg([
      "-y",
      "-i", inputPath,
      "-vn",
      "-acodec", "libmp3lame",
      "-q:a", "2",
      outputPath,
    ], { timeout: 5 * 60 * 1000, workDir: "." });

    // Cleanup input
    unlink(inputPath).catch(() => {});

    if (!ffmpegResult.success) {
      return NextResponse.json(
        { success: false, error: "Conversion failed" },
        { status: 500 }
      );
    }

    // Read output file
    const { readFile } = await import("fs/promises");
    const mp3Buffer = await readFile(outputPath);

    // Schedule cleanup
    setTimeout(() => unlink(outputPath).catch(() => {}), 3600000);

    const outputFilename = filename.replace(/\.[^.]+$/, ".mp3");

    return new NextResponse(mp3Buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "Content-Length": mp3Buffer.length.toString(),
      },
    });
  }

  // Direct stream
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function handleYtdlpDownload(url: string, formatId: string): Promise<NextResponse> {
  const { unlink, mkdir } = await import("fs/promises");
  const { join } = await import("path");

  // Create temp directory
  const tmpDir = "./tmp/ytdlp";
  await mkdir(tmpDir, { recursive: true });

  // Get filename from yt-dlp info
  const infoResult = await getYtdlpFormats(url);

  let baseFilename = "video";
  let ext = "mp4";
  let contentType = "video/mp4";

  if (infoResult.success && infoResult.info) {
    // Sanitize title - be very aggressive to avoid any trailing weird chars
    baseFilename = infoResult.info.title
      .trim()                                // Remove leading/trailing whitespace
      .replace(/[^\p{L}\p{N}\s-]/gu, "")     // Remove everything except letters, numbers, spaces, hyphens
      .replace(/\s+/g, "_")                  // Replace spaces with underscores
      .replace(/-+/g, "_")                   // Replace hyphens with underscores
      .replace(/^_+|_+$/g, "");              // Strip leading/trailing underscores
    if (!baseFilename) baseFilename = "video";

    // Find the selected format to get the correct extension
    const selectedFormat = infoResult.info.formats.find(f => f.format_id === formatId);
    if (selectedFormat) {
      ext = selectedFormat.ext;
      contentType = selectedFormat.has_video ? `video/${ext}` : `audio/${ext}`;
    }
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const outputPath = join(tmpDir, `${uniqueId}.${ext}`);
  const finalFilename = `${baseFilename}.${ext}`;

  // Download using yt-dlp to temp file
  // For video-only formats, we need to explicitly tell yt-dlp to also download best audio
  // The format selector "formatId+bestaudio" tells yt-dlp to download both and merge them
  const formatSelector = formatId.includes("+") ? formatId : `${formatId}+bestaudio`;

  const ytdlpProc = spawn("yt-dlp", [
    "-f", formatSelector,
    "-o", outputPath,
    "--no-playlist",
    "--merge-output-format", "mp4",
    "--embed-metadata",
    url,
  ], { shell: false });

  // Wait for process to complete
  await new Promise<void>((resolve, reject) => {
    ytdlpProc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited with code ${code}`));
    });
    ytdlpProc.on("error", reject);
  });

  // Read the downloaded file
  const { readFile } = await import("fs/promises");
  const fileBuffer = await readFile(outputPath);

  // Schedule cleanup
  setTimeout(() => unlink(outputPath).catch(() => {}), 5000);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`,
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } },
    { status: 405 }
  );
}
