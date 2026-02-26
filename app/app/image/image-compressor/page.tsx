"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";

// ============================================================================
// TYPES
// ============================================================================

interface CompressionResult {
  input: {
    size: number;
  };
  output: {
    filename: string;
    downloadUrl: string;
    size: number;
    compressionRatio: string;
  };
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
// FORMAT OPTIONS
// ============================================================================

const FORMAT_OPTIONS: readonly FormatOption[] = [
  { value: "jpeg", label: "JPEG", desc: "Best compression" },
  { value: "png", label: "PNG", desc: "Lossless" },
  { value: "webp", label: "WebP", desc: "Modern format" },
] as const;

// ============================================================================
// IMAGE COMPRESSOR COMPONENT
// ============================================================================

function ImageCompressorInner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(85);
  const [format, setFormat] = useState("jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", quality.toString());
    formData.append("outputFormat", format);

    try {
      const response = await fetch("/api/tools/image-compressor", {
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
  }, [file, quality, format]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Image Compressor"}
        description="Compress images without quality loss"
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
                Select Image
              </legend>
              <TactileDropzone
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                  setError(null);
                  setResult(null);
                }}
                accept="image/*"
                currentFile={file}
                maxSizeLabel="Max 50MB"
                fileTypesLabel="PNG, JPEG, WebP"
              />
            </fieldset>

            {/* Format Selection */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Output Format
              </legend>
              <TactileFormatGrid
                options={FORMAT_OPTIONS}
                value={format}
                onChange={setFormat}
                columns={3}
              />
            </fieldset>

            {/* Quality Settings */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  3
                </span>
                Quality
              </legend>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {[60, 75, 85, 95].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setQuality(preset)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      quality === preset
                        ? "bg-white text-black"
                        : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Custom Quality</span>
                  <span className="text-sm font-mono text-white">{quality}%</span>
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
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Original</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.input.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Compressed</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Saved</p>
                      <p className="text-white font-medium font-mono">{result.output.compressionRatio}</p>
                    </div>
                  </div>
                  <a
                    href={result.output.downloadUrl}
                    download
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                  >
                    Download Image
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
                {result ? "Start Over" : loading ? "Compressing..." : "Compress Image"}
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

export default function ImageCompressorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "image-compressor",
    name: "Image Compressor",
    description: "Compress images without quality loss",
    category: "image",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/image/image-compressor",
  };

  return (
    <ToolProvider tool={tool}>
      <ImageCompressorInner />
    </ToolProvider>
  );
}
