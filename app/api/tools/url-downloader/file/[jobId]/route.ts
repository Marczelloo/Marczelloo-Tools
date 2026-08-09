/**
 * URL Downloader File Retrieval API
 *
 * GET /api/tools/url-downloader/file/[jobId]
 *
 * Returns the downloaded file for a completed job
 */

import { type NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import { deleteJob, getJob } from "@/lib/yt-dlp/job-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await params;

  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "completed" || !job.outputPath) {
    return NextResponse.json({
      error: "Job not completed",
      status: job.status,
    }, { status: 400 });
  }

  try {
    const fileBuffer = await readFile(job.outputPath);

    // Determine content type
    const ext = job.filename?.split(".").pop()?.toLowerCase() || "mp4";
    const contentType = ext === "mp3" || ext === "m4a"
      ? `audio/${ext}`
      : `video/${ext}`;

    // Schedule cleanup after response
    setTimeout(async () => {
      try {
        await unlink(job.outputPath!);
        deleteJob(jobId);
      } catch {
        // Ignore cleanup errors
      }
    }, 60000); // Clean up after 1 minute

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${job.filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("File read error:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
