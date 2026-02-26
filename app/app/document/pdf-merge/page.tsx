"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileButton } from "@/components/tool-ui/TactileButton";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function PdfMergeInner(): React.JSX.Element {
  const { tool } = useTool();

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    merge: {
      input: { fileCount: number };
      output: { filename: string; downloadUrl: string; size: number };
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
      setError(null);
      setResult(null);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) {
      setError("Please select at least 2 PDF files");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/tools/pdf-merge", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Merge failed");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [files]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "PDF Merge"}
        description="Combine multiple PDFs into one"
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
                Select PDF Files
              </legend>
              <div
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "application/pdf";
                  input.multiple = true;
                  input.onchange = (e) => {
                    const selected = Array.from((e.target as HTMLInputElement).files || []);
                    handleFileSelect(selected);
                  };
                  input.click();
                }}
                className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:bg-white/5 hover:border-white/40 transition-all"
              >
                <p className="text-white">Click to select PDF files</p>
                <p className="text-xs text-zinc-500 mt-1">Select 2 or more PDFs • Max 100MB each</p>
              </div>
            </fieldset>

            {/* File List */}
            {files.length > 0 && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                    2
                  </span>
                  File Order ({files.length} files)
                </legend>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-zinc-900/50 border border-white/10 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-500 w-6">{index + 1}.</span>
                        <span className="text-sm text-white font-mono">{file.name}</span>
                        <span className="text-xs text-zinc-500">{formatSize(file.size)}</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-zinc-400 hover:text-white px-2 py-1 rounded text-xs transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">Files will be merged in the order shown above</p>
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
                  Merge Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Files Merged</p>
                      <p className="text-white font-medium font-mono">{result.merge.input.fileCount}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Output Size</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.merge.output.size)}</p>
                    </div>
                  </div>
                  <a
                    href={result.merge.output.downloadUrl}
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                    download
                  >
                    Download Merged PDF
                  </a>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <TactileButton
                onClick={result ? () => {
                  setFiles([]);
                  setResult(null);
                  setError(null);
                } : handleMerge}
                disabled={files.length < 2 || (loading && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Merging..." : "Merge PDFs"}
              </TactileButton>

              {files.length > 0 && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={() => setFiles([])}
                  disabled={loading}
                >
                  Clear All
                </TactileButton>
              )}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function PdfMergePage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs into one",
    category: "document",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/document/pdf-merge",
  };

  return (
    <ToolProvider tool={tool}>
      <PdfMergeInner />
    </ToolProvider>
  );
}
