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

function VolumeBoosterInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [volume, setVolume] = useState(1.5);
  const [normalize, setNormalize] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ volumeBoost: { output: { filename: string; downloadUrl: string; size: number }; settings: { volumeMultiplier: string; normalized: boolean } } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) { setFile(selectedFile); setError(null); setResult(null); }
  }, []);

  const handleBoost = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("volume", volume.toString());
    formData.append("normalize", normalize.toString());
    try {
      const response = await fetch("/api/tools/volume-booster", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Volume adjustment failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file, volume, normalize]);

  const PRESETS = [
    { value: 0.5, label: "50%", desc: "Quieter" },
    { value: 1.0, label: "100%", desc: "Original" },
    { value: 1.5, label: "150%", desc: "Moderate boost" },
    { value: 2.0, label: "200%", desc: "Double volume" },
    { value: 3.0, label: "300%", desc: "Strong boost" },
  ];

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "Volume Booster"} description="Increase audio volume levels" accent="orange" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">1. Select Audio</legend>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-orange transition-colors-fast">
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                {file ? <div><p className="text-content-primary font-medium">{file.name}</p><p className="text-sm text-content-tertiary mt-1">{formatSize(file.size)}</p></div> : <div><p className="text-content-secondary">Click to select an audio file</p><p className="text-xs text-content-muted mt-1">Max 100MB</p></div>}
              </div>
            </fieldset>
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">2. Volume Settings</legend>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PRESETS.map((p) => (
                  <button key={p.value} onClick={() => setVolume(p.value)} className={`px-4 py-3 rounded-md text-sm transition-colors-fast ${volume === p.value ? "bg-accent-orange text-background-primary" : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"}`}>
                    <span className="font-medium">{p.label}</span>
                    <span className="block text-xs opacity-75">{p.desc}</span>
                  </button>
                ))}
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-content-secondary mb-2">
                  <span>Custom Volume</span>
                  <span className="font-mono">{volume.toFixed(1)}x</span>
                </div>
                <input type="range" min={0.1} max={5} step={0.1} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full" />
              </div>
              <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
                <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} className="rounded border-border" />
                <span>Normalize audio (recommended for mixed sources)</span>
              </label>
            </fieldset>
            {error && <div className="mb-6 p-4 bg-accent-red-muted border border-accent-red rounded-md"><p className="text-accent-red text-sm">{error}</p></div>}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-accent-green mb-4">Processing Complete</legend>
                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><p className="text-content-muted">Volume</p><p className="text-content-primary">{result.volumeBoost.settings.volumeMultiplier}</p></div>
                    <div><p className="text-content-muted">Output Size</p><p className="text-content-primary">{formatSize(result.volumeBoost.output.size)}</p></div>
                  </div>
                  <a href={result.volumeBoost.output.downloadUrl} className="block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity" download>Download Audio</a>
                </div>
              </fieldset>
            )}
            <div className="flex gap-3">
              <button onClick={handleBoost} disabled={!file || loading} className="flex-1 px-6 py-3 bg-accent-orange text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">{loading ? "Processing..." : "Adjust Volume"}</button>
              {file && <button onClick={() => { setFile(null); setResult(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={loading} className="px-6 py-3 bg-surface border border-border text-content-secondary font-medium rounded-md hover:bg-interactive-hover disabled:opacity-50 transition-colors-fast">Clear</button>}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function VolumeBoosterPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "volume-booster", name: "Volume Booster", description: "Increase audio volume levels", category: "media", accent: "orange", layout: "form-heavy", enabled: true, route: "/media/volume-booster" };
  return <ToolProvider tool={tool}><VolumeBoosterInner /></ToolProvider>;
}
