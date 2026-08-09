export interface YtdlpJob {
  url: string;
  formatId: string;
  status: "pending" | "downloading" | "completed" | "error";
  progress: number;
  message: string;
  outputPath?: string;
  filename?: string;
  error?: string;
  hasAudio?: boolean;
}

interface YtdlpJobGlobal {
  __marczellooYtdlpJobs?: Map<string, YtdlpJob>;
}

const globalJobs = globalThis as typeof globalThis & YtdlpJobGlobal;
export const jobs = globalJobs.__marczellooYtdlpJobs ??= new Map<string, YtdlpJob>();

export function getJob(jobId: string): YtdlpJob | undefined {
  return jobs.get(jobId);
}

export function setJob(jobId: string, data: Partial<YtdlpJob>): void {
  const existing = jobs.get(jobId) ?? {
    url: "",
    formatId: "",
    status: "pending" as const,
    progress: 0,
    message: "",
  };

  jobs.set(jobId, { ...existing, ...data });
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}
