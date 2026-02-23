"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function BackgroundRemoverInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ removal: { output: { filename: string; downloadUrl: string; size: number } } } | null>(null);
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

  const handleRemove = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/tools/background-remover", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Background removal failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file]);

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "Background Remover"} description="Remove background from images" accent="pink" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">Select Image</legend>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-pink transition-colors-fast">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {file ? (
                  <div>
                    {preview && <img src={preview} alt="Preview" className="max-h-48 mx-auto mb-3 rounded" />}
                    <p className="text-content-primary font-medium">{file.name}</p>
                    <p className="text-sm text-content-tertiary">{formatSize(file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-content-secondary">Click to select an image</p>
                    <p className="text-xs text-content-muted mt-1">PNG, JPG, WebP • Max 20MB</p>
                  </div>
                )}
              </div>
            </fieldset>
            <div className="bg-surface-muted rounded-md p-4 mb-6">
              <p className="text-sm text-content-muted">
                <strong>Note:</strong> Background removal works best with images that have clear subject separation.
                Results are output as PNG with transparency.
              </p>
            </div>
            {error && <div className="mb-6 p-4 bg-accent-red-muted border border-accent-red rounded-md"><p className="text-accent-red text-sm">{error}</p></div>}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-accent-green mb-4">Background Removed</legend>
                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><p className="text-content-muted">Output Size</p><p className="text-content-primary">{formatSize(result.removal.output.size)}</p></div>
                    <div><p className="text-content-muted">Format</p><p className="text-content-primary">PNG (with transparency)</p></div>
                  </div>
                  <a href={result.removal.output.downloadUrl} className="block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity" download>Download Image</a>
                </div>
              </fieldset>
            )}
            <div className="flex gap-3">
              <button onClick={handleRemove} disabled={!file || loading} className="flex-1 px-6 py-3 bg-accent-pink text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                {loading ? "Processing..." : "Remove Background"}
              </button>
              {file && <button onClick={() => { setFile(null); setPreview(""); setResult(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={loading} className="px-6 py-3 bg-surface border border-border text-content-secondary font-medium rounded-md hover:bg-interactive-hover disabled:opacity-50 transition-colors-fast">Clear</button>}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function BackgroundRemoverPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "background-remover", name: "Background Remover", description: "Remove background from images", category: "image", accent: "pink", layout: "upload-center", enabled: true, route: "/image/background-remover" };
  return <ToolProvider tool={tool}><BackgroundRemoverInner /></ToolProvider>;
}
