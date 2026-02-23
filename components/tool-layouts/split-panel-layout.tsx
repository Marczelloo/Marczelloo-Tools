"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface SplitPanelLayoutProps {
  /** Left panel content (input) */
  left: ReactNode;

  /** Right panel content (output) */
  right: ReactNode;

  /** Optional header above panels */
  header?: ReactNode;

  /** Optional toolbar between header and panels */
  toolbar?: ReactNode;

  /** Left panel label */
  leftLabel?: string;

  /** Right panel label */
  rightLabel?: string;

  /** Panel split ratio (left percentage) */
  split?: 50 | 60 | 40;

  /** Additional classes */
  className?: string;
}

// ============================================================================
// SPLIT PANEL LAYOUT
// ============================================================================

const splitClasses = {
  40: "lg:grid-cols-[2fr_3fr]",
  50: "lg:grid-cols-2",
  60: "lg:grid-cols-[3fr_2fr]",
};

/**
 * SplitPanelLayout - Side-by-side layout for input/output tools
 *
 * Use for: JSON formatter, Base64 encoder, code transformers
 *
 * Structure:
 * - Two equal (or configurable) panels side by side
 * - Optional header and toolbar
 * - Panel labels
 * - Responsive: stacks on mobile
 *
 * @example
 * ```tsx
 * <SplitPanelLayout
 *   leftLabel="Input"
 *   rightLabel="Output"
 *   left={<TextArea />}
 *   right={<FormattedOutput />}
 *   toolbar={<FormatButton />}
 * >
 * </SplitPanelLayout>
 * ```
 */
export function SplitPanelLayout({
  left,
  right,
  header,
  toolbar,
  leftLabel = "Input",
  rightLabel = "Output",
  split = 50,
  className,
}: SplitPanelLayoutProps): React.JSX.Element {
  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      {header && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-background-secondary">
          {header}
        </div>
      )}

      {/* Toolbar */}
      {toolbar && (
        <div className="flex-shrink-0 px-6 py-3 border-b border-border bg-background-tertiary">
          {toolbar}
        </div>
      )}

      {/* Split panels */}
      <div className={cn(
        "flex-1 grid grid-cols-1 gap-4 p-6 min-h-0",
        splitClasses[split]
      )}>
        {/* Left panel */}
        <div className="flex flex-col min-h-0">
          <label className="block mb-2 text-xs font-semibold text-content-muted uppercase tracking-wider">
            {leftLabel}
          </label>
          <div className="flex-1 min-h-0">
            {left}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col min-h-0">
          <label className="block mb-2 text-xs font-semibold text-content-muted uppercase tracking-wider">
            {rightLabel}
          </label>
          <div className="flex-1 min-h-0">
            {right}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplitPanelLayout;
