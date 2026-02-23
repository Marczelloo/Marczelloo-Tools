"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/lib/hooks";
import { useToolNavigation } from "@/lib/tool-navigation-context";
import type { ToolDefinition, ToolCategory } from "@/lib/featureFlags";
import {
  Film,
  Music,
  Image,
  Code,
  Globe,
  Lock,
  Terminal,
  ChevronRight,
  Cpu,
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
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface SidebarProps {
  className?: string;
}

interface CategoryState {
  media: boolean;
  image: boolean;
  document: boolean;
  web: boolean;
  dev: boolean;
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const categoryConfig: Record<
  ToolCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  media: {
    label: "Media",
    icon: Film,
    description: "Video, audio processing",
  },
  image: {
    label: "Images",
    icon: Image,
    description: "Image processing tools",
  },
  document: {
    label: "Documents",
    icon: File,
    description: "PDF and document tools",
  },
  web: {
    label: "Web Tools",
    icon: Globe,
    description: "Web utilities",
  },
  dev: {
    label: "Dev Tools",
    icon: Code,
    description: "Developer utilities",
  },
};

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
// ACCENT STYLES
// ============================================================================

type AccentColor = "blue" | "cyan" | "emerald" | "green" | "orange" | "pink" | "yellow" | "red" | "purple";

const accentStyles: Record<AccentColor, { border: string; bg: string; text: string }> = {
  blue: {
    border: "border-l-white",
    bg: "bg-white/5",
    text: "text-white",
  },
  cyan: {
    border: "border-l-cyan-400",
    bg: "bg-cyan-400/10",
    text: "text-cyan-400",
  },
  emerald: {
    border: "border-l-emerald-400",
    bg: "bg-emerald-400/10",
    text: "text-emerald-400",
  },
  green: {
    border: "border-l-green-400",
    bg: "bg-green-400/10",
    text: "text-green-400",
  },
  orange: {
    border: "border-l-orange-400",
    bg: "bg-orange-400/10",
    text: "text-orange-400",
  },
  pink: {
    border: "border-l-pink-400",
    bg: "bg-pink-400/10",
    text: "text-pink-400",
  },
  yellow: {
    border: "border-l-yellow-400",
    bg: "bg-yellow-400/10",
    text: "text-yellow-400",
  },
  red: {
    border: "border-l-red-400",
    bg: "bg-red-400/10",
    text: "text-red-400",
  },
  purple: {
    border: "border-l-purple-400",
    bg: "bg-purple-400/10",
    text: "text-purple-400",
  },
};

// ============================================================================
// TOOL LINK COMPONENT
// ============================================================================

interface ToolLinkProps {
  tool: ToolDefinition;
  isActive: boolean;
  onSelect: () => void;
  collapsed: boolean;
}

function ToolLink({ tool, isActive, onSelect, collapsed }: ToolLinkProps): React.JSX.Element {
  const accent = tool.accent as AccentColor;
  const styles = accentStyles[accent] ?? accentStyles.blue;
  const IconComponent = toolIconMap[tool.id] ?? Cpu;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2 text-sm transition-all",
        "border-l-2",
        // Default state
        isActive
          ? ["bg-white/5 text-white border-white", styles.border]
          : "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent"
      )}
      title={collapsed ? tool.name : undefined}
    >
      <IconComponent className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{tool.name}</span>}
    </button>
  );
}

// ============================================================================
// CATEGORY SECTION COMPONENT
// ============================================================================

interface CategorySectionProps {
  category: ToolCategory;
  tools: ToolDefinition[];
  currentTool: ToolDefinition | null;
  isExpanded: boolean;
  onToggle: () => void;
  onToolSelect: (tool: ToolDefinition) => void;
  collapsed: boolean;
}

function CategorySection({
  category,
  tools,
  currentTool,
  isExpanded,
  onToggle,
  onToolSelect,
  collapsed,
}: CategorySectionProps): React.JSX.Element | null {
  const config = categoryConfig[category];
  const enabledTools = tools.filter((t) => t.enabled);

  // Don't render if no enabled tools
  if (enabledTools.length === 0) return null;

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {enabledTools.map((tool) => (
          <ToolLink
            key={tool.id}
            tool={tool}
            isActive={currentTool?.id === tool.id}
            onSelect={() => onToolSelect(tool)}
            collapsed={collapsed}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Category header */}
      <div className="px-4 mb-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 w-full"
        >
          <span
            className={cn(
              "text-[10px] font-mono text-zinc-600 uppercase tracking-wider transition-transform duration-200",
              isExpanded ? "rotate-90" : ""
            )}
          >
            ▸
          </span>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
            {config.label}
          </span>
        </button>
      </div>

      {/* Tool list */}
      {isExpanded && (
        <div className="space-y-0.5">
          {enabledTools.map((tool) => (
            <ToolLink
              key={tool.id}
              tool={tool}
              isActive={currentTool?.id === tool.id}
              onSelect={() => onToolSelect(tool)}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SIDEBAR MAIN COMPONENT
// ============================================================================

export function Sidebar({ className }: SidebarProps): React.JSX.Element | null {
  const { sidebarEnabled, enabledToolsByCategory } = useFeatureFlags();
  const { currentTool, setCurrentTool } = useToolNavigation();

  const [collapsed, setCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<CategoryState>({
    media: true,
    image: true,
    document: true,
    web: true,
    dev: true,
  });

  // Don't render if sidebar is disabled globally
  if (!sidebarEnabled) {
    return null;
  }

  const categories = Object.keys(enabledToolsByCategory) as ToolCategory[];
  const hasEnabledTools = categories.length > 0;

  const toggleCategory = (category: ToolCategory): void => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleToolSelect = (tool: ToolDefinition): void => {
    setCurrentTool(tool);
    // Update URL without navigation
    window.history.pushState({}, "", tool.route);
  };

  return (
    <aside
      className={cn(
        "bg-black border-r border-white/10 flex flex-col transition-all duration-200 flex-shrink-0",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 bg-white rounded-sm flex items-center justify-center">
                <Terminal className="w-4 h-4 text-black" />
              </div>
              <span className="font-semibold text-sm tracking-tight">Marczelloo</span>
            </Link>
          </div>
        ) : (
          <Link
            href="/"
            className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors mx-auto"
          >
            <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
              <Terminal className="w-3 h-3 text-black" />
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors"
        >
          <ChevronRight
            className={cn(
              "w-4 h-4 text-zinc-500 transition-transform",
              collapsed ? "rotate-0" : "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Tool Categories */}
      <nav className="flex-1 overflow-y-auto py-4">
        {hasEnabledTools ? (
          categories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              tools={enabledToolsByCategory[category]}
              currentTool={currentTool}
              isExpanded={expandedCategories[category]}
              onToggle={() => toggleCategory(category)}
              onToolSelect={handleToolSelect}
              collapsed={collapsed}
            />
          ))
        ) : (
          <div className="py-12 text-center px-4">
            <p className="text-sm text-zinc-500">No tools available</p>
            <p className="text-xs text-zinc-600 mt-1">Enable tools in feature flags</p>
          </div>
        )}
      </nav>

      {/* Bottom Section - Hidden until user/auth system is implemented */}
    </aside>
  );
}

export default Sidebar;
