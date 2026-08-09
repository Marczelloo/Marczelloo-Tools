"use client";

import { useToolNavigation } from "@/lib/tool-navigation-context";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// ============================================================================
// TOOL COMPONENT MAP
// Dynamically import all tool page components
// ============================================================================

const toolComponents: Record<string, () => Promise<{ default: ComponentType }>> = {
  // Media tools
  "video-compressor": () => import("@/app/app/media/video-compressor/page"),
  "video-converter": () => import("@/app/app/media/video-converter/page"),
  "video-trimmer": () => import("@/app/app/media/video-trimmer/page"),
  "audio-converter": () => import("@/app/app/media/audio-converter/page"),
  "audio-compressor": () => import("@/app/app/media/audio-compressor/page"),
  "audio-trimmer": () => import("@/app/app/media/audio-trimmer/page"),
  "mp4-to-mp3": () => import("@/app/app/media/mp4-to-mp3/page"),
  "volume-booster": () => import("@/app/app/media/volume-booster/page"),

  // Image tools
  "image-converter": () => import("@/app/app/image/image-converter/page"),
  "image-compressor": () => import("@/app/app/image/image-compressor/page"),
  "background-remover": () => import("@/app/app/image/background-remover/page"),
  "image-cropper": () => import("@/app/app/image/image-cropper/page"),
  "png-to-webp": () => import("@/app/app/image/png-to-webp/page"),

  // Document tools
  "pdf-merge": () => import("@/app/app/document/pdf-merge/page"),
  "pdf-split": () => import("@/app/app/document/pdf-split/page"),
  "pdf-compressor": () => import("@/app/app/document/pdf-compressor/page"),
  "pdf-to-word": () => import("@/app/app/document/pdf-to-word/page"),
  ocr: () => import("@/app/app/document/ocr/page"),

  // Web tools
  "url-shortener": () => import("@/app/app/web/url-shortener/page"),
  "qr-generator": () => import("@/app/app/web/qr-generator/page"),
  "json-formatter": () => import("@/app/app/web/json-formatter/page"),
  "base64-encoder": () => import("@/app/app/web/base64-encoder/page"),
  "hash-generator": () => import("@/app/app/web/hash-generator/page"),
  "website-screenshot": () => import("@/app/app/web/website-screenshot/page"),
  "url-downloader": () => import("@/app/app/downloader/url-downloader/page"),

  // Dev tools
  "uuid-generator": () => import("@/app/app/dev/uuid-generator/page"),
  "jwt-decoder": () => import("@/app/app/dev/jwt-decoder/page"),
  "regex-tester": () => import("@/app/app/dev/regex-tester/page"),
  "timestamp-converter": () => import("@/app/app/dev/timestamp-converter/page"),
  "color-palette": () => import("@/app/app/dev/color-palette/page"),
  "css-gradient": () => import("@/app/app/dev/css-gradient/page"),
  "box-shadow": () => import("@/app/app/dev/box-shadow/page"),
  "flexbox-playground": () => import("@/app/app/dev/flexbox-playground/page"),
  "grid-generator": () => import("@/app/app/dev/grid-generator/page"),
  "favicon-generator": () => import("@/app/app/dev/favicon-generator/page"),
  "meta-preview": () => import("@/app/app/dev/meta-preview/page"),
};

// ============================================================================
// TOOL PLACEHOLDER
// ============================================================================

function ToolPlaceholder({ toolId }: { toolId: string }): React.JSX.Element {
  return (
    <div className="p-8">
      <div className="bg-zinc-950 border border-white/10 rounded-sm p-12 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-sm mx-auto flex items-center justify-center mb-4">
          <span className="text-2xl">🔧</span>
        </div>
        <h3 className="font-semibold mb-2">Tool Not Found</h3>
        <p className="text-zinc-500 text-sm">{toolId}</p>
      </div>
    </div>
  );
}

// ============================================================================
// TOOL LOADING SKELETON
// ============================================================================

function ToolLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="p-8">
      <div className="bg-zinc-950 border border-white/10 rounded-sm p-12 text-center">
        <div className="animate-pulse w-16 h-16 bg-white/5 rounded-sm mx-auto mb-4" />
        <div className="animate-pulse h-4 bg-white/5 rounded w-32 mx-auto mb-2" />
        <div className="animate-pulse h-3 bg-white/5 rounded w-48 mx-auto" />
      </div>
    </div>
  );
}

// ============================================================================
// TOOL CONTENT RENDERER
// ============================================================================

export function ToolContentRenderer(): React.JSX.Element | null {
  const { currentTool } = useToolNavigation();

  if (!currentTool) {
    return null;
  }

  const importer = toolComponents[currentTool.id];

  if (!importer) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <ToolPlaceholder toolId={currentTool.id} />
        </div>
      </div>
    );
  }

  const ToolComponent = dynamic(importer, {
    loading: () => <ToolLoadingSkeleton />,
    ssr: false,
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <ToolComponent />
      </div>
    </div>
  );
}

export default ToolContentRenderer;
