"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";
import { MinimalProgress } from "@/components/tool-ui/MinimalProgress";

// ============================================================================
// TYPES
// ============================================================================

type ConversionType = "video";

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
  type: ConversionType;
}

interface ProgressData {
  progress: number;
  frame: number;
  fps: number;
  time: string;
  bitrate: string;
  speed: string;
  remainingTime?: string;
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
// VIDEO FORMAT OPTIONS
// ============================================================================

const VIDEO_FORMATS: readonly FormatOption[] = [
  { value: "mp4", label: "MP4", desc: "Universal" },
  { value: "webm", label: "WebM", desc: "Web optimized" },
  { value: "mov", label: "MOV", desc: "Apple" },
  { value: "avi", label: "AVI", desc: "Legacy" },
  { value: "mkv", label: "MKV", desc: "Matroska" },
] as const;

// ============================================================================
// VIDEO CONVERTER COMPONENT
// ============================================================================

function VideoConverterInner(): React.JSX.Element {
  const { tool } = useTool();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [conversionId, setConversionId] = useState<string | null>(null);

  // Cancel the conversion by calling the DELETE endpoint
  const cancelConversion = useCallback(async () => {
    if (conversionId) {
      try {
        await fetch(`/api/tools/video-converter/progress/${conversionId}`, {
          method: "DELETE",
        });
        console.log('[Frontend] Conversion cancelled:', conversionId);
      } catch (error) {
        console.error('[Frontend] Failed to cancel conversion:', error);
      }
    }
    // Stop polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    // Reset all state
    setConversionId(null);
    setLoading(false);
    setProgress(null);
  }, [conversionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = useCallback((id: string) => {
    console.log('[Frontend] Starting polling for ID:', id);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Poll immediately and then every 300ms
    const poll = async () => {
      try {
        const response = await fetch(`/api/tools/video-converter/progress/${id}`);
        const data = await response.json();
        console.log('[Frontend] Poll result:', data);
        if (data.success && data.progress) {
          console.log('[Frontend] Setting progress:', data.progress);
          setProgress(data.progress);

          if (data.progress.progress >= 100) {
            // Conversion complete - use result from progress store
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;

            if (data.progress.result) {
              setResult(data.progress.result);
            } else {
              // Fallback if result not in progress store
              setResult({
                id: id,
                input: { filename: file?.name || "", size: file?.size || 0 },
                output: {
                  filename: `${id}.${outputFormat}`,
                  downloadUrl: `/api/download/video-converter/${id}.${outputFormat}`,
                  format: outputFormat,
                  size: 0,
                },
                duration: 0,
                type: "video",
              } as ConversionResult);
            }
            setLoading(false);
          } else if (data.progress.progress < 0) {
            // Conversion failed
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setError("Conversion failed. Please try again.");
            setLoading(false);
          }
        }
      } catch {
        // Ignore errors, keep polling
      }
    };

    poll(); // Initial poll
    pollIntervalRef.current = setInterval(poll, 300);
  }, [file, outputFormat]);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("outputFormat", outputFormat);
    formData.append("conversionType", "video");

    try {
      const response = await fetch("/api/tools/video-converter", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Conversion failed");
        setLoading(false);
        return;
      }

      const id = data.conversion?.id;
      if (id) {
        setConversionId(id);
        // Don't set result yet - wait for polling to complete
        startPolling(id);
      } else {
        // No ID means conversion completed synchronously (shouldn't happen with video)
        setResult(data.conversion);
        setLoading(false);
      }
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [file, outputFormat, startPolling]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Video Converter"}
        description="Convert video files between formats"
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
                onFileSelect={async (selectedFile) => {
                  // Cancel any ongoing conversion first
                  if (loading && conversionId) {
                    await cancelConversion();
                  }
                  setFile(selectedFile);
                  setError(null);
                  setResult(null);
                  setProgress(null);
                  setConversionId(null);
                  setLoading(false);
                  setOutputFormat("mp4");
                  if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                  }
                }}
                accept="video/*"
                currentFile={file}
                maxSizeLabel="Max 200MB"
                fileTypesLabel="MP4, WebM, MOV, AVI, MKV"
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
                options={VIDEO_FORMATS}
                value={outputFormat}
                onChange={setOutputFormat}
              />
            </fieldset>

            {/* Progress Bar */}
            {loading && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  Converting...
                </legend>
                {progress ? (
                  <MinimalProgress
                    progress={progress.progress}
                    remainingTime={progress.remainingTime}
                    label="Video conversion progress"
                  />
                ) : (
                  <div className="bg-zinc-900/50 border border-white/10 rounded-md p-6">
                    <div className="text-center">
                      <p className="text-4xl font-light text-white font-mono tabular-nums mb-2">
                        0%
                      </p>
                      <p className="text-sm text-zinc-400 mb-4 font-mono tabular-nums">
                        Starting...
                      </p>
                      <div className="w-full bg-white/5 border border-white/10 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-white h-full rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.3)]" style={{ width: "0%" }} />
                      </div>
                    </div>
                  </div>
                )}
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
                    Download Video
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
                  setProgress(null);
                  setConversionId(null);
                  if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                  }
                } : handleConvert}
                disabled={!file || (loading && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Converting..." : "Convert Video"}
              </TactileButton>

              {/* Clear/Cancel Button */}
              {file && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={async () => {
                    if (loading) {
                      // Cancel the ongoing conversion
                      await cancelConversion();
                    }
                    // Clear all state
                    setFile(null);
                    setResult(null);
                    setError(null);
                    setProgress(null);
                    setConversionId(null);
                    setLoading(false);
                  }}
                  className={loading ? "border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5" : ""}
                >
                  {loading ? "Cancel" : "Clear"}
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

export default function VideoConverterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "video-converter",
    name: "Video Converter",
    description: "Convert video files between formats",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/video-converter",
  };

  return (
    <ToolProvider tool={tool}>
      <VideoConverterInner />
    </ToolProvider>
  );
}
