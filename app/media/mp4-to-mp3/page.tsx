"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

interface ConversionResult {
  input: {
    filename: string;
    size: number;
    mimeType: string;
  };
  output: {
    filename: string;
    downloadUrl: string;
    format: string;
    bitrate: string;
  };
  duration: number;
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
// MP4 TO MP3 COMPONENT
// ============================================================================

function Mp4ToMp3Inner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [bitrate, setBitrate] = useState("192k");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setProgress(0);
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bitrate", bitrate);

    try {
      setProgress(30);
      const response = await fetch("/api/tools/mp4-to-mp3", {
        method: "POST",
        body: formData,
      });

      setProgress(80);
      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Conversion failed");
        setProgress(0);
        return;
      }

      setProgress(100);
      setResult(data.conversion);
    } catch {
      setError("Failed to connect to server");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }, [file, bitrate]);

  const BITRATE_OPTIONS = [
    { value: "128k", label: "128 kbps (Good)" },
    { value: "192k", label: "192 kbps (Better)" },
    { value: "256k", label: "256 kbps (Best)" },
    { value: "320k", label: "320 kbps (Highest)" },
  ];

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Extract Audio"}
        description="Extract audio from MP4 videos as MP3"
        accent="cyan"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* File Upload */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                1. Select Video
              </legend>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-cyan transition-colors-fast"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4"
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
                      Click to select an MP4 video
                    </p>
                    <p className="text-xs text-content-muted mt-1">
                      Max 200MB
                    </p>
                  </div>
                )}
              </div>
            </fieldset>

            {/* Audio Quality */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                2. Audio Quality
              </legend>

              <div className="grid grid-cols-2 gap-2">
                {BITRATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBitrate(opt.value)}
                    className={`px-4 py-3 rounded-md text-sm font-medium transition-colors-fast ${
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

            {/* Progress */}
            {loading && progress > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-content-secondary">Converting...</span>
                  <span className="text-sm text-content-primary">{progress}%</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-2">
                  <div
                    className="bg-accent-cyan h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-accent-red-muted border border-accent-red rounded-md">
                <p className="text-accent-red text-sm">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-accent-green mb-4">
                  Conversion Complete
                </legend>

                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-content-muted">Original</p>
                      <p className="text-content-primary">{result.input.filename}</p>
                    </div>
                    <div>
                      <p className="text-content-muted">Size</p>
                      <p className="text-content-primary">{formatSize(result.input.size)}</p>
                    </div>
                    <div>
                      <p className="text-content-muted">Format</p>
                      <p className="text-content-primary uppercase">{result.output.format}</p>
                    </div>
                    <div>
                      <p className="text-content-muted">Bitrate</p>
                      <p className="text-content-primary">{result.output.bitrate}</p>
                    </div>
                  </div>

                  <a
                    href={result.output.downloadUrl}
                    className="mt-4 block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity"
                    download
                  >
                    Download MP3
                  </a>
                </div>
              </fieldset>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleConvert}
                disabled={!file || loading}
                className="flex-1 px-6 py-3 bg-accent-cyan text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? "Converting..." : "Extract Audio"}
              </button>

              {file && (
                <button
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
                    setProgress(0);
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

export default function Mp4ToMp3Page(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "mp4-to-mp3",
    name: "Extract Audio",
    description: "Extract audio from MP4 videos as MP3",
    category: "media",
    accent: "cyan",
    layout: "upload-center",
    enabled: true,
    route: "/media/mp4-to-mp3",
  };

  return (
    <ToolProvider tool={tool}>
      <Mp4ToMp3Inner />
    </ToolProvider>
  );
}
