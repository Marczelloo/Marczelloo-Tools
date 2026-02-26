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

interface ConversionResult {
  input: {
    filename: string;
    size: number;
  };
  output: {
    filename: string;
    downloadUrl: string;
    size: number;
    quality: number;
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
// QUALITY OPTIONS
// ============================================================================

const QUALITY_OPTIONS: readonly FormatOption[] = [
  { value: "65", label: "65%", desc: "Smallest size" },
  { value: "75", label: "75%", desc: "Small size" },
  { value: "85", label: "85%", desc: "Balanced" },
  { value: "95", label: "95%", desc: "High quality" },
] as const;

// ============================================================================
// PNG TO WEBP COMPONENT
// ============================================================================

function PngToWebpInner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(85);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", quality.toString());

    try {
      const response = await fetch("/api/tools/png-to-webp", {
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
  }, [file, quality]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "PNG to WebP"}
        description="Convert PNG images to WebP format"
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
                Select PNG Image
              </legend>
              <TactileDropzone
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                  setError(null);
                  setResult(null);
                }}
                accept="image/png"
                currentFile={file}
                maxSizeLabel="Max 50MB"
                fileTypesLabel="PNG"
              />
            </fieldset>

            {/* Quality Settings */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Quality Settings
              </legend>
              <TactileFormatGrid
                options={QUALITY_OPTIONS}
                value={quality.toString()}
                onChange={(v) => setQuality(parseInt(v))}
                columns={4}
              />

              <div className="mt-4">
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
                  Conversion Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Original Size</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.input.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">New Size</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Compression</p>
                      <p className="text-white font-medium font-mono">{result.output.compressionRatio}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Quality</p>
                      <p className="text-white font-medium font-mono">{result.output.quality}%</p>
                    </div>
                  </div>
                  <a
                    href={result.output.downloadUrl}
                    download
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                  >
                    Download WebP
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
                {result ? "Start Over" : loading ? "Converting..." : "Convert to WebP"}
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

export default function PngToWebpPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "png-to-webp",
    name: "PNG to WebP",
    description: "Convert between PNG and WebP formats",
    category: "image",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/image/png-to-webp",
  };

  return (
    <ToolProvider tool={tool}>
      <PngToWebpInner />
    </ToolProvider>
  );
}
