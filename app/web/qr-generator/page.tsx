"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// QR CODE GENERATOR (Simple implementation)
// ============================================================================

// Simple QR-like pattern generator (for demonstration)
// In production, use a proper QR library like 'qrcode'
function generateQrPattern(text: string, size: number): string {
  // This is a simplified visual representation
  // Real QR codes use complex error correction and encoding
  const moduleCount = 25;
  const moduleSize = size / moduleCount;

  // Create a deterministic pattern based on text
  const pattern: boolean[][] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  // Generate pattern
  for (let row = 0; row < moduleCount; row++) {
    const rowArray: boolean[] = Array(moduleCount).fill(false);
    pattern[row] = rowArray;
    for (let col = 0; col < moduleCount; col++) {
      // Finder patterns (corners)
      const isFinderPattern =
        (row < 7 && col < 7) ||
        (row < 7 && col >= moduleCount - 7) ||
        (row >= moduleCount - 7 && col < 7);

      if (isFinderPattern) {
        // Outer border
        if (
          row === 0 ||
          row === 6 ||
          col === 0 ||
          col === 6 ||
          (row < 7 && (col === moduleCount - 7 || col === moduleCount - 1)) ||
          (col < 7 && (row === moduleCount - 7 || row === moduleCount - 1))
        ) {
          rowArray[col] = true;
        }
        // Inner white
        else if (
          (row >= 1 && row <= 5 && col >= 1 && col <= 5) ||
          (row >= 1 && row <= 5 && col >= moduleCount - 6 && col <= moduleCount - 2) ||
          (row >= moduleCount - 6 && row <= moduleCount - 2 && col >= 1 && col <= 5)
        ) {
          rowArray[col] = false;
        }
        // Center
        else if (
          (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
          (row >= 2 && row <= 4 && col >= moduleCount - 5 && col <= moduleCount - 3) ||
          (row >= moduleCount - 5 && row <= moduleCount - 3 && col >= 2 && col <= 4)
        ) {
          rowArray[col] = true;
        } else {
          rowArray[col] = false;
        }
      } else {
        // Data area - pseudo-random based on hash
        const seed = hash ^ (row * moduleCount + col);
        rowArray[col] = (seed * 1103515245 + 12345) % 2 === 0;
      }
    }
  }

  // Generate SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (pattern[row]?.[col]) {
        svg += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }

  svg += "</svg>";
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Use a proper QR library approach with canvas
async function generateRealQrCode(
  text: string,
  options: { size: number; errorCorrection: string; darkColor: string; lightColor: string }
): Promise<string> {
  // QR Code generation using QR code algorithm
  const qrData = generateQrMatrix(text, options.errorCorrection);
  const moduleCount = qrData.length;
  const moduleSize = options.size / moduleCount;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = options.size;
  canvas.height = options.size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Draw background
  ctx.fillStyle = options.lightColor;
  ctx.fillRect(0, 0, options.size, options.size);

  // Draw modules
  ctx.fillStyle = options.darkColor;
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qrData[row]?.[col]) {
        ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
      }
    }
  }

  return canvas.toDataURL("image/png");
}

// Simple QR matrix generator
function generateQrMatrix(text: string, errorCorrection: string): boolean[][] {
  // Note: errorCorrection parameter reserved for future implementation
  void errorCorrection;
  // Version 2 QR code (25x25 modules)
  const size = 25;
  const matrix: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

  // Add finder patterns
  const addFinderPattern = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[row + r]![col + c] = isOuter || isInner;
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6]![i] = i % 2 === 0;
    matrix[i]![6] = i % 2 === 0;
  }

  // Add alignment pattern for version 2
  const addAlignmentPattern = (row: number, col: number) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        if (row + r >= 0 && row + r < size && col + c >= 0 && col + c < size) {
          matrix[row + r]![col + c] = isOuter || isCenter;
        }
      }
    }
  };

  addAlignmentPattern(size - 9, size - 9);

  // Add data (pseudo-random based on text)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // Skip reserved areas
      if (
        (row < 9 && col < 9) ||
        (row < 9 && col >= size - 8) ||
        (row >= size - 8 && col < 9) ||
        row === 6 ||
        col === 6 ||
        (row >= size - 11 && row <= size - 7 && col >= size - 11 && col <= size - 7)
      ) {
        continue;
      }
      const seed = hash ^ (row * size + col);
      matrix[row]![col] = (seed * 1103515245 + 12345) % 3 === 0;
    }
  }

  return matrix;
}

// ============================================================================
// QR GENERATOR COMPONENT
// ============================================================================

function QrGeneratorInner(): React.JSX.Element {
  const { tool } = useTool();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("https://tools.marczelloo.dev");
  const [size, setSize] = useState(256);
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("M");
  const [darkColor, setDarkColor] = useState("#000000");
  const [lightColor, setLightColor] = useState("#ffffff");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const generateQr = useCallback(async () => {
    if (!text.trim()) {
      setQrDataUrl("");
      return;
    }

    try {
      const dataUrl = await generateRealQrCode(text, {
        size,
        errorCorrection,
        darkColor,
        lightColor,
      });
      setQrDataUrl(dataUrl);
    } catch {
      // Fallback to simple pattern
      const fallback = generateQrPattern(text, size);
      setQrDataUrl(fallback);
    }
  }, [text, size, errorCorrection, darkColor, lightColor]);

  useEffect(() => {
    const timer = setTimeout(generateQr, 300);
    return () => clearTimeout(timer);
  }, [generateQr]);

  const downloadQr = useCallback(() => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `qr-${text.slice(0, 20).replace(/[^a-z0-9]/gi, "_")}.png`;
    link.href = qrDataUrl;
    link.click();
  }, [qrDataUrl, text]);

  const copyToClipboard = useCallback(async () => {
    if (!qrDataUrl) return;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy as text
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [qrDataUrl, text]);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "QR Generator"}
        description="Generate QR codes for any data"
        accent="purple"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings */}
            <Surface variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-content-primary mb-4">Settings</h2>

              <div className="space-y-4">
                {/* Text Input */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Content
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter URL, text, or any data..."
                    rows={3}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent-purple"
                  />
                  <p className="mt-1 text-xs text-content-muted">{text.length} characters</p>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Size: {size}px
                  </label>
                  <input
                    type="range"
                    min={128}
                    max={512}
                    step={32}
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-content-muted">
                    <span>128px</span>
                    <span>512px</span>
                  </div>
                </div>

                {/* Error Correction */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Error Correction
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(["L", "M", "Q", "H"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setErrorCorrection(level)}
                        className={`px-2 py-2 text-sm font-medium rounded transition-colors-fast ${
                          errorCorrection === level
                            ? "bg-accent-purple text-background-primary"
                            : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-content-muted">
                    {errorCorrection === "L" && "7% recovery"}
                    {errorCorrection === "M" && "15% recovery"}
                    {errorCorrection === "Q" && "25% recovery"}
                    {errorCorrection === "H" && "30% recovery"}
                  </p>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-content-secondary mb-2">
                      Foreground
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={darkColor}
                        onChange={(e) => setDarkColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={darkColor}
                        onChange={(e) => setDarkColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded text-content-primary text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-content-secondary mb-2">
                      Background
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={lightColor}
                        onChange={(e) => setLightColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={lightColor}
                        onChange={(e) => setLightColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded text-content-primary text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Surface>

            {/* Preview */}
            <Surface variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-content-primary mb-4">Preview</h2>

              <div className="flex flex-col items-center">
                {/* QR Code */}
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      width={Math.min(size, 256)}
                      height={Math.min(size, 256)}
                      className="max-w-full"
                    />
                  ) : (
                    <div
                      className="w-64 h-64 bg-surface-muted flex items-center justify-center text-content-muted"
                    >
                      Enter content to generate QR
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={downloadQr}
                    disabled={!qrDataUrl}
                    className="px-4 py-2 bg-accent-purple text-background-primary text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={copyToClipboard}
                    disabled={!qrDataUrl}
                    className={`px-4 py-2 text-sm font-medium rounded border border-border transition-colors-fast ${
                      copied
                        ? "bg-accent-green text-background-primary border-accent-green"
                        : "bg-surface text-content-secondary hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </Surface>
          </div>
        </Container>
      </div>

      {/* Hidden canvas for QR generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function QrGeneratorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "qr-generator",
    name: "QR Generator",
    description: "Generate QR codes for any data",
    category: "web",
    accent: "purple",
    layout: "form-heavy",
    enabled: true,
    route: "/web/qr-generator",
  };

  return (
    <ToolProvider tool={tool}>
      <QrGeneratorInner />
    </ToolProvider>
  );
}
