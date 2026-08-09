/**
 * Chunked Upload API
 *
 * Handles large file uploads by receiving chunks and assembling them.
 * Uses custom multipart parsing to avoid Next.js body size limits.
 */

import { type NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, unlink, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

// Route segment config
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ============================================================================
// CONFIG
// ============================================================================

const CHUNK_DIR = "./tmp/uploads/chunks";
const UPLOAD_DIR = "./tmp/uploads/assembly";
const MAX_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB per chunk
const MAX_TOTAL_SIZE = 10 * 1024 * 1024 * 1024; // 10GB total
const CLEANUP_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

// ============================================================================
// TYPES
// ============================================================================

interface UploadSession {
  uploadId: string;
  filename: string;
  mimeType: string;
  totalChunks: number;
  totalSize: number;
  receivedChunks: Set<number>;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

interface ParsedMultipart {
  file: { data: Buffer; filename: string; mimetype: string; size: number } | null;
  fields: Record<string, string>;
}

const uploadLocks = new Map<string, Promise<void>>();

async function withUploadLock<T>(uploadId: string, operation: () => Promise<T>): Promise<T> {
  const previous = uploadLocks.get(uploadId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  uploadLocks.set(uploadId, tail);
  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (uploadLocks.get(uploadId) === tail) uploadLocks.delete(uploadId);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function ensureDirs(): Promise<void> {
  if (!existsSync(CHUNK_DIR)) {
    await mkdir(CHUNK_DIR, { recursive: true });
  }
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

function getSessionPath(uploadId: string): string {
  return join(CHUNK_DIR, `${uploadId}.session.json`);
}

function getChunkPath(uploadId: string, chunkIndex: number): string {
  return join(CHUNK_DIR, `${uploadId}.chunk.${chunkIndex}`);
}

function isSafeUploadId(uploadId: string): boolean {
  return /^[A-Za-z0-9_-]{1,100}$/.test(uploadId);
}

async function readSession(uploadId: string): Promise<UploadSession | null> {
  const sessionPath = getSessionPath(uploadId);
  if (!existsSync(sessionPath)) return null;

  try {
    const data = await readFile(sessionPath, "utf-8");
    const parsed = JSON.parse(data);
    parsed.receivedChunks = new Set(parsed.receivedChunks || []);
    return parsed as UploadSession;
  } catch {
    return null;
  }
}

async function writeSession(session: UploadSession): Promise<void> {
  const sessionPath = getSessionPath(session.uploadId);
  const serializable = {
    ...session,
    receivedChunks: Array.from(session.receivedChunks),
  };
  await writeFile(sessionPath, JSON.stringify(serializable));
}

async function assembleFile(session: UploadSession): Promise<{ filepath: string; size: number }> {
  const fileId = randomUUID();
  const ext = session.filename.includes(".") ? session.filename.split(".").pop() : "bin";
  const filepath = join(UPLOAD_DIR, `${fileId}.${ext}`);

  const chunks: Buffer[] = [];
  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = getChunkPath(session.uploadId, i);
    const chunkData = await readFile(chunkPath);
    chunks.push(chunkData);
  }

  const assembledBuffer = Buffer.concat(chunks);
  await writeFile(filepath, assembledBuffer);

  // Cleanup chunks
  for (let i = 0; i < session.totalChunks; i++) {
    try {
      await unlink(getChunkPath(session.uploadId, i));
    } catch { /* ignore */ }
  }
  try {
    await unlink(getSessionPath(session.uploadId));
  } catch { /* ignore */ }

  return { filepath, size: assembledBuffer.length };
}

async function cleanupOldUploads(): Promise<void> {
  if (!existsSync(CHUNK_DIR)) return;

  const now = Date.now();
  try {
    const files = await readdir(CHUNK_DIR);
    for (const file of files) {
      if (file.endsWith(".session.json")) {
        const sessionPath = join(CHUNK_DIR, file);
        try {
          const data = await readFile(sessionPath, "utf-8");
          const session = JSON.parse(data) as UploadSession;
          if (now - session.createdAt > CLEANUP_AGE_MS) {
            await unlink(sessionPath);
            for (let i = 0; i < session.totalChunks; i++) {
              try { await unlink(getChunkPath(session.uploadId, i)); } catch { /* ignore */ }
            }
          }
        } catch {
          try { await unlink(sessionPath); } catch { /* ignore */ }
        }
      }
    }
  } catch { /* ignore */ }
}

// Custom multipart parser
async function parseMultipartUpload(request: NextRequest): Promise<ParsedMultipart> {
  const contentType = request.headers.get("content-type") || "";
  const boundaryMatch = contentType.match(/boundary=(.+)/);

  if (!boundaryMatch) {
    throw new Error("No boundary found in content-type");
  }

  const boundary = boundaryMatch[1]!;
  const result: ParsedMultipart = { file: null, fields: {} };

  const arrayBuffer = await request.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const boundaryBuffer = Buffer.from(`--${boundary}`);

  let position = 0;

  const findBoundary = (start: number): number => buffer.indexOf(boundaryBuffer, start);

  const readLine = (start: number): { line: string; end: number } => {
    let end = start;
    while (end < buffer.length && buffer[end] !== 0x0d) end++;
    return { line: buffer.toString("utf8", start, end), end: end + 2 }; // +2 for CRLF
  };

  while (position < buffer.length) {
    const partStart = findBoundary(position);
    if (partStart === -1) break;

    position = partStart + boundaryBuffer.length + 2;

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

    const contentEnd = nextBoundary - 2;
    const contentBuffer = buffer.subarray(position, contentEnd);

    // Parse content-disposition
    const disposition = headers["content-disposition"] || "";
    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const fieldName = nameMatch?.[1];

    if (fieldName) {
      if (filenameMatch) {
        result.file = {
          data: contentBuffer,
          filename: filenameMatch[1]!,
          mimetype: headers["content-type"] || "application/octet-stream",
          size: contentBuffer.length,
        };
      } else {
        result.fields[fieldName] = contentBuffer.toString("utf8");
      }
    }

    position = nextBoundary;
  }

  return result;
}

// ============================================================================
// POST - UPLOAD CHUNK
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  await ensureDirs();
  cleanupOldUploads().catch(() => {});

  try {
    const { file, fields } = await parseMultipartUpload(request);

    const uploadId = fields.uploadId;
    const chunkIndexStr = fields.chunkIndex;
    const totalChunksStr = fields.totalChunks;
    const filename = fields.filename || "unknown.bin";
    const mimeType = fields.mimeType || "application/octet-stream";
    const totalSizeStr = fields.totalSize;
    const metadataStr = fields.metadata;

    const chunkIndex = chunkIndexStr ? parseInt(chunkIndexStr, 10) : NaN;
    const totalChunks = totalChunksStr ? parseInt(totalChunksStr, 10) : NaN;
    const totalSize = totalSizeStr ? parseInt(totalSizeStr, 10) : 0;

    // Validation
    if (!uploadId || !isSafeUploadId(uploadId) || !file || !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks < 1 || totalSize < 1) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "Missing required fields" } },
        { status: 400 }
      );
    }

    if (file.size > MAX_CHUNK_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: "CHUNK_TOO_LARGE", message: `Chunk exceeds ${MAX_CHUNK_SIZE / 1024 / 1024}MB limit` } },
        { status: 400 }
      );
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_TOO_LARGE", message: `Total file size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024 / 1024}GB limit` } },
        { status: 400 }
      );
    }

    return await withUploadLock(uploadId, async () => {
      // Load or create session
      let session = await readSession(uploadId);

      if (!session) {
        session = {
          uploadId,
          filename,
          mimeType,
          totalChunks,
          totalSize,
          receivedChunks: new Set(),
          createdAt: Date.now(),
          metadata: metadataStr ? JSON.parse(metadataStr) : undefined,
        };
        await writeSession(session);
      }

    // Validate chunk index
      if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_CHUNK_INDEX", message: "Invalid chunk index" } },
          { status: 400 }
        );
      }

    // Check if chunk already received (idempotent)
      if (session.receivedChunks.has(chunkIndex)) {
        return NextResponse.json({
          success: true,
          chunkIndex,
          received: session.receivedChunks.size,
          total: session.totalChunks,
          duplicate: true,
        });
      }

    // Save chunk
      const chunkPath = getChunkPath(uploadId, chunkIndex);
      await writeFile(chunkPath, file.data);

    // Update session
      session.receivedChunks.add(chunkIndex);
      await writeSession(session);

    // Check if upload complete
      if (session.receivedChunks.size === session.totalChunks) {
        console.log(`[ChunkUpload] All ${session.totalChunks} chunks received, assembling file...`);
        const { filepath, size } = await assembleFile(session);

      // Extract the UUID filename from the filepath for the fileToken
        const assembledFilename = filepath.split(/[/\\]/).pop() || "";
        console.log(`[ChunkUpload] Assembly complete: ${assembledFilename} (${size} bytes)`);

        return NextResponse.json({
          success: true,
          complete: true,
          file: {
            filepath,
            filename: assembledFilename, // UUID filename for fileToken
            originalName: session.filename, // Original user filename
            mimeType: session.mimeType,
            size,
          },
          metadata: session.metadata,
        });
      }

    // Return progress
      return NextResponse.json({
        success: true,
        chunkIndex,
        received: session.receivedChunks.size,
        total: session.totalChunks,
        progress: (session.receivedChunks.size / session.totalChunks) * 100,
      });
    });
  } catch (error) {
    console.error("Chunk upload error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - CHECK UPLOAD STATUS
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get("uploadId");

  if (!uploadId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_UPLOAD_ID", message: "uploadId is required" } },
      { status: 400 }
    );
  }

  const session = await readSession(uploadId);

  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_NOT_FOUND", message: "Upload session not found or expired" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    uploadId: session.uploadId,
    filename: session.filename,
    totalChunks: session.totalChunks,
    receivedChunks: Array.from(session.receivedChunks),
    progress: (session.receivedChunks.size / session.totalChunks) * 100,
    isComplete: session.receivedChunks.size === session.totalChunks,
  });
}

// ============================================================================
// DELETE - CANCEL/ABORT UPLOAD
// ============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get("uploadId");

  if (!uploadId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_UPLOAD_ID", message: "uploadId is required" } },
      { status: 400 }
    );
  }

  const session = await readSession(uploadId);

  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_NOT_FOUND", message: "Upload session not found" } },
      { status: 404 }
    );
  }

  // Delete all chunks and session
  for (let i = 0; i < session.totalChunks; i++) {
    try {
      await unlink(getChunkPath(uploadId, i));
    } catch { /* ignore */ }
  }

  try {
    await unlink(getSessionPath(uploadId));
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    message: "Upload cancelled and cleaned up",
  });
}
