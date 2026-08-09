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

function FaviconGeneratorInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ favicon: { files: { filename: string; size: number; downloadUrl: string }[]; htmlSnippet: string; sessionId: string; downloadAllUrl: string } } | null>(null);
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

  const handleGenerate = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/tools/favicon-generator", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Generation failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file]);

  const copyHtmlSnippet = useCallback(async () => {
    if (result?.favicon.htmlSnippet) {
      await navigator.clipboard.writeText(result.favicon.htmlSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "Favicon Generator"} description="Generate favicons for websites" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">1. Select Logo/Image</legend>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-white/40 transition-colors bg-black/50">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                {file ? (
                  <div>
                    {preview && <img src={preview} alt="Preview" className="max-h-24 mx-auto mb-2 rounded" />}
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-zinc-500 font-mono">{formatSize(file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-zinc-400">Click to select an image</p>
                    <p className="text-xs text-zinc-500 mt-1">Square image recommended • Max 10MB</p>
                  </div>
                )}
              </div>
            </fieldset>
            <div className="bg-zinc-900/50 rounded-md p-4 mb-6">
              <p className="text-sm text-zinc-400">
                <strong>Generates:</strong> favicon.ico, favicon-16x16.png, favicon-32x32.png, favicon-48x48.png,
                favicon-64x64.png, apple-touch-icon.png (180x180), favicon-192x192.png, favicon-512x512.png
              </p>
            </div>
            {error && <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-md"><p className="text-zinc-300 text-sm">{error}</p></div>}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">2. Favicons Generated</legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {result.favicon.files.map((f, i) => (
                      <a key={i} href={f.downloadUrl} className="px-3 py-2 bg-black border border-white/10 rounded text-sm text-zinc-400 hover:text-white transition-colors" download>
                        {f.filename}
                      </a>
                    ))}
                  </div>
                  <a href={result.favicon.downloadAllUrl} download className="block w-full mb-4 px-3 py-2 text-center bg-white text-black rounded text-sm font-medium hover:bg-zinc-200 transition-colors">
                    Download all (.zip)
                  </a>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-500 uppercase font-mono">HTML Snippet</span>
                      <button onClick={copyHtmlSnippet} className={`px-2 py-1 text-xs rounded ${copied ? "bg-white text-black" : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5"}`}>
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <pre className="p-3 bg-black rounded text-xs text-white font-mono overflow-x-auto">
                      {result.favicon.htmlSnippet}
                    </pre>
                  </div>
                </div>
              </fieldset>
            )}
            <div className="flex gap-3">
              <button onClick={handleGenerate} disabled={!file || loading} className="flex-1 px-6 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? "Generating..." : "Generate Favicons"}
              </button>
              {file && <button onClick={() => { setFile(null); setPreview(""); setResult(null); setError(null); setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={loading} className="px-6 py-3 bg-black border border-white/10 text-zinc-400 font-medium rounded-md hover:bg-white/5 disabled:opacity-50 transition-colors">Clear</button>}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function FaviconGeneratorPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "favicon-generator", name: "Favicon Generator", description: "Generate favicons for websites", category: "dev", accent: "blue", layout: "upload-center", enabled: true, route: "/app/dev/favicon-generator" };
  return <ToolProvider tool={tool}><FaviconGeneratorInner /></ToolProvider>;
}
