/**
 * Tool API Route Template
 *
 * This is a catch-all route for tool APIs.
 * Individual tools should create their own routes for better type safety.
 *
 * For a specific tool, create: /api/tools/[tool-name]/route.ts
 */

import { type NextRequest, NextResponse } from "next/server";
import { getToolById } from "@/lib/featureFlags";
import { guardToolRouteAuto } from "@/lib/security";

type ToolRouteContext = { params: Promise<{ tool: string }> };

export async function POST(request: NextRequest, context: ToolRouteContext): Promise<NextResponse> {
  const { tool } = await context.params;
  const definition = getToolById(tool);
  if (!definition) {
    return NextResponse.json({ success: false, error: { code: "TOOL_NOT_FOUND", message: `Unknown tool: ${tool}` } }, { status: 404 });
  }

  if (!definition.enabled) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  const guardResponse = guardToolRouteAuto(request);
  if (guardResponse) return guardResponse;
  return NextResponse.json({
    success: false,
    error: { code: "USE_TOOL_ENDPOINT", message: `Use the dedicated endpoint for ${definition.name}` },
  }, { status: 404 });
}

export async function GET(request: NextRequest, context: ToolRouteContext): Promise<NextResponse> {
  const { tool } = await context.params;
  const definition = getToolById(tool);
  if (!definition) {
    return NextResponse.json({ success: false, error: { code: "TOOL_NOT_FOUND", message: `Unknown tool: ${tool}` } }, { status: 404 });
  }
  const guardResponse = guardToolRouteAuto(request);
  if (guardResponse) return guardResponse;
  return NextResponse.json({
    status: definition.enabled ? "available" : "disabled",
    tool: { id: definition.id, name: definition.name, route: definition.route },
  });
}
