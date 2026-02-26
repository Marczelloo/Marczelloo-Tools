/**
 * Next.js Middleware
 * Applies security headers to all responses
 */

import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security/headers";

export function middleware(): NextResponse {
  const response = NextResponse.next();

  // Apply security headers
  withSecurityHeaders(response);

  // Add request ID for tracing (optional)
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-Id", requestId);

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
