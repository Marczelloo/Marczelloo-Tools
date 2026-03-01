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
import { mkdir, readdir } from "fs/promises";

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
  hasAudio?: boolean;
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

// Helper to get format info
async function getFormatInfo(url: string, formatId: string): Promise<{ hasAudio: boolean; ext: string }> {
  return new Promise((resolve) => {
    const proc = spawn(YTDLP_PATH, [
      "--dump-json",
      "--no-playlist",
      "--no-check-certificates",
      url,
    ], { shell: false });

    let stdout = "";
    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout);
          const format = info.formats?.find((f: { format_id: string }) => f.format_id === formatId);
          if (format) {
            const hasAudio = Boolean(format.has_audio || (format.acodec && format.acodec !== "none"));
            resolve({ hasAudio, ext: format.ext || "mp4" });
          } else {
            resolve({ hasAudio: false, ext: "mp4" });
          }
        } catch {
          resolve({ hasAudio: false, ext: "mp4" });
        }
      } else {
        resolve({ hasAudio: false, ext: "mp4" });
      }
    });

    proc.on("error", () => {
      resolve({ hasAudio: false, ext: "mp4" });
    });
  });
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
        setJob(jobId, { status: "downloading", message: "Getting format info..." });
        send({ type: "status", status: "downloading", progress: 0, message: "Getting format info..." });

        // Get format info to determine if we need to merge audio
        const { hasAudio } = await getFormatInfo(job.url, job.formatId);
        setJob(jobId, { hasAudio });

        // Create temp directory
        const tmpDir = "./tmp/ytdlp";
        await mkdir(tmpDir, { recursive: true });

        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const outputPath = join(tmpDir, `${uniqueId}.%(ext)s`);

        // Determine format selectors to try
        let formatSelectors: string[];
        if (job.formatId.includes("+")) {
          formatSelectors = [job.formatId];
        } else if (hasAudio) {
          // Format already has audio, use just the format ID
          formatSelectors = [job.formatId];
        } else {
          // Try with bestaudio first, then fall back to just format ID
          formatSelectors = [`${job.formatId}+bestaudio`, job.formatId];
        }

        let lastError = "";
        let downloadSuccess = false;

        for (const formatSelector of formatSelectors) {
          setJob(jobId, { message: `Downloading...` });
          send({ type: "status", status: "downloading", progress: 0, message: "Starting download..." });

          const result = await new Promise<boolean>((resolve) => {
            ytDlpProcess = spawn(YTDLP_PATH, [
              "-f", formatSelector,
              "-o", outputPath,
              "--no-playlist",
              "--no-check-certificates",
              "--merge-output-format", "mp4",
              "--embed-metadata",
              "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              job.url,
            ], { shell: false });

            let stderr = "";

            ytDlpProcess.stdout?.on("data", (data: Buffer) => {
              const output = data.toString();
              const lines = output.split("\n");
              for (const line of lines) {
                if (line.includes("%")) {
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
              const lines = data.toString().split("\n");
              for (const line of lines) {
                if (line.includes("[download]") && line.includes("%")) {
                  const match = line.match(/(\d+\.?\d*)%/);
                  if (match && match[1]) {
                    const progress = parseFloat(match[1]);
                    setJob(jobId, { progress, message: "Downloading..." });
                    send({ type: "progress", progress, message: "Downloading..." });
                  }
                }
              }
            });

            ytDlpProcess.on("close", (code) => {
              if (code === 0) {
                resolve(true);
              } else {
                lastError = stderr.split("\n").filter(l => l.trim() && !l.includes("[debug]")).pop() || `Exit code ${code}`;
                console.log(`[yt-dlp] Format selector "${formatSelector}" failed:`, lastError);
                resolve(false);
              }
            });

            ytDlpProcess.on("error", (err) => {
              lastError = err.message;
              resolve(false);
            });
          });

          if (result) {
            downloadSuccess = true;
            break;
          }
        }

        if (!downloadSuccess) {
          setJob(jobId, { status: "error", error: lastError });
          send({ type: "error", error: lastError });
          controller.close();
          return;
        }

        // Find the output file
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

        controller.close();

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
