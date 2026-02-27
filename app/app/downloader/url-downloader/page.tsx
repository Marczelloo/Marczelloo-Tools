"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

interface Format {
  id: string;
  ext: string;
  quality: string;
  filesize: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  vcodec: string;
  acodec: string;
}

interface MediaInfo {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  canDownload: boolean;
  disclaimer: string;
  canConvertToMp3?: boolean;
  title?: string;
  thumbnail?: string;
  duration?: number;
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// URL DOWNLOADER COMPONENT
// ============================================================================

function UrlDownloaderInner(): React.JSX.Element {
  const { tool } = useTool();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [formats, setFormats] = useState<Format[] | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [convertToMp3, setConvertToMp3] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchInfo = useCallback(async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    setError(null);
    setFormats(null);
    setSelectedFormat(null);
    setMediaInfo(null);

    try {
      const response = await fetch("/api/tools/url-downloader/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Failed to fetch URL info");
        return;
      }

      if (data.type === "direct") {
        setMediaInfo({
          url,
          filename: data.direct.filename,
          size: data.direct.size,
          mimeType: data.direct.mimeType,
          canDownload: true,
          disclaimer: "You must have rights to download this content.",
          canConvertToMp3: data.direct.canConvertToMp3 ?? false,
        });
      } else if (data.type === "formats") {
        setFormats(data.formats.formats);
        setMediaInfo({
          url: "",
          filename: data.formats.title ?? "video",
          size: 0,
          mimeType: "video/mp4",
          canDownload: true,
          disclaimer: "You must have rights to download this content.",
          title: data.formats.title,
          thumbnail: data.formats.thumbnail,
          duration: data.formats.duration,
        });
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleDownload = useCallback(async () => {
    if (!url.trim() || downloading) return;

    setDownloading(true);
    setError(null);

    try {
      const response = await fetch("/api/tools/url-downloader/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formatId: selectedFormat,
          convertToMp3,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || "Download failed");
        return;
      }

      // Get filename from header
      const contentDisposition = response.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      const filename = filenameMatch?.[1] || "download";

      // Download blob
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

    } catch {
      setError("Download failed");
    } finally {
      setDownloading(false);
    }
  }, [url, selectedFormat, convertToMp3, downloading]);

  const canShowMp3Toggle =
    mediaInfo?.canConvertToMp3 ||
    (formats && selectedFormat && formats.find(f => f.id === selectedFormat)?.hasVideo);

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      <PageHeader
        title={tool?.name ?? "URL Downloader"}
        description="Download media from public URLs"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-white/10">
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-zinc-950">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Enter Media URL
            </h3>
          </div>

          <div className="flex-1 p-6 flex flex-col">
            <div className="mb-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetchInfo()}
                placeholder="https://example.com/video"
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

            {/* Format Selector */}
            {formats && (
              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2">Select format:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formats.map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setSelectedFormat(fmt.id)}
                      className={`w-full px-4 py-3 rounded-md text-left transition-colors ${
                        selectedFormat === fmt.id
                          ? "bg-white text-black border-transparent"
                          : "bg-black border border-white/10 text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-sm">{fmt.quality}</span>
                        <span className="text-xs opacity-70">{fmt.ext.toUpperCase()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MP3 Conversion Toggle */}
            {canShowMp3Toggle && (
              <div className="mt-4">
                <button
                  onClick={() => setConvertToMp3(!convertToMp3)}
                  className={`w-full px-4 py-3 rounded-md text-left transition-colors ${
                    convertToMp3
                      ? "bg-white text-black border-transparent"
                      : "bg-black border border-white/10 text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Convert to MP3</span>
                    <span className="font-mono text-xs opacity-70">
                      {convertToMp3 ? "ON" : "OFF"}
                    </span>
                  </div>
                </button>
              </div>
            )}

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
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-zinc-950">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Media Info
            </h3>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {/* Error */}
            {error && (
              <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 font-medium">Error</p>
                <p className="text-sm text-zinc-400 mt-1">{error}</p>
              </div>
            )}

            {/* Media Info - Direct */}
            {mediaInfo && !formats && (
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

                  <div className="mt-4 p-3 bg-zinc-950 rounded text-xs text-zinc-500">
                    {mediaInfo.disclaimer}
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="mt-4 w-full px-4 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? "Downloading..." : "Download File"}
                  </button>
                </div>
              </div>
            )}

            {/* Format Selection Result */}
            {mediaInfo && formats && (
              <div className="space-y-4">
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  {mediaInfo.thumbnail && (
                    <img
                      src={mediaInfo.thumbnail}
                      alt={mediaInfo.title}
                      className="w-full rounded-md mb-4"
                    />
                  )}

                  <p className="text-white font-medium mb-1">
                    {mediaInfo.title}
                  </p>

                  {mediaInfo.duration && (
                    <p className="text-zinc-500 text-xs mb-3 font-mono">
                      Duration: {formatDuration(mediaInfo.duration)}
                    </p>
                  )}

                  <div className="mt-4 p-3 bg-zinc-950 rounded text-xs text-zinc-500">
                    {mediaInfo.disclaimer}
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={!selectedFormat || downloading}
                    className="mt-4 w-full px-4 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? "Downloading..." : "Download"}
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!error && !mediaInfo && !formats && (
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
    route: "/app/downloader/url-downloader",
  };

  return (
    <ToolProvider tool={tool}>
      <UrlDownloaderInner />
    </ToolProvider>
  );
}
