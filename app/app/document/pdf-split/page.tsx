"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";

const MODE_OPTIONS: readonly FormatOption[] = [
  { value: "all", label: "All Pages", desc: "Split every page" },
  { value: "range", label: "Page Range", desc: "Custom range" },
] as const;

function PdfSplitInner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"all" | "range">("all");
  const [pageRange, setPageRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    split: {
      input: { totalPages: number };
      output: { files: { filename: string; pages: string; downloadUrl: string }[] };
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSplit = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    if (mode === "range" && pageRange) formData.append("pageRange", pageRange);

    try {
      const response = await fetch("/api/tools/pdf-split", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Split failed");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [file, mode, pageRange]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "PDF Split"}
        description="Split PDF into separate pages"
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
                Select PDF
              </legend>
              <TactileDropzone
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                  setError(null);
                  setResult(null);
                }}
                accept="application/pdf"
                currentFile={file}
                maxSizeLabel="Max 100MB"
                fileTypesLabel="PDF"
              />
            </fieldset>

            {/* Split Mode */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Split Mode
              </legend>
              <TactileFormatGrid
                options={MODE_OPTIONS}
                value={mode}
                onChange={(v) => setMode(v as "all" | "range")}
                columns={2}
              />

              {mode === "range" && (
                <div className="mt-4">
                  <label className="block text-sm text-zinc-400 mb-2">Page Range</label>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g., 1-3 or 1,3,5"
                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white focus:outline-none focus:border-white/30"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Use hyphens for ranges (1-3) or commas for specific pages (1,3,5)</p>
                </div>
              )}
            </fieldset>

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
                  Split Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <p className="text-sm text-zinc-400 mb-4">
                    Total pages: <span className="text-white font-mono">{result.split.input.totalPages}</span> • {result.split.output.files.length} file(s) created
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.split.output.files.map((f, i) => (
                      <a
                        key={i}
                        href={f.downloadUrl}
                        className="flex items-center justify-between p-3 bg-zinc-900 border border-white/10 rounded-md hover:bg-white/5 transition-colors"
                        download
                      >
                        <div>
                          <p className="text-sm text-white font-mono">{f.filename}</p>
                          <p className="text-xs text-zinc-500">{f.pages}</p>
                        </div>
                        <span className="text-xs text-zinc-400">Download</span>
                      </a>
                    ))}
                  </div>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <TactileButton
                onClick={result ? () => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                  setPageRange("");
                } : handleSplit}
                disabled={!file || (loading && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Splitting..." : "Split PDF"}
              </TactileButton>

              {file && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
                    setPageRange("");
                  }}
                  disabled={loading}
                >
                  Clear
                </TactileButton>
              )}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function PdfSplitPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "pdf-split",
    name: "PDF Split",
    description: "Split PDF into separate pages",
    category: "document",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/document/pdf-split",
  };

  return (
    <ToolProvider tool={tool}>
      <PdfSplitInner />
    </ToolProvider>
  );
}
