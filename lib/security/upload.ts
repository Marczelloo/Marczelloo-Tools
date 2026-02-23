/**
 * Upload Security Middleware
 * Per CLAUDE.md Section 7 - Security Rules
 *
 * Features:
 * - MIME type validation (magic number checking)
 * - Extension validation (whitelist approach)
 * - Size validation (configurable limits)
 * - UUID filename generation (never use original)
 * - Sandbox folder enforcement
 */

import { randomUUID } from "crypto";
import { writeFile, mkdir, stat, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface UploadConfig {
  /** Maximum file size in bytes */
  maxSizeBytes: number;

  /** Allowed MIME types */
  allowedMimeTypes: readonly string[];

  /** Allowed file extensions (without dot) */
  allowedExtensions: readonly string[];

  /** Upload directory (relative to project root) */
  uploadDir: string;

  /** Auto-delete files after this many minutes (0 = disabled) */
  autoDeleteMinutes: number;
}

export interface UploadResult {
  /** Generated UUID filename with extension */
  filename: string;

  /** Full path to saved file */
  filepath: string;

  /** Original filename (for reference only, never used for storage) */
  originalName: string;

  /** Detected MIME type */
  mimeType: string;

  /** File size in bytes */
  size: number;
}

export interface UploadError {
  code: UploadErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type UploadErrorCode =
  | "FILE_TOO_LARGE"
  | "INVALID_MIME_TYPE"
  | "INVALID_EXTENSION"
  | "EMPTY_FILE"
  | "MISSING_FILENAME"
  | "UPLOAD_FAILED"
  | "SANDBOX_VIOLATION";

// ============================================================================
// DANGEROUS EXTENSIONS (never allow)
// ============================================================================

/**
 * Extensions that are NEVER allowed, regardless of config
 */
export const DANGEROUS_EXTENSIONS = [
  // Executables
  "exe",
  "bat",
  "cmd",
  "com",
  "scr",
  "pif",
  "msi",
  "msp",
  "cpl",
  "gadget",
  // Scripts
  "vbs",
  "vbe",
  "js",
  "jse",
  "wsf",
  "wsh",
  "ps1",
  "ps2",
  "psm1",
  "psd1",
  "sh",
  "bash",
  "zsh",
  // System files
  "sys",
  "dll",
  "drv",
  "ocx",
  "dll",
  // Web shells / exploits
  "php",
  "php3",
  "php4",
  "php5",
  "phtml",
  "asp",
  "aspx",
  "jsp",
  "jspx",
  "cfm",
  "pl",
  "cgi",
  // Archives that can contain executables
  "jar",
  "war",
  "ear",
] as const;

// ============================================================================
// MAGIC NUMBER SIGNATURES
// ============================================================================

/**
 * File signature (magic number) definitions
 * First few bytes that identify file type
 */
type BytePattern = (number | null)[];

const FILE_SIGNATURES: Record<string, BytePattern[]> = {
  // Images
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  "image/svg+xml": [], // SVG is text-based, check extension

  // Video
  "video/mp4": [
    [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, null, 0x6d, 0x70, 0x34, 0x31], // mp41
    [0x00, 0x00, 0x00, null, 0x6d, 0x70, 0x34, 0x32], // mp42
  ],
  "video/webm": [[0x1a, 0x45, 0xdf, 0xa3]],
  "video/quicktime": [[0x00, 0x00, 0x00, null, 0x6d, 0x6f, 0x6f, 0x76]],
  "video/x-msvideo": [[0x52, 0x49, 0x46, 0x46]],

  // Audio
  "audio/mpeg": [[0xff, 0xfb], [0xff, 0xfa], [0x49, 0x44, 0x33]],
  "audio/wav": [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x41, 0x56, 0x45]],
  "audio/ogg": [[0x4f, 0x67, 0x67, 0x53]],
  "audio/flac": [[0x66, 0x4c, 0x61, 0x43]],

  // Documents
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/json": [], // Text-based

  // Archives
  "application/zip": [[0x50, 0x4b, 0x03, 0x04]],
};

// ============================================================================
// DEFAULT CONFIGS
// ============================================================================

/**
 * Default upload configuration for different file types
 */
export const DEFAULT_UPLOAD_CONFIGS = {
  /** For image processing tools */
  image: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"] as const,
    allowedExtensions: ["jpg", "jpeg", "png", "gif", "webp"] as const,
    uploadDir: "./tmp/uploads/images",
    autoDeleteMinutes: 20,
  },

  /** For video processing tools */
  video: {
    maxSizeBytes: 200 * 1024 * 1024, // 200MB
    allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"] as const,
    allowedExtensions: ["mp4", "webm", "mov"] as const,
    uploadDir: "./tmp/uploads/videos",
    autoDeleteMinutes: 20,
  },

  /** For audio processing tools */
  audio: {
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac"] as const,
    allowedExtensions: ["mp3", "wav", "ogg", "flac"] as const,
    uploadDir: "./tmp/uploads/audio",
    autoDeleteMinutes: 20,
  },

  /** For document tools */
  document: {
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: ["application/pdf", "application/json"] as const,
    allowedExtensions: ["pdf", "json"] as const,
    uploadDir: "./tmp/uploads/documents",
    autoDeleteMinutes: 20,
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a byte pattern matches the buffer at the given position
 */
function matchesPattern(buffer: Buffer, pattern: BytePattern): boolean {
  if (buffer.length < pattern.length) return false;

  for (let i = 0; i < pattern.length; i++) {
    const expected = pattern[i];
    if (expected === null) continue; // Wildcard
    if (buffer[i] !== expected) return false;
  }

  return true;
}

/**
 * Detect MIME type from file buffer using magic numbers
 */
export function detectMimeType(buffer: Buffer, allowedMimeTypes: readonly string[]): string | null {
  for (const mimeType of allowedMimeTypes) {
    const signatures = FILE_SIGNATURES[mimeType];
    if (!signatures) continue;

    // Empty signatures (text-based) - check via extension later
    if (signatures.length === 0) continue;

    for (const pattern of signatures) {
      if (matchesPattern(buffer, pattern)) {
        return mimeType;
      }
    }
  }

  return null;
}

/**
 * Extract extension from filename (lowercase, without dot)
 */
export function extractExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

/**
 * Check if extension is dangerous
 */
export function isDangerousExtension(extension: string): boolean {
  return DANGEROUS_EXTENSIONS.includes(extension.toLowerCase() as typeof DANGEROUS_EXTENSIONS[number]);
}

/**
 * Generate safe UUID-based filename
 * NEVER uses the original filename
 */
export function generateSafeFilename(extension: string): string {
  const uuid = randomUUID();
  const cleanExt = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${uuid}.${cleanExt}`;
}

/**
 * Ensure directory exists, create if not
 */
async function ensureDirectory(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Validate that path is within sandbox (prevent path traversal)
 */
export function isWithinSandbox(filepath: string, sandboxDir: string): boolean {
  const resolved = path.resolve(filepath);
  const sandbox = path.resolve(sandboxDir);
  return resolved.startsWith(sandbox + path.sep) || resolved === sandbox;
}

// ============================================================================
// MAIN UPLOAD HANDLER
// ============================================================================

/**
 * Process and validate file upload with full security checks
 *
 * @throws UploadError if validation fails
 */
export async function processUpload(
  file: {
    name: string;
    type: string; // MIME type from request
    size: number;
    buffer: Buffer;
  },
  config: UploadConfig
): Promise<UploadResult> {
  const { name: originalName, type: declaredMimeType, size, buffer } = file;

  // 1. Check for empty file
  if (!buffer || buffer.length === 0) {
    throw createUploadError("EMPTY_FILE", "File is empty");
  }

  // 2. Check file size
  if (size > config.maxSizeBytes) {
    throw createUploadError("FILE_TOO_LARGE", `File size (${formatBytes(size)}) exceeds limit (${formatBytes(config.maxSizeBytes)})`, {
      maxSize: config.maxSizeBytes,
      actualSize: size,
    });
  }

  // 3. Extract and validate extension
  const extension = extractExtension(originalName);
  if (!extension) {
    throw createUploadError("INVALID_EXTENSION", "File has no extension");
  }

  // 4. Block dangerous extensions (ALWAYS, regardless of config)
  if (isDangerousExtension(extension)) {
    throw createUploadError("INVALID_EXTENSION", `File extension '.${extension}' is not allowed for security reasons`, {
      blockedExtension: extension,
    });
  }

  // 5. Validate extension against whitelist
  if (!config.allowedExtensions.includes(extension)) {
    throw createUploadError("INVALID_EXTENSION", `File extension '.${extension}' is not allowed`, {
      allowedExtensions: config.allowedExtensions,
      providedExtension: extension,
    });
  }

  // 6. Detect actual MIME type from file content
  const detectedMimeType = detectMimeType(buffer, config.allowedMimeTypes);

  // 7. For text-based formats (JSON, SVG), allow if extension matches
  const isTextBasedFormat =
    (extension === "json" && config.allowedExtensions.includes("json")) ||
    (extension === "svg" && config.allowedExtensions.includes("svg"));

  // 8. Validate MIME type
  if (!detectedMimeType && !isTextBasedFormat) {
    throw createUploadError("INVALID_MIME_TYPE", "File content does not match allowed types", {
      declaredType: declaredMimeType,
      allowedTypes: config.allowedMimeTypes,
    });
  }

  // 9. Generate safe filename (NEVER use original)
  const safeFilename = generateSafeFilename(extension);

  // 10. Ensure upload directory exists
  await ensureDirectory(config.uploadDir);

  // 11. Build full path and validate sandbox
  const safeFilepath = path.join(config.uploadDir, safeFilename);

  if (!isWithinSandbox(safeFilepath, config.uploadDir)) {
    throw createUploadError("SANDBOX_VIOLATION", "Path traversal attempt detected");
  }

  // 12. Write file to disk
  try {
    await writeFile(safeFilepath, buffer);
  } catch (error) {
    throw createUploadError("UPLOAD_FAILED", "Failed to save file", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return {
    filename: safeFilename,
    filepath: safeFilepath,
    originalName, // For reference only - NEVER used for storage
    mimeType: detectedMimeType ?? declaredMimeType,
    size,
  };
}

// ============================================================================
// FILE CLEANUP
// ============================================================================

/**
 * Delete a file from the upload directory
 */
export async function deleteUploadedFile(filepath: string): Promise<boolean> {
  try {
    if (existsSync(filepath)) {
      await unlink(filepath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Clean up files older than specified minutes
 */
export async function cleanupOldFiles(
  directory: string,
  maxAgeMinutes: number
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  if (!existsSync(directory)) {
    return { deleted, errors };
  }

  const { readdir } = await import("fs/promises");
  const files = await readdir(directory);
  const now = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  for (const file of files) {
    const filepath = path.join(directory, file);
    try {
      const stats = await stat(filepath);
      const age = now - stats.mtimeMs;

      if (age > maxAgeMs) {
        await unlink(filepath);
        deleted++;
      }
    } catch {
      errors++;
    }
  }

  return { deleted, errors };
}

// ============================================================================
// ERROR HELPER
// ============================================================================

function createUploadError(
  code: UploadErrorCode,
  message: string,
  details?: Record<string, unknown>
): UploadError {
  return { code, message, details };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================================================
// EXPRESS/NEXT.JS MIDDLEWARE HELPER
// ============================================================================

/**
 * Create upload response (success or error)
 */
export function createUploadResponse(result: UploadResult): Response {
  return Response.json({
    success: true,
    file: {
      filename: result.filename,
      size: result.size,
      mimeType: result.mimeType,
    },
  });
}

/**
 * Create upload error response
 */
export function createUploadErrorResponse(error: UploadError): Response {
  const statusCodes: Record<UploadErrorCode, number> = {
    FILE_TOO_LARGE: 413,
    INVALID_MIME_TYPE: 415,
    INVALID_EXTENSION: 415,
    EMPTY_FILE: 400,
    MISSING_FILENAME: 400,
    UPLOAD_FAILED: 500,
    SANDBOX_VIOLATION: 400,
  };

  return Response.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ?? {}),
      },
    },
    { status: statusCodes[error.code] }
  );
}
