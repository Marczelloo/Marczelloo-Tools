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

const LANGUAGE_OPTIONS: readonly FormatOption[] = [
  { value: "eng", label: "English", desc: "" },
  { value: "spa", label: "Spanish", desc: "" },
  { value: "fra", label: "French", desc: "" },
  { value: "deu", label: "German", desc: "" },
  { value: "ita", label: "Italian", desc: "" },
  { value: "chi_sim", label: "Chinese", desc: "Simplified" },
  { value: "jpn", label: "Japanese", desc: "" },
] as const;

function OcrInner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [language, setLanguage] = useState("eng");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ocr: {
      input: { filename: string };
      output: { text: string; confidence: number; wordCount: number };
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOcr = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      const response = await fetch("/api/tools/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "OCR failed");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [file, language]);

  const copyText = useCallback(async () => {
    if (result?.ocr.output.text) {
      await navigator.clipboard.writeText(result.ocr.output.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "OCR"}
        description="Extract text from images"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Input */}
            <div>
              <Surface variant="elevated" padding="lg">
                {/* Language Selection */}
                <div className="mb-4">
                  <label className="block text-sm text-zinc-400 mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white focus:outline-none focus:border-white/30"
                  >
                    {LANGUAGE_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label} {l.desc && `(${l.desc})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <TactileDropzone
                  onFileSelect={(selectedFile) => {
                    setFile(selectedFile);
                    setPreview(URL.createObjectURL(selectedFile));
                    setError(null);
                    setResult(null);
                  }}
                  accept="image/*"
                  currentFile={file}
                  maxSizeLabel="Max 50MB"
                  fileTypesLabel="PNG, JPG, WebP"
                />

                {/* Preview */}
                {preview && (
                  <div className="mt-4">
                    <img src={preview} alt="Preview" className="w-full rounded-md border border-white/10" />
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-700 rounded-md">
                    <p className="text-zinc-300 text-sm">{error}</p>
                  </div>
                )}

                {/* Convert Button */}
                <TactileButton
                  onClick={handleOcr}
                  disabled={!file || loading}
                  loading={loading}
                  fullWidth
                  className="mt-4"
                >
                  {loading ? "Processing..." : "Extract Text"}
                </TactileButton>
              </Surface>
            </div>

            {/* Right Column - Output */}
            <div>
              <Surface variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Extracted Text</h2>
                  <button
                    onClick={copyText}
                    disabled={!result}
                    className={`px-4 py-2 text-sm rounded transition-colors ${
                      copied
                        ? "bg-white text-black"
                        : "bg-zinc-900 border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Stats */}
                {result && (
                  <div className="flex gap-4 text-sm text-zinc-400 mb-4 pb-4 border-b border-white/10">
                    <span>Confidence: <span className="text-white font-mono">{result.ocr.output.confidence}%</span></span>
                    <span>Words: <span className="text-white font-mono">{result.ocr.output.wordCount}</span></span>
                </div>
                )}

                {/* Text Output */}
                <div className="min-h-[300px] max-h-[500px] overflow-y-auto bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  {result ? (
                    <pre className="whitespace-pre-wrap text-sm text-white font-sans">
                      {result.ocr.output.text || "No text detected"}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                      Extracted text will appear here
                    </div>
                  )}
                </div>
              </Surface>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}

export default function OcrPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "ocr",
    name: "OCR",
    description: "Extract text from images",
    category: "document",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/document/ocr",
  };

  return (
    <ToolProvider tool={tool}>
      <OcrInner />
    </ToolProvider>
  );
}
