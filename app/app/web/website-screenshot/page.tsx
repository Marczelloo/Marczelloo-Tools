"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

function WebsiteScreenshotInner(): React.JSX.Element {
  const { tool } = useTool();
  const [url, setUrl] = useState("");
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ screenshot: { url: string; title: string; description: string; viewport: { width: number; height: number }; format: string; size: number; downloadUrl: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tools/website-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, viewport }),
      });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Failed to capture screenshot");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [url, viewport]);

  const VIEWPORT_PRESETS = [
    { label: "Desktop", width: 1280, height: 720 },
    { label: "Laptop", width: 1024, height: 768 },
    { label: "Tablet", width: 768, height: 1024 },
    { label: "Mobile", width: 375, height: 667 },
  ];

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "Website Screenshot"} description="Capture screenshots of websites" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">1. Enter URL</legend>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white font-mono focus:outline-none focus:border-white/30"
              />
            </fieldset>
            <fieldset className="mb-6">
              <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">2. Viewport Size</legend>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {VIEWPORT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setViewport({ width: preset.width, height: preset.height })}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${viewport.width === preset.width && viewport.height === preset.height ? "bg-white text-black" : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5"}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Width</label>
                  <input type="number" value={viewport.width} onChange={(e) => setViewport(prev => ({ ...prev, width: parseInt(e.target.value) || 1280 }))} className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white font-mono" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Height</label>
                  <input type="number" value={viewport.height} onChange={(e) => setViewport(prev => ({ ...prev, height: parseInt(e.target.value) || 720 }))} className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white font-mono" />
                </div>
              </div>
            </fieldset>
            {error && <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-md"><p className="text-zinc-300 text-sm">{error}</p></div>}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">3. Result</legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <h3 className="text-lg font-medium text-white mb-2">{result.screenshot.title}</h3>
                  <p className="text-sm text-zinc-400 mb-4">{result.screenshot.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><p className="text-zinc-500">URL</p><p className="text-white font-mono text-xs break-all">{result.screenshot.url}</p></div>
                    <div><p className="text-zinc-500">Viewport</p><p className="text-white font-mono">{result.screenshot.viewport.width}x{result.screenshot.viewport.height}</p></div>
                  </div>
                  <a href={result.screenshot.downloadUrl} download className="inline-flex px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors">
                    Download {result.screenshot.format.toUpperCase()} ({Math.round(result.screenshot.size / 1024)} KB)
                  </a>
                </div>
              </fieldset>
            )}
            <button onClick={handleCapture} disabled={!url.trim() || loading} className="w-full px-6 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? "Capturing..." : "Capture Screenshot"}
            </button>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function WebsiteScreenshotPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "website-screenshot", name: "Website Screenshot", description: "Capture screenshots of websites", category: "web", accent: "blue", layout: "form-heavy", enabled: true, route: "/app/web/website-screenshot" };
  return <ToolProvider tool={tool}><WebsiteScreenshotInner /></ToolProvider>;
}
