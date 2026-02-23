"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

interface ToolNavigationContextType {
  /** Currently selected tool */
  currentTool: ToolDefinition | null;
  /** Set the current tool */
  setCurrentTool: (tool: ToolDefinition | null) => void;
  /** Navigate to a tool by ID */
  navigateToTool: (toolId: string) => void;
  /** Navigate back to dashboard */
  navigateToDashboard: () => void;
  /** Whether we're viewing the dashboard or a tool */
  isViewingTool: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToolNavigationContext = createContext<ToolNavigationContextType | null>(null);

// ============================================================================
// PROVIDER PROPS
// ============================================================================

interface ToolNavigationProviderProps {
  children: ReactNode;
  /** All available tools */
  tools: readonly ToolDefinition[];
  /** Initial tool to display (optional) */
  initialToolId?: string;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function ToolNavigationProvider({
  children,
  tools,
  initialToolId,
}: ToolNavigationProviderProps): React.JSX.Element {
  // Find initial tool if provided
  const initialTool = initialToolId
    ? tools.find((t) => t.id === initialToolId) ?? null
    : null;

  const [currentTool, setCurrentTool] = useState<ToolDefinition | null>(initialTool);

  const navigateToTool = useCallback(
    (toolId: string) => {
      const tool = tools.find((t) => t.id === toolId);
      if (tool && tool.enabled) {
        setCurrentTool(tool);
        // Update URL without navigation
        window.history.pushState({}, "", tool.route);
      }
    },
    [tools]
  );

  const navigateToDashboard = useCallback(() => {
    setCurrentTool(null);
    // Update URL without navigation
    window.history.pushState({}, "", "/app");
  }, []);

  const value: ToolNavigationContextType = {
    currentTool,
    setCurrentTool,
    navigateToTool,
    navigateToDashboard,
    isViewingTool: currentTool !== null,
  };

  return (
    <ToolNavigationContext.Provider value={value}>
      {children}
    </ToolNavigationContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useToolNavigation(): ToolNavigationContextType {
  const context = useContext(ToolNavigationContext);
  if (!context) {
    throw new Error("useToolNavigation must be used within a ToolNavigationProvider");
  }
  return context;
}

export default ToolNavigationContext;
