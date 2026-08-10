"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";
import { Tabs } from "@/components/ui/tabs";
import { chunkedUpload } from "@/lib/upload/chunked-upload";

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

interface ProgressState {
  progress: number;
  status: string;
  message: string;
  remainingTime?: string;
  time?: string;
}

// ============================================================================
// OPTIONS
// ============================================================================

const COMPRESSION_MODES = [
  { value: "simple", label: "Simple" },
  { value: "advanced", label: "Advanced" },
] as const;

const SIMPLE_PRESETS: readonly FormatOption[] = [
  { value: "smallest", label: "Smallest", desc: "Max 720p" },
  { value: "balanced", label: "Balanced", desc: "Max 1080p" },
  { value: "best", label: "Best Quality", desc: "Original res" },
] as const;

const FPS_OPTIONS: readonly FormatOption[] = [
  { value: "original", label: "Original", desc: "Keep" },
  { value: "24", label: "24 fps", desc: "Cinema" },
  { value: "30", label: "30 fps", desc: "Standard" },
  { value: "60", label: "60 fps", desc: "Smooth" },
] as const;

const RESOLUTION_OPTIONS: readonly FormatOption[] = [
  { value: "original", label: "Original", desc: "Keep" },
  { value: "1080p", label: "1080p", desc: "Full HD" },
  { value: "720p", label: "720p", desc: "HD" },
  { value: "480p", label: "480p", desc: "SD" },
  { value: "360p", label: "360p", desc: "Low" },
] as const;

const OUTPUT_FORMATS: readonly FormatOption[] = [
  { value: "mp4", label: "MP4", desc: "H.264" },
  { value: "webm", label: "WebM", desc: "VP9" },
  { value: "mkv", label: "MKV", desc: "H.265" },
] as const;

const CHUNKED_UPLOAD_THRESHOLD = 50 * 1024 * 1024;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function estimateSize(originalSize: number, preset: SimplePreset): number {
  // More realistic compression ratios based on actual FFmpeg results
  // These are estimates - actual results vary based on source material
  const ratios: Record<SimplePreset, number> = {
    smallest: 0.35,  // CRF 35 + 720p max + 64k audio
    balanced: 0.5,   // CRF 28 + 1080p max + 128k audio
    best: 0.75,      // CRF 20 + original resolution + 192k audio
  };
  return Math.round(originalSize * ratios[preset]);
}

// Advanced mode estimation based on parameters
function estimateAdvancedSize(
  originalSize: number,
  compressionLevel: number,
  bitrate: string,
  resolution: string
): number {
  // Base ratio from compression level (0-100 maps to 0.2-0.9)
  // Higher compression level = better quality = larger file
  let baseRatio = 0.2 + (compressionLevel / 100) * 0.7;

  // Bitrate adjustment
  // Parse bitrate (e.g., "5M" -> 5, "2500k" -> 2.5)
  const bitrateMatch = bitrate.match(/^(\d+(?:\.\d+)?)([kMG])?$/i);
  if (bitrateMatch && bitrateMatch[1]) {
    const value = parseFloat(bitrateMatch[1]);
    const unit = (bitrateMatch[2] || "M").toLowerCase();
    let bitrateMbps = value;
    if (unit === "k") bitrateMbps = value / 1000;
    if (unit === "g") bitrateMbps = value * 1000;

    // Lower bitrate = smaller file
    // 1 Mbps -> 0.3x, 5 Mbps -> 0.5x, 10+ Mbps -> 0.7x
    const bitrateFactor = Math.min(0.7, Math.max(0.3, bitrateMbps / 10));
    baseRatio *= bitrateFactor;
  }

  // Resolution adjustment
  const resolutionFactors: Record<string, number> = {
    original: 1.0,
    "1080p": 0.9,
    "720p": 0.6,
    "480p": 0.4,
    "360p": 0.25,
  };
  baseRatio *= resolutionFactors[resolution] || 1.0;

  return Math.round(originalSize * baseRatio);
}

// ============================================================================
// VIDEO COMPRESSOR COMPONENT
// ============================================================================

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
  const [progress, setProgress] = useState<ProgressState | null>(null);

  // SSE connection ref
  const eventSourceRef = useRef<EventSource | null>(null);

  // Calculate estimated size based on mode
  const estimatedSize = file
    ? mode === "simple"
      ? estimateSize(file.size, preset)
      : estimateAdvancedSize(file.size, compressionLevel, bitrate, resolution)
    : 0;
  const compressionRatio = file ? ((1 - estimatedSize / file.size) * 100).toFixed(0) : "0";

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress({ progress: 0, status: "starting", message: "Initializing compression..." });

    const formData = new FormData();

    // Keep small files on the simple path, but avoid sending large videos as
    // one request through Next.js and Cloudflare Tunnel. The chunked upload
    // is resumable/retryable and the compressor receives only a file token.
    if (file.size > CHUNKED_UPLOAD_THRESHOLD) {
      try {
        const uploadResult = await chunkedUpload(file, {
          onProgress: (uploadProgress) => {
            setProgress({
              progress: uploadProgress.percentage,
              status: "uploading",
              message: `Uploading video... ${Math.round(uploadProgress.percentage)}%`,
            });
          },
        });

        formData.append("uploadedFileToken", uploadResult.file.filename);
        formData.append("uploadedOriginalName", file.name);
        formData.append("uploadedMimeType", file.type || "application/octet-stream");
      } catch {
        setError("Video upload failed. Please try again.");
        setLoading(false);
        setProgress(null);
        return;
      }
    } else {
      formData.append("file", file);
    }

    setProgress({ progress: 0, status: "starting", message: "Initializing compression..." });
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
        setProgress(null);
        return;
      }

      // If we got a jobId, connect to SSE for progress updates
      if (data.jobId) {
        const eventSource = new EventSource(`/api/ffmpeg/progress/${data.jobId}`);

        eventSource.onmessage = (event) => {
          try {
            const progressData = JSON.parse(event.data);

            if (progressData.type === "progress") {
              setProgress({
                progress: progressData.progress || 0,
                status: progressData.status || "processing",
                message: progressData.message || "Processing...",
                remainingTime: progressData.remainingTime,
                time: progressData.time,
              });
            } else if (progressData.type === "complete") {
              setProgress({ progress: 100, status: "completed", message: "Done!" });
              setResult({
                input: { filename: file.name, size: file.size },
                output: {
                  filename: progressData.filename || "output.mp4",
                  downloadUrl: progressData.downloadUrl || `/api/download/video-compressor/${progressData.filename}`,
                  format: outputFormat,
                  size: progressData.outputSize || 0,
                },
                compressionRatio: "",
                duration: progressData.duration || 0,
              });
              setLoading(false);
              eventSource.close();
            } else if (progressData.type === "error") {
              setError(progressData.error || "Compression failed");
              setLoading(false);
              setProgress(null);
              eventSource.close();
            }
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
        };

        eventSourceRef.current = eventSource;
      } else {
        // Fallback: no SSE support, just use the result directly
        setResult(data.compression);
        setLoading(false);
        setProgress({ progress: 100, status: "completed", message: "Done!" });
      }
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
      setProgress(null);
    }
  }, [file, mode, preset, compressionLevel, bitrate, fps, resolution, outputFormat, twoPass]);

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
            {/* Step 1: File Upload */}
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

            {/* Step 2: Mode Tabs */}
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

            {/* Step 3: Mode-Specific Options */}
            {mode === "simple" && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                    3
                  </span>
                  Quality Preset
                </legend>
                <TactileFormatGrid
                  options={SIMPLE_PRESETS}
                  value={preset}
                  onChange={(v) => setPreset(v as SimplePreset)}
                />
              </fieldset>
            )}

            {mode === "advanced" && (
              <>
                {/* Compression Level Slider */}
                <fieldset className="mb-6">
                  <legend className="text-lg font-semibold text-white mb-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                      3
                    </span>
                    Compression Level
                  </legend>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={compressionLevel}
                      onChange={(e) => setCompressionLevel(parseInt(e.target.value, 10))}
                      className="slider w-full"
                    />
                    <div className="flex justify-between text-xs text-zinc-500 font-mono">
                      <span>Smallest File</span>
                      <span className="text-white">{compressionLevel}%</span>
                      <span>Best Quality</span>
                    </div>
                  </div>
                </fieldset>

                {/* Bitrate Input */}
                <fieldset className="mb-6">
                  <legend className="text-sm font-semibold text-zinc-400 mb-3">
                    Target Bitrate
                  </legend>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={bitrate}
                      onChange={(e) => setBitrate(e.target.value)}
                      placeholder="e.g., 5M"
                      className="flex-1 px-4 py-2 bg-zinc-900 border border-white/10 rounded-md text-white font-mono text-sm focus:outline-none focus:border-white/30"
                    />
                    <span className="text-zinc-500 text-sm">bps</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">Examples: 1M (1 Mbps), 5M (5 Mbps), 10M (10 Mbps)</p>
                </fieldset>

                {/* FPS Selection */}
                <fieldset className="mb-6">
                  <legend className="text-sm font-semibold text-zinc-400 mb-3">
                    Frame Rate
                  </legend>
                  <TactileFormatGrid
                    options={FPS_OPTIONS}
                    value={fps}
                    onChange={setFps}
                    columns={4}
                  />
                </fieldset>

                {/* Resolution Selection */}
                <fieldset className="mb-6">
                  <legend className="text-sm font-semibold text-zinc-400 mb-3">
                    Resolution
                  </legend>
                  <TactileFormatGrid
                    options={RESOLUTION_OPTIONS}
                    value={resolution}
                    onChange={setResolution}
                    columns={5}
                  />
                </fieldset>

                {/* 2-Pass Encoding Toggle */}
                <fieldset className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={twoPass}
                        onChange={(e) => setTwoPass(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-zinc-800 rounded-full peer-checked:bg-zinc-700 transition-colors" />
                      <div className="absolute left-1 top-1 w-4 h-4 bg-zinc-500 rounded-full peer-checked:bg-white peer-checked:translate-x-4 transition-all" />
                    </div>
                    <div>
                      <span className="text-sm text-white group-hover:text-zinc-200">2-Pass Encoding</span>
                      <p className="text-xs text-zinc-500">Better quality at same file size (slower)</p>
                    </div>
                  </label>
                </fieldset>
              </>
            )}

            {/* Step 4 (Simple) / Step 4 (Advanced): Output Format */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  {mode === "simple" ? "4" : "4"}
                </span>
                Output Format
              </legend>
              <TactileFormatGrid
                options={OUTPUT_FORMATS}
                value={outputFormat}
                onChange={setOutputFormat}
                columns={3}
              />
            </fieldset>

            {/* Size Estimation */}
            {file && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
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
                  {mode === "advanced" && (
                    <p className="text-xs text-zinc-600 mt-3 text-center">
                      Based on current settings (compression: {compressionLevel}%, bitrate: {bitrate}, resolution: {resolution})
                    </p>
                  )}
                  {mode === "simple" && (
                    <p className="text-xs text-zinc-600 mt-3 text-center">
                      Based on &quot;{preset}&quot; preset
                    </p>
                  )}
                </div>
              </fieldset>
            )}

            {/* Progress Bar */}
            {loading && progress && (
              <fieldset className="mb-6">
                <legend className="text-sm font-semibold text-zinc-400 mb-3">
                  Compression Progress
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-mono text-sm">{Math.round(progress.progress)}%</span>
                    <span className="text-zinc-400 font-mono text-xs">{progress.remainingTime ? `~${progress.remainingTime}` : progress.message}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 ease-out"
                      style={{ width: `${progress.progress}%` }}
                    />
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

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function VideoCompressorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "video-compressor",
    name: "Video Compressor",
    description: "Compress videos with custom bitrate and quality",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/video-compressor",
  };

  return (
    <ToolProvider tool={tool}>
      <VideoCompressorInner />
    </ToolProvider>
  );
}
