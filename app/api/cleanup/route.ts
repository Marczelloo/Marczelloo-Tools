/**
 * Cleanup API Route
 *
 * GET  /api/cleanup - Get cleanup status
 * POST /api/cleanup - Trigger manual cleanup
 *
 * Per CLAUDE.md Section 7:
 * - Auto-delete after 20 minutes
 * - Cleanup worker must run
 */

import { type NextRequest, NextResponse } from "next/server";
import { runManualCleanup, getCleanupWorker } from "@/lib/telemetry/cleanup-worker";

// ============================================================================
// GET - Get Cleanup Status
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const worker = getCleanupWorker();
    const state = await worker.getState();

    return NextResponse.json({
      success: true,
      status: {
        lastCleanup: state.lastCleanup,
        lastDeletedCount: state.lastDeletedCount,
        totalDeleted: state.totalDeleted,
        lastError: state.lastError,
        isRunning: false, // Worker not started in serverless
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CLEANUP_STATUS_FAILED",
          message: error instanceof Error ? error.message : "Failed to get cleanup status",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Trigger Manual Cleanup
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Optional: Check for authorization header
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CLEANUP_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Get optional config from request body
    let config = {};
    try {
      const body = await request.json();
      if (body.maxAgeMinutes) {
        config = { maxAgeMinutes: body.maxAgeMinutes };
      }
    } catch {
      // No body, use defaults
    }

    const result = await runManualCleanup(config);

    return NextResponse.json({
      success: true,
      result: {
        directoriesProcessed: result.directoriesProcessed,
        filesDeleted: result.filesDeleted,
        errors: result.errors.length > 0 ? result.errors : undefined,
        duration: result.duration,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CLEANUP_FAILED",
          message: error instanceof Error ? error.message : "Failed to run cleanup",
        },
      },
      { status: 500 }
    );
  }
}
