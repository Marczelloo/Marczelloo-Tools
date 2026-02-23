"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

interface MediaInfo {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  canDownload: boolean;
  disclaimer: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes === 0) return "Unknown";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ============================================================================
// URL DOWNLOADER COMPONENT
// ============================================================================

function UrlDownloaderInner(): React.JSX.Element {
  const { tool } = useTool();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchInfo = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    setError(null);
    setMediaInfo(null);

    try {
      const response = await fetch("/api/tools/url-downloader", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Failed to fetch URL info");
        return;
      }

      setMediaInfo(data.media);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleDownload = useCallback(() => {
    if (mediaInfo?.url) {
      // Open the direct URL in a new tab for download
      window.open(mediaInfo.url, "_blank");
    }
  }, [mediaInfo]);

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      <PageHeader
        title={tool?.name ?? "URL Downloader"}
        description="Download media from public URLs"
        accent="orange"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-border">
          {/* Toolbar */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background-secondary">
            <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              Enter Media URL
            </h3>
          </div>

          {/* Input Area */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="mb-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetchInfo()}
                placeholder="https://example.com/video.mp4"
                className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary font-mono text-sm"
              />
            </div>

            <button
              onClick={handleFetchInfo}
              disabled={!url.trim() || loading}
              className="w-full px-6 py-3 bg-accent-orange text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Checking..." : "Check URL"}
            </button>

            {/* Legal Disclaimer */}
            <div className="mt-6 p-4 bg-surface-muted rounded-md">
              <p className="text-xs text-content-muted">
                <strong>Legal Notice:</strong> Download media from public URLs only.
                You must have rights to download this content. This tool does not
                support streaming platforms or copyright-protected content.
              </p>
            </div>

            {/* Supported Formats */}
            <div className="mt-4">
              <p className="text-xs text-content-muted mb-2">Supported formats:</p>
              <div className="flex flex-wrap gap-2">
                {["MP4", "WebM", "MP3", "WAV", "PNG", "JPG", "PDF"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2 py-1 bg-surface border border-border rounded text-xs text-content-secondary"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1" />
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex flex-col">
          {/* Toolbar */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-background-secondary">
            <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              Media Info
            </h3>
          </div>

          {/* Output */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Error */}
            {error && (
              <div className="p-4 bg-accent-red-muted border border-accent-red rounded-md">
                <p className="text-accent-red font-medium">Error</p>
                <p className="text-sm text-content-secondary mt-1">{error}</p>
              </div>
            )}

            {/* Media Info */}
            {mediaInfo && (
              <div className="space-y-4">
                <div className="bg-accent-green-muted border border-accent-green rounded-md p-4">
                  <p className="text-accent-green font-medium mb-3">Media Found</p>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-content-muted">Filename</p>
                      <p className="text-content-primary font-mono break-all">
                        {mediaInfo.filename}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-content-muted">Size</p>
                        <p className="text-content-primary">
                          {formatSize(mediaInfo.size)}
                        </p>
                      </div>
                      <div>
                        <p className="text-content-muted">Type</p>
                        <p className="text-content-primary font-mono text-xs">
                          {mediaInfo.mimeType}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-content-muted">Source URL</p>
                      <p className="text-content-primary font-mono text-xs break-all">
                        {mediaInfo.url}
                      </p>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-4 p-3 bg-background-secondary rounded text-xs text-content-muted">
                    {mediaInfo.disclaimer}
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={handleDownload}
                    className="mt-4 w-full px-4 py-3 bg-accent-green text-background-primary font-medium rounded-md hover:opacity-90 transition-opacity"
                  >
                    Download File
                  </button>
                </div>

                {/* Alternative: Direct Link */}
                <div className="text-center">
                  <p className="text-xs text-content-muted mb-2">
                    Or right-click to save:
                  </p>
                  <a
                    href={mediaInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent-orange hover:underline"
                  >
                    Direct Link
                  </a>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!error && !mediaInfo && (
              <div className="flex items-center justify-center h-full">
                <p className="text-content-muted text-center">
                  Enter a public media URL to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function UrlDownloaderPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "url-downloader",
    name: "URL Downloader",
    description: "Download media from public URLs",
    category: "web",
    accent: "orange",
    layout: "split-panel",
    enabled: true,
    route: "/web/url-downloader",
  };

  return (
    <ToolProvider tool={tool}>
      <UrlDownloaderInner />
    </ToolProvider>
  );
}
