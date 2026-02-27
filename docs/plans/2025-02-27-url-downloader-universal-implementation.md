# URL Downloader - Universal Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable downloading MP4/MP3 from any URL (direct files or streaming platforms) with optional MP4→MP3 conversion.

**Architecture:** Dual-path system - direct file fetch for media URLs, yt-dlp integration for page URLs. Server proxies all downloads to bypass CORS. FFmpeg pipes for audio conversion.

**Tech Stack:** Next.js API routes, yt-dlp (Python), FFmpeg, TypeScript, React

---

## Prerequisites

**Before starting, ensure yt-dlp is installed:**

```bash
# Check if yt-dlp is available
yt-dlp --version

# If not, install:
pip install yt-dlp
# or on Windows with pip:
pip install yt-dlp
```

---

## Task 1: Remove Platform Restrictions

**Files:**
- Modify: `lib/security/url-validator.ts:22-33`

**Step 1: Remove BLOCKED_PATTERNS and isBlockedUrl function**

Delete the blocked patterns array and function since we're supporting all platforms.

**Step 2: Update error handling**

Remove the "BLOCKED_PLATFORM" error case from POST handler.

**Step 3: Commit**

```bash
git add lib/security/url-validator.ts
git commit -m "refactor: remove platform restrictions from URL downloader"
```

---

## Task 2: Create yt-dlp Runner Library

**Files:**
- Create: `lib/yt-dlp/runner.ts`
- Create: `lib/yt-dlp/types.ts`

**Step 1: Create type definitions**

Create `lib/yt-dlp/types.ts`:

```typescript
export interface YtdlpFormat {
  format_id: string;
  ext: string;
  format: string;
  quality: string;
  filesize?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  has_video: boolean;
  has_audio: boolean;
  width?: number;
  height?: number;
}

export interface YtdlpInfo {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  formats: YtdlpFormat[];
  webpage_url: string;
}

export interface YtdlpResult {
  success: boolean;
  info?: YtdlpInfo;
  error?: string;
  timedOut?: boolean;
}
```

**Step 2: Create yt-dlp runner**

Create `lib/yt-dlp/runner.ts`:

```typescript
import { spawn } from "child_process";
import { type YtdlpInfo, type YtdlpFormat, type YtdlpResult } from "./types";

const YTDLP_PATH = process.env.YTDLP_PATH || "yt-dlp";
const TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface RunOptions {
  timeout?: number;
  args: string[];
}

async function runYtdlp(options: RunOptions): Promise<YtdlpResult> {
  const { args, timeout = TIMEOUT } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return new Promise((resolve) => {
    const proc = spawn(YTDLP_PATH, args, {
      signal: controller.signal as AbortSignal,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        try {
          const info = JSON.parse(stdout) as YtdlpInfo;
          resolve({ success: true, info });
        } catch (e) {
          resolve({
            success: false,
            error: `Failed to parse yt-dlp output: ${e}`,
          });
        }
      } else {
        resolve({
          success: false,
          error: stderr || "yt-dlp failed",
        });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        resolve({ success: false, timedOut: true, error: "Timeout" });
      } else {
        resolve({ success: false, error: err.message });
      }
    });
  });
}

export async function getYtdlpFormats(url: string): Promise<YtdlpResult> {
  return runYtdlp({
    args: [
      "--dump-json",
      "--no-playlist",
      "--flat-playlist",
      url,
    ],
  });
}

export interface StreamOptions {
  url: string;
  formatId: string;
  onProgress?: (bytes: number, total?: number) => void;
}

export function streamYtdlp(options: StreamOptions): ReadableStream<Uint8Array> {
  const { url, formatId } = options;
  const proc = spawn(YTDLP_PATH, [
    "-f",
    formatId,
    "-o",
    "-",
    "--no-playlist",
    url,
  ]);

  return new ReadableStream({
    start(controller) {
      proc.stdout?.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      proc.stderr?.on("data", (data) => {
        // Parse progress: [download] 23.4MB of 45.6MB
        const match = data.toString().match(/\[download\]\s+(\d+\.?\d*)% of/);
        if (match) {
          const percent = parseFloat(match[1]);
          // Could emit progress event here
        }
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          controller.error(new Error(`yt-dlp exited with code ${code}`));
        } else {
          controller.close();
        }
      });

      proc.on("error", (err) => {
        controller.error(err);
      });
    },

    cancel() {
      proc.kill();
    },
  });
}
```

**Step 3: Commit**

```bash
git add lib/yt-dlp/
git commit -m "feat: add yt-dlp runner library"
```

---

## Task 3: Update URL Validator

**Files:**
- Modify: `lib/security/url-validator.ts:40-53`

**Step 1: Add URL type detection**

Update the file to add detection logic:

```typescript
async function detectUrlType(url: string): Promise<"direct" | "page"> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarczellooTools/1.0)",
      },
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") ?? "";

    // Check if direct media file
    if (contentType.match(/video\/|audio\//)) {
      return "direct";
    }

    // Check URL extension as fallback
    const urlLower = url.toLowerCase();
    if (urlLower.match(/\.(mp4|mp3|webm|wav|ogg|mov|m4a)(\?|$)/)) {
      return "direct";
    }

    return "page";
  } catch {
    // If HEAD fails, assume it's a page needing yt-dlp
    return "page";
  }
}
```

**Step 2: Commit**

```bash
git add lib/security/url-validator.ts
git commit -m "feat: add URL type detection (direct vs page)"
```

---

## Task 4: Refactor API into Two Endpoints

**Files:**
- Create: `app/api/tools/url-downloader/check/route.ts`
- Create: `app/api/tools/url-downloader/download/route.ts`
- Modify: `lib/featureFlags.ts` (update TOOL_DIRECTORIES if needed)

**Step 1: Create check endpoint**

Create `app/api/tools/url-downloader/check/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";
import { detectUrlType } from "@/lib/security/url-validator";
import { getYtdlpFormats } from "@/lib/yt-dlp/runner";

const TOOL_ID = "url-downloader";

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

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_URL", message: "Invalid URL" } },
        { status: 400 }
      );
    }

    const urlType = await detectUrlType(url);

    if (urlType === "direct") {
      // For direct files, fetch HEAD info
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const headResponse = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!headResponse.ok) {
        return NextResponse.json(
          { success: false, error: { code: "FETCH_FAILED", message: `HTTP ${headResponse.status}` } },
          { status: 400 }
        );
      }

      const contentType = headResponse.headers.get("content-type") ?? "application/octet-stream";
      const contentLength = headResponse.headers.get("content-length");
      const size = contentLength ? parseInt(contentLength, 10) : 0;

      // Get filename from URL
      const parsed = new URL(url);
      let filename = parsed.pathname.split("/").pop() || "download";
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

      return NextResponse.json({
        success: true,
        type: "direct",
        direct: {
          filename,
          size,
          mimeType: contentType,
          canConvertToMp3: contentType.includes("video/mp4") || filename.toLowerCase().endsWith(".mp4"),
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

    // Simplify formats for UI
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
```

**Step 2: Create download endpoint**

Create `app/api/tools/url-downloader/download/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";
import { detectUrlType } from "@/lib/security/url-validator";
import { streamYtdlp } from "@/lib/yt-dlp/runner";

const TOOL_ID = "url-downloader";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: "Tool disabled" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const url = body.url as string | undefined;
    const formatId = body.formatId as string | undefined;
    const convertToMp3 = body.convertToMp3 as boolean | undefined;

    if (!url) {
      return NextResponse.json({ success: false, error: "URL required" }, { status: 400 });
    }

    const urlType = await detectUrlType(url);

    if (urlType === "direct") {
      // For direct files, fetch and stream
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
      });

      if (!response.ok) {
        return NextResponse.json({ success: false, error: `HTTP ${response.status}` }, { status: 400 });
      }

      // Get filename
      const parsed = new URL(url);
      let filename = parsed.pathname.split("/").pop() || "download";
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

      // If convertToMp3 requested, pipe through FFmpeg
      if (convertToMp3) {
        const { runFFmpeg } = await import("@/lib/ffmpeg/runner");

        // Create temp file for input
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
          "-vn",  // No video
          "-acodec", "libmp3lame",
          "-q:a", "2",
          outputPath,
        ], { timeout: 5 * 60 * 1000, workDir: "." });

        // Cleanup input
        unlink(inputPath).catch(() => {});

        if (!ffmpegResult.success) {
          return NextResponse.json({ success: false, error: "Conversion failed" }, { status: 500 });
        }

        // Read output file
        const { readFile } = await import("fs/promises");
        const mp3Buffer = await readFile(outputPath);

        // Schedule cleanup
        setTimeout(() => unlink(outputPath).catch(() => {}), 3600000);

        return new NextResponse(mp3Buffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": `attachment; filename="${filename.replace(/\.[^.]+$/, ".mp3")}"`,
            "Content-Length": mp3Buffer.length.toString(),
          },
        });
      }

      // Direct stream
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Page URL - use yt-dlp
    if (!formatId) {
      return NextResponse.json({ success: false, error: "Format ID required" }, { status: 400 });
    }

    const stream = streamYtdlp({ url, formatId });

    // Get filename from yt-dlp info first
    const { getYtdlpFormats } = await import("@/lib/yt-dlp/runner");
    const infoResult = await getYtdlpFormats(url);

    let filename = "download";
    if (infoResult.success && infoResult.info) {
      const sanitizedTitle = infoResult.info.title.replace(/[^a-zA-Z0-9._-]/g, "_");
      filename = `${sanitizedTitle}.${formatId.split("+")[0]}`;
    }

    // Convert stream to Response
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
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

  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ success: false, error: "Download failed" }, { status: 500 });
  }
}
```

**Step 3: Update old route to redirect**

Update `app/api/tools/url-downloader/route.ts`:

```typescript
// Legacy route - redirects to check endpoint
export { POST as legacyPOST } from "./check/route";
export const POST = async (req: NextRequest) => legacyPOST(req);
```

**Step 4: Commit**

```bash
git add app/api/tools/url-downloader/ lib/featureFlags.ts
git commit -m "refactor: split URL downloader into check and download endpoints"
```

---

## Task 5: Update UI Component

**Files:**
- Modify: `app/app/web/url-downloader/page.tsx`

**Step 1: Update component state and types**

Add new state for formats and conversion:

```typescript
interface Format {
  id: string;
  ext: string;
  quality: string;
  filesize?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

// Add to component:
const [formats, setFormats] = useState<Format[] | null>(null);
const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
const [convertToMp3, setConvertToMp3] = useState(false);
const [downloading, setDownloading] = useState(false);
const [progress, setProgress] = useState(0);
```

**Step 2: Update check API call**

Change the API call to use the new endpoint:

```typescript
const handleFetchInfo = useCallback(async () => {
  // ... validation ...

  setLoading(true);
  setError(null);
  setMediaInfo(null);
  setFormats(null);

  try {
    const response = await fetch("/api/tools/url-downloader/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!data.success) {
      setError(data.error?.message ?? "Failed to fetch URL info");
      return;
    }

    if (data.type === "direct") {
      setMediaInfo({
        url,
        filename: data.direct.filename,
        size: data.direct.size,
        mimeType: data.direct.mimeType,
        canDownload: true,
        canConvertToMp3: data.direct.canConvertToMp3,
      });
    } else if (data.type === "formats") {
      setFormats(data.formats.formats);
      setMediaInfo({
        title: data.formats.title,
        thumbnail: data.formats.thumbnail,
        duration: data.formats.duration,
      });
    }
  } catch (err) {
    setError("Failed to connect to server");
  } finally {
    setLoading(false);
  }
}, [url]);
```

**Step 3: Add format selector UI**

Add after the input section:

```tsx
{/* Format Selector */}
{formats && (
  <div className="mt-4">
    <p className="text-xs text-zinc-500 mb-2">Select format:</p>
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {formats.map((fmt) => (
        <button
          key={fmt.id}
          onClick={() => setSelectedFormat(fmt.id)}
          className={`w-full px-4 py-3 rounded-md text-left transition-colors ${
            selectedFormat === fmt.id
              ? "bg-white text-black border-transparent"
              : "bg-black border border-white/10 text-white hover:bg-white/5"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="font-mono text-sm">{fmt.quality}</span>
            <span className="text-xs opacity-70">{fmt.ext.toUpperCase()}</span>
          </div>
        </button>
      ))}
    </div>
  </div>
)}
```

**Step 4: Add MP3 conversion toggle**

```tsx
{/* Convert to MP3 Toggle */}
{(mediaInfo?.canConvertToMp3 || (formats && selectedFormat)) && (
  <div className="mt-4 flex items-center gap-3">
    <button
      onClick={() => setConvertToMp3(!convertToMp3)}
      className={`w-12 h-6 rounded-full transition-colors ${
        convertToMp3 ? "bg-white" : "bg-zinc-800"
      }`}
    >
      <div
        className={`w-5 h-5 bg-black rounded-full transition-transform ${
          convertToMp3 ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
    <span className="text-sm text-zinc-400">Convert to MP3</span>
  </div>
)}
```

**Step 5: Update download handler**

```typescript
const handleDownload = useCallback(async () => {
  if (!url) return;

  setDownloading(true);
  setProgress(0);

  try {
    const response = await fetch("/api/tools/url-downloader/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formatId: selectedFormat,
        convertToMp3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      setError(error.error || "Download failed");
      return;
    }

    // Get filename from header
    const contentDisposition = response.headers.get("content-disposition");
    const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
    const filename = filenameMatch?.[1] || "download";

    // Download blob
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

  } catch (err) {
    setError("Download failed");
  } finally {
    setDownloading(false);
  }
}, [url, selectedFormat, convertToMp3]);
```

**Step 6: Remove legal notice**

Delete the legal notice div (lines ~132-139).

**Step 7: Commit**

```bash
git add app/app/web/url-downloader/page.tsx
git commit -m "feat: add format selection and MP3 conversion to URL downloader"
```

---

## Task 6: Update Tool Registration

**Files:**
- Modify: `components/layout/tool-content-renderer.tsx`
- Modify: `components/layout/sidebar.tsx` (if needed)

**Step 1: Verify tool is registered**

Check that `url-downloader` is in the tool registry and renderer.

**Step 2: Commit if changes needed**

```bash
git add components/layout/tool-content-renderer.tsx components/layout/sidebar.tsx
git commit -m "fix: ensure URL downloader is registered"
```

---

## Task 7: Testing

**Step 1: Test direct URL download**

1. Start dev server: `pnpm dev`
2. Navigate to `/app/web/url-downloader`
3. Enter a direct MP4 URL (e.g., a sample video URL)
4. Verify metadata displays correctly
5. Click download and verify file downloads

**Step 2: Test yt-dlp format extraction**

1. Enter a YouTube URL
2. Verify format list appears
3. Select a format
4. Download and verify

**Step 3: Test MP3 conversion**

1. Use an MP4 URL
2. Enable "Convert to MP3"
3. Download and verify audio file

**Step 4: Test error cases**

- Invalid URL
- Non-existent URL
- URL with no downloadable media

---

## Task 8: Cleanup

**Step 1: Add tmp downloads to .gitignore**

Ensure `tmp/downloads/` is gitignored.

**Step 2: Final commit**

```bash
git add .gitignore
git commit -m "chore: ensure tmp/downloads is gitignored"
```

---

## Summary

This implementation:
1. Removes platform restrictions
2. Adds yt-dlp integration for page URLs
3. Adds format selection UI
4. Adds MP4→MP3 conversion option
5. Splits API into check and download endpoints
6. Maintains monochrome design system

**Total estimated time:** 2-3 hours
**Files created:** 4 new files
**Files modified:** 5 existing files
