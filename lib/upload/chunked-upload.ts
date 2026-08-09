/**
 * Chunked Upload Utility
 *
 * Handles large file uploads by splitting into chunks with:
 * - Progress tracking
 * - Automatic retries
 * - Resumable uploads
 * - Concurrent chunk uploads
 */

// ============================================================================
// TYPES
// ============================================================================

export interface UploadOptions {
  /** Size of each chunk in bytes (default: 10MB) */
  chunkSize?: number;
  /** Number of concurrent chunk uploads (default: 3) */
  concurrency?: number;
  /** Max retries per chunk (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Additional metadata to send with upload */
  metadata?: Record<string, unknown>;
  /** Callback for upload progress */
  onProgress?: (progress: UploadProgress) => void;
  /** Callback for chunk completion */
  onChunkComplete?: (chunkIndex: number, total: number) => void;
  /** Callback for errors */
  onError?: (error: Error, chunkIndex: number) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface UploadProgress {
  /** Upload session ID */
  uploadId: string;
  /** Bytes uploaded so far */
  uploadedBytes: number;
  /** Total bytes to upload */
  totalBytes: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Number of chunks completed */
  chunksCompleted: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Current upload speed in bytes/sec */
  speed: number;
  /** Estimated time remaining in seconds */
  eta: number;
  /** Upload status */
  status: "uploading" | "assembling" | "complete" | "error" | "cancelled";
}

export interface UploadResult {
  success: true;
  file: {
    filepath: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  metadata?: Record<string, unknown>;
}

export interface UploadError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

// ============================================================================
// CHUNKED UPLOAD FUNCTION
// ============================================================================

export async function chunkedUpload(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    chunkSize = 5 * 1024 * 1024, // 5MB default (safe for most server configs)
    concurrency = 3,
    maxRetries = 3,
    retryDelay = 1000,
    metadata,
    onProgress,
    onChunkComplete,
    onError,
    signal,
  } = options;

  const uploadId = generateUploadId();
  const totalChunks = Math.ceil(file.size / chunkSize);
  const totalBytes = file.size;

  // Track progress
  let uploadedBytes = 0;
  let chunksCompleted = 0;
  const startTime = Date.now();
  let lastProgressTime = startTime;

  const updateProgress = (status: UploadProgress["status"] = "uploading") => {
    const now = Date.now();
    const elapsed = now - startTime;
    const speed = elapsed > 0 ? (uploadedBytes / elapsed) * 1000 : 0;
    const remaining = totalBytes - uploadedBytes;
    const eta = speed > 0 ? remaining / speed : 0;

    // Only emit progress every 100ms to avoid flooding
    if (now - lastProgressTime >= 100 || status !== "uploading") {
      lastProgressTime = now;

      onProgress?.({
        uploadId,
        uploadedBytes,
        totalBytes,
        percentage: (uploadedBytes / totalBytes) * 100,
        chunksCompleted,
        totalChunks,
        speed,
        eta,
        status,
      });
    }
  };

  // Check for cancellation
  const checkCancelled = () => {
    if (signal?.aborted) {
      throw new Error("Upload cancelled");
    }
  };

  // Upload a single chunk with retries
  const uploadChunk = async (chunkIndex: number): Promise<UploadResult | null> => {
    checkCancelled();

    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("uploadId", uploadId);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("filename", file.name);
    formData.append("mimeType", file.type || "application/octet-stream");
    formData.append("totalSize", file.size.toString());
    if (metadata) {
      formData.append("metadata", JSON.stringify(metadata));
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        checkCancelled();

        const response = await fetch("/api/upload/chunk", {
          method: "POST",
          body: formData,
          signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || "Upload failed");
        }

        // Chunk uploaded successfully
        uploadedBytes += chunk.size;
        chunksCompleted++;
        updateProgress();
        onChunkComplete?.(chunkIndex, totalChunks);

        // Check if this was the final chunk that completed the upload
        if (data.complete && data.file) {
          updateProgress("complete");
          console.log("[ChunkedUpload] Upload complete, file:", data.file.filename);
          return data as UploadResult;
        }

        return null;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if cancelled
        if (signal?.aborted) {
          throw new Error("Upload cancelled");
        }

        // Don't retry on certain errors
        if (lastError.message.includes("FILE_TOO_LARGE") || lastError.message.includes("INVALID")) {
          throw lastError;
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    // All retries failed
    onError?.(lastError!, chunkIndex);
    throw lastError!;
  };

  // Start upload
  updateProgress();

  try {
    // Upload chunks in bounded batches. The API is idempotent per chunk, so
    // retries remain safe while large uploads can use the configured limit.
    let finalResult: UploadResult | null = null;
    const concurrencyLimit = Math.max(1, Math.floor(concurrency));

    for (let i = 0; i < totalChunks && !finalResult; i += concurrencyLimit) {
      checkCancelled();

      const indexes = Array.from(
        { length: Math.min(concurrencyLimit, totalChunks - i) },
        (_, offset) => i + offset
      );
      console.log(`[ChunkedUpload] Uploading chunks ${i + 1}-${i + indexes.length}/${totalChunks}`);
      const batchResults = await Promise.all(indexes.map((index) => uploadChunk(index)));
      finalResult = batchResults.find((result): result is UploadResult => result !== null) ?? null;
      if (finalResult) {
        console.log("[ChunkedUpload] Got final result from server");
      }
    }

    if (finalResult) {
      console.log("[ChunkedUpload] Returning final result");
      return finalResult;
    }

    // This shouldn't normally happen as the server returns the result on completion
    console.error("[ChunkedUpload] No result received after all chunks uploaded");
    throw new Error("Upload completed but no result received");
  } catch (error) {
    if (signal?.aborted || error instanceof Error && error.message === "Upload cancelled") {
      updateProgress("cancelled");
      // Cancel the upload on the server
      await fetch(`/api/upload/chunk?uploadId=${uploadId}`, {
        method: "DELETE",
      }).catch(() => {});
      throw new Error("Upload cancelled");
    }

    updateProgress("error");
    throw error;
  }
}

// ============================================================================
// RESUME UPLOAD
// ============================================================================

export async function resumeUpload(
  uploadId: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    chunkSize = 5 * 1024 * 1024, // 5MB default (safe for most server configs)
    concurrency = 3,
    maxRetries = 3,
    retryDelay = 1000,
    metadata,
    onProgress,
    onChunkComplete,
    onError,
    signal,
  } = options;

  // Check current status
  const statusResponse = await fetch(`/api/upload/chunk?uploadId=${uploadId}`);
  const statusData = await statusResponse.json();

  if (!statusData.success) {
    throw new Error(statusData.error?.message || "Failed to get upload status");
  }

  if (statusData.isComplete) {
    throw new Error("Upload already complete");
  }

  const { receivedChunks, totalChunks } = statusData;
  const receivedSet = new Set(receivedChunks as number[]);

  // Continue uploading missing chunks
  const totalBytes = file.size;
  let uploadedBytes = receivedSet.size * chunkSize;
  let chunksCompleted = receivedSet.size;
  const startTime = Date.now();
  let lastProgressTime = startTime;

  const updateProgress = (status: UploadProgress["status"] = "uploading") => {
    const now = Date.now();
    const elapsed = now - startTime;
    const speed = elapsed > 0 ? (uploadedBytes / elapsed) * 1000 : 0;
    const remaining = totalBytes - uploadedBytes;
    const eta = speed > 0 ? remaining / speed : 0;

    if (now - lastProgressTime >= 100 || status !== "uploading") {
      lastProgressTime = now;

      onProgress?.({
        uploadId,
        uploadedBytes,
        totalBytes,
        percentage: (uploadedBytes / totalBytes) * 100,
        chunksCompleted,
        totalChunks,
        speed,
        eta,
        status,
      });
    }
  };

  const checkCancelled = () => {
    if (signal?.aborted) {
      throw new Error("Upload cancelled");
    }
  };

  const uploadChunk = async (chunkIndex: number): Promise<UploadResult | null> => {
    checkCancelled();

    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("uploadId", uploadId);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("filename", file.name);
    formData.append("mimeType", file.type || "application/octet-stream");
    formData.append("totalSize", file.size.toString());
    if (metadata) {
      formData.append("metadata", JSON.stringify(metadata));
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        checkCancelled();

        const response = await fetch("/api/upload/chunk", {
          method: "POST",
          body: formData,
          signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || "Upload failed");
        }

        uploadedBytes += chunk.size;
        chunksCompleted++;
        updateProgress();
        onChunkComplete?.(chunkIndex, totalChunks);

        if (data.complete && data.file) {
          updateProgress("complete");
          return data as UploadResult;
        }

        return null;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (signal?.aborted) {
          throw new Error("Upload cancelled");
        }

        if (lastError.message.includes("FILE_TOO_LARGE") || lastError.message.includes("INVALID")) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    onError?.(lastError!, chunkIndex);
    throw lastError!;
  };

  updateProgress();

  try {
    // Get missing chunks
    const missingChunks: number[] = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!receivedSet.has(i)) {
        missingChunks.push(i);
      }
    }

    // Upload missing chunks with concurrency
    const uploadQueue: Promise<UploadResult | null>[] = [];
    let queueIndex = 0;
    let finalResult: UploadResult | null = null;

    const processQueue = async () => {
      while (queueIndex < missingChunks.length && !finalResult) {
        checkCancelled();

        if (uploadQueue.length >= concurrency) {
          const results = await Promise.race(uploadQueue.map(p => p.then(r => ({ p, r }))));
          if (results.r) {
            finalResult = results.r;
            return;
          }
          const idx = uploadQueue.indexOf(results.p);
          if (idx > -1) uploadQueue.splice(idx, 1);
        }

        const currentIndex = missingChunks[queueIndex++]!;
        const promise = uploadChunk(currentIndex);
        uploadQueue.push(promise);
      }

      const results = await Promise.all(uploadQueue);
      finalResult = results.find(r => r !== null) ?? null;
    };

    await processQueue();

    if (finalResult) {
      return finalResult;
    }

    updateProgress("complete");
    throw new Error("Upload completed but no result received");
  } catch (error) {
    if (signal?.aborted || error instanceof Error && error.message === "Upload cancelled") {
      updateProgress("cancelled");
      await fetch(`/api/upload/chunk?uploadId=${uploadId}`, {
        method: "DELETE",
      }).catch(() => {});
      throw new Error("Upload cancelled");
    }

    updateProgress("error");
    throw error;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function generateUploadId(): string {
  return `${Date.now()}-${randomUUID()}`;
}

function randomUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "--:--";

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
