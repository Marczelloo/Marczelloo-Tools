/**
 * FFmpeg Progress Store
 *
 * A general-purpose progress tracking system for FFmpeg operations.
 * Can be used by any tool that runs FFmpeg (video compressor, converter, audio extractor, etc.)
 */

import type { ProgressCallback } from "./runner";

// ============================================================================
// TYPES
// ============================================================================

export interface FFmpegJob {
  jobId: string;
  toolId: string;
  status: "pending" | "processing" | "completed" | "error" | "cancelled";
  progress: number;
  message: string;
  startTime: number;
  endTime?: number;

  // Input info
  inputPath: string;
  inputSize?: number;
  inputDuration?: number;

  // Output info
  outputPath?: string;
  outputSize?: number;

  // Progress details
  frame?: number;
  fps?: number;
  time?: string;
  bitrate?: string;
  speed?: string;
  percent?: number;
  remainingTime?: string;

  // Result
  error?: string;
  downloadUrl?: string;
  filename?: string;

  // For SSE cleanup
  _cleanup?: () => void;
}

export type JobUpdate = Partial<Omit<FFmpegJob, "jobId" | "startTime">>;

// ============================================================================
// JOB STORE
// ============================================================================

// In-memory store (in production, use Redis)
const jobs = new Map<string, FFmpegJob>();

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create a new FFmpeg job
 */
export function createJob(
  jobId: string,
  toolId: string,
  inputPath: string,
  inputSize?: number,
  inputDuration?: number
): FFmpegJob {
  const job: FFmpegJob = {
    jobId,
    toolId,
    status: "pending",
    progress: 0,
    message: "Initializing...",
    startTime: Date.now(),
    inputPath,
    inputSize,
    inputDuration,
  };
  jobs.set(jobId, job);
  return job;
}

/**
 * Get a job by ID
 */
export function getJob(jobId: string): FFmpegJob | undefined {
  return jobs.get(jobId);
}

/**
 * Update a job
 */
export function updateJob(jobId: string, update: JobUpdate): FFmpegJob | undefined {
  const job = jobs.get(jobId);
  if (job) {
    const updated = { ...job, ...update };
    jobs.set(jobId, updated);
    return updated;
  }
  return undefined;
}

/**
 * Delete a job
 */
export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}

/**
 * Get all jobs for a tool
 */
export function getJobsByTool(toolId: string): FFmpegJob[] {
  const result: FFmpegJob[] = [];
  jobs.forEach((job) => {
    if (job.toolId === toolId) {
      result.push(job);
    }
  });
  return result;
}

/**
 * Clean up old jobs (older than maxAgeMs)
 */
export function cleanupOldJobs(maxAgeMs: number = 30 * 60 * 1000): void {
  const now = Date.now();
  jobs.forEach((job, jobId) => {
    if (job.endTime && now - job.endTime > maxAgeMs) {
      jobs.delete(jobId);
    }
  });
}

// ============================================================================
// PROGRESS CALLBACK FACTORY
// ============================================================================

/**
 * Create a progress callback for a job
 * Use this with runFFmpeg's onProgress parameter
 */
export function createProgressCallback(jobId: string): ProgressCallback {
  return (progress) => {
    updateJob(jobId, {
      status: "processing",
      progress: progress.percent,
      message: `Processing: ${progress.percent.toFixed(1)}%`,
      frame: progress.frame,
      fps: progress.fps,
      time: progress.time,
      bitrate: progress.bitrate,
      speed: progress.speed,
      percent: progress.percent,
      remainingTime: progress.remainingTime,
    });
  };
}

/**
 * Mark job as completed
 */
export function completeJob(
  jobId: string,
  outputPath: string,
  outputSize: number,
  downloadUrl: string,
  filename: string
): FFmpegJob | undefined {
  return updateJob(jobId, {
    status: "completed",
    progress: 100,
    message: "Complete!",
    endTime: Date.now(),
    outputPath,
    outputSize,
    downloadUrl,
    filename,
  });
}

/**
 * Mark job as errored
 */
export function errorJob(jobId: string, error: string): FFmpegJob | undefined {
  return updateJob(jobId, {
    status: "error",
    message: `Error: ${error}`,
    endTime: Date.now(),
    error,
  });
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => cleanupOldJobs(), 5 * 60 * 1000);
}
