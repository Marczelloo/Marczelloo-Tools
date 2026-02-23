"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Find tool by current pathname for initial state
  const getInitialTool = (): ToolDefinition | null => {
    // Check if current pathname matches a tool route
    const matchingTool = tools.find((t) => t.route === pathname);
    if (matchingTool && matchingTool.enabled) {
      return matchingTool;
    }
    // Fall back to initialToolId if provided
    if (initialToolId) {
      return tools.find((t) => t.id === initialToolId) ?? null;
    }
    return null;
  };

  const [currentTool, setCurrentTool] = useState<ToolDefinition | null>(() => getInitialTool());

  // Sync currentTool with URL
  useEffect(() => {
    // Find tool by current pathname
    const matchingTool = tools.find((t) => t.route === pathname);
    if (matchingTool && matchingTool.enabled) {
      setCurrentTool(matchingTool);
    } else if (pathname === "/app") {
      setCurrentTool(null);
    }
  }, [pathname, tools]);

  const navigateToTool = useCallback(
    (toolId: string) => {
      const tool = tools.find((t) => t.id === toolId);
      if (tool && tool.enabled) {
        setCurrentTool(tool);
        // Navigate to tool route using Next.js router
        window.location.href = tool.route;
      }
    },
    [tools]
  );

  const navigateToDashboard = useCallback(() => {
    setCurrentTool(null);
    // Navigate to dashboard
    window.location.href = "/app";
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
