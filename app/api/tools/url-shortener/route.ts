/**
 * URL Shortener API
 *
 * POST /api/tools/url-shortener
 *
 * Creates shortened URLs (mock implementation for demo)
 */

import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";

const TOOL_ID = "url-shortener";

// In-memory store for demo (would be database in production)
const urlStore = new Map<string, { original: string; created: number; clicks: number }>();

function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const url = body.url as string | undefined;

    if (!url) {
      return NextResponse.json({ success: false, error: { code: "MISSING_URL", message: "Please provide a URL to shorten" } }, { status: 400 });
    }

    if (!isValidUrl(url)) {
      return NextResponse.json({ success: false, error: { code: "INVALID_URL", message: "Please enter a valid HTTP or HTTPS URL" } }, { status: 400 });
    }

    // Generate short code
    let shortCode = generateShortCode();
    while (urlStore.has(shortCode)) {
      shortCode = generateShortCode();
    }

    // Store URL
    urlStore.set(shortCode, {
      original: url,
      created: Date.now(),
      clicks: 0,
    });

    // Build short URL (mock domain for demo)
    const shortUrl = `https://mt.dev/${shortCode}`;

    return NextResponse.json({
      success: true,
      shortening: {
        original: url,
        shortUrl,
        shortCode,
        createdAt: new Date().toISOString(),
        note: "This is a demo implementation. URLs are stored in memory and will be lost on server restart.",
      },
    });
  } catch (error) {
    console.error("URL shortening error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
  }
}

// GET - Redirect to original URL
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ success: false, error: { code: "MISSING_CODE", message: "Please provide a short code" } }, { status: 400 });
  }

  const entry = urlStore.get(code);

  if (!entry) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Short URL not found" } }, { status: 404 });
  }

  // Increment clicks
  entry.clicks++;

  // Return redirect info (client handles redirect)
  return NextResponse.json({
    success: true,
    redirect: {
      original: entry.original,
      clicks: entry.clicks,
    },
  });
}
