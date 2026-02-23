"use client";

import { getEnabledTools, type ToolDefinition, type ToolCategory } from "@/lib/featureFlags";
import { useToolNavigation } from "@/lib/tool-navigation-context";
import {
  Film,
  Music,
  Image,
  Code,
  Globe,
  Lock,
  File,
  Scissors,
  Volume2,
  Palette,
  Grid3X3,
  Eye,
  Link2,
  Hash,
  QrCode,
  Binary,
  Clock,
  Sparkles,
  Layers,
  FileType,
  Camera,
  Wand2,
  Merge,
  Split,
  Zap,
  Cpu,
} from "lucide-react";

// ============================================================================
// TOOL ICON MAPPING
// ============================================================================

const toolIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "video-compressor": Film,
  "video-converter": Film,
  "video-trimmer": Scissors,
  "audio-converter": Music,
  "audio-compressor": Music,
  "audio-trimmer": Scissors,
  "mp4-to-mp3": Music,
  "volume-booster": Volume2,
  "image-compressor": Image,
  "background-remover": Wand2,
  "png-to-webp": Image,
  "image-cropper": Scissors,
  "pdf-merge": Merge,
  "pdf-split": Split,
  "pdf-compressor": File,
  "pdf-to-word": FileType,
  "ocr": Eye,
  "json-formatter": Code,
  "hash-generator": Hash,
  "base64-encoder": Binary,
  "url-downloader": Link2,
  "url-shortener": Link2,
  "website-screenshot": Camera,
  "qr-generator": QrCode,
  "uuid-generator": Zap,
  "timestamp-converter": Clock,
  "color-palette": Palette,
  "css-gradient": Palette,
  "flexbox-playground": Grid3X3,
  "regex-tester": Code,
  "jwt-decoder": Lock,
  "meta-preview": Eye,
  "favicon-generator": Sparkles,
  "box-shadow": Layers,
  "grid-generator": Grid3X3,
};

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const categoryConfig: Record<ToolCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  media: { label: "Media", icon: Film },
  image: { label: "Images", icon: Image },
  document: { label: "Documents", icon: File },
  web: { label: "Web Tools", icon: Globe },
  dev: { label: "Dev Tools", icon: Code },
};

// ============================================================================
// TOOL CARD COMPONENT
// ============================================================================

interface ToolCardProps {
  tool: ToolDefinition;
  onClick: () => void;
}

function ToolCard({ tool, onClick }: ToolCardProps): React.JSX.Element {
  const IconComponent = toolIconMap[tool.id] ?? Cpu;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group p-4 bg-zinc-950 border border-white/10 rounded-sm hover:border-white/20 hover:bg-white/5 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-white/5 rounded-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
          <IconComponent className="w-5 h-5 text-zinc-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm text-white truncate">{tool.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{tool.description}</p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// CATEGORY SECTION COMPONENT
// ============================================================================

interface CategorySectionProps {
  category: ToolCategory;
  tools: ToolDefinition[];
  onToolSelect: (toolId: string) => void;
}

function CategorySection({ category, tools, onToolSelect }: CategorySectionProps): React.JSX.Element | null {
  const config = categoryConfig[category];
  const IconComponent = config.icon;

  if (tools.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <IconComponent className="w-4 h-4 text-zinc-500" />
        <h2 className="text-sm font-semibold text-white">{config.label}</h2>
        <span className="text-xs text-zinc-600 font-mono">({tools.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onClick={() => onToolSelect(tool.id)} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD HOME COMPONENT
// ============================================================================

function DashboardHome(): React.JSX.Element {
  const enabledTools = getEnabledTools();
  const categories = [...new Set(enabledTools.map((t) => t.category))] as ToolCategory[];
  const { navigateToTool } = useToolNavigation();

  // Group tools by category
  const toolsByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = enabledTools.filter((t) => t.category === category);
      return acc;
    },
    {} as Record<ToolCategory, ToolDefinition[]>
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {enabledTools.length} tools available
          </p>
        </div>

        {/* Categories */}
        {categories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            tools={toolsByCategory[category] ?? []}
            onToolSelect={navigateToTool}
          />
        ))}

        {/* Empty state */}
        {enabledTools.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-zinc-500 mb-2">No tools are currently enabled</p>
            <p className="text-xs text-zinc-600">Enable tools in feature flags to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// APP HOME PAGE
// ============================================================================

export default function AppHomePage(): React.JSX.Element | null {
  const { isViewingTool } = useToolNavigation();

  // Only show dashboard when no tool is selected
  if (isViewingTool) {
    return null;
  }

  return <DashboardHome />;
}
