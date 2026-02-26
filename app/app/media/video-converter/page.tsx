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
  const [, setConversionId] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = useCallback((id: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Poll immediately and then every 300ms
    const poll = async () => {
      try {
        const response = await fetch(`/api/tools/video-converter/progress/${id}`);
        const data = await response.json();
        if (data.success && data.progress) {
          setProgress(data.progress);
          if (data.progress.progress >= 100) {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setLoading(false);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    poll(); // Initial poll
    pollIntervalRef.current = setInterval(poll, 300);
  }, []);

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
        setResult(data.conversion);
        startPolling(id);
      } else {
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
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                  setError(null);
                  setResult(null);
                  setProgress(null);
                  setConversionId(null);
                  setOutputFormat("mp4");
                  if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                  }
                }}
                accept="video/*"
                maxSize={200 * 1024 * 1024}
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
                    time={progress.time}
                    label="Video conversion progress"
                  />
                ) : (
                  <div className="bg-zinc-900/50 border border-white/10 rounded-md p-6">
                    <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                      <div className="bg-white h-full rounded-full animate-pulse" style={{ width: "30%" }} />
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
                      <p className="text-white font-medium">{result.input.filename}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Output Size</p>
                      <p className="text-white font-medium">{formatSize(result.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Format</p>
                      <p className="text-white font-medium uppercase">{result.output.format}</p>
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
            <div className="flex gap-3">
              <TactileButton
                onClick={handleConvert}
                disabled={!file || loading}
                loading={loading}
                fullWidth
              >
                {loading ? "Converting..." : "Convert Video"}
              </TactileButton>
              {file && (
                <TactileButton
                  variant="secondary"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
                    setProgress(null);
                    setConversionId(null);
                    if (pollIntervalRef.current) {
                      clearInterval(pollIntervalRef.current);
                      pollIntervalRef.current = null;
                    }
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

export default function VideoConverterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "video-converter",
    name: "Video Converter",
    description: "Convert video files between formats",
    category: "media",
    accent: "cyan",
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
