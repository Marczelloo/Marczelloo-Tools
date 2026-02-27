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
import { streamYtdlp, getYtdlpFormats } from "@/lib/yt-dlp/runner";
import { runFFmpeg, buildFFmpegArgs } from "@/lib/ffmpeg/runner";

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
    const filename = pathname.split("/").pop() || "download";
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
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
  // Get filename from yt-dlp info
  const infoResult = await getYtdlpFormats(url);

  let filename = "download";
  if (infoResult.success && infoResult.info) {
    const sanitizedTitle = infoResult.info.title.replace(/[^a-zA-Z0-9._-]/g, "_");
    filename = `${sanitizedTitle}.${formatId.split("+")[0]}`;
  }

  const stream = streamYtdlp({ url, formatId });

  // Convert stream to buffer (yt-dlp streams are readable)
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST" } },
    { status: 405 }
  );
}
