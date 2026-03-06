"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";
import { Tabs } from "@/components/ui/tabs";

// ============================================================================
// TYPES
// ============================================================================

type CompressionMode = "simple" | "advanced";
type SimplePreset = "smallest" | "balanced" | "best";
type OutputFormat = "mp3" | "aac" | "ogg";

interface CompressionResult {
  input: {
    filename: string;
    size: number;
  };
  output: {
    filename: string;
    downloadUrl: string;
    size: number;
    compressionRatio: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function estimateSize(originalSize: number, preset: SimplePreset): number {
  // Compression ratios aligned with advanced formula (bitrate / 320)
  // 64 kbps -> 0.2, 128 kbps -> 0.4, 192 kbps -> 0.6
  const ratios: Record<SimplePreset, number> = {
    smallest: 0.2,   // 64 kbps - aggressive compression
    balanced: 0.4,   // 128 kbps - standard quality
    best: 0.6,       // 192 kbps - high quality
  };
  return Math.round(originalSize * ratios[preset]);
}

function estimateAdvancedSize(originalSize: number, bitrate: string): number {
  // Parse bitrate (e.g., "128" -> 128)
  const bitrateNum = parseInt(bitrate, 10) || 128;

  // Map bitrate to compression ratio (linear scale)
  // 32 kbps -> ~0.1, 128 kbps -> 0.4, 320 kbps -> 1.0
  const ratio = Math.min(1.0, Math.max(0.2, bitrateNum / 320));

  return Math.round(originalSize * ratio);
}

// ============================================================================
// OPTIONS
// ============================================================================

const COMPRESSION_MODES = [
  { value: "simple", label: "Simple" },
  { value: "advanced", label: "Advanced" },
] as const;

const SIMPLE_PRESETS: readonly FormatOption[] = [
  { value: "smallest", label: "Smallest", desc: "64 kbps" },
  { value: "balanced", label: "Balanced", desc: "128 kbps" },
  { value: "best", label: "Best Quality", desc: "192 kbps" },
] as const;

const SAMPLE_RATE_OPTIONS: readonly FormatOption[] = [
  { value: "22050", label: "22.05 kHz", desc: "Voice" },
  { value: "44100", label: "44.1 kHz", desc: "CD" },
  { value: "48000", label: "48 kHz", desc: "Pro" },
] as const;

const CHANNEL_OPTIONS: readonly FormatOption[] = [
  { value: "1", label: "Mono", desc: "1 ch" },
  { value: "2", label: "Stereo", desc: "2 ch" },
] as const;

const OUTPUT_FORMATS: readonly FormatOption[] = [
  { value: "mp3", label: "MP3", desc: "Universal" },
  { value: "aac", label: "AAC", desc: "Efficient" },
  { value: "ogg", label: "OGG", desc: "Open" },
] as const;

// ============================================================================
// AUDIO COMPRESSOR COMPONENT
// ============================================================================

function AudioCompressorInner(): React.JSX.Element {
  const { tool } = useTool();

  // Mode and file
  const [mode, setMode] = useState<CompressionMode>("simple");
  const [file, setFile] = useState<File | null>(null);

  // Simple mode state
  const [preset, setPreset] = useState<SimplePreset>("balanced");

  // Advanced mode state
  const [bitrate, setBitrate] = useState("128");
  const [sampleRate, setSampleRate] = useState("44100");
  const [channels, setChannels] = useState("2");

  // Common state
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp3");

  // UI state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate estimated size based on mode
  const estimatedSize = file
    ? mode === "simple"
      ? estimateSize(file.size, preset)
      : estimateAdvancedSize(file.size, bitrate)
    : 0;
  const compressionRatio = file ? ((1 - estimatedSize / file.size) * 100).toFixed(0) : "0";

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("outputFormat", outputFormat);

    if (mode === "simple") {
      formData.append("preset", preset);
    } else {
      formData.append("bitrate", `${bitrate}k`);
      formData.append("sampleRate", sampleRate);
      formData.append("channels", channels);
    }

    try {
      const response = await fetch("/api/tools/audio-compressor", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Compression failed");
        setLoading(false);
        return;
      }

      setResult(data.compression);
      setLoading(false);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [file, mode, preset, outputFormat, bitrate, sampleRate, channels]);

  const resetState = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setMode("simple");
    setPreset("balanced");
    setOutputFormat("mp3");
    setBitrate("128");
    setSampleRate("44100");
    setChannels("2");
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Audio Compressor"}
        description="Compress audio files to reduce size"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* Step 1: File Upload */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  1
                </span>
                Select Audio
              </legend>
              <TactileDropzone
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                  setError(null);
                  setResult(null);
                }}
                accept="audio/*"
                currentFile={file}
                maxSizeLabel="Max 100MB"
                fileTypesLabel="MP3, WAV, AAC, OGG, FLAC"
              />
            </fieldset>

            {/* Step 2: Mode Tabs */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Compression Mode
              </legend>
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as CompressionMode)}
                tabs={COMPRESSION_MODES}
              />
            </fieldset>

            {/* Step 3: Mode-Specific Options */}
            {mode === "simple" && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-white mb-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                    3
                  </span>
                  Quality Preset
                </legend>
                <TactileFormatGrid
                  options={SIMPLE_PRESETS}
                  value={preset}
                  onChange={(v) => setPreset(v as SimplePreset)}
                />
              </fieldset>
            )}

            {mode === "advanced" && (
              <>
                {/* Bitrate Input */}
                <fieldset className="mb-6">
                  <legend className="text-sm font-semibold text-zinc-400 mb-3">
                    Bitrate
                  </legend>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={bitrate}
                      onChange={(e) => setBitrate(e.target.value)}
                      min="32"
                      max="320"
                      placeholder="128"
                      className="flex-1 px-4 py-2 bg-zinc-900 border border-white/10 rounded-md text-white font-mono text-sm focus:outline-none focus:border-white/30"
                    />
                    <span className="text-zinc-500 text-sm">kbps</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">Range: 32-320 kbps</p>
                </fieldset>

                {/* Sample Rate Selection */}
                <fieldset className="mb-6">
                  <legend className="text-sm font-semibold text-zinc-400 mb-3">
                    Sample Rate
                  </legend>
                  <TactileFormatGrid
                    options={SAMPLE_RATE_OPTIONS}
                    value={sampleRate}
                    onChange={setSampleRate}
                    columns={3}
                  />
                </fieldset>

                {/* Channels Selection */}
                <fieldset className="mb-6">
                  <legend className="text-sm font-semibold text-zinc-400 mb-3">
                    Channels
                  </legend>
                  <TactileFormatGrid
                    options={CHANNEL_OPTIONS}
                    value={channels}
                    onChange={setChannels}
                    columns={2}
                  />
                </fieldset>
              </>
            )}

            {/* Step 4: Output Format */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  {mode === "simple" ? "4" : "4"}
                </span>
                Output Format
              </legend>
              <TactileFormatGrid
                options={OUTPUT_FORMATS}
                value={outputFormat}
                onChange={(v) => setOutputFormat(v as OutputFormat)}
                columns={3}
              />
            </fieldset>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-700 rounded-md">
                <p className="text-zinc-300 text-sm">{error}</p>
              </div>
            )}

            {/* Result Display */}
            {result && !loading && (
              <fieldset className="mb-6">
                <legend className="text-lg font-semibold text-zinc-200 mb-4">
                  Compression Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">New Size</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.output.size)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Reduction</p>
                      <p className="text-white font-medium font-mono">{result.output.compressionRatio}</p>
                    </div>
                  </div>
                  <a
                    href={result.output.downloadUrl}
                    download
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                  >
                    Download Audio
                  </a>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <TactileButton
                onClick={result ? resetState : handleCompress}
                disabled={!file || (loading && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Compressing..." : "Compress Audio"}
              </TactileButton>

              {file && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={resetState}
                  disabled={loading}
                >
                  Clear
                </TactileButton>
              )}
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function AudioCompressorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "audio-compressor",
    name: "Audio Compressor",
    description: "Compress audio files to reduce size",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/audio-compressor",
  };

  return (
    <ToolProvider tool={tool}>
      <AudioCompressorInner />
    </ToolProvider>
  );
}
