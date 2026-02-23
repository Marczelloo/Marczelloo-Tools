/**
 * Feature Guard Utilities
 * Server-side checks for tool availability and feature flags
 */

import { NextResponse } from "next/server";
import { isToolEnabled, features } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

type FeatureFlagKey = keyof typeof features;

// ============================================================================
// TOOL GUARD
// ============================================================================

/**
 * Check if tool is enabled and return error response if not
 */
export function guardToolAccess(toolId: string): NextResponse | null {
  if (!isToolEnabled(toolId)) {
    return toolDisabledResponse(toolId);
  }
  return null;
}

/**
 * Check if feature is enabled and return error response if not
 */
export function guardFeatureAccess(feature: FeatureFlagKey): NextResponse | null {
  if (!features[feature]) {
    return featureDisabledResponse(feature);
  }
  return null;
}

// ============================================================================
// ROUTE GUARDS
// ============================================================================

/**
 * Guard for tool routes - returns 404 for disabled tools
 *
 * @param request - The incoming request
 * @param toolId - Tool ID to check
 * @returns NextResponse with error or null if allowed
 */
export function guardToolRoute(
  request: Request,
  toolId: string
): NextResponse | null {
  // Check if tool exists and is enabled
  if (!isToolEnabled(toolId)) {
    return toolNotFoundResponse(toolId, request.url);
  }

  return null;
}

/**
 * Auto-detect tool ID from URL pathname
 */
export function guardToolRouteAuto(request: Request): NextResponse | null {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  // Expected format: /{category}/{tool} or /api/tools/{tool}
  const toolId = pathParts[pathParts.length - 1];

  if (!toolId) {
    return toolNotFoundResponse("unknown", request.url);
  }

  return guardToolRoute(request, toolId);
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create tool disabled response
 */
export function toolDisabledResponse(toolId: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "TOOL_DISABLED",
        message: `Tool '${toolId}' is currently disabled`,
      },
    },
    { status: 503 }
  );
}

/**
 * Create feature disabled response
 */
export function featureDisabledResponse(feature: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "FEATURE_DISABLED",
        message: `Feature '${feature}' is currently disabled`,
      },
    },
    { status: 503 }
  );
}

/**
 * Create maintenance mode response
 */
export function maintenanceModeResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "MAINTENANCE_MODE",
        message: "Service is currently under maintenance",
      },
    },
    { status: 503 }
  );
}

/**
 * Create tool not found response
 */
export function toolNotFoundResponse(toolId: string, url?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "TOOL_NOT_FOUND",
        message: `Tool '${toolId}' not found`,
        path: url,
      },
    },
    { status: 404 }
  );
}

// ============================================================================
// WRAPPER FUNCTIONS
// ============================================================================

/**
 * Wrap a handler with tool guard
 *
 * @example
 * ```ts
 * export const GET = withToolGuard('json-formatter', async (request) => {
 *   return Response.json({ data: '...' });
 * });
 * ```
 */
export function withToolGuard<T>(
  toolId: string,
  handler: (request: Request) => Promise<T> | T
): (request: Request) => Promise<T | NextResponse> {
  return async (request: Request): Promise<T | NextResponse> => {
    const guard = guardToolAccess(toolId);
    if (guard) return guard;
    return handler(request);
  };
}

/**
 * Wrap a handler with feature guard
 */
export function withFeatureGuard<T>(
  feature: FeatureFlagKey,
  handler: (request: Request) => Promise<T> | T
): (request: Request) => Promise<T | NextResponse> {
  return async (request: Request): Promise<T | NextResponse> => {
    const guard = guardFeatureAccess(feature);
    if (guard) return guard;
    return handler(request);
  };
}
