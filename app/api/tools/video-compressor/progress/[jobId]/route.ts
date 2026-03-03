/**
 * Video Compressor Progress Streaming API
 *
 * GET /api/tools/video-compressor/progress/[jobId]
 *
 * Streams real-time compression progress via Server-Sent Events (SSE)
 */

import { type NextRequest, NextResponse } from "next/server";

// In-memory job store for video compression progress
const compressionJobs = new Map<
  string,
  {
    jobId: string;
    status: "starting" | "processing" | "compressing" | "completed" | "error";
    progress: number;
    message: string;
    startTime: number;
    videoInfo?: {
      duration: number;
      width: number;
      height: number;
    };
    originalSize?: number;
    outputPath?: string;
    filename?: string;
    downloadUrl?: string;
    error?: string;
    abortController?: () => void;
  }
>();

export function getCompressionJob(jobId: string) {
  return compressionJobs.get(jobId);
}

interface CompressionJob {
  jobId: string;
  status: "starting" | "processing" | "compressing" | "completed" | "error";
  progress: number;
  message: string;
  startTime: number;
  videoInfo?: {
    duration: number;
    width: number;
    height: number;
  };
  originalSize?: number;
  outputPath?: string;
  filename?: string;
  downloadUrl?: string;
  error?: string;
  abortController?: () => void;
}

export function setCompressionJob(
  jobId: string,
  data: Partial<CompressionJob>
): void {
  const existing = compressionJobs.get(jobId);
  if (existing) {
    compressionJobs.set(jobId, { ...existing, ...data });
  }
}

export function deleteCompressionJob(jobId: string): void {
  compressionJobs.delete(jobId);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  const { jobId } = await params;
  const job = getCompressionJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial status
      send({
        type: "status",
        jobId,
        status: job.status,
        progress: job.progress,
        message: job.message,
        videoInfo: job.videoInfo,
        originalSize: job.originalSize,
      });

      // Keep connection alive with heartbeat
      const heartbeatInterval = setInterval(() => {
        send({ type: "heartbeat", timestamp: Date.now() });
      }, 30000);

      // Cleanup on close
      controller.close = () => {
        clearInterval(heartbeatInterval);
        if (job.abortController) {
          job.abortController();
        }
        deleteCompressionJob(jobId);
      };
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
