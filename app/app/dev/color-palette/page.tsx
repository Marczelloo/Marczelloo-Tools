"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

type PaletteType = "analogous" | "complementary" | "triadic" | "tetradic" | "monochromatic";

interface ColorStop {
  hex: string;
  name: string;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];

  const r = parseInt(result[1] ?? "0", 16) / 255;
  const g = parseInt(result[2] ?? "0", 16) / 255;
  const b = parseInt(result[3] ?? "0", 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generatePalette(baseColor: string, type: PaletteType): ColorStop[] {
  const [h, s, l] = hexToHsl(baseColor);
  const colors: ColorStop[] = [];

  switch (type) {
    case "analogous":
      colors.push({ hex: hslToHex((h - 30 + 360) % 360, s, l), name: "Analogous 1" });
      colors.push({ hex: hslToHex((h - 15 + 360) % 360, s, l), name: "Analogous 2" });
      colors.push({ hex: baseColor, name: "Base" });
      colors.push({ hex: hslToHex((h + 15) % 360, s, l), name: "Analogous 3" });
      colors.push({ hex: hslToHex((h + 30) % 360, s, l), name: "Analogous 4" });
      break;

    case "complementary":
      colors.push({ hex: baseColor, name: "Base" });
      colors.push({ hex: hslToHex((h + 180) % 360, s, l), name: "Complementary" });
      colors.push({ hex: hslToHex(h, s, Math.max(0, l - 20)), name: "Shade" });
      colors.push({ hex: hslToHex((h + 180) % 360, s, Math.max(0, l - 20)), name: "Shade Complement" });
      colors.push({ hex: hslToHex(h, Math.max(0, s - 30), l), name: "Tone" });
      break;

    case "triadic":
      colors.push({ hex: baseColor, name: "Base" });
      colors.push({ hex: hslToHex((h + 120) % 360, s, l), name: "Triadic 1" });
      colors.push({ hex: hslToHex((h + 240) % 360, s, l), name: "Triadic 2" });
      break;

    case "tetradic":
      colors.push({ hex: baseColor, name: "Base" });
      colors.push({ hex: hslToHex((h + 90) % 360, s, l), name: "Tetradic 1" });
      colors.push({ hex: hslToHex((h + 180) % 360, s, l), name: "Tetradic 2" });
      colors.push({ hex: hslToHex((h + 270) % 360, s, l), name: "Tetradic 3" });
      break;

    case "monochromatic":
      colors.push({ hex: hslToHex(h, s, Math.min(100, l + 30)), name: "Light" });
      colors.push({ hex: hslToHex(h, s, Math.min(100, l + 15)), name: "Lighter" });
      colors.push({ hex: baseColor, name: "Base" });
      colors.push({ hex: hslToHex(h, s, Math.max(0, l - 15)), name: "Darker" });
      colors.push({ hex: hslToHex(h, s, Math.max(0, l - 30)), name: "Dark" });
      break;
  }

  return colors;
}

function getContrastColor(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "#ffffff";

  const r = parseInt(result[1] ?? "0", 16);
  const g = parseInt(result[2] ?? "0", 16);
  const b = parseInt(result[3] ?? "0", 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

// ============================================================================
// COLOR PALETTE GENERATOR COMPONENT
// ============================================================================

function ColorPaletteInner(): React.JSX.Element {
  const { tool } = useTool();
  const [baseColor, setBaseColor] = useState("#58a6ff");
  const [paletteType, setPaletteType] = useState<PaletteType>("analogous");
  const [palette, setPalette] = useState<ColorStop[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = useCallback(() => {
    const colors = generatePalette(baseColor, paletteType);
    setPalette(colors);
  }, [baseColor, paletteType]);

  const randomize = useCallback(() => {
    const randomHex = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    setBaseColor(randomHex);
  }, []);

  const copyColor = useCallback(async (hex: string) => {
    await navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const exportCss = useCallback(() => {
    const css = palette
      .map((c, i) => `  --color-${i + 1}: ${c.hex};`)
      .join("\n");
    return `:root {\n${css}\n}`;
  }, [palette]);

  const copyCss = useCallback(async () => {
    await navigator.clipboard.writeText(exportCss());
    setCopied("css");
    setTimeout(() => setCopied(null), 2000);
  }, [exportCss]);

  // Generate on mount and changes
  useState(() => {
    generate();
  });

  const paletteTypes: { id: PaletteType; name: string; description: string }[] = [
    { id: "analogous", name: "Analogous", description: "Adjacent colors" },
    { id: "complementary", name: "Complementary", description: "Opposite colors" },
    { id: "triadic", name: "Triadic", description: "Three equally spaced" },
    { id: "tetradic", name: "Tetradic", description: "Four equally spaced" },
    { id: "monochromatic", name: "Monochromatic", description: "Shades of one" },
  ];

  // Generate palette when dependencies change
  useState(() => {
    generate();
  });

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Color Palette Generator"}
        description="Generate beautiful color palettes"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-4xl mx-auto">
          {/* Controls */}
          <Surface variant="elevated" padding="lg" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Color */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Base Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="w-16 h-16 rounded-lg cursor-pointer border-2 border-white/10"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={baseColor}
                      onChange={(e) => setBaseColor(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white font-mono uppercase focus:outline-none focus:border-white/30"
                    />
                    <button
                      onClick={randomize}
                      className="mt-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Random Color
                    </button>
                  </div>
                </div>
              </div>

              {/* Palette Type */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Palette Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paletteTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => { setPaletteType(type.id); generate(); }}
                      className={`px-3 py-2 text-left rounded transition-colors ${
                        paletteType === type.id
                          ? "bg-white text-black"
                          : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5"
                      }`}
                    >
                      <span className="block font-medium text-sm">{type.name}</span>
                      <span className="block text-xs text-zinc-500">{type.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => { generate(); }}
                className="px-6 py-2 bg-white text-black font-medium rounded-md hover:bg-zinc-200 transition-colors"
              >
                Generate Palette
              </button>
            </div>
          </Surface>

          {/* Palette Display */}
          <Surface variant="elevated" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Generated Palette</h2>
              <button
                onClick={copyCss}
                className={`px-4 py-2 text-sm rounded border border-white/10 transition-colors ${
                  copied === "css"
                    ? "bg-white text-black"
                    : "bg-black text-zinc-400 hover:bg-white/5"
                }`}
              >
                {copied === "css" ? "Copied!" : "Export CSS"}
              </button>
            </div>

            {/* Color Swatches */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {palette.map((color, index) => (
                <div key={index} className="group">
                  <div
                    className="aspect-square rounded-lg shadow-lg cursor-pointer relative overflow-hidden border border-white/10"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => copyColor(color.hex)}
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
                    >
                      <span
                        className="text-xs font-medium px-2 py-1 rounded"
                        style={{ color: getContrastColor(color.hex), backgroundColor: "rgba(0,0,0,0.5)" }}
                      >
                        {copied === color.hex ? "Copied!" : "Copy"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-white">{color.name}</p>
                    <p className="text-xs font-mono text-zinc-500 uppercase">{color.hex}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CSS Output */}
            <div className="mt-6 p-4 bg-zinc-900/50 rounded-md">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
                CSS Variables
              </p>
              <pre className="text-sm text-white font-mono overflow-x-auto">
                {exportCss()}
              </pre>
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

export default function ColorPalettePage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "color-palette",
    name: "Color Palette Generator",
    description: "Generate beautiful color palettes",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/color-palette",
  };

  return (
    <ToolProvider tool={tool}>
      <ColorPaletteInner />
    </ToolProvider>
  );
}
