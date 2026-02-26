"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const COMPRESSION_LEVELS: readonly FormatOption[] = [
  { value: "low", label: "Low", desc: "Less compression" },
  { value: "medium", label: "Medium", desc: "Balanced" },
  { value: "high", label: "High", desc: "Smallest size" },
] as const;

function PdfCompressorInner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [compression, setCompression] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    compression: {
      input: { size: number };
      output: { filename: string; downloadUrl: string; size: number; compressionRatio: string };
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("compressionLevel", compression);

    try {
      const response = await fetch("/api/tools/pdf-compressor", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Compression failed");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [file, compression]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "PDF Compressor"}
        description="Reduce PDF file size"
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

            {/* Compression Level */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Compression Level
              </legend>
              <TactileFormatGrid
                options={COMPRESSION_LEVELS}
                value={compression}
                onChange={setCompression}
              />
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
                  Compression Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Original</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.compression.input.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Compressed</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.compression.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Reduction</p>
                      <p className="text-white font-medium font-mono">{result.compression.output.compressionRatio}</p>
                    </div>
                  </div>
                  <a
                    href={result.compression.output.downloadUrl}
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                    download
                  >
                    Download Compressed PDF
                  </a>
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
                } : handleCompress}
                disabled={!file || (loading && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Compressing..." : "Compress PDF"}
              </TactileButton>

              {file && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
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

export default function PdfCompressorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "pdf-compressor",
    name: "PDF Compressor",
    description: "Reduce PDF file size",
    category: "document",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/document/pdf-compressor",
  };

  return (
    <ToolProvider tool={tool}>
      <PdfCompressorInner />
    </ToolProvider>
  );
}
