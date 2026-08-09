"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { Film, Video, Music } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type MediaType = "video+audio" | "audio-only" | "video-only";

interface Format {
  id: string;
  ext: string;
  quality: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
}

interface FormatsResponse {
  videoAndAudio?: Format[];
  audioOnly?: Format[];
  videoOnly?: Format[];
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
  const hrs = Math.floor(seconds / 3600);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getYouTubeThumbnail(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  if (match && match[1]) {
    return `https://i.ytimg.com/vi/${match[1]}/maxresdefault.jpg`;
  }
  return url;
}

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================

interface ProgressBarProps {
  progress: number;
  message?: string;
  indeterminate?: boolean;
}

function ProgressBar({ progress, message, indeterminate }: ProgressBarProps) {
  const showIndeterminate = indeterminate || progress === 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{message || "Downloading..."}</span>
        {!showIndeterminate && (
          <span className="font-mono">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="h-2 bg-black rounded-full overflow-hidden">
        {showIndeterminate ? (
          <div
            className="h-full bg-white rounded-full animate-pulse"
            style={{ width: "30%" }}
          />
        ) : (
          <div
            className="h-full bg-white transition-all duration-200 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// URL DOWNLOADER COMPONENT
// ============================================================================

function UrlDownloaderInner(): React.JSX.Element {
  const { tool } = useTool();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [formats, setFormats] = useState<FormatsResponse | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>("video+audio");
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [convertToMp3, setConvertToMp3] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState("Starting download...");
  const [isFetchingFromSource, setIsFetchingFromSource] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [fallbackThumbnailError, setFallbackThumbnailError] = useState(false);

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
    setThumbnailError(false);
    setFallbackThumbnailError(false);
    setSelectedMediaType("video+audio");

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
        setFormats(data.formats);
        setMediaInfo({
          url,
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
    setDownloadProgress(0);
    setDownloadMessage("Starting download...");
    setIsFetchingFromSource(true);
    setError(null);

    try {
      // Direct media links do not have a yt-dlp format ID. Use the direct
      // download endpoint instead of creating an SSE job with a null format.
      if (!formats && mediaInfo) {
        const directResponse = await fetch("/api/tools/url-downloader/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, convertToMp3 }),
        });

        if (!directResponse.ok) {
          const data = await directResponse.json().catch(() => null) as { error?: string | { message?: string } } | null;
          const message = typeof data?.error === "string"
            ? data.error
            : data?.error?.message ?? "Failed to download file";
          setError(message);
          setDownloading(false);
          setIsFetchingFromSource(false);
          return;
        }

        const blob = await directResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = mediaInfo.filename || "download";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(blobUrl);
        setDownloadMessage("Done!");
        setDownloading(false);
        setIsFetchingFromSource(false);
        setTimeout(() => setDownloadProgress(0), 3000);
        return;
      }

      // Step 1: Start the download job
      const startResponse = await fetch("/api/tools/url-downloader/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formatId: selectedFormat,
        }),
      });

      if (!startResponse.ok) {
        const err = await startResponse.json();
        setError(err.error || "Failed to start download");
        setDownloading(false);
        setIsFetchingFromSource(false);
        return;
      }

      const { jobId } = await startResponse.json();

      // Step 2: Connect to SSE for progress updates
      const eventSource = new EventSource(`/api/tools/url-downloader/progress/${jobId}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "progress") {
          setDownloadProgress(data.progress);
          setDownloadMessage(data.message || "Downloading...");
        } else if (data.type === "status") {
          setDownloadMessage(data.message || "Processing...");
        } else if (data.type === "complete") {
          eventSource.close();
          setDownloadProgress(100);
          setDownloadMessage("Download complete! Fetching file...");
          setIsFetchingFromSource(false);

          // Step 3: Fetch the completed file
          fetch(`/api/tools/url-downloader/file/${jobId}`)
            .then(res => res.blob())
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = blobUrl;
              a.download = data.filename || "download";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
              setDownloadMessage("Done!");
            })
            .catch(() => {
              setError("Failed to fetch downloaded file");
            })
            .finally(() => {
              setDownloading(false);
              setTimeout(() => setDownloadProgress(0), 3000);
            });

        } else if (data.type === "error") {
          eventSource.close();
          setError(data.error || "Download failed");
          setDownloading(false);
          setIsFetchingFromSource(false);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setError("Connection lost");
        setDownloading(false);
        setIsFetchingFromSource(false);
      };

    } catch {
      setError("Download failed - try again");
      setDownloading(false);
      setIsFetchingFromSource(false);
    }
  }, [convertToMp3, formats, mediaInfo, url, selectedFormat, downloading]);

  const currentFormats = formats ? (
    selectedMediaType === "video+audio" ? (formats.videoAndAudio || []) :
    selectedMediaType === "audio-only" ? (formats.audioOnly || []) :
    (formats.videoOnly || [])
  ) : [];
  const selectedFormatObj = currentFormats.find((f: typeof currentFormats[0]) => f.id === selectedFormat);

  const canShowMp3Toggle =
    mediaInfo?.canConvertToMp3 ||
    (formats && selectedMediaType === "video+audio" && selectedFormat);

  const fallbackThumbnail = mediaInfo?.url ? getYouTubeThumbnail(mediaInfo.url) : undefined;

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
                placeholder="https://www.youtube.com/watch?v=..."
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

            {/* Media Type Selection */}
            {formats && (
              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2">What to download:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { setSelectedMediaType("video+audio"); setSelectedFormat(null); }}
                    className={`px-3 py-2 rounded-md text-left transition-colors ${
                      selectedMediaType === "video+audio"
                        ? "bg-white text-black"
                        : "bg-black border border-white/10 text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Video className="w-4 h-4" />
                      <span className="text-xs font-medium">Video + Audio</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setSelectedMediaType("audio-only"); setSelectedFormat(null); }}
                    className={`px-3 py-2 rounded-md text-left transition-colors ${
                      selectedMediaType === "audio-only"
                        ? "bg-white text-black"
                        : "bg-black border border-white/10 text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Music className="w-4 h-4" />
                      <span className="text-xs font-medium">Audio Only</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setSelectedMediaType("video-only"); setSelectedFormat(null); }}
                    className={`px-3 py-2 rounded-md text-left transition-colors ${
                      selectedMediaType === "video-only"
                        ? "bg-white text-black"
                        : "bg-black border border-white/10 text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex flex-col items-center gap-1">
                      <Film className="w-4 h-4" />
                      <span className="text-xs font-medium">Video Only</span>
                    </div>
                  </button>
                </div>
                {currentFormats.length === 0 && (
                  <p className="text-xs text-zinc-600 mt-2">No formats available for this type</p>
                )}
              </div>
            )}

            {/* Format Selector */}
            {formats && currentFormats.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2">Select quality:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {currentFormats.map((fmt: typeof currentFormats[0]) => (
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
                    <span className="text-sm">Extract audio (MP3)</span>
                    <span className="font-mono text-xs opacity-70">
                      {convertToMp3 ? "ON" : "OFF"}
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Supported Formats */}
            <div className="mt-auto pt-4">
              <p className="text-xs text-zinc-500 mb-2">Supported:</p>
              <div className="flex flex-wrap gap-2">
                {["YouTube", "Vimeo", "Direct MP4/MP3"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2 py-1 bg-black border border-white/10 rounded text-xs text-zinc-400"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-zinc-950">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Media Info
            </h3>
          </div>

          <div className="flex-1 p-6 overflow-auto flex flex-col">
            {/* Error */}
            {error && (
              <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 font-medium">Error</p>
                <p className="text-sm text-zinc-400 mt-1">{error}</p>
              </div>
            )}

            {/* Media Info - Direct */}
            {mediaInfo && !formats && (
              <div className="space-y-4 flex-1">
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
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="mt-4 w-full px-4 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? "Downloading..." : "Download File"}
                  </button>

                  {downloading && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <ProgressBar progress={downloadProgress} message={downloadMessage} indeterminate={isFetchingFromSource} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Format Selection Result */}
            {mediaInfo && formats && (
              <div className="space-y-4 flex-1">
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  {/* Thumbnail */}
                  <div className="mb-4 -mx-4 -mt-4 aspect-video bg-black rounded-t-md overflow-hidden relative">
                    {mediaInfo.thumbnail && !thumbnailError ? (
                      <img
                        src={mediaInfo.thumbnail}
                        alt={mediaInfo.title}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={() => setThumbnailError(true)}
                      />
                    ) : fallbackThumbnail && !fallbackThumbnailError ? (
                      <img
                        src={fallbackThumbnail}
                        alt={mediaInfo.title}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={() => setFallbackThumbnailError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <Film className="w-12 h-12 text-zinc-700" />
                      </div>
                    )}
                  </div>

                  <p className="text-white font-medium mb-1">
                    {mediaInfo.title}
                  </p>

                  {selectedFormatObj && (
                    <p className="text-zinc-400 text-xs mb-2 font-mono">
                      {selectedFormatObj.quality} • {selectedFormatObj.ext.toUpperCase()}
                    </p>
                  )}

                  {mediaInfo.duration && (
                    <p className="text-zinc-500 text-xs mb-1 font-mono">
                      Duration: {formatDuration(mediaInfo.duration)}
                    </p>
                  )}

                  <div className="mb-3">
                    <span className="px-2 py-1 bg-zinc-950 rounded text-xs text-zinc-500 font-mono">
                      {selectedMediaType === "video+audio" && "Video + Audio"}
                      {selectedMediaType === "audio-only" && "Audio Only"}
                      {selectedMediaType === "video-only" && "Video Only (No Audio)"}
                    </span>
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={!selectedFormat || downloading}
                    className="w-full px-4 py-3 bg-white text-black font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? "Downloading..." : "Download"}
                  </button>

                  {downloading && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <ProgressBar progress={downloadProgress} message={downloadMessage} indeterminate={isFetchingFromSource} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!error && !mediaInfo && !formats && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-zinc-500 text-center">
                  Enter a YouTube URL or direct media link to get started
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
