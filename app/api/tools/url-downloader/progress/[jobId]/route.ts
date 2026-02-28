/**
 * URL Downloader Progress Streaming API
 *
 * GET /api/tools/url-downloader/progress/[jobId]
 *
 * Streams real-time download progress via Server-Sent Events (SSE)
 */

import { type NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { join } from "path";
import { mkdir } from "fs/promises";

const YTDLP_PATH = process.env.YTDLP_PATH || "yt-dlp";

// In-memory job store (in production, use Redis)
const jobs = new Map<string, {
  url: string;
  formatId: string;
  status: "pending" | "downloading" | "completed" | "error";
  progress: number;
  message: string;
  outputPath?: string;
  filename?: string;
  error?: string;
}>();

export function getJob(jobId: string) {
  return jobs.get(jobId);
}

export function setJob(jobId: string, data: Partial<typeof jobs extends Map<string, infer T> ? T : never>) {
  const existing = jobs.get(jobId) || {
    url: "",
    formatId: "",
    status: "pending" as const,
    progress: 0,
    message: "",
  };
  jobs.set(jobId, { ...existing, ...data });
}

export function deleteJob(jobId: string) {
  jobs.delete(jobId);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  const { jobId } = await params;
  const job = jobs.get(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let ytDlpProcess: ReturnType<typeof spawn> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Update job status
        setJob(jobId, { status: "downloading", message: "Starting download..." });
        send({ type: "status", status: "downloading", progress: 0, message: "Starting download..." });

        // Create temp directory
        const tmpDir = "./tmp/ytdlp";
        await mkdir(tmpDir, { recursive: true });

        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const outputPath = join(tmpDir, `${uniqueId}.%(ext)s`);

        // Determine format selector
        const formatSelector = job.formatId.includes("+")
          ? job.formatId
          : `${job.formatId}+bestaudio`;

        // Spawn yt-dlp
        ytDlpProcess = spawn(YTDLP_PATH, [
          "-f", formatSelector,
          "-o", outputPath,
          "--no-playlist",
          "--no-check-certificates",
          "--merge-output-format", "mp4",
          "--embed-metadata",
          "--progress",
          "--progress-template", "%(progress._percent_str)s|%(progress._status)s",
          "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          job.url,
        ], { shell: false });

        let stderr = "";

        ytDlpProcess.stdout?.on("data", (data: Buffer) => {
          const output = data.toString();
          // Parse progress output
          const lines = output.split("\n");
          for (const line of lines) {
            if (line.includes("%")) {
              // Parse progress percentage
              const match = line.match(/(\d+\.?\d*)%/);
              if (match && match[1]) {
                const progress = parseFloat(match[1]);
                setJob(jobId, { progress, message: "Downloading..." });
                send({ type: "progress", progress, message: "Downloading..." });
              }
            }
          }
        });

        ytDlpProcess.stderr?.on("data", (data: Buffer) => {
          stderr += data.toString();
          // Also check stderr for progress (yt-dlp sometimes outputs there)
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.includes("[download]") && line.includes("%")) {
              const match = line.match(/(\d+\.?\d*)%/);
              if (match && match[1]) {
                const progress = parseFloat(match[1]);
                const message = line.includes("Downloading") ? "Downloading..." : "Processing...";
                setJob(jobId, { progress, message });
                send({ type: "progress", progress, message });
              }
            }
          }
        });

        ytDlpProcess.on("close", async (code) => {
          if (code === 0) {
            // Find the actual output file (yt-dlp replaces %(ext)s)
            const { readdir } = await import("fs/promises");
            const files = await readdir(tmpDir);
            const outputFile = files.find(f => f.startsWith(uniqueId));

            if (outputFile) {
              const finalPath = join(tmpDir, outputFile);
              setJob(jobId, {
                status: "completed",
                progress: 100,
                message: "Download complete!",
                outputPath: finalPath,
                filename: outputFile,
              });
              send({ type: "complete", filename: outputFile, outputPath: finalPath });
            } else {
              setJob(jobId, { status: "error", error: "Output file not found" });
              send({ type: "error", error: "Output file not found" });
            }
          } else {
            const errorMsg = stderr.split("\n").filter(l => l.trim()).pop() || `Exit code ${code}`;
            setJob(jobId, { status: "error", error: errorMsg });
            send({ type: "error", error: errorMsg });
          }
          controller.close();
        });

        ytDlpProcess.on("error", (err) => {
          setJob(jobId, { status: "error", error: err.message });
          send({ type: "error", error: err.message });
          controller.close();
        });

      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        setJob(jobId, { status: "error", error });
        send({ type: "error", error });
        controller.close();
      }
    },

    cancel() {
      if (ytDlpProcess) {
        ytDlpProcess.kill();
      }
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
