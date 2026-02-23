"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Container, Surface } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import { ToolLayout } from "@/components/tool-layouts";
import type { ToolDefinition } from "@/lib/featureFlags";
import type { ReactNode } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolPageWrapperProps {
  /** Tool configuration (null if not found/disabled) */
  tool: ToolDefinition | null;

  /** Page content - receives tool if enabled */
  children: (tool: ToolDefinition) => ReactNode;

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
// NOT FOUND COMPONENT
// ============================================================================

function ToolNotFound(): React.JSX.Element {
  return (
    <div className="py-12">
      <Container size="md">
        <Surface variant="elevated" padding="lg" className="text-center">
          <span className="text-4xl mb-4 block">🔍</span>
          <h1 className="text-xl font-semibold text-content-primary mb-2">
            Tool Not Found
          </h1>
          <p className="text-content-secondary mb-6">
            The tool you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-background-primary rounded transition-colors-fast hover:opacity-90"
          >
            ← Back to Dashboard
          </Link>
        </Surface>
      </Container>
    </div>
  );
}

// ============================================================================
// TOOL DISABLED COMPONENT
// ============================================================================

function ToolDisabled({ tool }: { tool: ToolDefinition }): React.JSX.Element {
  return (
    <div className="py-12">
      <Container size="md">
        <Surface variant="elevated" padding="lg" className="text-center">
          <span className="text-4xl mb-4 block">🚧</span>
          <h1 className="text-xl font-semibold text-content-primary mb-2">
            {tool.name}
          </h1>
          <p className="text-content-secondary mb-6">
            This tool is currently disabled. Check back later!
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-background-primary rounded transition-colors-fast hover:opacity-90"
          >
            ← Back to Dashboard
          </Link>
        </Surface>
      </Container>
    </div>
  );
}

// ============================================================================
// TOOL PAGE CONTENT
// ============================================================================

interface ToolPageContentProps {
  tool: ToolDefinition;
  children: (tool: ToolDefinition) => ReactNode;
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
  className?: string;
}

function ToolPageContent({
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
}: ToolPageContentProps): React.JSX.Element {
  const { accent } = useTool();

  return (
    <div
      className={cn("min-h-full")}
      style={
        {
          "--tool-accent": `var(--accent-${accent})`,
          "--tool-accent-muted": `var(--accent-${accent}-muted)`,
        } as React.CSSProperties
      }
    >
      <ToolLayout
        tool={tool}
        left={left}
        right={right}
        header={header}
        footer={footer}
        sidebar={sidebar}
        toolbar={toolbar}
        controls={controls}
        preview={preview}
        actions={actions}
        onSubmit={onSubmit}
        className={className}
      >
        {children(tool)}
      </ToolLayout>
    </div>
  );
}

// ============================================================================
// TOOL PAGE WRAPPER
// ============================================================================

/**
 * ToolPageWrapper - Handles tool loading, errors, and layout
 *
 * This component:
 * - Shows 404 if tool doesn't exist
 * - Shows "disabled" message if tool is disabled
 * - Wraps enabled tools with ToolProvider for accent injection
 * - Renders the appropriate layout
 *
 * @example
 * ```tsx
 * // In /app/[category]/[tool]/page.tsx
 * export default function ToolPage({ params }) {
 *   const tool = getToolById(params.tool);
 *
 *   return (
 *     <ToolPageWrapper tool={tool}>
 *       {(tool) => <MyToolContent tool={tool} />}
 *     </ToolPageWrapper>
 *   );
 * }
 * ```
 */
export function ToolPageWrapper({
  tool,
  children,
  ...layoutProps
}: ToolPageWrapperProps): React.JSX.Element {
  // Tool not found
  if (!tool) {
    return <ToolNotFound />;
  }

  // Tool disabled
  if (!tool.enabled) {
    return <ToolDisabled tool={tool} />;
  }

  // Tool enabled - render with provider and layout
  return (
    <ToolProvider tool={tool}>
      <ToolPageContent tool={tool} {...layoutProps}>
        {children}
      </ToolPageContent>
    </ToolProvider>
  );
}

export default ToolPageWrapper;
