"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function ImageCropperInner(): React.JSX.Element {
  const { tool } = useTool();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ crop: { output: { filename: string; downloadUrl: string; size: number; dimensions: string } } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setCrop({ x: 0, y: 0, width: Math.min(200, img.width), height: Math.min(200, img.height) });
      };
      img.src = URL.createObjectURL(selectedFile);
    }
  }, []);

  const handleCrop = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("x", crop.x.toString());
    formData.append("y", crop.y.toString());
    formData.append("width", crop.width.toString());
    formData.append("height", crop.height.toString());
    try {
      const response = await fetch("/api/tools/image-cropper", { method: "POST", body: formData });
      const data = await response.json();
      if (!data.success) setError(data.error?.message ?? "Crop failed");
      else setResult(data);
    } catch { setError("Failed to connect to server"); }
    finally { setLoading(false); }
  }, [file, crop]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x, y });
    setCrop(prev => ({ ...prev, x, y, width: 0, height: 0 }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !image) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(image.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(image.height, e.clientY - rect.top));
    setCrop(prev => ({
      ...prev,
      width: Math.abs(x - dragStart.x),
      height: Math.abs(y - dragStart.y),
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Preset aspect ratios
  const presets = [
    { label: "1:1", ratio: 1 },
    { label: "4:3", ratio: 4 / 3 },
    { label: "16:9", ratio: 16 / 9 },
    { label: "Free", ratio: null },
  ];

  const applyPreset = (ratio: number | null) => {
    if (!image || !ratio) return;
    const size = Math.min(crop.width, crop.height);
    setCrop(prev => ({
      ...prev,
      height: ratio ? Math.round(size / ratio) : prev.height,
      width: size,
    }));
  };

  return (
    <div className="min-h-full">
      <PageHeader title={tool?.name ?? "Image Cropper"} description="Crop and resize images" accent="green" backButton={{ href: "/app" as const, label: "Back to Dashboard" }} />
      <div className="p-6">
        <Container size="lg" className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Surface variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold text-content-primary mb-4">Crop Area</h2>
                <div
                  className="relative bg-surface-muted rounded-lg overflow-hidden"
                  style={{ minHeight: 300 }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {image ? (
                    <div className="relative">
                      <img src={image.src} alt="Preview" className="max-w-full" style={{ maxHeight: 400 }} />
                      <div
                        className="absolute border-2 border-accent-green bg-accent-green/20"
                        style={{
                          left: crop.x,
                          top: crop.y,
                          width: crop.width,
                          height: crop.height,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-content-muted">Select an image to crop</div>
                  )}
                </div>
              </Surface>
            </div>
            <div>
              <Surface variant="elevated" padding="lg">
                <h2 className="text-lg font-semibold text-content-primary mb-4">Settings</h2>
                <div className="mb-4">
                  <button onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-secondary hover:bg-interactive-hover transition-colors-fast">
                    {file ? "Change Image" : "Select Image"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
                {file && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm text-content-secondary mb-2">Presets</label>
                      <div className="grid grid-cols-2 gap-2">
                        {presets.map((p) => (
                          <button key={p.label} onClick={() => applyPreset(p.ratio)} className="px-3 py-2 text-sm bg-surface border border-border rounded hover:border-accent-green transition-colors-fast">{p.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-content-muted">X</label>
                        <input type="number" value={crop.x} onChange={(e) => setCrop(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1 bg-surface border border-border rounded text-content-primary text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-content-muted">Y</label>
                        <input type="number" value={crop.y} onChange={(e) => setCrop(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))} className="w-full px-2 py-1 bg-surface border border-border rounded text-content-primary text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-content-muted">Width</label>
                        <input type="number" value={crop.width} onChange={(e) => setCrop(prev => ({ ...prev, width: parseInt(e.target.value) || 1 }))} className="w-full px-2 py-1 bg-surface border border-border rounded text-content-primary text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-content-muted">Height</label>
                        <input type="number" value={crop.height} onChange={(e) => setCrop(prev => ({ ...prev, height: parseInt(e.target.value) || 1 }))} className="w-full px-2 py-1 bg-surface border border-border rounded text-content-primary text-sm" />
                      </div>
                    </div>
                  </>
                )}
                {error && <div className="mb-4 p-3 bg-accent-red-muted border border-accent-red rounded text-accent-red text-sm">{error}</div>}
                {result && (
                  <div className="mb-4 p-3 bg-accent-green-muted border border-accent-green rounded">
                    <p className="text-accent-green text-sm font-medium mb-2">Crop Complete</p>
                    <p className="text-xs text-content-muted mb-2">{result.crop.output.dimensions} • {formatSize(result.crop.output.size)}</p>
                    <a href={result.crop.output.downloadUrl} className="block text-center px-3 py-2 bg-accent-green text-background-primary text-sm rounded hover:opacity-90" download>Download</a>
                  </div>
                )}
                <button onClick={handleCrop} disabled={!file || crop.width < 1 || crop.height < 1 || loading} className="w-full px-4 py-3 bg-accent-green text-background-primary font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                  {loading ? "Cropping..." : "Crop Image"}
                </button>
              </Surface>
            </div>
          </div>
        </Container>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default function ImageCropperPage(): React.JSX.Element {
  const tool: ToolDefinition = { id: "image-cropper", name: "Image Cropper", description: "Crop and resize images", category: "image", accent: "green", layout: "live-playground", enabled: true, route: "/image/image-cropper" };
  return <ToolProvider tool={tool}><ImageCropperInner /></ToolProvider>;
}
