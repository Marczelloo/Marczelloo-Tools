/**
 * yt-dlp Runner
 *
 * Wrapper for yt-dlp CLI to extract formats and download media
 */

import { spawn } from "child_process";
import { type YtdlpInfo, type YtdlpResult, type StreamOptions } from "./types";

const YTDLP_PATH = process.env.YTDLP_PATH || "yt-dlp";
const TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface RunOptions {
  timeout?: number;
  args: string[];
}

async function runYtdlp(options: RunOptions): Promise<YtdlpResult> {
  const { args, timeout = TIMEOUT } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return new Promise((resolve) => {
    const proc = spawn(YTDLP_PATH, args, {
      signal: controller.signal as AbortSignal,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        try {
          const info = JSON.parse(stdout) as YtdlpInfo;
          resolve({ success: true, info });
        } catch (e) {
          resolve({
            success: false,
            error: `Failed to parse yt-dlp output: ${e}`,
          });
        }
      } else {
        resolve({
          success: false,
          error: stderr || "yt-dlp failed",
        });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        resolve({ success: false, timedOut: true, error: "Timeout" });
      } else {
        resolve({ success: false, error: err.message });
      }
    });
  });
}

export async function getYtdlpFormats(url: string): Promise<YtdlpResult> {
  return runYtdlp({
    args: [
      "--dump-json",
      "--no-playlist",
      "--flat-playlist",
      url,
    ],
  });
}

export function streamYtdlp(options: StreamOptions): ReadableStream<Uint8Array> {
  const { url, formatId } = options;

  // For YouTube and similar sites, many formats are video-only or audio-only.
  // We need to use format selector syntax to combine them if needed.
  // The formatId from our API is the video format; we append +bestaudio for merging.
  // Also use --merge-output-format to ensure proper container format.
  const formatSelector = formatId.includes("+")
    ? formatId
    : `${formatId}+bestaudio`;

  const proc = spawn(YTDLP_PATH, [
    "-f",
    formatSelector,
    "-o",
    "-",
    "--no-playlist",
    "--merge-output-format",
    "mp4",
    url,
  ], {
    shell: false,
  });

  return new ReadableStream({
    start(controller) {
      proc.stdout?.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      proc.stderr?.on("data", (data) => {
        // Parse progress: [download] 23.4MB of 45.6MB
        const match = data.toString().match(/\[download\]\s+(\d+\.?\d*)% of/);
        if (match && options.onProgress) {
          // TODO: emit progress event
          void parseFloat(match[1]);
        }
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          controller.error(new Error(`yt-dlp exited with code ${code}`));
        } else {
          controller.close();
        }
      });

      proc.on("error", (err) => {
        controller.error(err);
      });
    },

    cancel() {
      proc.kill();
    },
  });
}

export async function isYtdlpAvailable(): Promise<boolean> {
  try {
    const result = await runYtdlp({ args: ["--version"] });
    return result.success;
  } catch {
    return false;
  }
}
