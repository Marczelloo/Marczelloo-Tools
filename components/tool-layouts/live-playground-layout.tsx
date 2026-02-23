"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface LivePlaygroundLayoutProps {
  /** Preview/output area */
  preview: ReactNode;

  /** Controls panel */
  controls: ReactNode;

  /** Optional header */
  header?: ReactNode;

  /** Panel arrangement */
  arrangement?: "horizontal" | "vertical";

  /** Preview ratio (percentage) */
  previewRatio?: 50 | 60 | 70;

  /** Show controls panel as collapsible */
  collapsible?: boolean;

  /** Additional classes */
  className?: string;
}

// ============================================================================
// RATIO CLASSES
// ============================================================================

const horizontalRatioClasses = {
  50: "lg:grid-cols-2",
  60: "lg:grid-cols-[3fr_2fr]",
  70: "lg:grid-cols-[7fr_3fr]",
};

const verticalRatioClasses = {
  50: "grid-rows-2",
  60: "grid-rows-[3fr_2fr]",
  70: "grid-rows-[7fr_3fr]",
};

// ============================================================================
// LIVE PLAYGROUND LAYOUT
// ============================================================================

/**
 * LivePlaygroundLayout - Interactive playground for real-time tools
 *
 * Use for: Code playgrounds, live previews, interactive demos
 *
 * Structure:
 * - Large preview area
 * - Controls panel (can be horizontal or vertical)
 * - Real-time updates
 *
 * @example
 * ```tsx
 * <LivePlaygroundLayout
 *   preview={<PreviewFrame />}
 *   controls={<ControlPanel />}
 *   arrangement="horizontal"
 * >
 * </LivePlaygroundLayout>
 * ```
 */
export function LivePlaygroundLayout({
  preview,
  controls,
  header,
  arrangement = "horizontal",
  previewRatio = 60,
  className,
}: LivePlaygroundLayoutProps): React.JSX.Element {
  const gridClasses = arrangement === "horizontal"
    ? horizontalRatioClasses[previewRatio]
    : verticalRatioClasses[previewRatio];

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      {header && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-background-secondary">
          {header}
        </div>
      )}

      {/* Main content grid */}
      <div className={cn(
        "flex-1 grid grid-cols-1 gap-0 min-h-0",
        gridClasses
      )}>
        {/* Preview area */}
        <div className={cn(
          "relative overflow-auto",
          arrangement === "vertical" && "border-b border-border"
        )}>
          {preview}
        </div>

        {/* Controls panel */}
        <div className={cn(
          "overflow-auto bg-background-secondary border-border",
          arrangement === "horizontal" ? "border-l" : ""
        )}>
          <div className="p-4">
            <h3 className="mb-4 text-xs font-semibold text-content-muted uppercase tracking-wider">
              Controls
            </h3>
            {controls}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivePlaygroundLayout;
