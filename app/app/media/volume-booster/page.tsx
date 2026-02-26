"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const VOLUME_PRESETS: readonly FormatOption[] = [
  { value: "0.5", label: "50%", desc: "Quieter" },
  { value: "1.0", label: "100%", desc: "Original" },
  { value: "1.5", label: "150%", desc: "Moderate boost" },
  { value: "2.0", label: "200%", desc: "Double" },
  { value: "3.0", label: "300%", desc: "Strong boost" },
] as const;

function VolumeBoosterInner(): React.JSX.Element {
  const { tool } = useTool();

  const [file, setFile] = useState<File | null>(null);
  const [volume, setVolume] = useState(1.5);
  const [normalize, setNormalize] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    volumeBoost: {
      output: { filename: string; downloadUrl: string; size: number };
      settings: { volumeMultiplier: string; normalized: boolean };
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBoost = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("volume", volume.toString());
    formData.append("normalize", normalize.toString());

    try {
      const response = await fetch("/api/tools/volume-booster", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message ?? "Volume adjustment failed");
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }, [file, volume, normalize]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Volume Booster"}
        description="Increase audio volume levels"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* File Upload */}
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

            {/* Volume Settings */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-white mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
                  2
                </span>
                Volume Settings
              </legend>

              <TactileFormatGrid
                options={VOLUME_PRESETS}
                value={volume.toString()}
                onChange={(v) => setVolume(parseFloat(v))}
              />

              <div className="mt-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Custom Volume</span>
                  <span className="text-sm font-mono text-white">{volume.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={normalize}
                  onChange={(e) => setNormalize(e.target.checked)}
                  className="rounded border-white/10 bg-black"
                />
                <span>Normalize audio (recommended for mixed sources)</span>
              </label>
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
                  Processing Complete
                </legend>
                <div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-zinc-500">Volume</p>
                      <p className="text-white font-medium font-mono">{result.volumeBoost.settings.volumeMultiplier}x</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Output Size</p>
                      <p className="text-white font-medium font-mono">{formatSize(result.volumeBoost.output.size)}</p>
                    </div>
                  </div>
                  <a
                    href={result.volumeBoost.output.downloadUrl}
                    className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
                    download
                  >
                    Download Audio
                  </a>
                </div>
              </fieldset>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <TactileButton
                onClick={result ? () => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                } : handleBoost}
                disabled={!file || (loading && !result)}
                loading={loading && !result}
                variant={result ? "secondary" : "primary"}
                fullWidth
              >
                {result ? "Start Over" : loading ? "Processing..." : "Adjust Volume"}
              </TactileButton>

              {file && !result && (
                <TactileButton
                  variant="secondary"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
                  }}
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

export default function VolumeBoosterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "volume-booster",
    name: "Volume Booster",
    description: "Increase audio volume levels",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/volume-booster",
  };

  return (
    <ToolProvider tool={tool}>
      <VolumeBoosterInner />
    </ToolProvider>
  );
}
