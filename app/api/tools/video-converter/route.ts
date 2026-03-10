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
  getMediaDuration,
} from "@/lib/ffmpeg/runner";
import { isToolEnabled } from "@/lib/featureFlags";
import { updateProgress, registerProcess } from "./progress/[conversionId]/route";
import { join } from "path";
import { randomUUID } from "crypto";
import { mkdir, stat as statFile } from "fs/promises";
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

const VIDEO_CODECS: Record<VideoFormat, { video: string; audio: string; extraArgs?: string[] }> = {
  mp4: { video: "libx264", audio: "aac", extraArgs: ["-preset", "fast"] },
  // VP9 encoding - balanced quality and file size
  // CRF 31 is good quality while keeping file sizes reasonable (range 0-63)
  // -b:v 0 enables constant quality mode
  // -deadline good -cpu-used 2 balances speed and quality
  webm: { video: "libvpx-vp9", audio: "libopus", extraArgs: ["-crf", "31", "-b:v", "0", "-deadline", "good", "-cpu-used", "2"] },
  mov: { video: "libx264", audio: "aac", extraArgs: ["-preset", "fast"] },
  avi: { video: "mpeg4", audio: "mp3" },
  mkv: { video: "libx264", audio: "aac", extraArgs: ["-preset", "fast"] },
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

    // Generate conversion ID for progress tracking
    const conversionId = randomUUID();
    const outputFilename = `${conversionId}.${format}`;
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
      ];

      // Add format-specific extra args (e.g., webm encoding settings)
      if (codecs.extraArgs) {
        ffmpegArgs.push(...codecs.extraArgs);
      }

      // Add faststart only for MP4 (MOV doesn't need it, WebM doesn't support movflags, AVI doesn't need it)
      if (format === "mp4") {
        ffmpegArgs.push("-movflags", "+faststart");
      }

      ffmpegArgs.push(outputPath);
    } else {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_FORMAT", message: "Unsupported output format" } },
        { status: 400 }
      );
    }

    // Get input duration for accurate progress calculation (before conversion)
    let inputDuration: number | null = null;
    try {
      inputDuration = await getMediaDuration(uploadResult.filepath);
      console.log(`[video-converter] Input duration: ${inputDuration}s`);
    } catch (e) {
      console.log(`[video-converter] Could not get duration, using default`);
    }

    // Start conversion in background - return ID immediately
    runFFmpeg(ffmpegArgs, {
      timeout: 5 * 60 * 1000,
    }, (progress) => {
      // Update progress via SSE
      const progressData = {
        progress: progress.percent,
        frame: progress.frame,
        fps: progress.fps,
        time: progress.time,
        bitrate: progress.bitrate,
        speed: progress.speed,
        remainingTime: progress.remainingTime,
      };
      console.log(`[video-converter] Progress:`, progressData);
      updateProgress(conversionId, progressData);
    }, inputDuration || undefined, (process) => {
      // Register the process for cancellation
      registerProcess(conversionId, process);
      console.log(`[video-converter] Process registered for cancellation: ${conversionId}`);
    }).then(async (result) => {
      // Conversion complete or failed
      if (result.success) {
        // Get output file size with retry mechanism
        console.log(`[video-converter] FFmpeg completed successfully. Checking output file at: ${outputPath}`);
        let outputSize = 0;

        // Retry loop - file might be empty immediately after FFmpeg finishes
        const maxRetries = 20;
        const retryDelay = 250;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          // Wait before checking
          await new Promise(resolve => setTimeout(resolve, retryDelay));

          if (!existsSync(outputPath)) {
            console.log(`[video-converter] Attempt ${attempt + 1}: File not found yet, waiting...`);
            continue;
          }

          try {
            const stats = await statFile(outputPath);
            outputSize = stats.size;
            console.log(`[video-converter] Attempt ${attempt + 1}: Size = ${outputSize} bytes`);

            if (outputSize > 0) {
              console.log(`[video-converter] Got valid file size: ${outputSize} bytes`);
              break;
            }
          } catch (err) {
            console.log(`[video-converter] Attempt ${attempt + 1}: Stat failed:`, err);
          }
        }

        if (outputSize === 0) {
          console.error(`[video-converter] WARNING: Could not get file size after ${maxRetries} attempts`);
        }

        const conversionResult = {
          id: conversionId,
          input: { filename: uploadResult.originalName, size: uploadResult.size },
          output: {
            filename: outputFilename,
            downloadUrl: `/api/download/video-converter/${outputFilename}`,
            format: format,
            size: outputSize,
          },
          duration: result.duration,
          type: conversionType === "audio" ? "audio" : "video",
        };

        // Add bitrate for audio conversions
        if (conversionType === "audio" && isAudioFormat(format)) {
          const audioConfig = AUDIO_CODECS[format];
          (conversionResult.output as any).bitrate = bitrate ?? audioConfig.defaultBitrate;
        }

        updateProgress(conversionId, {
          progress: 100,
          frame: 0,
          fps: 0,
          time: "00:00:00.00",
          bitrate: "0kbits/s",
          speed: "1x",
          result: conversionResult,
        });
        console.log(`[video-converter] Conversion complete with size: ${outputSize} bytes`);
      } else {
        // Conversion failed
        console.error(`[video-converter] FFmpeg failed:`, result.error, result.stderr);
        updateProgress(conversionId, {
          progress: -1,
          frame: 0,
          fps: 0,
          time: "00:00:00.00",
          bitrate: "0kbits/s",
          speed: "0x",
        });
      }
    });

    // Return immediately with conversion ID
    return NextResponse.json({
      success: true,
      conversion: {
        id: conversionId,
        input: { filename: uploadResult.originalName, size: uploadResult.size },
        output: {
          filename: outputFilename,
          downloadUrl: `/api/download/video-converter/${outputFilename}`,
          format: format,
          size: 0, // Will be updated when complete
        },
        duration: 0, // Will be updated when complete
        type: conversionType === "audio" ? "audio" : "video",
      },
    });
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
