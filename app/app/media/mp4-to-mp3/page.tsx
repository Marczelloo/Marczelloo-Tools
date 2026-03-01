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
    format: string;
    size: number;
    bitrate: string;
  };
  duration: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Sanitize filename by removing HTTP header artifacts
 * Handles cases like: "file.mp4_; filename_=UTF-8''file.mp4"
 */
function sanitizeFilename(filename: string): string {
  if (!filename) return "Unknown";

  // Remove common HTTP header artifacts
  let clean = filename;

  // Remove patterns like "_; filename*=" or "; filename="
  clean = clean.split(/_;?\s*filename/i)[0] ?? clean;
  clean = clean.split(/;\s*filename/i)[0] ?? clean;

  // Remove UTF-8 prefix patterns
  clean = clean.replace(/UTF-8''/i, "");

  // Trim whitespace and trailing special characters
  clean = clean.trim().replace(/[_;,\s]+$/, "");

  return clean || "Unknown";
}

// ============================================================================
// BITRATE OPTIONS
// ============================================================================

const BITRATE_OPTIONS: readonly FormatOption[] = [
  { value: "128k", label: "128 kbps", desc: "Good quality" },
  { value: "192k", label: "192 kbps", desc: "Better quality" },
  { value: "256k", label: "256 kbps", desc: "High quality" },
  { value: "320k", label: "320 kbps", desc: "Highest quality" },
] as const;

// ============================================================================
// MP4 TO MP3 COMPONENT
// ============================================================================

function Mp4ToMp3Inner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [bitrate, setBitrate] = useState("192k");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bitrate", bitrate);

    try {
      const response = await fetch("/api/tools/mp4-to-mp3", {
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
  }, [file, bitrate]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Extract Audio"}
        description="Extract audio from MP4 videos as MP3"
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
                accept="video/mp4"
                currentFile={file}
                maxSizeLabel="Max 200MB"
                fileTypesLabel="MP4"
              />
            </fieldset>

            {/* Audio Quality */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Audio Quality
              </legend>
              <TactileFormatGrid
                options={BITRATE_OPTIONS}
                value={bitrate}
                onChange={setBitrate}
                columns={4}
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
                    <div className="min-w-0">
                      <p className="text-zinc-500">Original</p>
                      <p className="text-white font-medium font-mono truncate" title={sanitizeFilename(result.input.filename)}>
                        {sanitizeFilename(result.input.filename)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Size</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Format</p>
                      <p className="text-white font-medium font-mono uppercase">{result.output.format}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Bitrate</p>
                      <p className="text-white font-medium font-mono">{result.output.bitrate}</p>
                    </div>
                  </div>
                  <a
                    href={result.output.downloadUrl}
                    download
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                  >
                    Download MP3
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
                  setLoading(false);
                } : handleConvert}
                disabled={!file || loading}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Extracting..." : "Extract Audio"}
              </TactileButton>

              {file && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
                    setLoading(false);
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

export default function Mp4ToMp3Page(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "mp4-to-mp3",
    name: "Extract Audio",
    description: "Extract audio from MP4 videos as MP3",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/mp4-to-mp3",
  };

  return (
    <ToolProvider tool={tool}>
      <Mp4ToMp3Inner />
    </ToolProvider>
  );
}
