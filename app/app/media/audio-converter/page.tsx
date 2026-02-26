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
  id: string;
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
  type: "audio";
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
// AUDIO FORMAT OPTIONS
// ============================================================================

const AUDIO_FORMATS: readonly FormatOption[] = [
  { value: "mp3", label: "MP3", desc: "Universal" },
  { value: "wav", label: "WAV", desc: "Uncompressed" },
  { value: "aac", label: "AAC", desc: "Apple" },
  { value: "ogg", label: "OGG", desc: "Open source" },
  { value: "flac", label: "FLAC", desc: "Lossless" },
] as const;

// ============================================================================
// AUDIO CONVERTER COMPONENT
// ============================================================================

function AudioConverterInner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState("mp3");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputFormat", outputFormat);
    formData.append("conversionType", "audio");

    try {
      const response = await fetch("/api/tools/audio-converter", {
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
  }, [file, outputFormat]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Audio Converter"}
        description="Convert audio files between formats"
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
                Select Audio
              </legend>
              <TactileDropzone
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                  setError(null);
                  setResult(null);
                }}
                accept="audio/*"
                currentFile={file}
                maxSizeLabel="Max 100MB"
                fileTypesLabel="MP3, WAV, AAC, OGG, FLAC"
              />
            </fieldset>

            {/* Output Format */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Output Format
              </legend>
              <TactileFormatGrid
                options={AUDIO_FORMATS}
                value={outputFormat}
                onChange={setOutputFormat}
              />
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
                      <p className="text-zinc-500">Original</p>
                      <p className="text-white font-medium font-mono">{result.input.filename}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Output Size</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.output.size)}</p>
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
                    Download Audio
                  </a>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {/* Primary/Secondary Action Button */}
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
                {result ? "Start Over" : loading ? "Converting..." : "Convert Audio"}
              </TactileButton>

              {/* Clear Button */}
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

export default function AudioConverterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "audio-converter",
    name: "Audio Converter",
    description: "Convert audio files between formats",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/audio-converter",
  };

  return (
    <ToolProvider tool={tool}>
      <AudioConverterInner />
    </ToolProvider>
  );
}
