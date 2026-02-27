# URL Downloader - Universal Support Design

**Date:** 2025-02-27
**Status:** Approved
**Author:** Design Session

---

## Overview

Enhance the URL Downloader to support downloading MP4/MP3 from any URL without platform restrictions. The tool will combine direct file fetching with yt-dlp integration for streaming platforms, plus optional MP4→MP3 conversion.

---

## Requirements

- Proxy downloads through server (bypass CORS)
- Support direct MP4/MP3 URLs
- Support page URLs (YouTube, Vimeo, etc.) via yt-dlp
- Format selection UI for yt-dlp sources
- MP4 → MP3 instant conversion option
- No file size limit (personal use)

---

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Client (UI)    │────▶│  Next.js API Route  │────▶│  yt-dlp      │
│                 │     │  (TypeScript)       │     │  (Python)    │
└─────────────────┘     └─────────────────────┘     └──────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  FFmpeg (MP3)   │
                       └─────────────────┘
```

### Flow

1. User enters URL → UI sends POST to `/api/tools/url-downloader/check`
2. Server determines if direct file or page URL
3. Returns metadata or format list
4. User selects format (and optional MP3 conversion)
5. Server streams file to client

---

## API Endpoints

### `POST /api/tools/url-downloader/check`

**Input:**
```typescript
{ url: string }
```

**Output (direct file):**
```typescript
{
  type: "direct",
  direct: {
    filename: string,
    size: number,
    mimeType: string,
    canConvertToMp3: boolean  // true if video/mp4
  }
}
```

**Output (page URL):**
```typescript
{
  type: "formats",
  formats: {
    title: string,
    thumbnail?: string,
    duration?: number,
    formats: Format[]
  }
}
```

### `POST /api/tools/url-downloader/download`

**Input:**
```typescript
{
  url: string,
  formatId?: string,      // for yt-dlp formats
  convertToMp3?: boolean  // extract audio only
}
```

**Output:** File stream (binary)

---

## Data Models

```typescript
interface Format {
  id: string;
  format: string;           // e.g., "137+140"
  ext: string;              // mp4, mp3, webm
  quality: string;          // "1080p", "320k"
  filesize?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface CheckResponse {
  type: "direct" | "formats";
  direct?: {
    filename: string;
    size: number;
    mimeType: string;
    canConvertToMp3: boolean;
  };
  formats?: {
    title: string;
    thumbnail?: string;
    duration?: number;
    formats: Format[];
  };
}
```

---

## Components

### UrlDownloaderInner
- Split panel: URL input | Results
- Shows format selector when needed
- "Convert to MP3" toggle for MP4 sources
- Download progress bar

### FormatSelector
- Radio card list of available formats
- Shows: quality, filesize, container, codec
- Filter: video only / audio only

### DownloadProgress
- Progress bar with percentage
- Current speed / ETA

---

## URL Detection Logic

```typescript
async function detectUrlType(url: string): Promise<"direct" | "page"> {
  const response = await fetch(url, { method: 'HEAD' });

  if (response.headers.get('content-type')?.match(/video|audio/)) {
    return "direct";
  }

  return "page";
}
```

---

## MP4 → MP3 Conversion

When user enables "Convert to MP3":

1. yt-dlp downloads to stdout
2. FFmpeg reads stdin, extracts audio to MP3
3. Stream MP3 to client

No intermediate file saved — direct stream conversion.

---

## File Storage

- Downloads saved to `/tmp/downloads/`
- Filename pattern: `{UUID}.{ext}`
- Cleanup: Delete after 1 hour

---

## Security Changes

**Remove:** `BLOCKED_PATTERNS` array entirely

**Keep:**
- URL format validation (http/https only)
- Filename sanitization
- Rate limiting

---

## UI Changes

1. Remove "Legal Notice" section
2. Remove "platform not supported" errors
3. Add format selector (hidden by default)
4. Add "Convert to MP3" toggle
5. Add progress bar

---

## Dependencies

**New:**
- `yt-dlp` (Python package, system executable)
- `uuid` for filenames

**Existing:**
- FFmpeg (already in use)
- Next.js API routes
