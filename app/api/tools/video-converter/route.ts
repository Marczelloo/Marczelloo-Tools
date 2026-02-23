/**
 * Video Converter API
 *
 * POST /api/tools/video-converter
 *
 * Converts video files between formats (MP4, WebM, MOV, AVI, MKV)
 * Also supports extracting audio from video (MP3, AAC, WAV, OGG)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  processUpload,
  DEFAULT_UPLOAD_CONFIGS,
  type UploadResult,
} from "@/lib/security/upload";
import {
  runFFmpeg,
  buildFFmpegArgs,
  validateInputFile,
} from "@/lib/ffmpeg/runner";
import { isToolEnabled } from "@/lib/featureFlags";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

// ============================================================================
// CONFIG
// ============================================================================

const TOOL_ID = "video-converter";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.video,
  allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"],
  allowedExtensions: ["mp4", "webm", "mov", "avi", "mkv"],
  uploadDir: "./tmp/uploads/video-converter",
  maxSizeBytes: 200 * 1024 * 1024, // 200MB
};

// Video output formats
const VIDEO_FORMATS = ["mp4", "webm", "mov", "avi", "mkv"] as const;
type VideoFormat = typeof VIDEO_FORMATS[number];

// Audio output formats
const AUDIO_FORMATS = ["mp3", "aac", "wav", "ogg", "m4a"] as const;
type AudioFormat = typeof AUDIO_FORMATS[number];

type OutputFormat = VideoFormat | AudioFormat;

const isVideoFormat = (format: string): format is VideoFormat =>
  VIDEO_FORMATS.includes(format as VideoFormat);

const isAudioFormat = (format: string): format is AudioFormat =>
  AUDIO_FORMATS.includes(format as AudioFormat);

const VIDEO_CODECS: Record<VideoFormat, { video: string; audio: string }> = {
  mp4: { video: "libx264", audio: "aac" },
  webm: { video: "libvpx-vp9", audio: "libopus" },
  mov: { video: "libx264", audio: "aac" },
  avi: { video: "mpeg4", audio: "mp3" },
  mkv: { video: "libx264", audio: "aac" },
};

const AUDIO_CODECS: Record<AudioFormat, { codec: string; defaultBitrate: string }> = {
  mp3: { codec: "libmp3lame", defaultBitrate: "192k" },
  aac: { codec: "aac", defaultBitrate: "192k" },
  wav: { codec: "pcm_s16le", defaultBitrate: "" }, // WAV is uncompressed
  ogg: { codec: "libvorbis", defaultBitrate: "192k" },
  m4a: { codec: "aac", defaultBitrate: "192k" },
};

// ============================================================================
// HELPER: PARSE FORM DATA
// ============================================================================

async function parseFormData(request: NextRequest): Promise<{
  file: File | null;
  outputFormat?: OutputFormat;
  bitrate?: string;
  conversionType?: "video" | "audio";
}> {
  const formData = await request.formData();
  const file = formData.get("file");
  const outputFormat = formData.get("outputFormat")?.toString();
  const bitrate = formData.get("bitrate")?.toString();
  const conversionType = formData.get("conversionType")?.toString();

  // Validate output format
  const allFormats = [...VIDEO_FORMATS, ...AUDIO_FORMATS];
  const validFormat = outputFormat && allFormats.includes(outputFormat as OutputFormat)
    ? (outputFormat as OutputFormat)
    : "mp4";

  // Validate bitrate format (e.g., "128k", "192k", "320k")
  const validBitrate = bitrate && /^\d+[kMG]?$/.test(bitrate) ? bitrate : undefined;

  return {
    file: file instanceof File ? file : null,
    outputFormat: validFormat,
    bitrate: validBitrate,
    conversionType: conversionType === "audio" ? "audio" : "video",
  };
}

// ============================================================================
// POST - CONVERT VIDEO
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json(
      { success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } },
      { status: 403 }
    );
  }

  try {
    const { file, outputFormat, bitrate, conversionType } = await parseFormData(request);

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "No video file provided" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let uploadResult: UploadResult;
    try {
      uploadResult = await processUpload(
        { name: file.name, type: file.type, size: file.size, buffer },
        UPLOAD_CONFIG
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        return NextResponse.json(
          { success: false, error: { code: (error as { code?: string }).code ?? "UPLOAD_ERROR", message: (error as { message?: string }).message ?? "Upload validation failed" } },
          { status: 400 }
        );
      }
      throw error;
    }

    if (!(await validateInputFile(uploadResult.filepath))) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_NOT_FOUND", message: "Uploaded file not found" } },
        { status: 500 }
      );
    }

    const format = outputFormat ?? "mp4";
    const outputDir = "./tmp/processed/video-converter";
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputFilename = `${randomUUID()}.${format}`;
    const outputPath = join(outputDir, outputFilename);

    let ffmpegArgs: string[];

    if (conversionType === "audio" && isAudioFormat(format)) {
      // Video to Audio conversion
      const audioConfig = AUDIO_CODECS[format];
      const effectiveBitrate = bitrate ?? audioConfig.defaultBitrate;

      ffmpegArgs = buildFFmpegArgs({
        input: uploadResult.filepath,
        output: outputPath,
        codec: audioConfig.codec,
        format: format,
        bitrate: effectiveBitrate || undefined,
      });

      // Add -vn to disable video stream
      ffmpegArgs = ["-vn", ...ffmpegArgs];
    } else if (isVideoFormat(format)) {
      // Video to Video conversion
      const codecs = VIDEO_CODECS[format];

      ffmpegArgs = [
        "-y",
        "-i", uploadResult.filepath,
        "-c:v", codecs.video,
        "-c:a", codecs.audio,
        "-movflags", "+faststart",
        outputPath,
      ];
    } else {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_FORMAT", message: "Unsupported output format" } },
        { status: 400 }
      );
    }

    const result = await runFFmpeg(ffmpegArgs, {
      timeout: 5 * 60 * 1000,
      workDir: "./tmp/ffmpeg",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "CONVERSION_FAILED", message: result.timedOut ? "Conversion timed out" : result.error || "FFmpeg conversion failed" } },
        { status: 500 }
      );
    }

    const { stat } = await import("fs/promises");
    let outputSize = 0;
    try {
      const stats = await stat(outputPath);
      outputSize = stats.size;
    } catch { /* ignore */ }

    const response: {
      success: boolean;
      conversion: {
        input: { filename: string; size: number };
        output: {
          filename: string;
          downloadUrl: string;
          format: string;
          size: number;
          bitrate?: string;
        };
        duration: number;
        type: "video" | "audio";
      };
    } = {
      success: true,
      conversion: {
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/video-converter/${outputFilename}`,
          format: format,
          size: outputSize,
        },
        duration: result.duration,
        type: conversionType === "audio" ? "audio" : "video",
      },
    };

    // Add bitrate for audio conversions
    if (conversionType === "audio" && isAudioFormat(format)) {
      const audioConfig = AUDIO_CODECS[format];
      response.conversion.output.bitrate = bitrate ?? audioConfig.defaultBitrate;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Video conversion error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during conversion" } },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to convert files" } },
    { status: 405 }
  );
}
