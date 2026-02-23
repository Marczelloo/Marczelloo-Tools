"use client";

import { cn } from "@/lib/utils";
import { Container } from "@/components/layout";
import type { ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface UploadCenterLayoutProps {
  /** Main content area - typically upload zone */
  children: ReactNode;

  /** Optional header above upload area */
  header?: ReactNode;

  /** Optional footer below content (e.g., actions, info) */
  footer?: ReactNode;

  /** Optional sidebar for options/settings */
  sidebar?: ReactNode;

  /** Maximum width of the layout */
  maxWidth?: "sm" | "md" | "lg" | "xl";

  /** Additional container classes */
  className?: string;
}

// ============================================================================
// UPLOAD CENTER LAYOUT
// ============================================================================

const maxWidthClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
};

/**
 * UploadCenterLayout - Centered layout for upload-based tools
 *
 * Use for: Video converter, audio converter, image compressor
 *
 * Structure:
 * - Centered main content area
 * - Optional sidebar for options
 * - Header and footer slots
 *
 * @example
 * ```tsx
 * <UploadCenterLayout
 *   header={<h2>Upload your file</h2>}
 *   sidebar={<OptionsPanel />}
 *   footer={<ActionButtons />}
 * >
 *   <Dropzone />
 * </UploadCenterLayout>
 * ```
 */
export function UploadCenterLayout({
  children,
  header,
  footer,
  sidebar,
  maxWidth = "lg",
  className,
}: UploadCenterLayoutProps): React.JSX.Element {
  return (
    <div className={cn("py-6", className)}>
      <Container size="lg" className={cn(maxWidthClasses[maxWidth], "mx-auto")}>
        {/* Header */}
        {header && (
          <div className="mb-6">
            {header}
          </div>
        )}

        {/* Main content with optional sidebar */}
        <div className={cn("flex gap-6", sidebar && "flex-row")}>
          {/* Main upload area */}
          <div className={cn("flex-1 min-w-0", !sidebar && "w-full")}>
            {children}
          </div>

          {/* Optional sidebar */}
          {sidebar && (
            <aside className="w-64 flex-shrink-0">
              {sidebar}
            </aside>
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 pt-6 border-t border-border">
            {footer}
          </div>
        )}
      </Container>
    </div>
  );
}

export default UploadCenterLayout;
