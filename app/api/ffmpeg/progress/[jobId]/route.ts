/**
 * General FFmpeg Progress Streaming API
 *
 * GET /api/ffmpeg/progress/[jobId]
 *
 * Streams real-time FFmpeg job progress via Server-Sent Events (SSE)
 * This endpoint can be used by any tool that uses FFmpeg.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/ffmpeg/progress-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      // Send initial status
      send({
        type: "status",
        jobId: job.jobId,
        toolId: job.toolId,
        status: job.status,
        progress: job.progress,
        message: job.message,
        inputSize: job.inputSize,
        inputDuration: job.inputDuration,
      });

      // Poll for updates
      let lastProgress = job.progress;
      const pollInterval = setInterval(() => {
        const currentJob = getJob(jobId);

        if (!currentJob) {
          clearInterval(pollInterval);
          controller.close();
          return;
        }

        // Only send update if something changed
        if (currentJob.progress !== lastProgress || currentJob.status !== job.status) {
          lastProgress = currentJob.progress;

          send({
            type: "progress",
            jobId: currentJob.jobId,
            status: currentJob.status,
            progress: currentJob.progress,
            message: currentJob.message,
            frame: currentJob.frame,
            fps: currentJob.fps,
            time: currentJob.time,
            bitrate: currentJob.bitrate,
            speed: currentJob.speed,
            remainingTime: currentJob.remainingTime,
          });

          // Check for completion
          if (currentJob.status === "completed") {
            send({
              type: "complete",
              jobId: currentJob.jobId,
              outputPath: currentJob.outputPath,
              outputSize: currentJob.outputSize,
              downloadUrl: currentJob.downloadUrl,
              filename: currentJob.filename,
              duration: currentJob.endTime && currentJob.startTime
                ? (currentJob.endTime - currentJob.startTime) / 1000
                : undefined,
            });
            clearInterval(pollInterval);
            controller.close();
          } else if (currentJob.status === "error") {
            send({
              type: "error",
              jobId: currentJob.jobId,
              error: currentJob.error,
            });
            clearInterval(pollInterval);
            controller.close();
          } else if (currentJob.status === "cancelled") {
            send({
              type: "cancelled",
              jobId: currentJob.jobId,
            });
            clearInterval(pollInterval);
            controller.close();
          }
        }
      }, 250); // Poll every 250ms for smooth updates

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        send({ type: "heartbeat", timestamp: Date.now() });
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
      };

      // Return cleanup function for cancel handler
      return cleanup;
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
      "Access-Control-Allow-Origin": "*",
    },
  });
}
