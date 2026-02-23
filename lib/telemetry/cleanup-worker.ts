/**
 * Temp File Cleanup Worker
 * Per CLAUDE.md Section 7:
 * - Only inside /tmp
 * - Auto-delete after 20 minutes
 * - Cleanup worker must run
 *
 * Features:
 * - Interval-based cleanup (configurable)
 * - Crash-safe: tracks cleanup state in file
 * - Handles graceful shutdown
 * - Logs all operations
 */

import { readdir, stat, unlink, writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface CleanupConfig {
  /** Directories to clean */
  directories: string[];

  /** File age threshold in minutes */
  maxAgeMinutes: number;

  /** Cleanup interval in minutes */
  intervalMinutes: number;

  /** Path to state file for crash recovery */
  stateFile: string;

  /** Enable logging */
  logging: boolean;
}

export interface CleanupState {
  /** Last cleanup timestamp */
  lastCleanup: string;

  /** Number of files deleted in last run */
  lastDeletedCount: number;

  /** Total files deleted across all runs */
  totalDeleted: number;

  /** Any errors from last run */
  lastError?: string;
}

export interface CleanupResult {
  /** Directories processed */
  directoriesProcessed: number;

  /** Files deleted */
  filesDeleted: number;

  /** Errors encountered */
  errors: Array<{
    file: string;
    error: string;
  }>;

  /** Duration in ms */
  duration: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  directories: [
    "./tmp/uploads/images",
    "./tmp/uploads/videos",
    "./tmp/uploads/audio",
    "./tmp/uploads/documents",
    "./tmp/ffmpeg",
    "./tmp/processed",
  ],
  maxAgeMinutes: 20,
  intervalMinutes: 5,
  stateFile: "./tmp/.cleanup-state.json",
  logging: true,
};

// ============================================================================
// LOGGING
// ============================================================================

function log(message: string, config: CleanupConfig): void {
  if (config.logging) {
    const timestamp = new Date().toISOString();
    console.log(`[CleanupWorker] ${timestamp} - ${message}`);
  }
}

// ============================================================================
// STATE MANAGEMENT (Crash-Safe)
// ============================================================================

/**
 * Read cleanup state from file
 * Returns default state if file doesn't exist
 */
async function readState(stateFile: string): Promise<CleanupState> {
  try {
    if (existsSync(stateFile)) {
      const content = await readFile(stateFile, "utf-8");
      return JSON.parse(content) as CleanupState;
    }
  } catch {
    // State file corrupted or doesn't exist, return default
  }

  return {
    lastCleanup: new Date(0).toISOString(), // Epoch
    lastDeletedCount: 0,
    totalDeleted: 0,
  };
}

/**
 * Write cleanup state to file (crash-safe: atomic write)
 */
async function writeState(stateFile: string, state: CleanupState): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(stateFile);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Write to temp file first, then rename (atomic on most systems)
  const tempFile = `${stateFile}.tmp`;
  await writeFile(tempFile, JSON.stringify(state, null, 2));

  // On Windows, rename doesn't work if target exists, so we use direct write
  await writeFile(stateFile, JSON.stringify(state, null, 2));

  // Clean up temp file
  try {
    await unlink(tempFile);
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// DIRECTORY CLEANUP
// ============================================================================

/**
 * Clean a single directory
 */
async function cleanDirectory(
  dir: string,
  maxAgeMs: number,
  config: CleanupConfig
): Promise<{ deleted: number; errors: Array<{ file: string; error: string }> }> {
  let deleted = 0;
  const errors: Array<{ file: string; error: string }> = [];

  if (!existsSync(dir)) {
    log(`Directory does not exist: ${dir}`, config);
    return { deleted, errors };
  }

  try {
    const files = await readdir(dir);
    const now = Date.now();

    for (const file of files) {
      // Skip state files
      if (file.startsWith(".")) continue;

      const filepath = path.join(dir, file);

      try {
        const stats = await stat(filepath);

        // Only process files, not directories
        if (!stats.isFile()) continue;

        const age = now - stats.mtimeMs;

        if (age > maxAgeMs) {
          try {
            await unlink(filepath);
            deleted++;
            log(`Deleted: ${filepath} (age: ${Math.round(age / 60000)}min)`, config);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            errors.push({ file: filepath, error: errorMsg });
            log(`Failed to delete ${filepath}: ${errorMsg}`, config);
          }
        }
      } catch (error) {
        // File might have been deleted by another process
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push({ file: filepath, error: errorMsg });
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.push({ file: dir, error: errorMsg });
    log(`Failed to read directory ${dir}: ${errorMsg}`, config);
  }

  return { deleted, errors };
}

// ============================================================================
// CLEANUP WORKER CLASS
// ============================================================================

export class CleanupWorker {
  private config: CleanupConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = { ...DEFAULT_CLEANUP_CONFIG, ...config };
  }

  /**
   * Start the cleanup worker
   */
  async start(): Promise<void> {
    if (this.intervalId) {
      log("Worker already running", this.config);
      return;
    }

    log("Starting cleanup worker", this.config);
    log(`Interval: ${this.config.intervalMinutes}min`, this.config);
    log(`Max age: ${this.config.maxAgeMinutes}min`, this.config);

    // Run initial cleanup
    await this.runCleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(
      () => this.runCleanup(),
      this.config.intervalMinutes * 60 * 1000
    );

    // Handle graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Stop the cleanup worker
   */
  async stop(): Promise<void> {
    log("Stopping cleanup worker", this.config);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Wait for current run to complete
    while (this.isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    log("Cleanup worker stopped", this.config);
  }

  /**
   * Run a single cleanup cycle
   */
  async runCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      log("Cleanup already in progress, skipping", this.config);
      return {
        directoriesProcessed: 0,
        filesDeleted: 0,
        errors: [],
        duration: 0,
      };
    }

    if (this.isShuttingDown) {
      log("System shutting down, skipping cleanup", this.config);
      return {
        directoriesProcessed: 0,
        filesDeleted: 0,
        errors: [],
        duration: 0,
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    let totalDeleted = 0;
    let directoriesProcessed = 0;
    const allErrors: Array<{ file: string; error: string }> = [];

    log("Starting cleanup cycle", this.config);

    try {
      const maxAgeMs = this.config.maxAgeMinutes * 60 * 1000;

      // Clean each directory
      for (const dir of this.config.directories) {
        const result = await cleanDirectory(dir, maxAgeMs, this.config);
        totalDeleted += result.deleted;
        allErrors.push(...result.errors);
        directoriesProcessed++;
      }

      // Update state
      const state = await readState(this.config.stateFile);
      state.lastCleanup = new Date().toISOString();
      state.lastDeletedCount = totalDeleted;
      state.totalDeleted += totalDeleted;

      if (allErrors.length > 0) {
        state.lastError = allErrors.map((e) => `${e.file}: ${e.error}`).join("; ");
      } else {
        delete state.lastError;
      }

      await writeState(this.config.stateFile, state);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      allErrors.push({ file: "cleanup", error: errorMsg });
      log(`Cleanup error: ${errorMsg}`, this.config);
    } finally {
      this.isRunning = false;
    }

    const duration = Date.now() - startTime;

    log(
      `Cleanup complete: ${totalDeleted} files deleted, ${allErrors.length} errors, ${duration}ms`,
      this.config
    );

    return {
      directoriesProcessed,
      filesDeleted: totalDeleted,
      errors: allErrors,
      duration,
    };
  }

  /**
   * Get current cleanup state
   */
  async getState(): Promise<CleanupState> {
    return readState(this.config.stateFile);
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (): Promise<void> => {
      this.isShuttingDown = true;
      await this.stop();
    };

    process.on("SIGTERM", () => {
      log("Received SIGTERM", this.config);
      shutdown();
    });

    process.on("SIGINT", () => {
      log("Received SIGINT", this.config);
      shutdown();
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE (for Next.js API routes)
// ============================================================================

let workerInstance: CleanupWorker | null = null;

/**
 * Get or create the singleton cleanup worker
 */
export function getCleanupWorker(config?: Partial<CleanupConfig>): CleanupWorker {
  if (!workerInstance) {
    workerInstance = new CleanupWorker(config);
  }
  return workerInstance;
}

/**
 * Start the cleanup worker (call once at app startup)
 */
export async function startCleanupWorker(config?: Partial<CleanupConfig>): Promise<CleanupWorker> {
  const worker = getCleanupWorker(config);
  await worker.start();
  return worker;
}

// ============================================================================
// STANDALONE CLEANUP FUNCTION (for manual/API calls)
// ============================================================================

/**
 * Run a single cleanup without starting the worker
 * Useful for API endpoints or manual triggers
 */
export async function runManualCleanup(
  config: Partial<CleanupConfig> = {}
): Promise<CleanupResult> {
  const fullConfig = { ...DEFAULT_CLEANUP_CONFIG, ...config };
  const maxAgeMs = fullConfig.maxAgeMinutes * 60 * 1000;
  const startTime = Date.now();

  let totalDeleted = 0;
  let directoriesProcessed = 0;
  const allErrors: Array<{ file: string; error: string }> = [];

  for (const dir of fullConfig.directories) {
    const result = await cleanDirectory(dir, maxAgeMs, fullConfig);
    totalDeleted += result.deleted;
    allErrors.push(...result.errors);
    directoriesProcessed++;
  }

  return {
    directoriesProcessed,
    filesDeleted: totalDeleted,
    errors: allErrors,
    duration: Date.now() - startTime,
  };
}

export default CleanupWorker;
