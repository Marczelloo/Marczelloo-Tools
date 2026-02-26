"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

type GradientType = "linear" | "radial" | "conic";
type GradientDirection = "to right" | "to left" | "to bottom" | "to top" | "to bottom right" | "to bottom left" | "to top right" | "to top left";

interface ColorStop {
  color: string;
  position: number;
}

// ============================================================================
// CSS GRADIENT GENERATOR COMPONENT
// ============================================================================

function CssGradientInner(): React.JSX.Element {
  const { tool } = useTool();
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(90);
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { color: "#58a6ff", position: 0 },
    { color: "#a371f7", position: 100 },
  ]);
  const [copied, setCopied] = useState<string | null>(null);

  const directions: { id: GradientDirection; label: string; angle: number }[] = [
    { id: "to right", label: "→", angle: 90 },
    { id: "to left", label: "←", angle: 270 },
    { id: "to bottom", label: "↓", angle: 180 },
    { id: "to top", label: "↑", angle: 0 },
    { id: "to bottom right", label: "↘", angle: 135 },
    { id: "to bottom left", label: "↙", angle: 225 },
    { id: "to top right", label: "↗", angle: 45 },
    { id: "to top left", label: "↖", angle: 315 },
  ];

  const generateCss = useCallback((): string => {
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
    const colorString = sortedStops
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(", ");

    switch (gradientType) {
      case "linear":
        return `linear-gradient(${angle}deg, ${colorString})`;
      case "radial":
        return `radial-gradient(circle, ${colorString})`;
      case "conic":
        return `conic-gradient(from ${angle}deg, ${colorString})`;
      default:
        return `linear-gradient(${angle}deg, ${colorString})`;
    }
  }, [gradientType, angle, colorStops]);

  const copyCss = useCallback(async () => {
    const css = `background: ${generateCss()};`;
    await navigator.clipboard.writeText(css);
    setCopied("css");
    setTimeout(() => setCopied(null), 2000);
  }, [generateCss]);

  const addColorStop = useCallback(() => {
    const lastStop = colorStops[colorStops.length - 1];
    const newPosition = lastStop
      ? Math.min(100, lastStop.position + 25)
      : 50;
    setColorStops([...colorStops, { color: "#ffffff", position: newPosition }]);
  }, [colorStops]);

  const removeColorStop = useCallback((index: number) => {
    if (colorStops.length > 2) {
      setColorStops(colorStops.filter((_, i) => i !== index));
    }
  }, [colorStops]);

  const updateColorStop = useCallback((index: number, updates: Partial<ColorStop>) => {
    setColorStops(colorStops.map((stop, i) =>
      i === index ? { ...stop, ...updates } : stop
    ));
  }, [colorStops]);

  const presetGradients = [
    { name: "Sunset", stops: [{ color: "#ff7e5f", position: 0 }, { color: "#feb47b", position: 100 }] },
    { name: "Ocean", stops: [{ color: "#2193b0", position: 0 }, { color: "#6dd5ed", position: 100 }] },
    { name: "Purple", stops: [{ color: "#667eea", position: 0 }, { color: "#764ba2", position: 100 }] },
    { name: "Fire", stops: [{ color: "#f12711", position: 0 }, { color: "#f5af19", position: 100 }] },
    { name: "Forest", stops: [{ color: "#134e5e", position: 0 }, { color: "#71b280", position: 100 }] },
    { name: "Night", stops: [{ color: "#0f0c29", position: 0 }, { color: "#302b63", position: 50 }, { color: "#24243e", position: 100 }] },
  ];

  const applyPreset = useCallback((preset: typeof presetGradients[0]) => {
    setColorStops(preset.stops);
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "CSS Gradient Generator"}
        description="Create CSS gradients visually"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preview */}
            <div className="lg:col-span-2">
              <Surface variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>

                {/* Gradient Preview */}
                <div
                  className="aspect-video rounded-lg shadow-lg border border-white/10"
                  style={{ background: generateCss() }}
                />

                {/* CSS Output */}
                <div className="mt-4 p-4 bg-zinc-900/50 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                      CSS Code
                    </span>
                    <button
                      onClick={copyCss}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        copied === "css"
                          ? "bg-white text-black"
                          : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5"
                      }`}
                    >
                      {copied === "css" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <code className="text-sm text-white font-mono break-all">
                    background: {generateCss()};
                  </code>
                </div>
              </Surface>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <Surface variant="elevated" padding="lg">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                  Gradient Type
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(["linear", "radial", "conic"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setGradientType(type)}
                      className={`px-3 py-2 text-sm font-medium rounded capitalize transition-colors ${
                        gradientType === type
                          ? "bg-white text-black"
                          : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </Surface>

              {gradientType !== "radial" && (
                <Surface variant="elevated" padding="lg">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    Direction
                  </h3>

                  {/* Angle Slider */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">Angle</span>
                      <span className="text-sm font-mono text-white">{angle}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={angle}
                      onChange={(e) => setAngle(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Direction Presets */}
                  <div className="grid grid-cols-4 gap-2">
                    {directions.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setAngle(d.angle);
                        }}
                        className={`px-3 py-2 text-lg rounded transition-colors ${
                          angle === d.angle
                            ? "bg-white text-black"
                            : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5"
                        }`}
                        title={d.id}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </Surface>
              )}

              <Surface variant="elevated" padding="lg">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                  Color Stops
                </h3>

                <div className="space-y-3">
                  {colorStops.map((stop, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={stop.color}
                        onChange={(e) => updateColorStop(index, { color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-white/10"
                      />
                      <input
                        type="text"
                        value={stop.color}
                        onChange={(e) => updateColorStop(index, { color: e.target.value })}
                        className="flex-1 px-3 py-2 bg-black border border-white/10 rounded text-white text-sm font-mono"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={stop.position}
                        onChange={(e) => updateColorStop(index, { position: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-2 bg-black border border-white/10 rounded text-white text-sm text-center font-mono"
                      />
                      <span className="text-xs text-zinc-500">%</span>
                      {colorStops.length > 2 && (
                        <button
                          onClick={() => removeColorStop(index)}
                          className="px-2 py-1 text-zinc-400 hover:text-white rounded transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addColorStop}
                  className="mt-4 w-full px-4 py-2 border border-dashed border-white/10 text-zinc-400 text-sm rounded hover:border-white/30 hover:text-white transition-colors"
                >
                  + Add Color Stop
                </button>
              </Surface>

              <Surface variant="elevated" padding="lg">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                  Presets
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {presetGradients.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="p-2 rounded border border-white/10 hover:border-white/30 transition-colors"
                    >
                      <div
                        className="aspect-video rounded mb-1"
                        style={{
                          background: `linear-gradient(to right, ${preset.stops.map(s => `${s.color} ${s.position}%`).join(", ")})`,
                        }}
                      />
                      <span className="text-xs text-zinc-400">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </Surface>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function CssGradientPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "css-gradient",
    name: "CSS Gradient Generator",
    description: "Create CSS gradients visually",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/css-gradient",
  };

  return (
    <ToolProvider tool={tool}>
      <CssGradientInner />
    </ToolProvider>
  );
}
