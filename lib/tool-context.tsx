"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { ToolDefinition, ToolCategory } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolContextValue {
  tool: ToolDefinition | null;
  toolId: string | null;
  category: ToolCategory | null;
  accent: ToolDefinition["accent"];
  layout: ToolDefinition["layout"];
  isEnabled: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToolContext = createContext<ToolContextValue>({
  tool: null,
  toolId: null,
  category: null,
  accent: "blue",
  layout: "upload-center",
  isEnabled: false,
});

// ============================================================================
// ACCENT CSS VARIABLES
// ============================================================================

const accentColors: Record<ToolDefinition["accent"], { primary: string; muted: string }> = {
  blue: {
    primary: "#58a6ff",
    muted: "rgba(88, 166, 255, 0.15)",
  },
  cyan: {
    primary: "#22d3ee",
    muted: "rgba(34, 211, 238, 0.15)",
  },
  emerald: {
    primary: "#10b981",
    muted: "rgba(16, 185, 129, 0.15)",
  },
  orange: {
    primary: "#f97316",
    muted: "rgba(249, 115, 22, 0.15)",
  },
  pink: {
    primary: "#ec4899",
    muted: "rgba(236, 72, 153, 0.15)",
  },
  green: {
    primary: "#3fb950",
    muted: "rgba(63, 185, 80, 0.15)",
  },
  yellow: {
    primary: "#d29922",
    muted: "rgba(210, 153, 34, 0.15)",
  },
  red: {
    primary: "#f85149",
    muted: "rgba(248, 81, 73, 0.15)",
  },
  purple: {
    primary: "#a371f7",
    muted: "rgba(163, 113, 247, 0.15)",
  },
};

// ============================================================================
// PROVIDER
// ============================================================================

export interface ToolProviderProps {
  tool: ToolDefinition;
  children: ReactNode;
}

/**
 * ToolProvider - Provides tool context and injects accent CSS variables
 *
 * This provider:
 * - Makes tool config available via useTool() hook
 * - Injects CSS variables for accent color theming
 * - Should wrap all tool page content
 *
 * @example
 * ```tsx
 * // In tool page
 * export default function ToolPage({ params }) {
 *   const tool = getToolById(params.tool);
 *   return (
 *     <ToolProvider tool={tool}>
 *       <ToolLayout tool={tool}>...</ToolLayout>
 *     </ToolProvider>
 *   );
 * }
 * ```
 */
export function ToolProvider({ tool, children }: ToolProviderProps): React.JSX.Element {
  // Inject accent CSS variables
  useEffect(() => {
    const colors = accentColors[tool.accent];

    // Set CSS variables on :root for global access
    const root = document.documentElement;
    root.style.setProperty("--tool-accent", colors.primary);
    root.style.setProperty("--tool-accent-muted", colors.muted);

    // Cleanup on unmount
    return () => {
      root.style.removeProperty("--tool-accent");
      root.style.removeProperty("--tool-accent-muted");
    };
  }, [tool.accent]);

  const value: ToolContextValue = {
    tool,
    toolId: tool.id,
    category: tool.category,
    accent: tool.accent,
    layout: tool.layout,
    isEnabled: tool.enabled,
  };

  return (
    <ToolContext.Provider value={value}>
      {children}
    </ToolContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * useTool - Access current tool context
 *
 * @example
 * ```tsx
 * function ToolActions() {
 *   const { tool, accent } = useTool();
 *   return <Button accent={accent}>Run {tool.name}</Button>;
 * }
 * ```
 */
export function useTool(): ToolContextValue {
  const context = useContext(ToolContext);

  if (!context.tool) {
    console.warn("useTool called outside ToolProvider");
  }

  return context;
}

/**
 * useToolAccent - Get current tool's accent color values
 */
export function useToolAccent(): { primary: string; muted: string } {
  const { accent } = useTool();
  return accentColors[accent];
}

export default ToolProvider;
