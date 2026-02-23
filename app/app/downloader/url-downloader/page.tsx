"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface } from "@/components/layout";
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

interface DownloadError {
  code: string;
  message: string;
}

// ============================================================================
// URL DOWNLOADER COMPONENT
// ============================================================================

function UrlDownloaderInner(): React.JSX.Element {
  const { tool } = useTool();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [error, setError] = useState<DownloadError | null>(null);

  const validateUrl = useCallback(async () => {
    if (!url.trim()) {
      setError({ code: "EMPTY_URL", message: "Please enter a URL" });
      return;
    }

    setLoading(true);
    setError(null);
    setMediaInfo(null);

    try {
      const response = await fetch("/api/tools/url-downloader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.success) {
        setError({
          code: data.error?.code ?? "UNKNOWN",
          message: data.error?.message ?? "Failed to validate URL",
        });
        return;
      }

      setMediaInfo(data.media);
    } catch {
      setError({
        code: "NETWORK_ERROR",
        message: "Failed to connect to server",
      });
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleDownload = useCallback(() => {
    if (mediaInfo) {
      // Open in new tab for download
      window.open(mediaInfo.url, "_blank");
    }
  }, [mediaInfo]);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "Unknown size";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      {/* Page Header */}
      <PageHeader
        title={tool?.name ?? "URL Downloader"}
        description="Download media from public URLs"
        accent="orange"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Disclaimer Banner */}
      <div className="flex-shrink-0 px-6 py-3 bg-accent-orange-muted border-b border-accent-orange">
        <p className="text-sm text-accent-orange text-center">
          <strong>Important:</strong> You must have rights to download this content. Only download media you own or have permission to use.
        </p>
      </div>

      {/* Split Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-border">
          {/* Input Label */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-border">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              URL Input
            </span>
          </div>

          {/* Input Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-sm text-content-secondary mb-2">
                  Media URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && validateUrl()}
                  placeholder="https://example.com/media.mp4"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-orange"
                />
              </div>

              {/* Validate Button */}
              <button
                onClick={validateUrl}
                disabled={loading || !url.trim()}
                className="w-full px-4 py-3 bg-accent-orange text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? "Validating..." : "Validate URL"}
              </button>

              {/* Error Display */}
              {error && (
                <Surface variant="default" padding="md" className="border-accent-red">
                  <p className="text-accent-red font-medium">{error.code}</p>
                  <p className="text-sm text-content-secondary mt-1">{error.message}</p>
                </Surface>
              )}

              {/* Supported Formats */}
              <div className="mt-8">
                <h3 className="text-sm font-medium text-content-primary mb-3">
                  Supported Formats
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-content-tertiary">
                  <span>Video: MP4, WebM, MOV</span>
                  <span>Audio: MP3, WAV, OGG</span>
                  <span>Image: JPG, PNG, GIF, WebP</span>
                  <span>Document: PDF</span>
                </div>
              </div>

              {/* Limits */}
              <div className="mt-6 p-4 bg-surface-muted rounded-md">
                <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-2">
                  Limits
                </h4>
                <ul className="text-xs text-content-tertiary space-y-1">
                  <li>Maximum file size: 200MB</li>
                  <li>Request timeout: 30 seconds</li>
                  <li>Direct media URLs only</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex flex-col bg-background-secondary">
          {/* Preview Label */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-border">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              Media Preview
            </span>
          </div>

          {/* Preview Content */}
          <div className="flex-1 p-6 overflow-auto">
            {mediaInfo ? (
              <div className="space-y-6">
                {/* Media Info Card */}
                <Surface variant="elevated" padding="lg">
                  <h3 className="text-lg font-medium text-content-primary mb-4">
                    Media Information
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-content-tertiary">Filename</span>
                      <span className="text-content-primary font-mono">
                        {mediaInfo.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-tertiary">Size</span>
                      <span className="text-content-primary">
                        {formatSize(mediaInfo.size)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-tertiary">Type</span>
                      <span className="text-content-primary font-mono text-xs">
                        {mediaInfo.mimeType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-tertiary">Status</span>
                      <span className="text-accent-green">
                        {mediaInfo.canDownload ? "Ready to download" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                </Surface>

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  disabled={!mediaInfo.canDownload}
                  className="w-full px-4 py-3 bg-accent-green text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  Download Media
                </button>

                {/* Reminder */}
                <p className="text-xs text-content-muted text-center">
                  By downloading, you confirm you have the rights to this content.
                </p>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-content-muted">
                  <p className="text-sm">Enter a URL and click Validate</p>
                  <p className="text-xs mt-1">Media preview will appear here</p>
                </div>
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
    route: "/downloader/url-downloader",
  };

  return (
    <ToolProvider tool={tool}>
      <UrlDownloaderInner />
    </ToolProvider>
  );
}
