"use client";

import type { Route } from "next";
import type { ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type PageHeaderProps = {
  title: string;
  description?: string;
  accent?: "blue" | "cyan" | "emerald" | "green" | "orange" | "pink" | "yellow" | "red" | "purple";
  children?: ReactNode;
  backButton?: {
    href: Route;
    label: string;
  };
};

// ============================================================================
// PAGE HEADER COMPONENT
// ============================================================================

/**
 * PageHeader - Consistent page header for tool pages
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="JSON Formatter"
 *   description="Format and validate JSON data"
 *   accent="yellow"
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps): React.JSX.Element {
  return (
    <div className="px-8 pt-8 pb-4 border-b border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && (
            <p className="text-zinc-500 text-sm mt-1">{description}</p>
          )}
        </div>

        {/* Optional actions */}
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export default PageHeader;
