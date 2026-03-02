"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";
import { Tabs } from "@/components/ui/tabs";

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
  const ratios: Record<SimplePreset, number> = {
    smallest: 0.2,
    balanced: 0.4,
    best: 0.6,
  };
  return Math.round(originalSize * ratios[preset]);
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

  const estimatedSize = file ? estimateSize(file.size, preset) : 0;
  const compressionRatio = file ? ((1 - estimatedSize / file.size) * 100).toFixed(0) : "0";

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

            {/* Quality Settings */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Quality Preset
              </legend>
              <TactileFormatGrid
                options={QUALITY_OPTIONS}
                value={quality}
                onChange={(v) => setQuality(v as QualityPreset)}
              />
            </fieldset>

            {/* Bitrate Selection */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  3
                </span>
                Target Bitrate
              </legend>
              <TactileFormatGrid
                options={BITRATE_OPTIONS}
                value={bitrate}
                onChange={setBitrate}
                columns={5}
              />
            </fieldset>

            {/* Output Format */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  4
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
