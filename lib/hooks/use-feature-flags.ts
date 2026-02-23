"use client";

import { useMemo } from "react";
import {
  features,
  toolRegistry,
  getEnabledTools,
  getEnabledToolsByCategory,
  isToolEnabled,
  type ToolDefinition,
  type ToolCategory,
} from "@/lib/featureFlags";

// Feature flag keys
type FeatureFlagKey = keyof typeof features;

/**
 * React hook for accessing feature flags
 *
 * @example
 * ```tsx
 * const { isToolEnabled, isEnabled } = useFeatureFlags();
 *
 * if (!isToolEnabled('json-formatter')) {
 *   return <div>Tool not available</div>;
 * }
 * ```
 */
export function useFeatureFlags(): {
  // Tool checks
  isToolEnabled: (toolId: string) => boolean;
  enabledTools: ToolDefinition[];
  enabledToolsByCategory: Record<ToolCategory, ToolDefinition[]>;

  // Feature checks
  isEnabled: (feature: FeatureFlagKey) => boolean;
  sidebarEnabled: boolean;
  telemetryEnabled: boolean;
  adsEnabled: boolean;

  // All tools (for admin/debug)
  allTools: typeof toolRegistry;
} {
  // Memoize to prevent unnecessary recalculations
  const enabledTools = useMemo(() => getEnabledTools(), []);
  const enabledToolsByCategory = useMemo(() => getEnabledToolsByCategory(), []);

  const isEnabled = (feature: FeatureFlagKey): boolean => features[feature];

  return {
    // Tool checks
    isToolEnabled,
    enabledTools,
    enabledToolsByCategory,

    // Feature checks
    isEnabled,
    sidebarEnabled: true, // Always enabled
    telemetryEnabled: features.telemetry,
    adsEnabled: features.ads,

    // All tools
    allTools: toolRegistry,
  };
}

/**
 * Hook to check if a specific tool is enabled
 * Returns the tool definition if enabled, undefined otherwise
 *
 * @example
 * ```tsx
 * const tool = useTool('json-formatter');
 *
 * if (!tool) {
 *   return <NotFound />;
 * }
 *
 * return <ToolPage tool={tool} />;
 * ```
 */
export function useTool(toolId: string): ToolDefinition | undefined {
  return useMemo(() => {
    if (!isToolEnabled(toolId)) {
      return undefined;
    }
    return toolRegistry.find((t) => t.id === toolId);
  }, [toolId]);
}

/**
 * Hook to get all tools in a category (only enabled ones)
 *
 * @example
 * ```tsx
 * const mediaTools = useToolsByCategory('media');
 * ```
 */
export function useToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return useMemo(() => {
    return toolRegistry.filter((tool) => tool.category === category && tool.enabled);
  }, [category]);
}

export default useFeatureFlags;
