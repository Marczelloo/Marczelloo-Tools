# Video Compressor Tabs Design

**Date:** 2026-03-02
**Status:** Approved

## Overview

Add Simple/Advanced tabs to the video compressor tool with unified presets in Simple mode and granular controls in Advanced mode. Also fix the FFmpeg error 234 caused by WebM codec mismatch.

## Root Cause Analysis

**FFmpeg Error 234** is caused by codec/container mismatch:
- WebM format requires VP8/VP9 codecs
- Current code uses `libx264` (H.264) for all formats
- FFmpeg fails when trying to put H.264 into WebM container

**Fix:** Use codec selection based on output format:
- MP4 → `libx264` (H.264)
- WebM → `libvpx-vp9` (VP9)

## Component Design

### Tabs Component

**File:** `/components/ui/tabs.tsx`

```tsx
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: Array<{ value: string; label: string }>;
}
```

- Monochrome styling with border-bottom active indicator
- Keyboard accessible
- Follows existing design system (zinc colors, 150ms transitions)

## Simple Mode

**Unified Presets:**

| Preset | CRF | Bitrate | Audio | Use Case |
|--------|-----|---------|-------|----------|
| Smallest | 28 | 1M | 96k | Sharing via message apps |
| Balanced | 23 | 5M | 128k | General use, web |
| Best Quality | 18 | 10M | 192k | Archival, high-quality |

**Output Format:** Default to MP4 (universally compatible)

**UI:** Single preset selector using existing `TactileFormatGrid`

## Advanced Mode Controls

1. **Compression Level** - Slider: 0-100% (maps to CRF 51-0)
2. **Frame Rate** - Dropdown: Original / 24 / 30 / 60 fps
3. **Bitrate** - Text input with validation (e.g., "5M", "2500k")
4. **Resolution** - Dropdown: Original / 4K / 1080p / 720p / 480p / Custom
5. **Output Format** - Radio: MP4 (H.264) / WebM (VP9)
6. **2-Pass Encoding** - Toggle switch (better quality, slower)
7. **Expected Size Preview** - Auto-calculated estimate

## API Changes

### New Request Parameters

```typescript
// Existing (backward compatible)
file: File
quality?: "low" | "medium" | "high"
bitrate?: string
outputFormat?: "mp4" | "webm"

// New
mode?: "simple" | "advanced"
preset?: "smallest" | "balanced" | "best"  // Simple mode
fps?: number                               // 24, 30, 60, or omit for original
resolution?: string                        // "1920x1080", "1280x720", etc.
twoPass?: boolean                          // Enable 2-pass encoding
compressionLevel?: number                  // 0-100, maps to CRF
```

### Codec Selection

```typescript
const CODEC_CONFIG = {
  mp4: {
    videoCodec: "libx264",
    audioCodec: "aac",
    pixelFormat: "yuv420p",
  },
  webm: {
    videoCodec: "libvpx-vp9",
    audioCodec: "libopus",
    pixelFormat: "yuv420p",
  },
};
```

### Error Response Enhancement

Include `stderr` in error responses for debugging:

```typescript
{
  success: false,
  error: {
    code: "COMPRESSION_FAILED",
    message: "FFmpeg exited with code 234",
    details: result.stderr.slice(-500)  // Last 500 chars
  }
}
```

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `/components/ui/tabs.tsx` | Create | Reusable tabs component |
| `/app/app/media/video-compressor/page.tsx` | Modify | Add tabs + simple/advanced modes |
| `/app/api/tools/video-compressor/route.ts` | Modify | New params + WebM codec fix |

## Implementation Order

1. Create `Tabs` component
2. Update API route with new params and WebM VP9 codec
3. Update page with tabs and both modes
4. Test all scenarios

## Backward Compatibility

Existing API calls without `mode` parameter will continue to work using quality/bitrate params.
