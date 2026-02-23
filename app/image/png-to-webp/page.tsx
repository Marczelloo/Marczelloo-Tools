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
    quality: number;
    size: number;
    compressionRatio: string;
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
// PNG TO WEBP COMPONENT
// ============================================================================

function PngToWebpInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(85);
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
    formData.append("quality", quality.toString());

    try {
      setProgress(30);
      const response = await fetch("/api/tools/png-to-webp", {
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
  }, [file, quality]);

  const QUALITY_PRESETS = [
    { value: 65, label: "65% - Smallest" },
    { value: 75, label: "75% - Small" },
    { value: 85, label: "85% - Balanced" },
    { value: 95, label: "95% - High Quality" },
  ];

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "PNG to WebP"}
        description="Convert PNG images to WebP format"
        accent="purple"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* File Upload */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                1. Select PNG Image
              </legend>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-purple transition-colors-fast"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png"
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
                      Click to select a PNG image
                    </p>
                    <p className="text-xs text-content-muted mt-1">
                      Max 50MB
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

              <div className="grid grid-cols-2 gap-2 mb-4">
                {QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setQuality(preset.value)}
                    className={`px-4 py-3 rounded-md text-sm font-medium transition-colors-fast ${
                      quality === preset.value
                        ? "bg-accent-purple text-background-primary"
                        : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-content-secondary">Custom Quality</span>
                  <span className="text-sm font-mono text-content-primary">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full"
                />
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
                    className="bg-accent-purple h-2 rounded-full transition-all duration-300"
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
                      <p className="text-content-muted">Original Size</p>
                      <p className="text-content-primary">{formatSize(result.input.size)}</p>
                    </div>
                    <div>
                      <p className="text-content-muted">New Size</p>
                      <p className="text-content-primary">{formatSize(result.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-content-muted">Compression</p>
                      <p className="text-accent-green font-medium">{result.output.compressionRatio}</p>
                    </div>
                    <div>
                      <p className="text-content-muted">Quality</p>
                      <p className="text-content-primary">{result.output.quality}%</p>
                    </div>
                  </div>

                  <a
                    href={result.output.downloadUrl}
                    className="mt-4 block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity"
                    download
                  >
                    Download WebP
                  </a>
                </div>
              </fieldset>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleConvert}
                disabled={!file || loading}
                className="flex-1 px-6 py-3 bg-accent-purple text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? "Converting..." : "Convert to WebP"}
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

export default function PngToWebpPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "png-to-webp",
    name: "PNG to WebP",
    description: "Convert between PNG and WebP formats",
    category: "image",
    accent: "purple",
    layout: "upload-center",
    enabled: true,
    route: "/image/png-to-webp",
  };

  return (
    <ToolProvider tool={tool}>
      <PngToWebpInner />
    </ToolProvider>
  );
}
