"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

function UrlShortenerInner(): React.JSX.Element {
  const { tool } = useTool();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ shortening: { original: string; shortUrl: string; shortCode: string; note: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShorten = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tools/url-shortener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Failed to shorten URL");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [url]);

  const copyShortUrl = useCallback(async () => {
    if (result?.shortening.shortUrl) {
      await navigator.clipboard.writeText(result.shortening.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "URL Shortener"} description="Create short, shareable links" accent="blue" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">Enter URL</legend>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleShorten()}
                  placeholder="https://example.com/very-long-url"
                  className="flex-1 px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                />
                <button
                  onClick={handleShorten}
                  disabled={!url.trim() || loading}
                  className="px-6 py-3 bg-accent-blue text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? "Shortening..." : "Shorten"}
                </button>
              </div>
            </fieldset>
            {error && <div className="mb-6 p-4 bg-accent-red-muted border border-accent-red rounded-md"><p className="text-accent-red text-sm">{error}</p></div>}
            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-accent-green mb-4">Shortened URL</legend>
                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="text"
                      value={result.shortening.shortUrl}
                      readOnly
                      className="flex-1 px-4 py-3 bg-surface border border-border rounded-md text-content-primary font-mono"
                    />
                    <button
                      onClick={copyShortUrl}
                      className={`px-4 py-3 font-medium rounded-md transition-colors-fast ${copied ? "bg-accent-green text-background-primary" : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"}`}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="text-xs text-content-muted">
                    <p><strong>Original:</strong> {result.shortening.original}</p>
                  </div>
                  <div className="mt-4 p-3 bg-background-secondary rounded text-xs text-content-muted">
                    {result.shortening.note}
                  </div>
                </div>
              </fieldset>
            )}
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function UrlShortenerPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "url-shortener", name: "URL Shortener", description: "Create short, shareable links", category: "web", accent: "blue", layout: "form-heavy", enabled: true, route: "/web/url-shortener" };
  return <ToolProvider tool={tool}><UrlShortenerInner /></ToolProvider>;
}
