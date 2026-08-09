/**
 * URL Downloader Job Starter API
 *
 * POST /api/tools/url-downloader/start
 *
 * Creates a download job and returns a job ID for progress tracking
 */

import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";
import { randomUUID } from "crypto";
import { RemoteUrlError, validateRemoteUrl } from "@/lib/security/remote-url";
import { setJob } from "@/lib/yt-dlp/job-store";

const TOOL_ID = "url-downloader";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: "Tool disabled" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const url = body.url as string | undefined;
    const formatId = body.formatId as string | undefined;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL required" },
        { status: 400 }
      );
    }

    try { await validateRemoteUrl(url); }
    catch (error) {
      return NextResponse.json({ success: false, error: error instanceof RemoteUrlError ? error.message : "Invalid public URL" }, { status: 400 });
    }

    if (!formatId) {
      return NextResponse.json(
        { success: false, error: "Format ID required" },
        { status: 400 }
      );
    }

    // Create job ID
    const jobId = randomUUID();

    setJob(jobId, {
      url,
      formatId,
      status: "pending",
      progress: 0,
      message: "Job created",
    });

    return NextResponse.json({
      success: true,
      jobId,
      progressUrl: `/api/tools/url-downloader/progress/${jobId}`,
    });

  } catch (error) {
    console.error("Job start error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start download" },
      { status: 500 }
    );
  }
}
