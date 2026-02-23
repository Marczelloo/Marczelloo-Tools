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

function PdfCompressorInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ compression: { input: { size: number }; output: { filename: string; downloadUrl: string; size: number; compressionRatio: string } } } | null>(null);
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
    try {
      const response = await fetch("/api/tools/pdf-compressor", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Compression failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file]);

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "PDF Compressor"} description="Reduce PDF file size" accent="red" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">1. Select PDF</legend>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-red transition-colors-fast">
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
                {file ? <div><p className="text-content-primary font-medium">{file.name}</p><p className="text-sm text-content-tertiary">{formatSize(file.size)}</p></div> : <div><p className="text-content-secondary">Click to select a PDF file</p><p className="text-xs text-content-muted">Max 100MB</p></div>}
              </div>
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
                  <a href={result.compression.output.downloadUrl} className="block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity" download>Download PDF</a>
                </div>
              </fieldset>
            )}
            <div className="flex gap-3">
              <button onClick={handleCompress} disabled={!file || loading} className="flex-1 px-6 py-3 bg-accent-red text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">{loading ? "Compressing..." : "Compress PDF"}</button>
              {file && <button onClick={() => { setFile(null); setResult(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={loading} className="px-6 py-3 bg-surface border border-border text-content-secondary font-medium rounded-md hover:bg-interactive-hover disabled:opacity-50 transition-colors-fast">Clear</button>}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function PdfCompressorPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "pdf-compressor", name: "PDF Compressor", description: "Reduce PDF file size", category: "document", accent: "red", layout: "form-heavy", enabled: true, route: "/document/pdf-compressor" };
  return <ToolProvider tool={tool}><PdfCompressorInner /></ToolProvider>;
}
