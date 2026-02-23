"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function PdfSplitInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"all" | "range">("all");
  const [pageRange, setPageRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ split: { input: { totalPages: number }; output: { files: { filename: string; pages: string; downloadUrl: string }[]; sessionId: string } } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) { setFile(selectedFile); setError(null); setResult(null); }
  }, []);

  const handleSplit = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    if (mode === "range" && pageRange) formData.append("pageRange", pageRange);
    try {
      const response = await fetch("/api/tools/pdf-split", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Split failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file, mode, pageRange]);

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      <PageHeader title={tool?.name ?? "PDF Split"} description="Split PDF into separate pages" accent="red" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        <div className="flex flex-col border-r border-border">
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background-secondary"><span className="text-xs font-semibold text-content-muted uppercase tracking-wider">Input</span></div>
          <div className="flex-1 p-6">
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-red transition-colors-fast mb-6">
              <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
              {file ? <div><p className="text-content-primary font-medium">{file.name}</p><p className="text-sm text-content-tertiary">{formatSize(file.size)}</p></div> : <div><p className="text-content-secondary">Click to select a PDF</p><p className="text-xs text-content-muted">Max 100MB</p></div>}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-content-secondary mb-2">Split Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode("all")} className={`px-4 py-3 rounded-md text-sm ${mode === "all" ? "bg-accent-red text-background-primary" : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"}`}>All Pages</button>
                  <button onClick={() => setMode("range")} className={`px-4 py-3 rounded-md text-sm ${mode === "range" ? "bg-accent-red text-background-primary" : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"}`}>Page Range</button>
                </div>
              </div>
              {mode === "range" && (
                <div>
                  <label className="block text-sm text-content-secondary mb-2">Page Range</label>
                  <input type="text" value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="e.g., 1-3 or 1,3,5" className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary" />
                  <p className="text-xs text-content-muted mt-1">Use hyphens for ranges (1-3) or commas for specific pages (1,3,5)</p>
                </div>
              )}
            </div>
            {error && <div className="mt-4 p-4 bg-accent-red-muted border border-accent-red rounded-md"><p className="text-accent-red text-sm">{error}</p></div>}
            <div className="mt-6">
              <button onClick={handleSplit} disabled={!file || loading} className="w-full px-6 py-3 bg-accent-red text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">{loading ? "Splitting..." : "Split PDF"}</button>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background-secondary"><span className="text-xs font-semibold text-content-muted uppercase tracking-wider">Output</span></div>
          <div className="flex-1 p-6 overflow-auto">
            {result ? (
              <div className="space-y-3">
                <p className="text-sm text-content-muted">Total pages: {result.split.input.totalPages} • {result.split.output.files.length} file(s) created</p>
                {result.split.output.files.map((f, i) => (
                  <a key={i} href={f.downloadUrl} className="flex items-center justify-between p-3 bg-surface-muted rounded-md hover:bg-interactive-hover transition-colors-fast" download>
                    <div>
                      <p className="text-sm text-content-primary">{f.filename}</p>
                      <p className="text-xs text-content-muted">{f.pages}</p>
                    </div>
                    <span className="text-xs text-accent-red">Download</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-content-muted">Split output will appear here</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PdfSplitPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "pdf-split", name: "PDF Split", description: "Split PDF into separate pages", category: "document", accent: "red", layout: "split-panel", enabled: true, route: "/document/pdf-split" };
  return <ToolProvider tool={tool}><PdfSplitInner /></ToolProvider>;
}
