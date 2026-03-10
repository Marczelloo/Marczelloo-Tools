/**
 * Video Trimmer API
 *
 * POST /api/tools/video-trimmer
 *
 * Trims video clips between start and end times
 *
 * Supports two modes:
 * 1. Direct file upload (multipart/form-data with file field)
 * 2. Chunked upload reference (fileToken field referencing assembled file)
 */

import { type NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, stat as statFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

import { type UploadResult } from "@/lib/security/upload";
import { runFFmpeg, validateInputFile, getMediaDuration } from "@/lib/ffmpeg/runner";
import { isToolEnabled } from "@/lib/featureFlags";
import {
  createJob,
  completeJob,
  errorJob,
  createProgressCallback,
} from "@/lib/ffmpeg/progress-store";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "video-trimmer";
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB (for chunked uploads)
const UPLOAD_DIR = "./tmp/uploads/video-trimmer";
const ASSEMBLY_DIR = "./tmp/uploads/assembly"; // Where chunked uploads are assembled

// ============================================================================
// HELPERS
// ============================================================================

function parseTimeToSeconds(timeStr: string): number {
  const clean = timeStr.replace(/s$/i, "");
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  const parts = clean.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  return 0;
}

// Streaming multipart parser
async function parseMultipartUpload(request: NextRequest): Promise<{
  file: { filepath: string; filename: string; mimetype: string; size: number } | null;
  fields: Record<string, string>;
}> {
  const contentType = request.headers.get("content-type") || "";
  const boundaryMatch = contentType.match(/boundary=(.+)/);

  if (!boundaryMatch) {
    throw new Error("No boundary found in content-type");
  }

  const boundary = boundaryMatch[1]!;
  const result: { file: { filepath: string; filename: string; mimetype: string; size: number } | null; fields: Record<string, string> } = {
    file: null,
    fields: {},
  };

  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  // Read the entire body as ArrayBuffer (this is the limitation, but we'll validate size)
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);

  if (contentLength > MAX_FILE_SIZE + 1024 * 1024) { // +1MB for form fields
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const arrayBuffer = await request.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

  let position = 0;

  function findBoundary(start: number): number {
    const idx = buffer.indexOf(boundaryBuffer, start);
    return idx;
  }

  function readLine(start: number): { line: string; end: number } {
    let end = start;
    while (end < buffer.length && buffer[end] !== 0x0d && buffer[end + 1] !== 0x0a) {
      end++;
    }
    return { line: buffer.toString("utf8", start, end), end: end + 2 };
  }

  // Parse parts
  while (position < buffer.length) {
    const partStart = findBoundary(position);
    if (partStart === -1) break;

    // Move past boundary and CRLF
    position = partStart + boundaryBuffer.length + 2;

    // Check if this is the end boundary
    if (buffer.indexOf(endBoundaryBuffer, partStart) === partStart) {
      break;
    }

    // Read headers
    const headers: Record<string, string> = {};
    while (position < buffer.length) {
      const { line, end } = readLine(position);
      position = end;

      if (line === "") break;

      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        headers[line.substring(0, colonIdx).toLowerCase()] = line.substring(colonIdx + 1).trim();
      }
    }

    // Find next boundary
    const nextBoundary = findBoundary(position);
    if (nextBoundary === -1) break;

    // Content is between current position and next boundary (minus CRLF)
    const contentEnd = nextBoundary - 2; // Remove trailing CRLF before boundary
    const contentBuffer = buffer.subarray(position, contentEnd);

    // Parse content-disposition
    const disposition = headers["content-disposition"] || "";
    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);

    const fieldName = nameMatch?.[1];

    if (fieldName) {
      if (filenameMatch) {
        // This is a file
        const filename = filenameMatch[1]!;
        const mimetype = headers["content-type"] || "application/octet-stream";
        const size = contentBuffer.length;

        if (size > MAX_FILE_SIZE) {
          throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        // Save file to disk
        const fileId = randomUUID();
        const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
        const filepath = join(UPLOAD_DIR, `${fileId}.${ext}`);

        await writeFile(filepath, contentBuffer);

        result.file = {
          filepath,
          filename,
          mimetype,
          size,
        };
      } else {
        // This is a regular field
        result.fields[fieldName] = contentBuffer.toString("utf8");
      }
    }

    position = nextBoundary;
  }

  return result;
}

// Route segment config
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

// ============================================================================
// POST - TRIM VIDEO
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } },
      { status: 403 }
    );
  }

  try {
    // Parse the multipart form data
    const { file, fields } = await parseMultipartUpload(request);

    // Check for chunked upload reference (fileToken)
    const fileToken = fields.fileToken;

    let uploadResult: UploadResult;

    if (fileToken && !file) {
      // Using chunked upload - file is already assembled in ASSEMBLY_DIR
      const filePath = join(ASSEMBLY_DIR, fileToken);

      // Security: Validate the file token doesn't contain path traversal
      if (fileToken.includes("..") || fileToken.includes("/") || fileToken.includes("\\")) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TOKEN", message: "Invalid file token" } },
          { status: 400 }
        );
      }

      if (!existsSync(filePath)) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_NOT_FOUND", message: "Uploaded file not found or expired. Please re-upload." } },
          { status: 404 }
        );
      }

      const fileStats = await statFile(filePath);
      const filename = fields.filename || fileToken;

      uploadResult = {
        filepath: filePath,
        filename: fileToken,
        originalName: filename,
        mimeType: fields.mimeType || "video/mp4",
        size: fileStats.size,
      };
    } else if (file) {
      // Direct file upload
      uploadResult = {
        filepath: file.filepath,
        filename: file.filepath.split("/").pop() || file.filename,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      };
    } else {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "No video file or file token provided" } },
        { status: 400 }
      );
    }

    const startTime = fields.startTime ? parseTimeToSeconds(fields.startTime) : 0;
    const endTime = fields.endTime ? parseTimeToSeconds(fields.endTime) : undefined;

    // Validate file type
    const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"];
    if (!validVideoTypes.includes(uploadResult.mimeType) && !uploadResult.originalName.match(/\.(mp4|webm|mov|avi|mpg|mpeg)$/i)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_FILE_TYPE", message: "Please upload a valid video file (MP4, WebM, MOV, AVI)" } },
        { status: 400 }
      );
    }

    if (!(await validateInputFile(uploadResult.filepath))) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Could not validate input file" } },
        { status: 500 }
      );
    }

    const outputDir = "./tmp/processed/video-trimmer";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Get video duration for progress tracking
    let inputDuration: number | null = null;
    try {
      inputDuration = await getMediaDuration(uploadResult.filepath);
    } catch {
      console.log("[video-trimmer] Could not get duration, using default");
    }

    // Create job for progress tracking
    const jobId = randomUUID();
    const outputFilename = `${jobId}.mp4`;
    const outputPath = join(outputDir, outputFilename);

    // Calculate trimmed duration for accurate progress tracking
    let trimmedDuration: number | undefined;
    if (endTime && endTime > startTime) {
      trimmedDuration = endTime - startTime;
    } else if (inputDuration) {
      trimmedDuration = inputDuration - startTime;
    }

    createJob(jobId, TOOL_ID, uploadResult.filepath, uploadResult.size, trimmedDuration);

    // Build FFmpeg args
    const ffmpegArgs = ["-y", "-ss", startTime.toString(), "-i", uploadResult.filepath];

    if (endTime && endTime > startTime) {
      const duration = endTime - startTime;
      ffmpegArgs.push("-t", duration.toString());
    }

    ffmpegArgs.push(
      "-c:v", "libx264",
      "-c:a", "aac",
      "-avoid_negative_ts", "1",
      "-fflags", "+genpts",
      "-movflags", "+faststart",
      outputPath
    );

    // Return immediately with jobId
    const response = NextResponse.json({
      success: true,
      jobId,
      message: "Trim started",
    });

    // Run trim in background
    (async () => {
      try {
        const result = await runFFmpeg(ffmpegArgs, {
          timeout: 5 * 60 * 1000,
        }, createProgressCallback(jobId), trimmedDuration);

        if (!result.success) {
          errorJob(jobId, result.timedOut ? "Trim timed out" : result.error || "FFmpeg trim failed");
          return;
        }

        // Get output file size
        const { stat } = await import("fs/promises");
        let outputSize = 0;
        try {
          const stats = await stat(outputPath);
          outputSize = stats.size;
        } catch {
          // Ignore stat errors
        }

        const downloadUrl = `/api/download/video-trimmer/${outputFilename}`;
        completeJob(jobId, outputPath, outputSize, downloadUrl, outputFilename);

        console.log(`[video-trimmer] Job ${jobId} completed. Output: ${outputSize} bytes`);
      } catch (err) {
        console.error(`[video-trimmer] Job ${jobId} error:`, err);
        errorJob(jobId, err instanceof Error ? err.message : "Unknown trim error");
      }
    })().catch((err) => {
      console.error("[video-trimmer] Background error:", err);
      errorJob(jobId, err instanceof Error ? err.message : "Unknown error");
    });

    return response;
  } catch (error) {
    console.error("Video trim error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to trim videos" } },
    { status: 405 }
  );
}
