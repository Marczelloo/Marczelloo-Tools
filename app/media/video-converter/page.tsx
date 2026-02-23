"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

type ConversionType = "video" | "audio";

interface ConversionResult {
  input: {
    filename: string;
    size: number;
  };
  output: {
    filename: string;
    downloadUrl: string;
    format: string;
    size: number;
    bitrate?: string;
  };
  duration: number;
  type: ConversionType;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ============================================================================
// VIDEO CONVERTER COMPONENT
// ============================================================================

function VideoConverterInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [conversionType, setConversionType] = useState<ConversionType>("video");
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [bitrate, setBitrate] = useState("192k");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      if (conversionType === "audio") {
        setOutputFormat("mp3");
      } else {
        setOutputFormat("mp4");
      }
    }
  }, [conversionType]);

  const handleConversionTypeChange = useCallback((type: ConversionType) => {
    setConversionType(type);
    if (type === "audio") {
      setOutputFormat("mp3");
    } else {
      setOutputFormat("mp4");
    }
    setResult(null);
    setError(null);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputFormat", outputFormat);
    formData.append("conversionType", conversionType);
    if (conversionType === "audio") {
      formData.append("bitrate", bitrate);
    }

    try {
      const response = await fetch("/api/tools/video-converter", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Conversion failed");
        return;
      }

      setResult(data.conversion);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [file, outputFormat, conversionType, bitrate]);

  const VIDEO_FORMATS = [
    { value: "mp4", label: "MP4", desc: "Universal" },
    { value: "webm", label: "WebM", desc: "Web optimized" },
    { value: "mov", label: "MOV", desc: "Apple" },
    { value: "avi", label: "AVI", desc: "Legacy" },
    { value: "mkv", label: "MKV", desc: "Matroska" },
  ];

  const AUDIO_FORMATS = [
    { value: "mp3", label: "MP3", desc: "Most compatible" },
    { value: "aac", label: "AAC", desc: "Better quality" },
    { value: "wav", label: "WAV", desc: "Lossless" },
    { value: "ogg", label: "OGG", desc: "Open source" },
    { value: "m4a", label: "M4A", desc: "Apple audio" },
  ];

  const BITRATE_OPTIONS = [
    { value: "128k", label: "128 kbps" },
    { value: "192k", label: "192 kbps" },
    { value: "256k", label: "256 kbps" },
    { value: "320k", label: "320 kbps" },
  ];

  const formats = conversionType === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;
  const accentColor = conversionType === "video" ? "blue" : "cyan";

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Video Converter"}
        description="Convert video files or extract audio"
        accent="blue"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* Conversion Type Toggle */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                Conversion Type
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleConversionTypeChange("video")}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors-fast ${
                    conversionType === "video"
                      ? "bg-accent-blue text-background-primary"
                      : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                  }`}
                >
                  Video to Video
                </button>
                <button
                  onClick={() => handleConversionTypeChange("audio")}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors-fast ${
                    conversionType === "audio"
                      ? "bg-accent-cyan text-background-primary"
                      : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                  }`}
                >
                  Extract Audio
                </button>
              </div>
            </fieldset>

            {/* File Upload */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                1. Select Video
              </legend>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-${accentColor} transition-colors-fast`}
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
                    <p className="text-sm text-content-tertiary mt-1">{formatSize(file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-content-secondary">Click to select a video file</p>
                    <p className="text-xs text-content-muted mt-1">
                      MP4, WebM, MOV, AVI, MKV • Max 200MB
                    </p>
                  </div>
                )}
              </div>
            </fieldset>

            {/* Output Format */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                2. {conversionType === "video" ? "Output Format" : "Audio Format"}
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {formats.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setOutputFormat(f.value)}
                    className={`px-4 py-3 rounded-md text-sm transition-colors-fast ${
                      outputFormat === f.value
                        ? conversionType === "video"
                          ? "bg-accent-blue text-background-primary"
                          : "bg-accent-cyan text-background-primary"
                        : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                    }`}
                  >
                    <span className="font-medium">{f.label}</span>
                    <span className="block text-xs opacity-75 mt-0.5">{f.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Audio Bitrate (only for audio conversion) */}
            {conversionType === "audio" && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-content-primary mb-4">
                  3. Audio Quality
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {BITRATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setBitrate(opt.value)}
                      className={`px-3 py-2 rounded-md text-sm transition-colors-fast ${
                        bitrate === opt.value
                          ? "bg-accent-cyan text-background-primary"
                          : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
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
                  ✓ Conversion Complete
                </legend>
                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-content-muted">Original</p>
                      <p className="text-content-primary font-medium">{result.input.filename}</p>
                    </div>
                    <div>
                      <p className="text-content-muted">Output Size</p>
                      <p className="text-content-primary font-medium">{formatSize(result.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-content-muted">Format</p>
                      <p className="text-content-primary font-medium uppercase">{result.output.format}</p>
                    </div>
                    {result.output.bitrate && (
                      <div>
                        <p className="text-content-muted">Bitrate</p>
                        <p className="text-content-primary font-medium">{result.output.bitrate}</p>
                      </div>
                    )}
                  </div>
                  <a
                    href={result.output.downloadUrl}
                    className="block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity"
                    download
                  >
                    Download {conversionType === "video" ? "Video" : "Audio"}
                  </a>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleConvert}
                disabled={!file || loading}
                className={`flex-1 px-6 py-3 font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${
                  conversionType === "video"
                    ? "bg-accent-blue text-background-primary"
                    : "bg-accent-cyan text-background-primary"
                }`}
              >
                {loading
                  ? conversionType === "video"
                    ? "Converting..."
                    : "Extracting..."
                  : conversionType === "video"
                  ? "Convert Video"
                  : "Extract Audio"}
              </button>
              {file && (
                <button
                  onClick={() => {
                    setFile(null);
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

export default function VideoConverterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "video-converter",
    name: "Video Converter",
    description: "Convert video files or extract audio",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/media/video-converter",
  };

  return (
    <ToolProvider tool={tool}>
      <VideoConverterInner />
    </ToolProvider>
  );
}
