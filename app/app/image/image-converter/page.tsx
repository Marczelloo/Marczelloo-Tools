"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";
import { Download } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface ConversionResult {
  input: {
    filename: string;
    size: number;
    format: string;
  };
  output: {
    filename: string;
    downloadUrl: string;
    format: string;
    quality: number | null;
    size: number;
    sizeChange: string;
  };
  duration: number;
}

type OutputFormat = "png" | "webp" | "jpeg" | "gif" | "bmp" | "tiff";

// ============================================================================
// FORMAT CONFIG
// ============================================================================

const FORMAT_OPTIONS: readonly FormatOption[] = [
  { value: "webp", label: "WebP", desc: "Modern, excellent" },
  { value: "png", label: "PNG", desc: "Lossless" },
  { value: "jpeg", label: "JPEG", desc: "Best for photos" },
  { value: "gif", label: "GIF", desc: "Animated" },
  { value: "bmp", label: "BMP", desc: "Uncompressed" },
  { value: "tiff", label: "TIFF", desc: "Print quality" },
] as const;

const FORMATS_WITH_QUALITY: readonly OutputFormat[] = ["webp", "jpeg"] as const;

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
// IMAGE CONVERTER COMPONENT
// ============================================================================

function ImageConverterInner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState(85);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supportsQuality = FORMATS_WITH_QUALITY.includes(outputFormat);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputFormat", outputFormat);
    formData.append("quality", quality.toString());

    try {
      const response = await fetch("/api/tools/image-converter", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Conversion failed");
        setLoading(false);
        return;
      }

      setResult(data.conversion);
      setLoading(false);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [file, outputFormat, quality]);

  const sizeChangeNum = result ? parseFloat(result.output.sizeChange) : 0;
  const isSmaller = sizeChangeNum < 0;

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Image Converter"}
        description="Convert images between different formats"
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
                fileTypesLabel="PNG, WebP, JPEG, GIF, BMP, TIFF"
              />
            </fieldset>

            {/* Output Format Selection */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Output Format
              </legend>
              <TactileFormatGrid
                options={FORMAT_OPTIONS}
                value={outputFormat}
                onChange={(v) => setOutputFormat(v as OutputFormat)}
                columns={3}
              />
            </fieldset>

            {/* Quality Settings (for formats that support it) */}
            {supportsQuality && (
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
                  Conversion Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Original</p>
                      <p className="text-white font-medium font-mono">{result.input.filename}</p>
                      <p className="text-zinc-400 text-xs font-mono">{formatSize(result.input.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Converted</p>
                      <p className="text-white font-medium font-mono">{result.output.filename}</p>
                      <p className="text-zinc-400 text-xs font-mono">{formatSize(result.output.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-white/10">
                    <span className="text-sm text-zinc-500">Size Change</span>
                    <span className={`text-sm font-medium font-mono ${isSmaller ? "text-white" : "text-zinc-400"}`}>
                      {isSmaller ? "-" : "+"}{Math.abs(sizeChangeNum).toFixed(1)}%
                    </span>
                  </div>

                  {result.output.quality && (
                    <div className="flex items-center justify-between py-3 border-t border-white/10">
                      <span className="text-sm text-zinc-500">Quality</span>
                      <span className="text-sm text-white font-mono">{result.output.quality}%</span>
                    </div>
                  )}

                  <a
                    href={result.output.downloadUrl}
                    className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                    download
                  >
                    <Download className="w-4 h-4" />
                    Download {FORMAT_OPTIONS.find(f => f.value === outputFormat)?.label}
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
                } : handleConvert}
                disabled={!file || (loading && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Converting..." : `Convert to ${FORMAT_OPTIONS.find(f => f.value === outputFormat)?.label}`}
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

export default function ImageConverterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "image-converter",
    name: "Image Converter",
    description: "Convert images between different formats",
    category: "image",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/image/image-converter",
  };

  return (
    <ToolProvider tool={tool}>
      <ImageConverterInner />
    </ToolProvider>
  );
}
