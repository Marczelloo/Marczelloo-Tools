"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import { MediaTimeline } from "@/components/tool-ui";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileButton } from "@/components/tool-ui/TactileButton";
import type { ToolDefinition } from "@/lib/featureFlags";
import {
  chunkedUpload,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_UPLOAD_CONCURRENCY,
  formatBytes,
  formatETA,
  type UploadProgress,
} from "@/lib/upload/chunked-upload";

// ============================================================================
// TYPES
// ============================================================================

interface UploadState {
  status: "idle" | "uploading" | "complete" | "error";
  progress: UploadProgress | null;
  fileToken: string | null;
  error: string | null;
}

interface TrimProgress {
  progress: number;
  status: string;
  message: string;
  remainingTime?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatSize(bytes: number): string {
  return formatBytes(bytes);
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// UPLOAD PROGRESS COMPONENT
// ============================================================================

function UploadProgressBar({ progress }: { progress: UploadProgress }): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-400">
          Uploading... {formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}
        </span>
        <span className="text-white font-medium">{progress.percentage.toFixed(1)}%</span>
      </div>

      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-150 rounded-full"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {progress.speed > 0 ? `${formatBytes(progress.speed)}/s` : "Calculating..."}
        </span>
        <span>
          ETA: {formatETA(progress.eta)}
        </span>
      </div>

      <div className="text-xs text-zinc-600 text-center">
        Chunk {progress.chunksCompleted} of {progress.totalChunks}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function VideoTrimmerInner(): React.JSX.Element {
  const { tool } = useTool();
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    trim: {
      output: { filename: string; downloadUrl: string; size: number };
      settings: { startTime: string; endTime: string };
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: null,
    fileToken: null,
    error: null,
  });
  const [trimProgress, setTrimProgress] = useState<TrimProgress | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Determine file size threshold for chunked upload (50MB)
  const CHUNKED_UPLOAD_THRESHOLD = 50 * 1024 * 1024;

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setStartTime(0);
    setEndTime(0);

    // Reset upload state
    setUploadState({
      status: "idle",
      progress: null,
      fileToken: null,
      error: null,
    });

    // Auto-upload if file is large enough for chunked upload
    if (selectedFile.size > CHUNKED_UPLOAD_THRESHOLD) {
      // Start chunked upload
      abortControllerRef.current = new AbortController();

      try {
        const uploadResult = await chunkedUpload(selectedFile, {
          chunkSize: DEFAULT_CHUNK_SIZE,
          concurrency: DEFAULT_UPLOAD_CONCURRENCY,
          signal: abortControllerRef.current.signal,
          onProgress: (progress) => {
            setUploadState({
              status: "uploading",
              progress,
              fileToken: null,
              error: null,
            });
          },
        });

        setUploadState({
          status: "complete",
          progress: null,
          fileToken: uploadResult.file.filename,
          error: null,
        });
      } catch (err) {
        if (err instanceof Error && err.message === "Upload cancelled") {
          setUploadState({
            status: "idle",
            progress: null,
            fileToken: null,
            error: null,
          });
        } else {
          setUploadState({
            status: "error",
            progress: null,
            fileToken: null,
            error: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }
    }
  }, []);

  const handleTrim = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setTrimProgress({ progress: 0, status: "starting", message: "Starting trim..." });

    const formData = new FormData();
    formData.append("startTime", formatTime(startTime));
    if (endTime > 0) formData.append("endTime", formatTime(endTime));

    // Use file token if available (chunked upload), otherwise send file directly
    if (uploadState.fileToken) {
      formData.append("fileToken", uploadState.fileToken);
      formData.append("filename", file.name);
      formData.append("mimeType", file.type || "video/mp4");
    } else {
      formData.append("file", file);
    }

    try {
      const response = await fetch("/api/tools/video-trimmer", { method: "POST", body: formData });
      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Trim failed");
        setLoading(false);
        setTrimProgress(null);
        return;
      }

      // If we got a jobId, connect to SSE for progress updates
      if (data.jobId) {
        const eventSource = new EventSource(`/api/ffmpeg/progress/${data.jobId}`);

        eventSource.onmessage = (event) => {
          try {
            const progressData = JSON.parse(event.data);

            if (progressData.type === "progress" || progressData.status === "processing") {
              setTrimProgress({
                progress: progressData.progress || progressData.percent || 0,
                status: progressData.status || "processing",
                message: progressData.message || "Processing...",
                remainingTime: progressData.remainingTime,
              });
            } else if (progressData.type === "complete" || progressData.status === "completed") {
              setTrimProgress({ progress: 100, status: "completed", message: "Done!" });
              setResult({
                trim: {
                  output: {
                    filename: progressData.filename || "output.mp4",
                    downloadUrl: progressData.downloadUrl || `/api/download/video-trimmer/${progressData.filename}`,
                    size: progressData.outputSize || 0,
                  },
                  settings: {
                    startTime: formatTime(startTime),
                    endTime: endTime > 0 ? formatTime(endTime) : "End",
                  },
                },
              });
              setLoading(false);
              eventSource.close();
            } else if (progressData.type === "error" || progressData.status === "error") {
              setError(progressData.error || progressData.message || "Trim failed");
              setLoading(false);
              setTrimProgress(null);
              eventSource.close();
            }
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
        };

        eventSourceRef.current = eventSource;
      } else {
        // Fallback: no SSE support
        setLoading(false);
        setTrimProgress(null);
      }
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
      setTrimProgress(null);
    }
  }, [file, startTime, endTime, uploadState.fileToken]);

  const handleClear = useCallback(() => {
    // Cancel any ongoing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setFile(null);
    setResult(null);
    setError(null);
    setStartTime(0);
    setEndTime(0);
    setTrimProgress(null);
    setUploadState({
      status: "idle",
      progress: null,
      fileToken: null,
      error: null,
    });
  }, []);

  const isUploading = uploadState.status === "uploading";
  const isReadyToTrim = file && !isUploading && (uploadState.status === "complete" || file.size <= CHUNKED_UPLOAD_THRESHOLD);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Video Trimmer"}
        description="Trim and cut video clips"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />
      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  1
                </span>
                Select Video
              </legend>
              <TactileDropzone
                onFileSelect={handleFileSelect}
                accept="video/*"
                currentFile={file}
                maxSizeLabel="No size limit"
                fileTypesLabel="MP4, WebM, MOV, AVI"
                disabled={isUploading}
              />

              {/* Upload progress for large files */}
              {uploadState.status === "uploading" && uploadState.progress && (
                <div className="mt-4 p-4 bg-zinc-900 border border-white/10 rounded-md">
                  <UploadProgressBar progress={uploadState.progress} />
                </div>
              )}

              {/* Upload complete indicator */}
              {uploadState.status === "complete" && (
                <div className="mt-4 p-3 bg-zinc-900 border border-zinc-700 rounded-md flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-zinc-300">File uploaded and ready</span>
                </div>
              )}

              {/* Upload error */}
              {uploadState.status === "error" && (
                <div className="mt-4 p-3 bg-zinc-900 border border-red-900/50 rounded-md">
                  <p className="text-sm text-red-400">{uploadState.error}</p>
                </div>
              )}
            </fieldset>

            {file && isReadyToTrim && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                    2
                  </span>
                  Trim Settings
                </legend>
                <MediaTimeline
                  file={file}
                  type="video"
                  startTime={startTime}
                  endTime={endTime}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                />
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  Drag the START and END handles to select your trim range
                </p>
              </fieldset>
            )}

            {/* Trimming Progress */}
            {loading && trimProgress && (
              <fieldset className="mb-6">
                <legend className="text-sm font-semibold text-zinc-400 mb-3">
                  Trimming Progress
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-mono text-sm">{Math.round(trimProgress.progress)}%</span>
                    <span className="text-zinc-400 font-mono text-xs">{trimProgress.remainingTime ? `~${trimProgress.remainingTime}` : trimProgress.message || "Processing..."}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 ease-out"
                      style={{ width: `${trimProgress.progress}%` }}
                    />
                  </div>
                </div>
              </fieldset>
            )}

            {error && (
              <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 text-sm">{error}</p>
              </div>
            )}

            {result && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-zinc-200 mb-4">
                  Trim Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Trimmed From</p>
                      <p className="text-white font-mono">
                        {result.trim.settings.startTime} to {result.trim.settings.endTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Output Size</p>
                      <p className="text-white font-medium font-mono">
                        {formatSize(result.trim.output.size)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={result.trim.output.downloadUrl}
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                    download
                  >
                    Download Video
                  </a>
                </div>
              </fieldset>
            )}

            <div className="flex gap-4">
              <TactileButton
                onClick={result ? () => {
                  handleClear();
                } : handleTrim}
                disabled={!isReadyToTrim || loading || (endTime <= startTime && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Trimming..." : "Trim Video"}
              </TactileButton>

              {file && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={handleClear}
                  disabled={loading && !isUploading}
                >
                  {isUploading ? "Cancel" : "Clear"}
                </TactileButton>
              )}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function VideoTrimmerPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "video-trimmer",
    name: "Video Trimmer",
    description: "Trim and cut video clips",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/video-trimmer",
  };
  return (
    <ToolProvider tool={tool}>
      <VideoTrimmerInner />
    </ToolProvider>
  );
}
