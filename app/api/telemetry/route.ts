/**
 * Telemetry API Endpoint
 * Receives anonymous usage events
 *
 * POST /api/telemetry
 */

import { type NextRequest, NextResponse } from "next/server";
import type { TelemetryEvent } from "@/lib/telemetry/tracker";

// ============================================================================
// CONFIG
// ============================================================================

const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED === "true";

// ============================================================================
// STORAGE (In-memory for demo - use database in production)
// ============================================================================

const eventStore: TelemetryEvent[] = [];
const MAX_STORED_EVENTS = 10000;

// ============================================================================
// POST - RECEIVE EVENTS
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check if telemetry is enabled
  if (!TELEMETRY_ENABLED) {
    return NextResponse.json({
      success: true,
      message: "Telemetry disabled",
    });
  }

  try {
    const body = await request.json();
    const events: TelemetryEvent[] = body.events;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No events provided",
        },
        { status: 400 }
      );
    }

    // Validate and store events
    for (const event of events) {
      if (!isValidEvent(event)) {
        continue; // Skip invalid events
      }

      // Sanitize event data
      const sanitized = sanitizeEvent(event);

      // Store (with limit)
      if (eventStore.length < MAX_STORED_EVENTS) {
        eventStore.push(sanitized);
      }
    }

    return NextResponse.json({
      success: true,
      received: events.length,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
      },
      { status: 400 }
    );
  }
}

// ============================================================================
// GET - AGGREGATED STATS (for admin dashboard)
// ============================================================================

export async function GET(): Promise<NextResponse> {
  if (!TELEMETRY_ENABLED) {
    return NextResponse.json({
      enabled: false,
      stats: null,
    });
  }

  // Calculate aggregated stats
  const stats = calculateStats();

  return NextResponse.json({
    enabled: true,
    stats,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function isValidEvent(event: unknown): boolean {
  if (!event || typeof event !== "object") return false;

  const e = event as Record<string, unknown>;
  return (
    typeof e.type === "string" &&
    typeof e.timestamp === "number" &&
    typeof e.sessionId === "string" &&
    typeof e.data === "object"
  );
}

function sanitizeEvent(event: TelemetryEvent): TelemetryEvent {
  // Deep clone and sanitize
  const sanitized: TelemetryEvent = {
    type: event.type,
    timestamp: event.timestamp,
    sessionId: event.sessionId.substring(0, 32), // Limit session ID length
    data: {},
  };

  // Sanitize data fields
  for (const [key, value] of Object.entries(event.data)) {
    // Skip potentially sensitive fields
    if (key.toLowerCase().includes("email")) continue;
    if (key.toLowerCase().includes("password")) continue;
    if (key.toLowerCase().includes("token")) continue;
    if (key.toLowerCase().includes("secret")) continue;

    // Truncate string values
    if (typeof value === "string" && value.length > 256) {
      sanitized.data[key] = value.substring(0, 256);
    } else {
      sanitized.data[key] = value;
    }
  }

  return sanitized;
}

function calculateStats(): {
  totalEvents: number;
  uniqueSessions: number;
  toolUsage: Record<string, number>;
  errorCount: number;
  timeRange: { start: number; end: number } | null;
} {
  const sessions = new Set<string>();
  const toolUsage: Record<string, number> = {};
  let errorCount = 0;
  let minTimestamp = Infinity;
  let maxTimestamp = 0;

  for (const event of eventStore) {
    sessions.add(event.sessionId);

    if (event.timestamp < minTimestamp) minTimestamp = event.timestamp;
    if (event.timestamp > maxTimestamp) maxTimestamp = event.timestamp;

    if (event.type === "tool_use") {
      const toolId = event.data.toolId as string | undefined;
      if (toolId) {
        toolUsage[toolId] = (toolUsage[toolId] ?? 0) + 1;
      }
    }

    if (event.type === "error") {
      errorCount++;
    }
  }

  return {
    totalEvents: eventStore.length,
    uniqueSessions: sessions.size,
    toolUsage,
    errorCount,
    timeRange:
      eventStore.length > 0
        ? { start: minTimestamp, end: maxTimestamp }
        : null,
  };
}
