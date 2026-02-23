"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { ToolContentRenderer } from "./tool-content-renderer";
import { ToolNavigationProvider, useToolNavigation } from "@/lib/tool-navigation-context";
import { toolRegistry } from "@/lib/featureFlags";
import type { ReactNode } from "react";
import { ChevronRight, ArrowUpRight } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface AppShellProps {
  children: ReactNode;
  className?: string;
  noSidebar?: boolean;
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function AppHeader(): React.JSX.Element {
  const { currentTool } = useToolNavigation();

  return (
    <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span>Tools</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white">{currentTool?.name ?? "Dashboard"}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors">
          <ArrowUpRight className="w-4 h-4 text-zinc-500" />
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// STATUS BAR COMPONENT
// ============================================================================

function StatusBar(): React.JSX.Element {
  const { currentTool } = useToolNavigation();

  return (
    <footer className="h-8 border-t border-white/10 flex items-center justify-between px-6 text-xs text-zinc-600 flex-shrink-0">
      <div className="flex items-center gap-4">
        <span className="font-mono">{currentTool?.id ?? "dashboard"}</span>
        <span>v1.0.0</span>
      </div>
    </footer>
  );
}

// ============================================================================
// APP SHELL CONTENT
// ============================================================================

function AppShellContent({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-black text-white font-sans antialiased">
      <Sidebar />
      <main className="flex-1 bg-zinc-950 flex flex-col overflow-hidden min-w-0">
        <AppHeader />
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Tool content area - renders selected tool or children */}
          <ToolContentRenderer />
          {/* Dashboard content when no tool selected */}
          {children}
        </div>
        <StatusBar />
      </main>
    </div>
  );
}

// ============================================================================
// APP SHELL COMPONENT
// ============================================================================

/**
 * AppShell - Main application layout wrapper
 *
 * Provides consistent structure with sidebar and main content area.
 * Set `noSidebar` to true for full-width pages.
 *
 * @example
 * ```tsx
 * // In app layout
 * export default function AppLayout({ children }) {
 *   return <AppShell>{children}</AppShell>;
 * }
 * ```
 */
export function AppShell({ children, className, noSidebar = false }: AppShellProps): React.JSX.Element {
  if (noSidebar) {
    return (
      <div className={cn("min-h-screen bg-background-primary", className)}>
        {children}
      </div>
    );
  }

  return (
    <ToolNavigationProvider tools={toolRegistry}>
      <AppShellContent>{children}</AppShellContent>
    </ToolNavigationProvider>
  );
}

export default AppShell;
