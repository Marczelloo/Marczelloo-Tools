"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// BOX SHADOW GENERATOR COMPONENT
// ============================================================================

function BoxShadowInner(): React.JSX.Element {
  const { tool } = useTool();
  const [shadows, setShadows] = useState([
    { offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: "#000000", opacity: 25, inset: false },
  ]);
  const [boxBg, setBoxBg] = useState("#ffffff");
  const [boxRadius, setBoxRadius] = useState(8);
  const [copied, setCopied] = useState<string | null>(null);

  const updateShadow = useCallback((index: number, updates: Record<string, unknown>) => {
    setShadows(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  }, []);

  const addShadow = useCallback(() => {
    setShadows(prev => [...prev, {
      offsetX: 0,
      offsetY: prev.length * 4 + 4,
      blur: 8,
      spread: 0,
      color: "#000000",
      opacity: 25,
      inset: false,
    }]);
  }, []);

  const removeShadow = useCallback((index: number) => {
    if (shadows.length > 1) {
      setShadows(prev => prev.filter((_, i) => i !== index));
    }
  }, [shadows.length]);

  const generateCss = useCallback((): string => {
    const shadowStrings = shadows.map(s => {
      const opacityHex = Math.round(s.opacity * 2.55).toString(16).padStart(2, "0");
      const color = `${s.color}${opacityHex}`;
      return `${s.inset ? "inset " : ""}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${color}`;
    });
    return `box-shadow: ${shadowStrings.join(", ")};`;
  }, [shadows]);

  const generateFullCss = useCallback((): string => {
    return `.box {
  width: 200px;
  height: 200px;
  background: ${boxBg};
  border-radius: ${boxRadius}px;
  ${generateCss()}
}`;
  }, [boxBg, boxRadius, generateCss]);

  const copyCss = useCallback(async () => {
    await navigator.clipboard.writeText(generateCss());
    setCopied("css");
    setTimeout(() => setCopied(null), 2000);
  }, [generateCss]);

  const copyFullCss = useCallback(async () => {
    await navigator.clipboard.writeText(generateFullCss());
    setCopied("full");
    setTimeout(() => setCopied(null), 2000);
  }, [generateFullCss]);

  const presets = [
    { name: "Subtle", shadows: [{ offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: "#000000", opacity: 10, inset: false }] },
    { name: "Medium", shadows: [{ offsetX: 0, offsetY: 4, blur: 6, spread: -1, color: "#000000", opacity: 15, inset: false }] },
    { name: "Large", shadows: [{ offsetX: 0, offsetY: 10, blur: 15, spread: -3, color: "#000000", opacity: 15, inset: false }] },
    { name: "Elevated", shadows: [
      { offsetX: 0, offsetY: 4, blur: 6, spread: -1, color: "#000000", opacity: 10, inset: false },
      { offsetX: 0, offsetY: 2, blur: 4, spread: -1, color: "#000000", opacity: 6, inset: false },
    ]},
    { name: "Inset", shadows: [{ offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: "#000000", opacity: 25, inset: true }] },
    { name: "Neon", shadows: [
      { offsetX: 0, offsetY: 0, blur: 10, spread: 0, color: "#58a6ff", opacity: 80, inset: false },
      { offsetX: 0, offsetY: 0, blur: 20, spread: 0, color: "#58a6ff", opacity: 60, inset: false },
      { offsetX: 0, offsetY: 0, blur: 30, spread: 0, color: "#58a6ff", opacity: 40, inset: false },
    ]},
  ];

  const applyPreset = useCallback((preset: typeof presets[0]) => {
    setShadows(preset.shadows);
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Box Shadow Generator"}
        description="Generate CSS box shadows"
        accent="orange"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preview */}
            <div className="lg:col-span-2">
              <Surface variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold text-content-primary mb-4">Preview</h2>

                {/* Shadow Preview */}
                <div
                  className="flex items-center justify-center min-h-[300px] rounded-lg"
                  style={{ background: "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 20px 20px" }}
                >
                  <div
                    className="w-48 h-48 rounded-lg transition-all duration-200"
                    style={{
                      background: boxBg,
                      borderRadius: `${boxRadius}px`,
                      boxShadow: shadows.map(s => {
                        const opacityHex = Math.round(s.opacity * 2.55).toString(16).padStart(2, "0");
                        return `${s.inset ? "inset " : ""}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}${opacityHex}`;
                      }).join(", "),
                    }}
                  />
                </div>

                {/* CSS Output */}
                <div className="mt-4 p-4 bg-surface-muted rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                      CSS Code
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={copyCss}
                        className={`px-2 py-1 text-xs rounded transition-colors-fast ${
                          copied === "css"
                            ? "bg-accent-green text-background-primary"
                            : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                        }`}
                      >
                        {copied === "css" ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={copyFullCss}
                        className={`px-2 py-1 text-xs rounded transition-colors-fast ${
                          copied === "full"
                            ? "bg-accent-green text-background-primary"
                            : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                        }`}
                      >
                        {copied === "full" ? "Copied!" : "Copy Full"}
                      </button>
                    </div>
                  </div>
                  <pre className="text-sm text-content-primary font-mono whitespace-pre-wrap">
                    {generateFullCss()}
                  </pre>
                </div>
              </Surface>
            </div>

            {/* Controls */}
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* Box Settings */}
              <Surface variant="elevated" padding="md">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-3">
                  Box Settings
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-content-secondary">Background</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={boxBg}
                        onChange={(e) => setBoxBg(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-border"
                      />
                      <input
                        type="text"
                        value={boxBg}
                        onChange={(e) => setBoxBg(e.target.value)}
                        className="flex-1 px-2 py-1 bg-surface border border-border rounded text-content-primary text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-content-secondary">Border Radius: {boxRadius}px</label>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={boxRadius}
                      onChange={(e) => setBoxRadius(parseInt(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              </Surface>

              {/* Presets */}
              <Surface variant="elevated" padding="md">
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-3">
                  Presets
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="px-3 py-2 text-sm bg-surface border border-border rounded hover:border-accent-orange hover:text-accent-orange transition-colors-fast"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </Surface>

              {/* Shadow Layers */}
              {shadows.map((shadow, index) => (
                <Surface key={index} variant="elevated" padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider">
                      Shadow {index + 1}
                    </h3>
                    {shadows.length > 1 && (
                      <button
                        onClick={() => removeShadow(index)}
                        className="text-accent-red hover:bg-accent-red-muted px-2 py-1 rounded text-xs transition-colors-fast"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Offset X */}
                    <div>
                      <div className="flex justify-between text-xs text-content-secondary mb-1">
                        <span>Offset X</span>
                        <span>{shadow.offsetX}px</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={shadow.offsetX}
                        onChange={(e) => updateShadow(index, { offsetX: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Offset Y */}
                    <div>
                      <div className="flex justify-between text-xs text-content-secondary mb-1">
                        <span>Offset Y</span>
                        <span>{shadow.offsetY}px</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={shadow.offsetY}
                        onChange={(e) => updateShadow(index, { offsetY: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Blur */}
                    <div>
                      <div className="flex justify-between text-xs text-content-secondary mb-1">
                        <span>Blur</span>
                        <span>{shadow.blur}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={shadow.blur}
                        onChange={(e) => updateShadow(index, { blur: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Spread */}
                    <div>
                      <div className="flex justify-between text-xs text-content-secondary mb-1">
                        <span>Spread</span>
                        <span>{shadow.spread}px</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={shadow.spread}
                        onChange={(e) => updateShadow(index, { spread: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Color & Opacity */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-content-secondary">Color</label>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="color"
                            value={shadow.color}
                            onChange={(e) => updateShadow(index, { color: e.target.value })}
                            className="w-6 h-6 rounded cursor-pointer border border-border"
                          />
                          <input
                            type="text"
                            value={shadow.color}
                            onChange={(e) => updateShadow(index, { color: e.target.value })}
                            className="flex-1 px-1 py-1 bg-surface border border-border rounded text-content-primary text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-content-secondary">Opacity: {shadow.opacity}%</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={shadow.opacity}
                          onChange={(e) => updateShadow(index, { opacity: parseInt(e.target.value) })}
                          className="w-full mt-2"
                        />
                      </div>
                    </div>

                    {/* Inset Toggle */}
                    <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shadow.inset}
                        onChange={(e) => updateShadow(index, { inset: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span>Inset Shadow</span>
                    </label>
                  </div>
                </Surface>
              ))}

              {/* Add Shadow Button */}
              <button
                onClick={addShadow}
                className="w-full px-4 py-3 border border-dashed border-border text-content-secondary rounded-lg hover:border-accent-orange hover:text-accent-orange transition-colors-fast"
              >
                + Add Shadow Layer
              </button>
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

export default function BoxShadowPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "box-shadow",
    name: "Box Shadow Generator",
    description: "Generate CSS box shadows",
    category: "dev",
    accent: "orange",
    layout: "live-playground",
    enabled: true,
    route: "/dev/box-shadow",
  };

  return (
    <ToolProvider tool={tool}>
      <BoxShadowInner />
    </ToolProvider>
  );
}
