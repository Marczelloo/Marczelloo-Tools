"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function AudioCompressorInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ compression: { output: { filename: string; downloadUrl: string; size: number; compressionRatio: string } } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) { setFile(selectedFile); setError(null); setResult(null); }
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", quality);
    try {
      const response = await fetch("/api/tools/audio-compressor", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Compression failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file, quality]);

  const QUALITY_OPTIONS = [
    { value: "low" as const, label: "Low", bitrate: "64 kbps", desc: "Smallest file" },
    { value: "medium" as const, label: "Medium", bitrate: "128 kbps", desc: "Balanced" },
    { value: "high" as const, label: "High", bitrate: "192 kbps", desc: "Best quality" },
  ];

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "Audio Compressor"} description="Compress audio files to reduce size" accent="purple" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">1. Select Audio</legend>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-purple transition-colors-fast">
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                {file ? <div><p className="text-content-primary font-medium">{file.name}</p><p className="text-sm text-content-tertiary mt-1">{formatSize(file.size)}</p></div> : <div><p className="text-content-secondary">Click to select an audio file</p><p className="text-xs text-content-muted mt-1">Max 100MB</p></div>}
              </div>
            </fieldset>
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">2. Quality Settings</legend>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((q) => (
                  <button key={q.value} onClick={() => setQuality(q.value)} className={`px-4 py-3 rounded-md text-sm transition-colors-fast ${quality === q.value ? "bg-accent-purple text-background-primary" : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"}`}>
                    <span className="font-medium">{q.label}</span>
                    <span className="block text-xs opacity-75">{q.bitrate}</span>
                    <span className="block text-xs opacity-50">{q.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {error && <div className="mb-6 p-4 bg-accent-red-muted border border-accent-red rounded-md"><p className="text-accent-red text-sm">{error}</p></div>}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-accent-green mb-4">Compression Complete</legend>
                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><p className="text-content-muted">New Size</p><p className="text-content-primary">{formatSize(result.compression.output.size)}</p></div>
                    <div><p className="text-content-muted">Reduction</p><p className="text-accent-green font-medium">{result.compression.output.compressionRatio}</p></div>
                  </div>
                  <a href={result.compression.output.downloadUrl} className="block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity" download>Download Audio</a>
                </div>
              </fieldset>
            )}
            <div className="flex gap-3">
              <button onClick={handleCompress} disabled={!file || loading} className="flex-1 px-6 py-3 bg-accent-purple text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">{loading ? "Compressing..." : "Compress Audio"}</button>
              {file && <button onClick={() => { setFile(null); setResult(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={loading} className="px-6 py-3 bg-surface border border-border text-content-secondary font-medium rounded-md hover:bg-interactive-hover disabled:opacity-50 transition-colors-fast">Clear</button>}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function AudioCompressorPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "audio-compressor", name: "Audio Compressor", description: "Compress audio files to reduce size", category: "media", accent: "purple", layout: "form-heavy", enabled: true, route: "/media/audio-compressor" };
  return <ToolProvider tool={tool}><AudioCompressorInner /></ToolProvider>;
}
