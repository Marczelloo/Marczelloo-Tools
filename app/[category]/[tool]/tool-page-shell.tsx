"use client";

import { cn } from "@/lib/utils";
import { Container, Surface } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import { ToolLayout } from "@/components/tool-layouts";
import Link from "next/link";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolPageShellProps {
  tool: ToolDefinition;
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
// TOOL PLACEHOLDER CONTENT
// ============================================================================

function ToolPlaceholder(): React.JSX.Element {
  const { tool } = useTool();

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center">
        <p className="text-content-secondary mb-2">
          {tool?.name} - Component not implemented
        </p>
        <p className="text-xs text-content-muted">
          Create a custom implementation for this tool
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// TOOL PAGE CONTENT
// ============================================================================

function ToolPageContent({ tool }: { tool: ToolDefinition }): React.JSX.Element {
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
      <ToolLayout tool={tool}>
        <ToolPlaceholder />
      </ToolLayout>
    </div>
  );
}

// ============================================================================
// TOOL PAGE SHELL
// ============================================================================

/**
 * ToolPageShell - Client component that handles tool rendering
 *
 * This component:
 * - Shows "disabled" message if tool is disabled
 * - Wraps enabled tools with ToolProvider for accent injection
 * - Renders the appropriate layout
 */
export function ToolPageShell({ tool }: ToolPageShellProps): React.JSX.Element {
  // Tool disabled
  if (!tool.enabled) {
    return <ToolDisabled tool={tool} />;
  }

  // Tool enabled - render with provider and layout
  return (
    <ToolProvider tool={tool}>
      <ToolPageContent tool={tool} />
    </ToolProvider>
  );
}

export default ToolPageShell;
