"use client";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout";
import { UploadCenterLayout } from "./upload-center-layout";
import { SplitPanelLayout } from "./split-panel-layout";
import { FormLayout } from "./form-layout";
import { LivePlaygroundLayout } from "./live-playground-layout";
import type { ToolDefinition } from "@/lib/featureFlags";
import type { ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolLayoutProps {
  /** Tool configuration */
  tool: ToolDefinition;

  /** Main content */
  children: ReactNode;

  /** Layout-specific props */
  left?: ReactNode;
  right?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  toolbar?: ReactNode;
  controls?: ReactNode;
  preview?: ReactNode;
  actions?: ReactNode;
  onSubmit?: () => void;

  /** Additional classes */
  className?: string;
}

// ============================================================================
// TOOL LAYOUT - DYNAMIC WRAPPER
// ============================================================================

/**
 * ToolLayout - Automatically selects layout based on tool config
 *
 * Use this as the main wrapper for tool pages. It will automatically
 * select the appropriate layout based on the tool's `layout` property.
 *
 * @example
 * ```tsx
 * // In /app/dev/json-formatter/page.tsx
 * const tool = getToolById('json-formatter');
 *
 * export default function JsonFormatterPage() {
 *   return (
 *     <ToolLayout tool={tool!} left={<InputPanel />} right={<OutputPanel />}>
 *   );
 * }
 * ```
 */
export function ToolLayout({
  tool,
  children,
  left,
  right,
  header,
  footer,
  sidebar,
  toolbar,
  controls,
  preview,
  actions,
  onSubmit,
  className,
}: ToolLayoutProps): React.JSX.Element {
  // Build page header
  const pageHeader = (
    <PageHeader
      title={tool.name}
      description={tool.description}
      accent={tool.accent}
      backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
    >
      {header}
    </PageHeader>
  );

  // Select layout based on tool config
  const renderLayout = (): ReactNode => {
    switch (tool.layout) {
      case "upload-center":
        return (
          <UploadCenterLayout
            header={children}
            footer={footer}
            sidebar={sidebar}
            className={className}
          >
            {children}
          </UploadCenterLayout>
        );

      case "split-panel":
        return (
          <SplitPanelLayout
            header={header}
            toolbar={toolbar}
            left={left}
            right={right}
            className={cn("h-[calc(100vh-73px)]", className)}
          />
        );

      case "form-heavy":
        return (
          <FormLayout
            header={children}
            actions={actions}
            onSubmit={onSubmit}
            className={className}
          >
            {children}
          </FormLayout>
        );

      case "live-playground":
        return (
          <LivePlaygroundLayout
            header={header}
            preview={preview}
            controls={controls ?? children}
            className={cn("h-[calc(100vh-73px)]", className)}
          />
        );

      default:
        // Fallback to upload-center
        return (
          <UploadCenterLayout className={className}>
            {children}
          </UploadCenterLayout>
        );
    }
  };

  return (
    <div className="min-h-full">
      {pageHeader}
      {renderLayout()}
    </div>
  );
}

export default ToolLayout;
