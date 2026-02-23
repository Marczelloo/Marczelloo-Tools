/**
 * Rate Limiting System
 * Per-IP and per-tool rate limiting with configurable limits
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  /** Window size in milliseconds */
  windowMs: number;

  /** Maximum requests per window */
  maxRequests: number;

  /** Key prefix for storage */
  keyPrefix: string;

  /** Skip rate limiting for these IPs (e.g., localhost) */
  skipIPs?: string[];

  /** Custom key generator */
  keyGenerator?: (request: NextRequest) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitStore {
  count: number;
  resetTime: number;
}

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

/**
 * Simple in-memory rate limit store
 * For production, consider using Redis for distributed systems
 */
class MemoryStore {
  private store = new Map<string, RateLimitStore>();

  constructor() {
    // Clean up expired entries every minute (server-side only)
    if (typeof window === "undefined") {
      setInterval(() => {
        this.cleanup();
      }, 60 * 1000);
    }
  }

  get(key: string): RateLimitStore | undefined {
    return this.store.get(key);
  }

  set(key: string, value: RateLimitStore): void {
    this.store.set(key, value);
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      // New window
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, resetTime };
    }

    // Increment existing
    existing.count++;
    return { count: existing.count, resetTime: existing.resetTime };
  }

  decrement(key: string): void {
    const existing = this.store.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
    }
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

// Singleton store
const memoryStore = new MemoryStore();

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const RATE_LIMIT_CONFIGS = {
  /** Default API rate limit */
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyPrefix: "rl:default",
  },

  /** Heavy tools (video conversion, etc.) */
  heavy: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
    keyPrefix: "rl:heavy",
  },

  /** Upload endpoints */
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    keyPrefix: "rl:upload",
  },

  /** Download endpoints */
  download: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 downloads per minute
    keyPrefix: "rl:download",
  },

  /** Strict rate limit for sensitive operations */
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 requests per minute
    keyPrefix: "rl:strict",
  },
} as const;

// Tools categorized by rate limit type
export const TOOL_RATE_LIMITS: Record<string, keyof typeof RATE_LIMIT_CONFIGS> = {
  "mp4-to-mp3": "heavy",
  "video-compressor": "heavy",
  "png-to-webp": "default",
  "json-formatter": "default",
  "hash-generator": "default",
  "url-downloader": "default",
};

// ============================================================================
// KEY GENERATORS
// ============================================================================

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (reverse proxy aware)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback
  return "unknown";
}

/**
 * Generate rate limit key for IP-based limiting
 */
export function generateIPKey(request: NextRequest, prefix: string): string {
  const ip = getClientIP(request);
  return `${prefix}:ip:${ip}`;
}

/**
 * Generate rate limit key for tool-based limiting
 */
export function generateToolKey(request: NextRequest, toolId: string, prefix: string): string {
  const ip = getClientIP(request);
  return `${prefix}:tool:${toolId}:${ip}`;
}

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Check rate limit
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): RateLimitResult {
  // Skip rate limiting for whitelisted IPs
  const ip = getClientIP(request);
  if (config.skipIPs?.includes(ip)) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
    };
  }

  // Generate key
  const key = config.keyGenerator
    ? config.keyGenerator(request)
    : generateIPKey(request, config.keyPrefix);

  // Check current count
  const { count, resetTime } = memoryStore.increment(key, config.windowMs);

  const remaining = Math.max(0, config.maxRequests - count);
  const allowed = count <= config.maxRequests;

  return {
    allowed,
    remaining,
    resetTime,
    retryAfter: allowed ? undefined : Math.ceil((resetTime - Date.now()) / 1000),
  };
}

/**
 * Decrement rate limit count (e.g., on error)
 */
export function decrementRateLimit(request: NextRequest, config: RateLimitConfig): void {
  const key = config.keyGenerator
    ? config.keyGenerator(request)
    : generateIPKey(request, config.keyPrefix);
  memoryStore.decrement(key);
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(request: NextRequest, config: RateLimitConfig): void {
  const key = config.keyGenerator
    ? config.keyGenerator(request)
    : generateIPKey(request, config.keyPrefix);
  memoryStore.reset(key);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Create rate limit middleware
 *
 * @example
 * ```ts
 * // In API route
 * const limiter = createRateLimiter(RATE_LIMIT_CONFIGS.heavy);
 *
 * export async function POST(request: NextRequest) {
 *   const limit = limiter(request);
 *   if (!limit.allowed) {
 *     return limit.response;
 *   }
 *   // ... proceed
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (
    request: NextRequest
  ): { allowed: boolean; response?: NextResponse; result: RateLimitResult } => {
    const result = checkRateLimit(request, config);

    if (!result.allowed) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            retryAfter: result.retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": result.retryAfter?.toString() ?? "60",
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.resetTime.toString(),
          },
        }
      );

      return { allowed: false, response, result };
    }

    return { allowed: true, result };
  };
}

/**
 * Create combined rate limiter (IP + Tool)
 */
export function createCombinedRateLimiter(
  ipConfig: RateLimitConfig,
  toolConfig: RateLimitConfig,
  toolId: string
) {
  return (
    request: NextRequest
  ): { allowed: boolean; response?: NextResponse; result: RateLimitResult } => {
    // Check IP limit first
    const ipResult = checkRateLimit(request, ipConfig);

    if (!ipResult.allowed) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests from your IP. Please try again later.",
            retryAfter: ipResult.retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": ipResult.retryAfter?.toString() ?? "60",
            "X-RateLimit-Limit": ipConfig.maxRequests.toString(),
            "X-RateLimit-Remaining": ipResult.remaining.toString(),
            "X-RateLimit-Reset": ipResult.resetTime.toString(),
          },
        }
      );

      return { allowed: false, response, result: ipResult };
    }

    // Check tool-specific limit
    const toolKeyGenerator = (req: NextRequest) => generateToolKey(req, toolId, toolConfig.keyPrefix);
    const toolResult = checkRateLimit(request, {
      ...toolConfig,
      keyGenerator: toolKeyGenerator,
    });

    if (!toolResult.allowed) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: "TOOL_RATE_LIMIT_EXCEEDED",
            message: `Too many requests for ${toolId}. Please try again later.`,
            retryAfter: toolResult.retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": toolResult.retryAfter?.toString() ?? "60",
            "X-RateLimit-Limit": toolConfig.maxRequests.toString(),
            "X-RateLimit-Remaining": toolResult.remaining.toString(),
            "X-RateLimit-Reset": toolResult.resetTime.toString(),
          },
        }
      );

      return { allowed: false, response, result: toolResult };
    }

    // Return combined remaining (use more restrictive)
    return {
      allowed: true,
      result: {
        allowed: true,
        remaining: Math.min(ipResult.remaining, toolResult.remaining),
        resetTime: Math.max(ipResult.resetTime, toolResult.resetTime),
      },
    };
  };
}

// ============================================================================
// RATE LIMIT HEADERS HELPER
// ============================================================================

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.resetTime.toString());

  return response;
}

// ============================================================================
// PRE-BUILT LIMITERS
// ============================================================================

export const defaultLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.default);
export const heavyLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.heavy);
export const uploadLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.upload);
export const downloadLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.download);

/**
 * Get appropriate limiter for a tool
 */
export function getToolLimiter(toolId: string) {
  const limitType = TOOL_RATE_LIMITS[toolId] ?? "default";
  const config = RATE_LIMIT_CONFIGS[limitType];

  return createRateLimiter(config);
}
