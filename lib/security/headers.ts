/**
 * Security Headers Configuration
 * CSP, X-Frame-Options, X-Content-Type-Options, and more
 */

import { NextResponse } from "next/server";

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityHeadersConfig {
  /** Content Security Policy directives */
  csp: CSPDirectives;

  /** X-Frame-Options value */
  frameOptions: "DENY" | "SAMEORIGIN" | "ALLOW-FROM";

  /** X-Content-Type-Options */
  noSniff: boolean;

  /** Referrer-Policy */
  referrerPolicy: string;

  /** Permissions-Policy */
  permissionsPolicy: string[];

  /** Strict-Transport-Security (HSTS) */
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  } | null;

  /** Enable in development mode */
  enableInDev: boolean;
}

export interface CSPDirectives {
  "default-src"?: string[];
  "script-src"?: string[];
  "style-src"?: string[];
  "img-src"?: string[];
  "font-src"?: string[];
  "connect-src"?: string[];
  "frame-ancestors"?: string[];
  "base-uri"?: string[];
  "form-action"?: string[];
  "object-src"?: string[];
  "media-src"?: string[];
  "worker-src"?: string[];
  "child-src"?: string[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  csp: {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Required for Next.js in development
      "'unsafe-eval'", // Required for Next.js in development
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind
      "https://fonts.googleapis.com", // Google Fonts CSS
    ],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      // YouTube
      "https://i.ytimg.com",
      "https://*.ytimg.com",
      "https://img.youtube.com",
      // Twitter/X
      "https://pbs.twimg.com",
      "https://*.twimg.com",
      // Instagram/Meta
      "https://*.cdninstagram.com",
      "https://*.fbcdn.net",
      // Vimeo
      "https://*.vimeocdn.com",
      "https://i.vimeocdn.com",
      // TikTok
      "https://*.tiktokcdn.com",
      "https://p16-sign-va.tiktokcdn.com",
      "https://*.bytecdn.com",
      // Reddit
      "https://*.redditmedia.com",
      "https://i.redd.it",
      "https://preview.redd.it",
      "https://*.thumbs.redditmedia.com",
      // Twitch
      "https://static-cdn.jtvnw.net",
      "https://*.cdn.twitch.tv",
      // Dailymotion
      "https://*.dmcdn.net",
      // SoundCloud
      "https://i1.sndcdn.com",
      "https://*.sndcdn.com",
      // Facebook
      "https://*.facebook.com",
      "https://*.fbcdn.com",
      // General CDNs (covers many platforms)
      "https://*.cloudfront.net",
      "https://*.akamaized.net",
      "https://*.cdn77.org",
    ],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"], // Google Fonts
    "connect-src": ["'self'", "https://api.marczelloo.dev", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "media-src": ["'self'", "blob:", "data:"],
    "worker-src": ["'self'", "blob:"],
  },
  frameOptions: "DENY",
  noSniff: true,
  referrerPolicy: "strict-origin-when-cross-origin",
  permissionsPolicy: [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "interest-cohort=()",
  ],
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  enableInDev: true,
};

// Production config (stricter CSP)
export const PRODUCTION_SECURITY_CONFIG: SecurityHeadersConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  csp: {
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      // YouTube
      "https://i.ytimg.com",
      "https://*.ytimg.com",
      "https://img.youtube.com",
      // Twitter/X
      "https://pbs.twimg.com",
      "https://*.twimg.com",
      // Instagram/Meta
      "https://*.cdninstagram.com",
      "https://*.fbcdn.net",
      // Vimeo
      "https://*.vimeocdn.com",
      "https://i.vimeocdn.com",
      // TikTok
      "https://*.tiktokcdn.com",
      "https://p16-sign-va.tiktokcdn.com",
      "https://*.bytecdn.com",
      // Reddit
      "https://*.redditmedia.com",
      "https://i.redd.it",
      "https://preview.redd.it",
      "https://*.thumbs.redditmedia.com",
      // Twitch
      "https://static-cdn.jtvnw.net",
      "https://*.cdn.twitch.tv",
      // Dailymotion
      "https://*.dmcdn.net",
      // SoundCloud
      "https://i1.sndcdn.com",
      "https://*.sndcdn.com",
      // Facebook
      "https://*.facebook.com",
      "https://*.fbcdn.com",
      // General CDNs (covers many platforms)
      "https://*.cloudfront.net",
      "https://*.akamaized.net",
      "https://*.cdn77.org",
    ],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
  },
};

// ============================================================================
// HEADER GENERATORS
// ============================================================================

/**
 * Build CSP header value from directives
 */
export function buildCSP(directives: CSPDirectives): string {
  return Object.entries(directives)
    .filter(([, values]) => values && values.length > 0)
    .map(([directive, values]) => {
      const directiveName = directive as keyof CSPDirectives;
      return `${directiveName} ${(values as string[]).join(" ")}`;
    })
    .join("; ");
}

/**
 * Build HSTS header value
 */
export function buildHSTS(
  hsts: NonNullable<SecurityHeadersConfig["hsts"]>
): string {
  const parts = [`max-age=${hsts.maxAge}`];
  if (hsts.includeSubDomains) parts.push("includeSubDomains");
  if (hsts.preload) parts.push("preload");
  return parts.join("; ");
}

/**
 * Build Permissions-Policy header value
 */
export function buildPermissionsPolicy(policies: string[]): string {
  return policies.join(", ");
}

// ============================================================================
// SECURITY HEADERS MIDDLEWARE
// ============================================================================

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_CONFIG
): NextResponse {
  // CSP
  const csp = buildCSP(config.csp);
  response.headers.set("Content-Security-Policy", csp);

  // X-Frame-Options
  response.headers.set("X-Frame-Options", config.frameOptions);

  // X-Content-Type-Options
  if (config.noSniff) {
    response.headers.set("X-Content-Type-Options", "nosniff");
  }

  // Referrer-Policy
  response.headers.set("Referrer-Policy", config.referrerPolicy);

  // Permissions-Policy
  if (config.permissionsPolicy.length > 0) {
    response.headers.set(
      "Permissions-Policy",
      buildPermissionsPolicy(config.permissionsPolicy)
    );
  }

  // HSTS (only in production with HTTPS)
  if (config.hsts && process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      buildHSTS(config.hsts)
    );
  }

  // Additional security headers
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

/**
 * Create middleware that adds security headers
 *
 * @example
 * ```ts
 * // In middleware.ts
 * export function middleware(request: NextRequest) {
 *   const response = NextResponse.next();
 *   return withSecurityHeaders(response);
 * }
 * ```
 */
export function withSecurityHeaders(
  response: NextResponse,
  config?: SecurityHeadersConfig
): NextResponse {
  const isDev = process.env.NODE_ENV === "development";

  // Skip in dev if configured
  if (isDev && config && !config.enableInDev) {
    return response;
  }

  // Use production config in production
  const finalConfig =
    process.env.NODE_ENV === "production"
      ? PRODUCTION_SECURITY_CONFIG
      : DEFAULT_SECURITY_CONFIG;

  return applySecurityHeaders(response, config ?? finalConfig);
}

// ============================================================================
// PRESET HEADERS FOR SPECIFIC RESPONSES
// ============================================================================

/**
 * Headers for API responses (JSON)
 */
export function apiSecurityHeaders(): Record<string, string> {
  return {
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
  };
}

/**
 * Headers for file downloads
 */
export function downloadSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "private, max-age=3600",
  };
}

/**
 * Headers for static assets
 */
export function staticAssetHeaders(maxAge: number = 31536000): Record<string, string> {
  return {
    "Cache-Control": `public, max-age=${maxAge}, immutable`,
    "X-Content-Type-Options": "nosniff",
  };
}

// ============================================================================
// APPLY HEADERS TO RESPONSE
// ============================================================================

/**
 * Apply preset headers to a response object
 */
export function applyHeaders(
  response: NextResponse,
  headers: Record<string, string>
): NextResponse {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
