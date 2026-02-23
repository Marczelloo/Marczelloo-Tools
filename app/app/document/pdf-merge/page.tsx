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

function PdfMergeInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ merge: { input: { fileCount: number }; output: { filename: string; downloadUrl: string; size: number } } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
      setError(null);
      setResult(null);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) {
      setError("Please select at least 2 PDF files");
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    try {
      const response = await fetch("/api/tools/pdf-merge", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Merge failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [files]);

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "PDF Merge"} description="Combine multiple PDFs into one" accent="red" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">1. Select PDF Files</legend>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-red transition-colors-fast">
                <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={handleFileChange} className="hidden" />
                <p className="text-content-secondary">Click to select PDF files</p>
                <p className="text-xs text-content-muted mt-1">Select 2 or more PDFs • Max 100MB each</p>
              </div>
            </fieldset>
            {files.length > 0 && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-content-primary mb-4">2. File Order ({files.length} files)</legend>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-surface-muted rounded-md">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-content-muted w-6">{index + 1}.</span>
                        <span className="text-sm text-content-primary">{file.name}</span>
                        <span className="text-xs text-content-muted">{formatSize(file.size)}</span>
                      </div>
                      <button onClick={() => removeFile(index)} className="text-accent-red hover:bg-accent-red-muted px-2 py-1 rounded text-xs transition-colors-fast">Remove</button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-content-muted mt-2">Files will be merged in the order shown above</p>
              </fieldset>
            )}
            {error && <div className="mb-6 p-4 bg-accent-red-muted border border-accent-red rounded-md"><p className="text-accent-red text-sm">{error}</p></div>}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-accent-green mb-4">Merge Complete</legend>
                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><p className="text-content-muted">Files Merged</p><p className="text-content-primary">{result.merge.input.fileCount}</p></div>
                    <div><p className="text-content-muted">Output Size</p><p className="text-content-primary">{formatSize(result.merge.output.size)}</p></div>
                  </div>
                  <a href={result.merge.output.downloadUrl} className="block w-full px-4 py-3 bg-accent-green text-background-primary font-medium text-center rounded-md hover:opacity-90 transition-opacity" download>Download Merged PDF</a>
                </div>
              </fieldset>
            )}
            <div className="flex gap-3">
              <button onClick={handleMerge} disabled={files.length < 2 || loading} className="flex-1 px-6 py-3 bg-accent-red text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">{loading ? "Merging..." : "Merge PDFs"}</button>
              {files.length > 0 && <button onClick={() => setFiles([])} disabled={loading} className="px-6 py-3 bg-surface border border-border text-content-secondary font-medium rounded-md hover:bg-interactive-hover disabled:opacity-50 transition-colors-fast">Clear All</button>}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function PdfMergePage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "pdf-merge", name: "PDF Merge", description: "Combine multiple PDFs into one", category: "document", accent: "red", layout: "upload-center", enabled: true, route: "/document/pdf-merge" };
  return <ToolProvider tool={tool}><PdfMergeInner /></ToolProvider>;
}
