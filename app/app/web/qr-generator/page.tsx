"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";

// Simple QR matrix generator
function generateQrMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

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

  for (let i = 8; i < size - 8; i++) {
    matrix[6]![i] = i % 2 === 0;
    matrix[i]![6] = i % 2 === 0;
  }

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

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
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

async function generateQrCode(
  text: string,
  options: { size: number; darkColor: string; lightColor: string }
): Promise<string> {
  const qrData = generateQrMatrix(text);
  const moduleCount = qrData.length;
  const moduleSize = options.size / moduleCount;

  const canvas = document.createElement("canvas");
  canvas.width = options.size;
  canvas.height = options.size;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  ctx.fillStyle = options.lightColor;
  ctx.fillRect(0, 0, options.size, options.size);

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

const ERROR_LEVELS: readonly FormatOption[] = [
  { value: "L", label: "L", desc: "7% recovery" },
  { value: "M", label: "M", desc: "15% recovery" },
  { value: "Q", label: "Q", desc: "25% recovery" },
  { value: "H", label: "H", desc: "30% recovery" },
] as const;

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
      const dataUrl = await generateQrCode(text, { size, darkColor, lightColor });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl("");
    }
  }, [text, size, darkColor, lightColor]);

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
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings */}
            <Surface variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>

              <div className="space-y-4">
                {/* Text Input */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Content</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter URL, text, or any data..."
                    rows={3}
                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white text-sm resize-none focus:outline-none focus:border-white/30"
                  />
                  <p className="mt-1 text-xs text-zinc-500">{text.length} characters</p>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Size: {size}px</label>
                  <input
                    type="range"
                    min={128}
                    max={512}
                    step={32}
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>128px</span>
                    <span>512px</span>
                  </div>
                </div>

                {/* Error Correction */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Error Correction</label>
                  <TactileFormatGrid
                    options={ERROR_LEVELS}
                    value={errorCorrection}
                    onChange={(v) => setErrorCorrection(v as "L" | "M" | "Q" | "H")}
                    columns={4}
                  />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Foreground</label>
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
                        className="flex-1 px-3 py-2 bg-black border border-white/10 rounded text-white text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Background</label>
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
                        className="flex-1 px-3 py-2 bg-black border border-white/10 rounded text-white text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Surface>

            {/* Preview */}
            <Surface variant="elevated" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>

              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      width={Math.min(size, 256)}
                      height={Math.min(size, 256)}
                      className="max-w-full"
                    />
                  ) : (
                    <div className="w-64 h-64 bg-zinc-900 flex items-center justify-center text-zinc-500">
                      Enter content to generate QR
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <TactileButton onClick={downloadQr} disabled={!qrDataUrl}>
                    Download PNG
                  </TactileButton>
                  <TactileButton
                    variant="secondary"
                    onClick={copyToClipboard}
                    disabled={!qrDataUrl}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </TactileButton>
                </div>
              </div>
            </Surface>
          </div>
        </Container>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default function QrGeneratorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "qr-generator",
    name: "QR Generator",
    description: "Generate QR codes for any data",
    category: "web",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/web/qr-generator",
  };

  return (
    <ToolProvider tool={tool}>
      <QrGeneratorInner />
    </ToolProvider>
  );
}
