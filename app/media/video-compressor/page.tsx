"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

type QualityPreset = "low" | "medium" | "high";

interface CompressionSettings {
  quality: QualityPreset;
  bitrate: string;
  outputFormat: "mp4" | "webm";
}

interface VideoInfo {
  filename: string;
  size: number;
  duration: number;
  resolution: string;
}

interface CompressionResult {
  input: {
    filename: string;
    size: number;
    duration: number;
    resolution: string;
    codec: string;
  };
  settings: {
    quality: string;
    bitrate: string;
    preset: string;
  };
  output: {
    filename: string;
    downloadUrl: string;
    format: string;
    estimatedSize: number;
    actualSize: number;
    compressionRatio: string;
  };
  duration: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUALITY_OPTIONS: Record<
  QualityPreset,
  { label: string; description: string; bitrate: string; audioBitrate: string }
> = {
  low: {
    label: "Low",
    description: "Smallest file, lowest quality",
    bitrate: "2M",
    audioBitrate: "96k",
  },
  medium: {
    label: "Medium",
    description: "Balanced quality and size",
    bitrate: "5M",
    audioBitrate: "128k",
  },
  high: {
    label: "High",
    description: "Best quality, larger file",
    bitrate: "10M",
    audioBitrate: "192k",
  },
};

const BITRATE_OPTIONS = [
  { value: "1M", label: "1 Mbps" },
  { value: "2M", label: "2 Mbps" },
  { value: "3M", label: "3 Mbps" },
  { value: "5M", label: "5 Mbps" },
  { value: "8M", label: "8 Mbps" },
  { value: "10M", label: "10 Mbps" },
  { value: "15M", label: "15 Mbps" },
  { value: "20M", label: "20 Mbps" },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function estimateSize(
  originalSize: number,
  quality: QualityPreset,
  bitrate?: string
): number {
  const targetBitrate = bitrate ?? QUALITY_OPTIONS[quality].bitrate;
  const bitrateNum = parseInt(targetBitrate);

  // Rough estimation based on typical compression ratios
  const ratios: Record<QualityPreset, number> = {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
  };

  // Adjust based on bitrate
  const bitrateFactor = bitrateNum / 5; // 5M as baseline
  const adjustedRatio = ratios[quality] * bitrateFactor;

  return Math.round(originalSize * Math.min(adjustedRatio, 0.9));
}

// ============================================================================
// VIDEO COMPRESSOR COMPONENT
// ============================================================================

function VideoCompressorInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [settings, setSettings] = useState<CompressionSettings>({
    quality: "medium",
    bitrate: "5M",
    outputFormat: "mp4",
  });
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setError(null);
        setResult(null);

        // Create video info
        const info: VideoInfo = {
          filename: selectedFile.name,
          size: selectedFile.size,
          duration: 0, // Will be updated after server probe
          resolution: "Unknown",
        };
        setVideoInfo(info);

        // Estimate size
        setEstimatedSize(estimateSize(selectedFile.size, settings.quality, settings.bitrate));
      }
    },
    [settings]
  );

  const handleSettingsChange = useCallback(
    (key: keyof CompressionSettings, value: string) => {
      setSettings((prev) => {
        const newSettings = { ...prev, [key]: value };
        if (file && key !== "outputFormat") {
          setEstimatedSize(
            estimateSize(
              file.size,
              newSettings.quality,
              newSettings.bitrate
            )
          );
        }
        return newSettings;
      });
    },
    [file]
  );

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", settings.quality);
    formData.append("bitrate", settings.bitrate);
    formData.append("outputFormat", settings.outputFormat);

    try {
      const response = await fetch("/api/tools/video-compressor", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Compression failed");
        return;
      }

      setResult(data.compression);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [file, settings]);

  const compressionRatio = videoInfo
    ? ((1 - estimatedSize / videoInfo.size) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <PageHeader
        title={tool?.name ?? "Video Compressor"}
        description="Compress videos with custom quality and bitrate settings"
        accent="blue"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Main Content */}
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* File Upload Section */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                1. Select Video
              </legend>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-blue transition-colors-fast"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div>
                    <p className="text-content-primary font-medium">{file.name}</p>
                    <p className="text-sm text-content-tertiary mt-1">
                      {formatSize(file.size)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-content-secondary">
                      Click to select a video file
                    </p>
                    <p className="text-xs text-content-muted mt-1">
                      MP4, WebM, MOV • Max 200MB
                    </p>
                  </div>
                )}
              </div>
            </fieldset>

            {/* Quality Settings */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                2. Quality Settings
              </legend>

              <div className="space-y-4">
                {/* Quality Preset */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Quality Preset
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(QUALITY_OPTIONS) as QualityPreset[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSettingsChange("quality", q)}
                        className={`px-4 py-3 rounded-md text-sm font-medium transition-colors-fast ${
                          settings.quality === q
                            ? "bg-accent-blue text-background-primary"
                            : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                        }`}
                      >
                        {QUALITY_OPTIONS[q].label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-content-muted mt-2">
                    {QUALITY_OPTIONS[settings.quality].description}
                  </p>
                </div>

                {/* Bitrate Selection */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Target Bitrate
                  </label>
                  <select
                    value={settings.bitrate}
                    onChange={(e) => handleSettingsChange("bitrate", e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                  >
                    {BITRATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Output Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["mp4", "webm"] as const).map((format) => (
                      <button
                        key={format}
                        onClick={() => handleSettingsChange("outputFormat", format)}
                        className={`px-4 py-3 rounded-md text-sm font-medium uppercase transition-colors-fast ${
                          settings.outputFormat === format
                            ? "bg-accent-blue text-background-primary"
                            : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Size Estimation */}
            {videoInfo && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-content-primary mb-4">
                  3. Size Estimation
                </legend>

                <div className="bg-surface-muted rounded-md p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-content-muted uppercase">Original</p>
                      <p className="text-lg font-semibold text-content-primary mt-1">
                        {formatSize(videoInfo.size)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-content-muted uppercase">Estimated</p>
                      <p className="text-lg font-semibold text-accent-blue mt-1">
                        {formatSize(estimatedSize)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-content-muted uppercase">Reduction</p>
                      <p className="text-lg font-semibold text-accent-green mt-1">
                        {compressionRatio}%
                      </p>
                    </div>
                  </div>
                </div>
              </fieldset>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-accent-red-muted border border-accent-red rounded-md">
                <p className="text-accent-red text-sm">{error}</p>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-accent-green mb-4">
                  ✓ Compression Complete
                </legend>

                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-content-muted">Output Size</p>
                      <p className="text-content-primary font-medium">
                        {formatSize(result.output.actualSize)}
                      </p>
                    </div>
                    <div>
                      <p className="text-content-muted">Compression</p>
                      <p className="text-accent-green font-medium">
                        {result.output.compressionRatio} smaller
                      </p>
                    </div>
                    <div>
                      <p className="text-content-muted">Processing Time</p>
                      <p className="text-content-primary">
                        {Math.round(result.duration / 1000)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-content-muted">Format</p>
                      <p className="text-content-primary uppercase">
                        {result.output.format}
                      </p>
                    </div>
                  </div>

                  <a
                    href={result.output.downloadUrl}
                    className="mt-4 block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity"
                  >
                    Download Compressed Video
                  </a>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCompress}
                disabled={!file || loading}
                className="flex-1 px-6 py-3 bg-accent-blue text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? "Compressing..." : "Compress Video"}
              </button>

              {file && (
                <button
                  onClick={() => {
                    setFile(null);
                    setVideoInfo(null);
                    setResult(null);
                    setError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-surface border border-border text-content-secondary font-medium rounded-md hover:bg-interactive-hover disabled:opacity-50 transition-colors-fast"
                >
                  Clear
                </button>
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
    layout: "form-heavy",
    enabled: true,
    route: "/media/video-compressor",
  };

  return (
    <ToolProvider tool={tool}>
      <VideoCompressorInner />
    </ToolProvider>
  );
}
