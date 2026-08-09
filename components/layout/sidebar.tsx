"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/lib/hooks";
import { useToolNavigation } from "@/lib/tool-navigation-context";
import type { ToolDefinition, ToolCategory } from "@/lib/featureFlags";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/icons/brand-mark";
import { categoryIconMap, getToolIcon } from "@/components/icons/tool-icons";

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
  { label: string; icon: LucideIcon; description: string }
> = {
  media: {
    label: "Media",
    icon: categoryIconMap.media,
    description: "Video, audio processing",
  },
  image: {
    label: "Images",
    icon: categoryIconMap.image,
    description: "Image processing tools",
  },
  document: {
    label: "Documents",
    icon: categoryIconMap.document,
    description: "PDF and document tools",
  },
  web: {
    label: "Web Tools",
    icon: categoryIconMap.web,
    description: "Web utilities",
  },
  dev: {
    label: "Dev Tools",
    icon: categoryIconMap.dev,
    description: "Developer utilities",
  },
};

// ============================================================================
// ACTIVE STATE STYLES (MONOCHROME ONLY)
// ============================================================================

// All tools use the same monochrome active state per CLAUDE.md architecture
// No accent colors, no colored borders, only black/white/zinc

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
  const IconComponent = getToolIcon(tool.id);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2 text-sm transition-all",
        "border-l-2",
        // Active state (monochrome only)
        isActive
          ? "bg-white/5 text-white border-white"
          : "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent"
      )}
      title={collapsed ? tool.name : undefined}
    >
      <IconComponent aria-hidden="true" className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
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
  const CategoryIcon = config.icon;
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
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="flex min-h-10 items-center gap-2 w-full text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "w-3 h-3 transition-transform duration-200",
              isExpanded ? "rotate-90" : ""
            )}
          />
          <CategoryIcon aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="text-[10px] font-mono uppercase tracking-wider">{config.label}</span>
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
              href="/app"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <BrandMark className="w-7 h-7" />
              <span className="font-semibold text-sm tracking-tight">Marczelloo</span>
            </Link>
          </div>
        ) : (
          <Link
            href="/app"
            aria-label="Marczelloo Tools home"
            className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors mx-auto"
          >
            <BrandMark className="w-6 h-6" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors"
        >
          <ChevronRight
            aria-hidden="true"
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
