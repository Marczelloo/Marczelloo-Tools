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
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-white/10">
          {/* Toolbar */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-zinc-950">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
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
                className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white font-mono text-sm focus:outline-none focus:border-white/30"
              />
            </div>

            <button
              onClick={handleFetchInfo}
              disabled={!url.trim() || loading}
              className="w-full px-6 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Checking..." : "Check URL"}
            </button>

            {/* Legal Disclaimer */}
            <div className="mt-6 p-4 bg-zinc-900/50 rounded-md">
              <p className="text-xs text-zinc-500">
                <strong>Legal Notice:</strong> Download media from public URLs only.
                You must have rights to download this content. This tool does not
                support streaming platforms or copyright-protected content.
              </p>
            </div>

            {/* Supported Formats */}
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-2">Supported formats:</p>
              <div className="flex flex-wrap gap-2">
                {["MP4", "WebM", "MP3", "WAV", "PNG", "JPG", "PDF"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2 py-1 bg-black border border-white/10 rounded text-xs text-zinc-400 font-mono"
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
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-zinc-950">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Media Info
            </h3>
          </div>

          {/* Output */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Error */}
            {error && (
              <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 font-medium">Error</p>
                <p className="text-sm text-zinc-400 mt-1">{error}</p>
              </div>
            )}

            {/* Media Info */}
            {mediaInfo && (
              <div className="space-y-4">
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <p className="text-white font-medium mb-3">Media Found</p>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-zinc-500">Filename</p>
                      <p className="text-white font-mono break-all">
                        {mediaInfo.filename}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-zinc-500">Size</p>
                        <p className="text-white">
                          {formatSize(mediaInfo.size)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Type</p>
                        <p className="text-white font-mono text-xs">
                          {mediaInfo.mimeType}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-zinc-500">Source URL</p>
                      <p className="text-white font-mono text-xs break-all">
                        {mediaInfo.url}
                      </p>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-4 p-3 bg-zinc-950 rounded text-xs text-zinc-500">
                    {mediaInfo.disclaimer}
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={handleDownload}
                    className="mt-4 w-full px-4 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 transition-colors"
                  >
                    Download File
                  </button>
                </div>

                {/* Alternative: Direct Link */}
                <div className="text-center">
                  <p className="text-xs text-zinc-500 mb-2">
                    Or right-click to save:
                  </p>
                  <a
                    href={mediaInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Direct Link
                  </a>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!error && !mediaInfo && (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-500 text-center">
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
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/web/url-downloader",
  };

  return (
    <ToolProvider tool={tool}>
      <UrlDownloaderInner />
    </ToolProvider>
  );
}
