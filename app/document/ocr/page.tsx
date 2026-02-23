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

function OcrInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [language, setLanguage] = useState("eng");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ocr: { input: { filename: string }; output: { text: string; confidence: number; wordCount: number } } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setResult(null);
    }
  }, []);

  const handleOcr = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    try {
      const response = await fetch("/api/tools/ocr", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "OCR failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file, language]);

  const copyText = useCallback(async () => {
    if (result?.ocr.output.text) {
      await navigator.clipboard.writeText(result.ocr.output.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const LANGUAGES = [
    { value: "eng", label: "English" },
    { value: "spa", label: "Spanish" },
    { value: "fra", label: "French" },
    { value: "deu", label: "German" },
    { value: "ita", label: "Italian" },
    { value: "por", label: "Portuguese" },
    { value: "chi_sim", label: "Chinese (Simplified)" },
    { value: "jpn", label: "Japanese" },
  ];

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      <PageHeader title={tool?.name ?? "OCR"} description="Extract text from images and PDFs" accent="yellow" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        <div className="flex flex-col border-r border-border">
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background-secondary flex items-center justify-between">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">Input</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-2 py-1 bg-surface border border-border rounded text-xs text-content-primary">
              {LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
            </select>
          </div>
          <div className="flex-1 p-6 flex flex-col">
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent-yellow transition-colors-fast mb-4">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div>
                  {preview && <img src={preview} alt="Preview" className="max-h-40 mx-auto mb-2 rounded" />}
                  <p className="text-content-primary font-medium">{file.name}</p>
                  <p className="text-sm text-content-tertiary">{formatSize(file.size)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-content-secondary">Click to select an image</p>
                  <p className="text-xs text-content-muted">PNG, JPG, WebP • Max 50MB</p>
                </div>
              )}
            </div>
            {error && <div className="p-4 bg-accent-red-muted border border-accent-red rounded-md mb-4"><p className="text-accent-red text-sm">{error}</p></div>}
            <button onClick={handleOcr} disabled={!file || loading} className="w-full px-6 py-3 bg-accent-yellow text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">{loading ? "Processing..." : "Extract Text"}</button>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background-secondary flex items-center justify-between">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">Extracted Text</span>
            <button onClick={copyText} disabled={!result} className={`px-3 py-1 text-xs rounded transition-colors-fast ${copied ? "bg-accent-green text-background-primary" : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover disabled:opacity-50"}`}>{copied ? "Copied!" : "Copy"}</button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {result ? (
              <div>
                <div className="flex gap-4 text-sm text-content-muted mb-4">
                  <span>Confidence: {result.ocr.output.confidence}%</span>
                  <span>Words: {result.ocr.output.wordCount}</span>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-content-primary font-sans">{result.ocr.output.text || "No text detected"}</pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-content-muted">Extracted text will appear here</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OcrPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "ocr", name: "OCR", description: "Extract text from images and PDFs", category: "document", accent: "yellow", layout: "split-panel", enabled: true, route: "/document/ocr" };
  return <ToolProvider tool={tool}><OcrInner /></ToolProvider>;
}
