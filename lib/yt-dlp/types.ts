/**
 * yt-dlp Type Definitions
 *
 * Interfaces for yt-dlp JSON output and download operations
 */

export interface YtdlpFormat {
  format_id: string;
  ext: string;
  format: string;
  quality: string;
  filesize?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  has_video: boolean;
  has_audio: boolean;
  width?: number;
  height?: number;
  abr?: number;
  vbr?: number;
  tbr?: number;
}

export interface YtdlpInfo {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  formats: YtdlpFormat[];
  webpage_url: string;
  uploader?: string;
  upload_date?: string;
}

export interface YtdlpResult {
  success: boolean;
  info?: YtdlpInfo;
  error?: string;
  timedOut?: boolean;
}

export interface StreamOptions {
  url: string;
  formatId: string;
  onProgress?: (bytes: number, total?: number) => void;
}
