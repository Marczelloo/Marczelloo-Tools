"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import { MediaTimeline, FileDropZone } from "@/components/tool-ui";
import type { ToolDefinition } from "@/lib/featureFlags";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function AudioTrimmerInner(): React.JSX.Element {
  const { tool } = useTool();
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [outputFormat, setOutputFormat] = useState("mp3");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    trim: {
      output: { filename: string; downloadUrl: string; size: number; format: string };
      settings: { startTime: string; endTime: string };
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setStartTime(0);
    setEndTime(0);
  }, []);

  const handleTrim = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("startTime", formatTime(startTime));
    formData.append("outputFormat", outputFormat);
    if (endTime > 0) formData.append("endTime", formatTime(endTime));
    try {
      const response = await fetch("/api/tools/audio-trimmer", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Trim failed");
      else setResult(data);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [file, startTime, endTime, outputFormat]);

  const handleClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setStartTime(0);
    setEndTime(0);
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Audio Trimmer"}
        description="Trim and cut audio files"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                1. Select Audio
              </legend>
              <FileDropZone
                onFileSelect={handleFileSelect}
                fileType="audio"
                currentFile={file}
              />
            </fieldset>

            {file && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  2. Trim Settings
                </legend>
                <MediaTimeline
                  file={file}
                  type="audio"
                  startTime={startTime}
                  endTime={endTime}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                />
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  Drag the START and END handles to select your trim range
                </p>
              </fieldset>
            )}

            {file && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  3. Output Format
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "mp3", label: "MP3" },
                    { value: "wav", label: "WAV" },
                    { value: "aac", label: "AAC" },
                  ].map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setOutputFormat(f.value)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        outputFormat === f.value
                          ? "bg-white text-black"
                          : "bg-zinc-900 border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {error && (
              <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 text-sm">{error}</p>
              </div>
            )}

            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-zinc-200 mb-4">
                  Trim Complete
                </legend>
                <div className="bg-zinc-900 border border-zinc-700 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Trimmed</p>
                      <p className="text-zinc-200">
                        {result.trim.settings.startTime} to {result.trim.settings.endTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Output</p>
                      <p className="text-zinc-200">
                        {formatSize(result.trim.output.size)} • {result.trim.output.format.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={result.trim.output.downloadUrl}
                    className="block w-full px-4 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 transition-colors"
                    download
                  >
                    Download Audio
                  </a>
                </div>
              </fieldset>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleTrim}
                disabled={!file || loading || endTime <= startTime}
                className="flex-1 px-6 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Trimming..." : "Trim Audio"}
              </button>
              {file && (
                <button
                  onClick={handleClear}
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

export default function AudioTrimmerPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "audio-trimmer",
    name: "Audio Trimmer",
    description: "Trim and cut audio files",
    category: "media",
    accent: "purple",
    layout: "split-panel",
    enabled: true,
    route: "/media/audio-trimmer",
  };
  return (
    <ToolProvider tool={tool}>
      <AudioTrimmerInner />
    </ToolProvider>
  );
}
