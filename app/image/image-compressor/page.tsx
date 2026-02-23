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

function ImageCompressorInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [quality, setQuality] = useState(85);
  const [format, setFormat] = useState("jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ compression: { input: { size: number }; output: { filename: string; downloadUrl: string; size: number; compressionRatio: string } } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setResult(null);
    }
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", quality.toString());
    formData.append("outputFormat", format);
    try {
      const response = await fetch("/api/tools/image-compressor", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Compression failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file, quality, format]);

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "Image Compressor"} description="Compress images without quality loss" accent="green" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">1. Select Image</legend>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-green transition-colors-fast">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {file ? <div>{preview && <img src={preview} alt="Preview" className="max-h-32 mx-auto mb-2 rounded" />}<p className="text-content-primary font-medium">{file.name}</p><p className="text-sm text-content-tertiary mt-1">{formatSize(file.size)}</p></div> : <div><p className="text-content-secondary">Click to select an image</p><p className="text-xs text-content-muted mt-1">Max 50MB</p></div>}
              </div>
            </fieldset>
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">2. Settings</legend>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(["jpeg", "png", "webp"] as const).map((f) => (
                  <button key={f} onClick={() => setFormat(f)} className={`px-4 py-3 rounded-md text-sm font-medium uppercase transition-colors-fast ${format === f ? "bg-accent-green text-background-primary" : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"}`}>{f}</button>
                ))}
              </div>
              <div className="flex justify-between text-sm text-content-secondary mb-2">
                <span>Quality</span>
                <span className="font-mono">{quality}%</span>
              </div>
              <input type="range" min={1} max={100} value={quality} onChange={(e) => setQuality(parseInt(e.target.value))} className="w-full" />
            </fieldset>
            {error && <div className="mb-6 p-4 bg-accent-red-muted border border-accent-red rounded-md"><p className="text-accent-red text-sm">{error}</p></div>}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-accent-green mb-4">Compression Complete</legend>
                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div><p className="text-content-muted">Original</p><p className="text-content-primary">{formatSize(result.compression.input.size)}</p></div>
                    <div><p className="text-content-muted">Compressed</p><p className="text-content-primary">{formatSize(result.compression.output.size)}</p></div>
                    <div><p className="text-content-muted">Saved</p><p className="text-accent-green font-medium">{result.compression.output.compressionRatio}</p></div>
                  </div>
                  <a href={result.compression.output.downloadUrl} className="block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity" download>Download Image</a>
                </div>
              </fieldset>
            )}
            <div className="flex gap-3">
              <button onClick={handleCompress} disabled={!file || loading} className="flex-1 px-6 py-3 bg-accent-green text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">{loading ? "Compressing..." : "Compress Image"}</button>
              {file && <button onClick={() => { setFile(null); setPreview(""); setResult(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={loading} className="px-6 py-3 bg-surface border border-border text-content-secondary font-medium rounded-md hover:bg-interactive-hover disabled:opacity-50 transition-colors-fast">Clear</button>}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function ImageCompressorPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "image-compressor", name: "Image Compressor", description: "Compress images without quality loss", category: "image", accent: "green", layout: "form-heavy", enabled: true, route: "/image/image-compressor" };
  return <ToolProvider tool={tool}><ImageCompressorInner /></ToolProvider>;
}
