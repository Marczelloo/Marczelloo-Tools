/**
 * Next.js Proxy
 * Applies security headers to all responses.
 */

import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security/headers";

export function proxy(): NextResponse {
  const response = NextResponse.next();
  withSecurityHeaders(response);
  response.headers.set("X-Request-Id", crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
