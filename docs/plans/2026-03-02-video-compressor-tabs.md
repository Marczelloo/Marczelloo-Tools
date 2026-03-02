# Video Compressor Tabs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Simple/Advanced tabs to video compressor with unified presets and granular controls, plus fix FFmpeg error 234 (WebM codec mismatch).

**Architecture:** Create a reusable Tabs UI component, extend the API to support new compression parameters with proper codec selection (H.264 for MP4, VP9 for WebM), and refactor the page to show tabbed interface with Simple (unified presets) and Advanced (granular controls) modes.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, FFmpeg (libx264, libvpx-vp9)

---

## Task 1: Create Reusable Tabs Component

**Files:**
- Create: `components/ui/tabs.tsx`

**Step 1: Create the Tabs component**

```tsx
"use client";

import { forwardRef } from "react";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: readonly TabItem[];
  className?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ value, onValueChange, tabs, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex border-b border-white/10 ${className}`}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            role="tab"
            aria-selected={value === tab.value}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ${
              value === tab.value
                ? "border-white text-white"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
);

Tabs.displayName = "Tabs";
```

**Step 2: Commit the Tabs component**

```bash
git add components/ui/tabs.tsx
git commit -m "feat: add reusable Tabs component

- Monochrome styling with border-bottom active indicator
- Keyboard accessible with proper ARIA attributes
- Follows existing design system patterns"
```

---

## Task 2: Update API Route - Codec Config and Types

**Files:**
- Modify: `app/api/tools/video-compressor/route.ts`

**Step 1: Add codec configuration and new types**

Add after the `QUALITY_PRESETS` definition (around line 75):

```typescript
// Codec configuration for different output formats
const CODEC_CONFIG = {
  mp4: {
    videoCodec: "libx264",
    audioCodec: "aac",
    extraArgs: ["-movflags", "+faststart"],
  },
  webm: {
    videoCodec: "libvpx-vp9",
    audioCodec: "libopus",
    extraArgs: ["-row-mt", "1"],
  },
} as const;

// Simple mode presets
const SIMPLE_PRESETS = {
  smallest: {
    crf: 28,
    preset: "faster",
    maxBitrate: "1M",
    audioBitrate: "96k",
    label: "Smallest File",
  },
  balanced: {
    crf: 23,
    preset: "medium",
    maxBitrate: "5M",
    audioBitrate: "128k",
    label: "Balanced",
  },
  best: {
    crf: 18,
    preset: "slow",
    maxBitrate: "10M",
    audioBitrate: "192k",
    label: "Best Quality",
  },
} as const;

type SimplePreset = keyof typeof SIMPLE_PRESETS;

// Resolution presets
const RESOLUTION_PRESETS: Record<string, { width: number; height: number }> = {
  "4k": { width: 3840, height: 2160 },
  "1080p": { width: 1920, height: 1080 },
  "720p": { width: 1280, height: 720 },
  "480p": { width: 854, height: 480 },
  "360p": { width: 640, height: 360 },
};
```

**Step 2: Update parseFormData to handle new parameters**

Replace the `parseFormData` function (around line 83):

```typescript
async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  mode: "simple" | "advanced";
  // Simple mode
  preset?: SimplePreset;
  // Advanced mode
  quality?: QualityPreset;
  bitrate?: string;
  compressionLevel?: number;
  fps?: number;
  resolution?: string;
  twoPass?: boolean;
  // Common
  outputFormat?: "mp4" | "webm";
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode")?.toString() as "simple" | "advanced" | undefined;

  // Simple mode params
  const preset = formData.get("preset")?.toString() as SimplePreset | undefined;

  // Advanced mode params
  const quality = formData.get("quality")?.toString() as QualityPreset | undefined;
  const bitrate = formData.get("bitrate")?.toString();
  const compressionLevelStr = formData.get("compressionLevel")?.toString();
  const fpsStr = formData.get("fps")?.toString();
  const resolution = formData.get("resolution")?.toString();
  const twoPassStr = formData.get("twoPass")?.toString();

  // Common params
  const outputFormat = formData.get("outputFormat")?.toString() as "mp4" | "webm" | undefined;

  return {
    file: file instanceof File ? file : null,
    mode: mode === "advanced" ? "advanced" : "simple",
    preset: preset && SIMPLE_PRESETS[preset] ? preset : "balanced",
    quality: quality && QUALITY_PRESETS[quality] ? quality : undefined,
    bitrate: bitrate && /^\d+[kMG]?$/.test(bitrate) ? bitrate : undefined,
    compressionLevel: compressionLevelStr
      ? Math.min(100, Math.max(0, parseInt(compressionLevelStr, 10)))
      : undefined,
    fps: fpsStr ? parseInt(fpsStr, 10) : undefined,
    resolution: resolution && RESOLUTION_PRESETS[resolution] ? resolution : undefined,
    twoPass: twoPassStr === "true",
    outputFormat: outputFormat && ["mp4", "webm"].includes(outputFormat)
      ? outputFormat
      : "mp4",
  };
}
```

**Step 3: Commit API types and config**

```bash
git add app/api/tools/video-compressor/route.ts
git commit -m "feat(video-compressor): add codec config and new parameter types

- Add CODEC_CONFIG for MP4 (H.264) and WebM (VP9) codecs
- Add SIMPLE_PRESETS for unified simple mode
- Add RESOLUTION_PRESETS for resolution selection
- Update parseFormData to handle all new parameters"
```

---

## Task 3: Update API Route - FFmpeg Command Builder

**Files:**
- Modify: `app/api/tools/video-compressor/route.ts`

**Step 1: Add helper function to map compression level to CRF**

Add before the POST function (around line 145):

```typescript
/**
 * Map compression level (0-100) to CRF (51-0)
 * 0 = no compression (CRF 51, worst quality)
 * 100 = max compression (CRF 0, best quality, lossless)
 */
function compressionLevelToCrf(level: number): number {
  // Invert: higher compression level = lower CRF = better quality
  return Math.round(51 - (level / 100) * 51);
}

/**
 * Build FFmpeg arguments based on mode and settings
 */
function buildFFmpegArgs(options: {
  inputPath: string;
  outputPath: string;
  outputFormat: "mp4" | "webm";
  videoInfo: VideoInfo;
  // Simple mode
  preset?: SimplePreset;
  // Advanced mode
  quality?: QualityPreset;
  bitrate?: string;
  compressionLevel?: number;
  fps?: number;
  resolution?: string;
  twoPass?: boolean;
}): string[] {
  const {
    inputPath,
    outputPath,
    outputFormat,
    videoInfo,
    preset,
    quality,
    bitrate,
    compressionLevel,
    fps,
    resolution,
    twoPass,
  } = options;

  const codecConfig = CODEC_CONFIG[outputFormat];
  const args: string[] = ["-y", "-i", inputPath];

  // Determine CRF and preset
  let crf: number;
  let presetName: string;
  let targetBitrate: string;
  let audioBitrate: string;

  if (preset && SIMPLE_PRESETS[preset]) {
    // Simple mode
    const p = SIMPLE_PRESETS[preset];
    crf = p.crf;
    presetName = p.preset;
    targetBitrate = p.maxBitrate;
    audioBitrate = p.audioBitrate;
  } else {
    // Advanced mode or backward compatibility
    const qualityPreset = quality && QUALITY_PRESETS[quality]
      ? QUALITY_PRESETS[quality]
      : QUALITY_PRESETS.medium;
    crf = compressionLevel !== undefined
      ? compressionLevelToCrf(compressionLevel)
      : qualityPreset.crf;
    presetName = qualityPreset.preset;
    targetBitrate = bitrate ?? qualityPreset.maxBitrate;
    audioBitrate = qualityPreset.audioBitrate;
  }

  // Video codec
  args.push("-c:v", codecConfig.videoCodec);
  args.push("-crf", crf.toString());
  args.push("-preset", presetName);

  // Bitrate control
  args.push("-maxrate", targetBitrate);
  const bufsizeUnit = targetBitrate.includes("M") ? "M" : "k";
  const bufsizeValue = parseInt(targetBitrate) * 2;
  args.push("-bufsize", `${bufsizeValue}${bufsizeUnit}`);

  // FPS
  if (fps && [24, 30, 60].includes(fps)) {
    args.push("-r", fps.toString());
  }

  // Resolution
  if (resolution && RESOLUTION_PRESETS[resolution]) {
    const res = RESOLUTION_PRESETS[resolution];
    // Only scale down, not up
    if (videoInfo.width && videoInfo.height) {
      if (res.width < videoInfo.width || res.height < videoInfo.height) {
        args.push("-vf", `scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease`);
      }
    }
  }

  // Audio codec
  args.push("-c:a", codecConfig.audioCodec);
  args.push("-b:a", audioBitrate);

  // Format-specific args
  args.push(...codecConfig.extraArgs);

  // Pixel format for compatibility
  args.push("-pix_fmt", "yuv420p");

  // Output format
  args.push("-f", outputFormat);

  // Output file
  args.push(outputPath);

  return args;
}
```

**Step 2: Commit FFmpeg command builder**

```bash
git add app/api/tools/video-compressor/route.ts
git commit -m "feat(video-compressor): add FFmpeg command builder

- Add compressionLevelToCrf helper function
- Add buildFFmpegArgs with support for all new parameters
- Handle resolution scaling (downscale only)
- Handle FPS changes
- Use proper codec config for MP4/WebM"
```

---

## Task 4: Update API Route - POST Handler

**Files:**
- Modify: `app/api/tools/video-compressor/route.ts`

**Step 1: Update the POST handler to use new parameters**

Replace the FFmpeg args building section (around line 296-324) with:

```typescript
    // Build FFmpeg arguments using the new builder
    const ffmpegArgs = buildFFmpegArgs({
      inputPath: uploadResult.filepath,
      outputPath,
      outputFormat: outputFormat as "mp4" | "webm",
      videoInfo,
      preset: mode === "simple" ? preset : undefined,
      quality,
      bitrate,
      compressionLevel,
      fps,
      resolution,
      twoPass,
    });

    // Handle 2-pass encoding
    if (twoPass) {
      // First pass
      const pass1Args = [...ffmpegArgs.slice(0, -1), "-pass", "1", "-f", outputFormat, "/dev/null"];
      const pass1Result = await runFFmpeg(pass1Args, {
        timeout: 5 * 60 * 1000,
        workDir: "./tmp/ffmpeg",
      });

      if (!pass1Result.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "COMPRESSION_FAILED",
              message: pass1Result.timedOut
                ? "First pass timed out"
                : pass1Result.error || "FFmpeg first pass failed",
              details: pass1Result.stderr.slice(-500),
            },
          },
          { status: 500 }
        );
      }

      // Second pass
      const pass2Args = [...ffmpegArgs.slice(0, -1), "-pass", "2", outputPath];
      const pass2Result = await runFFmpeg(pass2Args, {
        timeout: 5 * 60 * 1000,
        workDir: "./tmp/ffmpeg",
      });

      if (!pass2Result.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "COMPRESSION_FAILED",
              message: pass2Result.timedOut
                ? "Second pass timed out"
                : pass2Result.error || "FFmpeg second pass failed",
              details: pass2Result.stderr.slice(-500),
            },
          },
          { status: 500 }
        );
      }

      result = pass2Result;
    } else {
      // Single pass
      result = await runFFmpeg(ffmpegArgs, {
        timeout: 5 * 60 * 1000,
        workDir: "./tmp/ffmpeg",
      });
    }

    // Note: 'result' variable needs to be declared before the compression logic
```

**Step 2: Update error response to include stderr details**

Replace the error response section (around line 326-339) with:

```typescript
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMPRESSION_FAILED",
            message: result.timedOut
              ? "Compression timed out"
              : result.error || "FFmpeg compression failed",
            details: result.stderr.slice(-500), // Include stderr for debugging
          },
        },
        { status: 500 }
      );
    }
```

**Step 3: Commit POST handler updates**

```bash
git add app/api/tools/video-compressor/route.ts
git commit -m "feat(video-compressor): update POST handler with new parameters

- Use buildFFmpegArgs for command generation
- Add 2-pass encoding support
- Include stderr in error responses for debugging
- Fix WebM codec selection (VP9 instead of H.264)"
```

---

## Task 5: Update Video Compressor Page - Types and Constants

**Files:**
- Modify: `app/app/media/video-compressor/page.tsx`

**Step 1: Add new imports and types**

Update imports at the top:

```tsx
"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";
import { Tabs } from "@/components/ui/tabs";
```

**Step 2: Add new types and constants**

Add after the imports, before the helper functions:

```typescript
// ============================================================================
// TYPES
// ============================================================================

type CompressionMode = "simple" | "advanced";
type SimplePreset = "smallest" | "balanced" | "best";

interface CompressionResult {
  input: {
    filename: string;
    size: number;
    duration?: number;
    resolution?: string;
  };
  output: {
    filename: string;
    downloadUrl: string;
    format: string;
    size: number;
    estimatedSize?: number;
  };
  compressionRatio: string;
  duration: number;
}

// ============================================================================
// OPTIONS
// ============================================================================

const COMPRESSION_MODES = [
  { value: "simple", label: "Simple" },
  { value: "advanced", label: "Advanced" },
] as const;

const SIMPLE_PRESETS: readonly FormatOption[] = [
  { value: "smallest", label: "Smallest", desc: "1 Mbps" },
  { value: "balanced", label: "Balanced", desc: "5 Mbps" },
  { value: "best", label: "Best Quality", desc: "10 Mbps" },
] as const;

const FPS_OPTIONS: readonly FormatOption[] = [
  { value: "original", label: "Original" },
  { value: "24", label: "24 fps" },
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
] as const;

const RESOLUTION_OPTIONS: readonly FormatOption[] = [
  { value: "original", label: "Original" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
  { value: "360p", label: "360p" },
] as const;

const OUTPUT_FORMATS: readonly FormatOption[] = [
  { value: "mp4", label: "MP4", desc: "H.264" },
  { value: "webm", label: "WebM", desc: "VP9" },
] as const;
```

**Step 3: Commit page types and constants**

```bash
git add app/app/media/video-compressor/page.tsx
git commit -m "feat(video-compressor): add page types and constants

- Add CompressionMode and SimplePreset types
- Add COMPRESSION_MODES for tab labels
- Add SIMPLE_PRESETS for unified presets
- Add FPS_OPTIONS and RESOLUTION_OPTIONS for advanced mode
- Update OUTPUT_FORMATS with codec descriptions"
```

---

## Task 6: Update Video Compressor Page - Component State

**Files:**
- Modify: `app/app/media/video-compressor/page.tsx`

**Step 1: Update component state**

Replace the state declarations in `VideoCompressorInner` (around line 82-88):

```typescript
function VideoCompressorInner(): React.JSX.Element {
  const { tool } = useTool();

  // Mode and file
  const [mode, setMode] = useState<CompressionMode>("simple");
  const [file, setFile] = useState<File | null>(null);

  // Simple mode state
  const [preset, setPreset] = useState<SimplePreset>("balanced");

  // Advanced mode state
  const [compressionLevel, setCompressionLevel] = useState(50);
  const [fps, setFps] = useState("original");
  const [bitrate, setBitrate] = useState("5M");
  const [resolution, setResolution] = useState("original");

  // Common state
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [twoPass, setTwoPass] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
```

**Step 2: Update the handleCompress callback**

Replace the `handleCompress` function (around line 93-125):

```typescript
  const handleCompress = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("outputFormat", outputFormat);

    if (mode === "simple") {
      formData.append("preset", preset);
    } else {
      formData.append("compressionLevel", compressionLevel.toString());
      formData.append("bitrate", bitrate);
      if (fps !== "original") {
        formData.append("fps", fps);
      }
      if (resolution !== "original") {
        formData.append("resolution", resolution);
      }
      if (twoPass) {
        formData.append("twoPass", "true");
      }
    }

    try {
      const response = await fetch("/api/tools/video-compressor", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Compression failed");
        setLoading(false);
        return;
      }

      setResult(data.compression);
      setLoading(false);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [file, mode, preset, compressionLevel, bitrate, fps, resolution, outputFormat, twoPass]);
```

**Step 3: Commit component state updates**

```bash
git add app/app/media/video-compressor/page.tsx
git commit -m "feat(video-compressor): update component state for tabs

- Add mode state for simple/advanced tabs
- Add preset state for simple mode
- Add compressionLevel, fps, resolution, twoPass for advanced mode
- Update handleCompress to send all new parameters"
```

---

## Task 7: Update Video Compressor Page - UI Layout

**Files:**
- Modify: `app/app/media/video-compressor/page.tsx`

**Step 1: Replace the entire return statement in VideoCompressorInner**

Replace from `return (` to the end of the function:

```tsx
  const estimatedSize = file ? estimateSize(file.size, mode === "simple" ? preset : "balanced") : 0;
  const compressionRatio = file ? ((1 - estimatedSize / file.size) * 100).toFixed(0) : "0";

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Video Compressor"}
        description="Compress videos with custom quality settings"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* File Upload */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  1
                </span>
                Select Video
              </legend>
              <TactileDropzone
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                  setError(null);
                  setResult(null);
                }}
                accept="video/*"
                currentFile={file}
                maxSizeLabel="Max 200MB"
                fileTypesLabel="MP4, WebM, MOV"
              />
            </fieldset>

            {/* Mode Tabs */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Compression Mode
              </legend>
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as CompressionMode)}
                tabs={COMPRESSION_MODES}
              />
            </fieldset>

            {/* Simple Mode Options */}
            {mode === "simple" && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                    3
                  </span>
                  Preset
                </legend>
                <TactileFormatGrid
                  options={SIMPLE_PRESETS}
                  value={preset}
                  onChange={(v) => setPreset(v as SimplePreset)}
                />
              </fieldset>
            )}

            {/* Advanced Mode Options */}
            {mode === "advanced" && (
              <>
                {/* Compression Level */}
                <fieldset className="mb-6">
                  <legend className="text-sm font-medium text-zinc-400 mb-3">
                    Compression Level: {compressionLevel}%
                  </legend>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={compressionLevel}
                    onChange={(e) => setCompressionLevel(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                </fieldset>

                {/* Bitrate */}
                <fieldset className="mb-6">
                  <legend className="text-sm font-medium text-zinc-400 mb-3">
                    Target Bitrate
                  </legend>
                  <input
                    type="text"
                    value={bitrate}
                    onChange={(e) => setBitrate(e.target.value)}
                    placeholder="e.g., 5M, 2500k"
                    className="w-full px-4 py-2 bg-black border border-white/10 rounded-md text-white font-mono focus:outline-none focus:border-white/30"
                  />
                </fieldset>

                {/* FPS and Resolution */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <fieldset>
                    <legend className="text-sm font-medium text-zinc-400 mb-3">
                      Frame Rate
                    </legend>
                    <TactileFormatGrid
                      options={FPS_OPTIONS}
                      value={fps}
                      onChange={setFps}
                      columns={2}
                    />
                  </fieldset>
                  <fieldset>
                    <legend className="text-sm font-medium text-zinc-400 mb-3">
                      Resolution
                    </legend>
                    <TactileFormatGrid
                      options={RESOLUTION_OPTIONS}
                      value={resolution}
                      onChange={setResolution}
                      columns={2}
                    />
                  </fieldset>
                </div>

                {/* 2-Pass Toggle */}
                <fieldset className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={twoPass}
                      onChange={(e) => setTwoPass(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-white focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-sm text-zinc-300">
                      2-Pass Encoding (better quality, slower)
                    </span>
                  </label>
                </fieldset>
              </>
            )}

            {/* Output Format */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  {mode === "simple" ? "4" : "5"}
                </span>
                Output Format
              </legend>
              <TactileFormatGrid
                options={OUTPUT_FORMATS}
                value={outputFormat}
                onChange={setOutputFormat}
                columns={2}
              />
            </fieldset>

            {/* Size Estimation */}
            {file && (
              <fieldset className="mb-6">
                <legend className="text-sm font-semibold text-zinc-400 mb-3">
                  Size Estimation
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-mono">Original</p>
                      <p className="text-lg font-semibold text-white mt-1 font-mono">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-mono">Estimated</p>
                      <p className="text-lg font-semibold text-white mt-1 font-mono">
                        {formatSize(estimatedSize)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-mono">Reduction</p>
                      <p className="text-lg font-semibold text-white mt-1 font-mono">
                        {compressionRatio}%
                      </p>
                    </div>
                  </div>
                </div>
              </fieldset>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 text-sm">{error}</p>
              </div>
            )}

            {/* Result Display */}
            {result && !loading && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-zinc-200 mb-4">
                  Compression Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Output Size</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Compression</p>
                      <p className="text-white font-medium font-mono">{result.compressionRatio} smaller</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Format</p>
                      <p className="text-white font-medium font-mono uppercase">{result.output.format}</p>
                    </div>
                  </div>
                  <a
                    href={result.output.downloadUrl}
                    download
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                  >
                    Download Compressed Video
                  </a>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <TactileButton
                onClick={result ? () => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                } : handleCompress}
                disabled={!file || (loading && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Compressing..." : "Compress Video"}
              </TactileButton>

              {file && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Clear
                </TactileButton>
              )}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}
```

**Step 2: Remove old unused constants**

Remove the old `QUALITY_OPTIONS`, `BITRATE_OPTIONS`, and `estimateSize` function that are no longer needed.

**Step 3: Commit page UI updates**

```bash
git add app/app/media/video-compressor/page.tsx
git commit -m "feat(video-compressor): add tabs UI with simple and advanced modes

- Add Tabs component for mode switching
- Simple mode: unified presets (Smallest/Balanced/Best)
- Advanced mode: compression slider, bitrate, FPS, resolution, 2-pass
- Update size estimation display
- Fix step numbering based on mode"
```

---

## Task 8: Final Testing and Cleanup

**Step 1: Test the implementation**

```bash
pnpm dev
```

Test scenarios:
1. Simple mode with each preset (Smallest, Balanced, Best)
2. Advanced mode with various settings
3. MP4 output format
4. WebM output format (verify VP9 codec is used)
5. 2-pass encoding
6. Resolution scaling
7. FPS changes

**Step 2: Verify FFmpeg command for WebM**

Check server logs to ensure WebM uses `libvpx-vp9` instead of `libx264`.

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final cleanup and testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create Tabs component | `components/ui/tabs.tsx` |
| 2 | Add API codec config and types | `app/api/tools/video-compressor/route.ts` |
| 3 | Add FFmpeg command builder | `app/api/tools/video-compressor/route.ts` |
| 4 | Update POST handler | `app/api/tools/video-compressor/route.ts` |
| 5 | Add page types and constants | `app/app/media/video-compressor/page.tsx` |
| 6 | Update component state | `app/app/media/video-compressor/page.tsx` |
| 7 | Update UI layout | `app/app/media/video-compressor/page.tsx` |
| 8 | Testing and cleanup | All files |
