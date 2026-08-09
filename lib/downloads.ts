import { existsSync } from "fs";
import { join, resolve } from "path";

export const TOOL_DIRECTORIES: Readonly<Record<string, string>> = {
  "mp4-to-mp3": "./tmp/processed/mp4-to-mp3",
  "png-to-webp": "./tmp/processed/png-to-webp",
  "image-converter": "./tmp/processed/image-converter",
  "image-compressor": "./tmp/processed/image-compressor",
  "image-cropper": "./tmp/processed/image-cropper",
  "background-remover": "./tmp/processed/background-remover",
  "favicon-generator": "./tmp/processed/favicon-generator",
  "video-compressor": "./tmp/processed/video-compressor",
  "video-converter": "./tmp/processed/video-converter",
  "video-trimmer": "./tmp/processed/video-trimmer",
  "audio-converter": "./tmp/processed/audio-converter",
  "audio-compressor": "./tmp/processed/audio-compressor",
  "audio-trimmer": "./tmp/processed/audio-trimmer",
  "volume-booster": "./tmp/processed/volume-booster",
  "pdf-compressor": "./tmp/processed/pdf-compressor",
  "pdf-merge": "./tmp/processed/pdf-merge",
  "pdf-split": "./tmp/processed/pdf-split",
  "pdf-to-word": "./tmp/processed/pdf-to-word",
  "website-screenshot": "./tmp/processed/website-screenshot",
};

export const CONTENT_TYPES: Readonly<Record<string, string>> = {
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
  png: "image/png",
  webp: "image/webp",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  ico: "image/x-icon",
};

export function getDownloadDirectory(tool: string): string | null {
  return TOOL_DIRECTORIES[tool] ?? null;
}

export function isSafePathSegment(segment: string): boolean {
  return Boolean(segment) && segment !== "." && segment !== ".." && !/[\\/\0]/.test(segment);
}

export function getDownloadPath(tool: string, segments: string[]): string | null {
  const directory = getDownloadDirectory(tool);
  if (!directory || segments.length === 0 || !segments.every(isSafePathSegment)) return null;

  const root = resolve(directory);
  const filepath = resolve(join(root, ...segments));
  if (
    filepath !== root &&
    !filepath.startsWith(`${root}${"\\"}`) &&
    !filepath.startsWith(`${root}/`)
  )
    return null;
  return filepath;
}

export function getContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

export function downloadExists(filepath: string): boolean {
  return existsSync(filepath);
}
