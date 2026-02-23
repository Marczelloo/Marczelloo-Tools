/**
 * Anonymous Telemetry System
 * Privacy-first usage tracking
 *
 * Features:
 * - Anonymous session IDs (no PII)
 * - Tool usage events
 * - Error tracking
 * - Performance metrics
 * - Opt-out support
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TelemetryConfig {
  /** Enable telemetry */
  enabled: boolean;

  /** Endpoint for telemetry events */
  endpoint?: string;

  /** Batch size before sending */
  batchSize: number;

  /** Flush interval in milliseconds */
  flushInterval: number;

  /** Include performance metrics */
  includePerformance: boolean;

  /** Include error events */
  includeErrors: boolean;
}

export interface TelemetryEvent {
  type: "tool_use" | "error" | "performance" | "page_view";
  timestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
}

export interface ToolUseEvent {
  toolId: string;
  action: "start" | "complete" | "error";
  duration?: number;
  fileSize?: number;
  error?: string;
}

export interface PerformanceEvent {
  metric: string;
  value: number;
  unit: "ms" | "bytes" | "count";
}

export interface ErrorEvent {
  errorType: string;
  message: string;
  stack?: string;
  toolId?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: process.env.TELEMETRY_ENABLED === "true",
  endpoint: process.env.TELEMETRY_ENDPOINT,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  includePerformance: true,
  includeErrors: true,
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Generate anonymous session ID
 * Uses crypto for uniqueness, no PII
 */
function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server-" + crypto.randomUUID();
  }

  const storageKey = "mt_session_id";
  const stored = sessionStorage.getItem(storageKey);

  if (stored) {
    return stored;
  }

  const newId = generateSessionId();
  sessionStorage.setItem(storageKey, newId);
  return newId;
}

// ============================================================================
// TELEMETRY TRACKER CLASS
// ============================================================================

class TelemetryTracker {
  private config: TelemetryConfig;
  private events: TelemetryEvent[] = [];
  private sessionId: string = "";
  private flushTimer: NodeJS.Timeout | null = null;
  private flushPromise: Promise<void> | null = null;

  constructor(config: TelemetryConfig = DEFAULT_TELEMETRY_CONFIG) {
    this.config = config;

    if (typeof window !== "undefined") {
      this.sessionId = getSessionId();
      this.startFlushTimer();
    }
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Track a tool use event
   */
  trackToolUse(event: ToolUseEvent): void {
    if (!this.config.enabled) return;

    this.addEvent({
      type: "tool_use",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        toolId: event.toolId,
        action: event.action,
        duration: event.duration,
        fileSize: event.fileSize,
        error: event.error,
        // Never include filenames or user data
      },
    });
  }

  /**
   * Track a performance metric
   */
  trackPerformance(event: PerformanceEvent): void {
    if (!this.config.enabled || !this.config.includePerformance) return;

    this.addEvent({
      type: "performance",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        metric: event.metric,
        value: event.value,
        unit: event.unit,
      },
    });
  }

  /**
   * Track an error
   */
  trackError(event: ErrorEvent): void {
    if (!this.config.enabled || !this.config.includeErrors) return;

    // Sanitize error - remove potential PII
    const sanitizedMessage = event.message
      .replace(/\/[\w\-./]+/g, "/[path]") // Remove file paths
      .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, "[email]") // Remove emails
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[ip]"); // Remove IPs

    this.addEvent({
      type: "error",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        errorType: event.errorType,
        message: sanitizedMessage,
        toolId: event.toolId,
        // Never include full stack traces in production
        stack: process.env.NODE_ENV === "development" ? event.stack : undefined,
      },
    });
  }

  /**
   * Track a page view
   */
  trackPageView(path: string): void {
    if (!this.config.enabled) return;

    // Only track path, not query params or hashes
    const cleanPath = path.split("?")[0]?.split("#")[0] ?? "/";

    this.addEvent({
      type: "page_view",
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        path: cleanPath,
      },
    });
  }

  /**
   * Add event to batch
   */
  private addEvent(event: TelemetryEvent): void {
    this.events.push(event);

    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Flush events to endpoint
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return;
    if (!this.config.endpoint) {
      // Clear events if no endpoint configured
      this.events = [];
      return;
    }

    // Wait for previous flush
    if (this.flushPromise) {
      await this.flushPromise;
    }

    const eventsToSend = [...this.events];
    this.events = [];

    this.flushPromise = this.sendEvents(eventsToSend);

    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  /**
   * Send events to telemetry endpoint
   */
  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    try {
      // Use sendBeacon for reliability (doesn't block page unload)
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ events })], {
          type: "application/json",
        });
        navigator.sendBeacon(this.config.endpoint!, blob);
        return;
      }

      // Fallback to fetch
      await fetch(this.config.endpoint!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch {
      // Silently fail - telemetry should never break the app
    }
  }

  /**
   * Shutdown tracker
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  /**
   * Get current session ID (for debugging)
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get pending event count (for debugging)
   */
  getPendingCount(): number {
    return this.events.length;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let trackerInstance: TelemetryTracker | null = null;

/**
 * Get telemetry tracker instance
 */
export function getTelemetryTracker(
  config?: Partial<TelemetryConfig>
): TelemetryTracker {
  if (!trackerInstance) {
    trackerInstance = new TelemetryTracker({
      ...DEFAULT_TELEMETRY_CONFIG,
      ...config,
    });
  }
  return trackerInstance;
}

/**
 * Initialize telemetry with custom config
 */
export function initTelemetry(config: Partial<TelemetryConfig>): TelemetryTracker {
  trackerInstance = new TelemetryTracker({
    ...DEFAULT_TELEMETRY_CONFIG,
    ...config,
  });
  return trackerInstance;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Track tool usage
 */
export function trackToolUse(event: ToolUseEvent): void {
  getTelemetryTracker().trackToolUse(event);
}

/**
 * Track performance metric
 */
export function trackPerformance(event: PerformanceEvent): void {
  getTelemetryTracker().trackPerformance(event);
}

/**
 * Track error
 */
export function trackError(event: ErrorEvent): void {
  getTelemetryTracker().trackError(event);
}

/**
 * Track page view
 */
export function trackPageView(path: string): void {
  getTelemetryTracker().trackPageView(path);
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * React hook for telemetry
 */
export function useTelemetry() {
  const tracker = getTelemetryTracker();

  return {
    isEnabled: tracker.isEnabled(),
    trackToolUse: (event: ToolUseEvent) => tracker.trackToolUse(event),
    trackPerformance: (event: PerformanceEvent) => tracker.trackPerformance(event),
    trackError: (event: ErrorEvent) => tracker.trackError(event),
    trackPageView: (path: string) => tracker.trackPageView(path),
  };
}

export default TelemetryTracker;
