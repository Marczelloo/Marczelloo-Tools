/**
 * Progress Endpoint
 *
 * GET /api/tools/video-converter/progress/[conversionId]
 * DELETE /api/tools/video-converter/progress/[conversionId] - Cancel conversion
 *
 * Returns current conversion progress or cancels an active conversion
 */

import { NextRequest, NextResponse } from "next/server";
import type { ChildProcess } from "child_process";

// Store progress data in memory (in production, use Redis)
export const progressStore = new Map<string, {
  progress: number;
  frame: number;
  fps: number;
  time: string;
  bitrate: string;
  speed: string;
  remainingTime?: string;
  result?: any; // Store full conversion result when complete
  cancelled?: boolean; // Flag to indicate cancellation
}>();

// Store active FFmpeg processes for cancellation
export const processStore = new Map<string, ChildProcess>();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversionId: string }> }
) {
  const { conversionId } = await params;

  const progressData = progressStore.get(conversionId);

  return NextResponse.json({
    success: true,
    progress: progressData || null,
  });
}

/**
 * Cancel an active conversion
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ conversionId: string }> }
) {
  const { conversionId } = await params;

  // Mark as cancelled in progress store
  const existing = progressStore.get(conversionId);
  if (existing) {
    progressStore.set(conversionId, { ...existing, cancelled: true });
  }

  // Kill the FFmpeg process if it exists
  const process = processStore.get(conversionId);
  if (process) {
    try {
      // Kill the process
      process.kill("SIGKILL");
      processStore.delete(conversionId);

      // Clean up progress store after a short delay
      setTimeout(() => {
        progressStore.delete(conversionId);
      }, 5000);

      return NextResponse.json({
        success: true,
        message: "Conversion cancelled",
      });
    } catch (error) {
      console.error("[cancel] Error killing process:", error);
      return NextResponse.json(
        { success: false, error: { message: "Failed to cancel conversion" } },
        { status: 500 }
      );
    }
  }

  // No process found, but return success anyway (might have already completed)
  return NextResponse.json({
    success: true,
    message: "Conversion not found or already completed",
  });
}

/**
 * Update progress for a conversion
 */
export function updateProgress(
  conversionId: string,
  data: {
    progress: number;
    frame: number;
    fps: number;
    time: string;
    bitrate: string;
    speed: string;
    remainingTime?: string;
    result?: any;
  }
) {
  // Get existing data and merge with new data (preserving result if already set)
  const existing = progressStore.get(conversionId);

  // Don't update if conversion was cancelled
  if (existing?.cancelled) {
    return;
  }

  progressStore.set(conversionId, { ...existing, ...data });

  // Auto-cleanup when complete or cancelled
  if (data.progress >= 100 || data.progress < 0 || existing?.cancelled) {
    setTimeout(() => {
      progressStore.delete(conversionId);
    }, 300000); // Keep for 5 minutes after completion (longer for download)
  }
}

/**
 * Register an FFmpeg process for a conversion
 */
export function registerProcess(conversionId: string, process: ChildProcess) {
  processStore.set(conversionId, process);

  // Clean up when process exits
  process.on("close", () => {
    processStore.delete(conversionId);
  });
}
