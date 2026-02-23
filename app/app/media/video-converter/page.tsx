"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

type ConversionType = "video";

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
    bitrate?: string;
  };
  duration: number;
  type: ConversionType;
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
// VIDEO CONVERTER COMPONENT
// ============================================================================

function VideoConverterInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setOutputFormat("mp4");
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

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
        return;
      }

      setResult(data.conversion);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [file, outputFormat]);

  const VIDEO_FORMATS = [
    { value: "mp4", label: "MP4", desc: "Universal" },
    { value: "webm", label: "WebM", desc: "Web optimized" },
    { value: "mov", label: "MOV", desc: "Apple" },
    { value: "avi", label: "AVI", desc: "Legacy" },
    { value: "mkv", label: "MKV", desc: "Matroska" },
  ];

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
                1. Select Video
              </legend>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center cursor-pointer hover:border-white/20 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-zinc-500 mt-1">{formatSize(file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-zinc-300">Click to select a video file</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      MP4, WebM, MOV, AVI, MKV • Max 200MB
                    </p>
                  </div>
                )}
              </div>
            </fieldset>

            {/* Output Format */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                2. Output Format
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setOutputFormat(f.value)}
                    className={`px-4 py-3 rounded-md text-sm transition-colors ${
                      outputFormat === f.value
                        ? "bg-white text-black"
                        : "bg-zinc-900 border border-white/10 text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-medium">{f.label}</span>
                    <span className="block text-xs opacity-75 mt-0.5">{f.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 text-sm">{error}</p>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-zinc-200 mb-4">
                  Conversion Complete
                </legend>
                <div className="bg-zinc-900 border border-zinc-700 rounded-md p-4">
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
                    className="block w-full px-4 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 transition-colors"
                    download
                  >
                    Download Video
                  </a>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleConvert}
                disabled={!file || loading}
                className="flex-1 px-6 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Converting..." : "Convert Video"}
              </button>
              {file && (
                <button
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-zinc-900 border border-white/10 text-zinc-400 font-medium rounded-md hover:bg-white/5 hover:text-white disabled:opacity-50 transition-colors"
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
