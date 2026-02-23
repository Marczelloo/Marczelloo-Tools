/**
 * Concurrency Limiter
 * Limits concurrent processing jobs for Raspberry Pi optimization
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConcurrencyConfig {
  /** Maximum concurrent jobs */
  maxConcurrent: number;

  /** Queue timeout in milliseconds */
  queueTimeout: number;
}

export interface JobInfo {
  id: string;
  toolId: string;
  startTime: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  maxConcurrent: 2, // Raspberry Pi limit
  queueTimeout: 60000, // 1 minute max wait
};

// ============================================================================
// CONCURRENCY MANAGER
// ============================================================================

class ConcurrencyManager {
  private config: ConcurrencyConfig;
  private activeJobs: Map<string, JobInfo> = new Map();
  private queue: Array<{
    id: string;
    toolId: string;
    resolve: (id: string) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  constructor(config: ConcurrencyConfig = DEFAULT_CONCURRENCY_CONFIG) {
    this.config = config;
  }

  /**
   * Check if a new job can start
   */
  canStartJob(): boolean {
    return this.activeJobs.size < this.config.maxConcurrent;
  }

  /**
   * Get current active job count
   */
  getActiveCount(): number {
    return this.activeJobs.size;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Start a job (acquire slot)
   * Returns job ID when slot is available
   */
  async startJob(toolId: string): Promise<string> {
    // Can start immediately
    if (this.canStartJob()) {
      const jobId = crypto.randomUUID();
      this.activeJobs.set(jobId, {
        id: jobId,
        toolId,
        startTime: Date.now(),
      });
      return jobId;
    }

    // Need to queue
    return new Promise((resolve, reject) => {
      const jobId = crypto.randomUUID();

      const timeout = setTimeout(() => {
        // Remove from queue
        const index = this.queue.findIndex((q) => q.id === jobId);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error("Job queue timeout - server busy"));
      }, this.config.queueTimeout);

      this.queue.push({
        id: jobId,
        toolId,
        resolve: (id) => {
          clearTimeout(timeout);
          this.activeJobs.set(id, {
            id,
            toolId,
            startTime: Date.now(),
          });
          resolve(id);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
      });
    });
  }

  /**
   * Complete a job (release slot)
   */
  completeJob(jobId: string): void {
    this.activeJobs.delete(jobId);

    // Process queue
    if (this.queue.length > 0 && this.canStartJob()) {
      const next = this.queue.shift();
      if (next) {
        next.resolve(next.id);
      }
    }
  }

  /**
   * Get job info
   */
  getJobInfo(jobId: string): JobInfo | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): JobInfo[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<ConcurrencyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let managerInstance: ConcurrencyManager | null = null;

/**
 * Get concurrency manager instance
 */
export function getConcurrencyManager(
  config?: Partial<ConcurrencyConfig>
): ConcurrencyManager {
  if (!managerInstance) {
    managerInstance = new ConcurrencyManager({
      ...DEFAULT_CONCURRENCY_CONFIG,
      ...config,
    });
  }
  return managerInstance;
}

/**
 * Initialize with custom config
 */
export function initConcurrencyManager(
  config: Partial<ConcurrencyConfig>
): ConcurrencyManager {
  managerInstance = new ConcurrencyManager({
    ...DEFAULT_CONCURRENCY_CONFIG,
    ...config,
  });
  return managerInstance;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check if server can accept new jobs
 */
export function canAcceptJob(): boolean {
  return getConcurrencyManager().canStartJob();
}

/**
 * Get current load percentage
 */
export function getLoadPercentage(): number {
  const manager = getConcurrencyManager();
  return (manager.getActiveCount() / DEFAULT_CONCURRENCY_CONFIG.maxConcurrent) * 100;
}

/**
 * Execute a job with concurrency control
 */
export async function withConcurrency<T>(
  toolId: string,
  job: () => Promise<T>
): Promise<T> {
  const manager = getConcurrencyManager();
  const jobId = await manager.startJob(toolId);

  try {
    const result = await job();
    return result;
  } finally {
    manager.completeJob(jobId);
  }
}

export default ConcurrencyManager;
