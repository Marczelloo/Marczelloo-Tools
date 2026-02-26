/**
 * Progress Endpoint
 *
 * GET /api/tools/video-converter/progress/[conversionId]
 *
 * Returns current conversion progress
 */

import { NextRequest, NextResponse } from "next/server";

// Store progress data in memory (in production, use Redis)
export const progressStore = new Map<string, {
  progress: number;
  frame: number;
  fps: number;
  time: string;
  bitrate: string;
  speed: string;
}>();

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
  }
) {
  progressStore.set(conversionId, data);

  // Auto-cleanup when complete
  if (data.progress >= 100) {
    setTimeout(() => {
      progressStore.delete(conversionId);
    }, 60000); // Keep for 1 minute after completion
  }
}
