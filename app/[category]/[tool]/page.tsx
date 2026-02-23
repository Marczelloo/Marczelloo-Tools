import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolById, getToolByRoute, toolRegistry } from "@/lib/featureFlags";
import { ToolPageShell } from "./tool-page-shell";

// ============================================================================
// TYPES
// ============================================================================

interface ToolPageProps {
  params: Promise<{
    category: string;
    tool: string;
  }>;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

/**
 * Dynamic tool page - Loads tool config and renders appropriate layout
 *
 * Route: /[category]/[tool]
 * Example: /dev/json-formatter, /media/video-converter
 */
export default async function ToolPage({ params }: ToolPageProps): Promise<React.JSX.Element> {
  const { category, tool: toolId } = await params;

  // Construct expected route
  const expectedRoute = `/${category}/${toolId}`;

  // Find tool by route (most reliable match)
  const tool = getToolByRoute(expectedRoute);

  // Fallback: try to find by ID
  const toolConfig = tool ?? getToolById(toolId);

  // Tool not found
  if (!toolConfig) {
    notFound();
  }

  return <ToolPageShell tool={toolConfig} />;
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { category, tool: toolId } = await params;
  const expectedRoute = `/${category}/${toolId}`;
  const tool = getToolByRoute(expectedRoute) ?? getToolById(toolId);

  if (!tool) {
    return {
      title: "Tool Not Found",
    };
  }

  return {
    title: `${tool.name} - Marczelloo Tools`,
    description: tool.description,
  };
}

// ============================================================================
// STATIC PARAMS (for build-time generation)
// ============================================================================

/**
 * Pre-generate pages for all enabled tools
 */
export function generateStaticParams(): Array<{ category: string; tool: string }> {
  return toolRegistry
    .filter((t) => t.enabled)
    .map((t) => {
      const parts = t.route.split("/").filter(Boolean);
      return {
        category: parts[0] ?? "",
        tool: parts[1] ?? "",
      };
    });
}
