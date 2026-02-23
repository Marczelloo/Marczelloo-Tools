"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { FileDropZone } from "@/components/tool-ui/FileDropZone";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { Download, RefreshCw } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface ConversionResult {
  input: {
    filename: string;
    size: number;
    mimeType: string;
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

const FORMAT_INFO: Record<
  OutputFormat,
  { label: string; extension: string; description: string; supportsQuality: boolean }
> = {
  png: {
    label: "PNG",
    extension: "png",
    description: "Lossless compression, transparency support",
    supportsQuality: false,
  },
  webp: {
    label: "WebP",
    extension: "webp",
    description: "Modern format, excellent compression",
    supportsQuality: true,
  },
  jpeg: {
    label: "JPEG",
    extension: "jpg",
    description: "Best for photos, widespread support",
    supportsQuality: true,
  },
  gif: {
    label: "GIF",
    extension: "gif",
    description: "Animated images, 256 colors",
    supportsQuality: false,
  },
  bmp: {
    label: "BMP",
    extension: "bmp",
    description: "Uncompressed, Windows compatibility",
    supportsQuality: false,
  },
  tiff: {
    label: "TIFF",
    extension: "tiff",
    description: "High quality, print usage",
    supportsQuality: false,
  },
};

const SUPPORTED_INPUT_FORMATS = [
  "PNG", "WebP", "JPEG", "JPG", "GIF", "BMP", "TIFF", "TIF"
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
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setProgress(0);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputFormat", outputFormat);
    formData.append("quality", quality.toString());

    try {
      setProgress(30);
      const response = await fetch("/api/tools/image-converter", {
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
  }, [file, outputFormat, quality]);

  const handleClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  const currentFormatInfo = FORMAT_INFO[outputFormat];
  const sizeChangeNum = result ? parseFloat(result.output.sizeChange) : 0;
  const isSmaller = sizeChangeNum < 0;

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={tool?.name ?? "Image Converter"}
        description="Convert images between different formats"
        accent="purple"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* File Upload */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                1. Select Image
              </legend>

              <FileDropZone
                onFileSelect={handleFileSelect}
                accept={SUPPORTED_INPUT_FORMATS.map(f => `.${f.toLowerCase()}`).join(",")}
                maxSize={50 * 1024 * 1024}
                fileType="image"
                maxFileSizeLabel="Max 50MB"
                currentFile={file}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {SUPPORTED_INPUT_FORMATS.slice(0, 8).map(fmt => (
                  <span
                    key={fmt}
                    className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs text-zinc-500"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </fieldset>

            {/* Output Format Selection */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                2. Select Output Format
              </legend>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FORMAT_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setOutputFormat(key as OutputFormat)}
                    className={`p-4 rounded-md text-left transition-colors-fast ${
                      outputFormat === key
                        ? "bg-white text-black"
                        : "bg-zinc-900 border border-white/10 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${outputFormat === key ? "text-black" : "text-white"}`}>
                        {info.label}
                      </span>
                      {outputFormat === key && (
                        <span className="w-2 h-2 bg-black rounded-full" />
                      )}
                    </div>
                    <p className={`text-xs ${outputFormat === key ? "text-zinc-600" : "text-zinc-500"}`}>
                      {info.description}
                    </p>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Quality Settings (for formats that support it) */}
            {currentFormatInfo.supportsQuality && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  3. Quality Settings
                </legend>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[60, 75, 85, 95].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setQuality(preset)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors-fast ${
                        quality === preset
                          ? "bg-white text-black"
                          : "bg-zinc-900 border border-white/10 text-zinc-400 hover:bg-zinc-800 hover:text-white"
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

            {/* Progress */}
            {loading && progress > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Converting...</span>
                  <span className="text-sm text-white">{progress}%</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 text-sm">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  Conversion Complete
                </legend>

                <div className="bg-zinc-900 border border-zinc-600 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Original</p>
                      <p className="text-white">{result.input.filename}</p>
                      <p className="text-zinc-400 text-xs">{formatSize(result.input.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Converted</p>
                      <p className="text-white">{result.output.filename}</p>
                      <p className="text-zinc-400 text-xs">{formatSize(result.output.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-white/10">
                    <span className="text-sm text-zinc-400">Size Change</span>
                    <span className={`text-sm font-medium ${isSmaller ? "text-zinc-200" : "text-zinc-400"}`}>
                      {isSmaller ? "-" : "+"}{Math.abs(sizeChangeNum).toFixed(1)}%
                    </span>
                  </div>

                  {result.output.quality && (
                    <div className="flex items-center justify-between py-3 border-t border-white/10">
                      <span className="text-sm text-zinc-400">Quality</span>
                      <span className="text-sm text-white">{result.output.quality}%</span>
                    </div>
                  )}

                  <a
                    href={result.output.downloadUrl}
                    className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 transition-colors"
                    download
                  >
                    <Download className="w-4 h-4" />
                    Download {currentFormatInfo.label}
                  </a>
                </div>
              </fieldset>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleConvert}
                disabled={!file || loading}
                className="flex-1 px-6 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Converting...
                  </span>
                ) : (
                  `Convert to ${currentFormatInfo.label}`
                )}
              </button>

              {file && (
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="px-6 py-3 bg-zinc-900 border border-white/10 text-zinc-400 font-medium rounded-md hover:bg-zinc-800 hover:text-white disabled:opacity-50 transition-colors-fast"
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

export default function ImageConverterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "image-converter",
    name: "Image Converter",
    description: "Convert images between different formats",
    category: "image",
    accent: "purple",
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
