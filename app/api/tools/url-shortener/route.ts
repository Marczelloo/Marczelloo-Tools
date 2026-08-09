import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";
import { createShortLink, getShortLink } from "@/lib/url-shortener-store";

const TOOL_ID = "url-shortener";

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch { return false; }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  try {
    const body = await request.json() as { url?: unknown };
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) return NextResponse.json({ success: false, error: { code: "MISSING_URL", message: "Please provide a URL to shorten" } }, { status: 400 });
    if (!isValidUrl(url)) return NextResponse.json({ success: false, error: { code: "INVALID_URL", message: "Please enter a valid HTTP or HTTPS URL" } }, { status: 400 });

    const { code, link } = await createShortLink(url);
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProtocol = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
    const requestOrigin = forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : new URL(request.url).origin;
    const origin = process.env.PUBLIC_APP_URL?.replace(/\/$/, "") || process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || requestOrigin;
    return NextResponse.json({
      success: true,
      shortening: {
        original: link.original,
        shortUrl: `${origin}/s/${code}`,
        shortCode: code,
        createdAt: new Date(link.created).toISOString(),
        clicks: link.clicks,
        note: "Links are stored in the local application data directory.",
      },
    });
  } catch (error) {
    console.error("URL shortening error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ success: false, error: { code: "MISSING_CODE", message: "Please provide a short code" } }, { status: 400 });
  const link = await getShortLink(code);
  if (!link) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Short URL not found" } }, { status: 404 });
  return NextResponse.json({ success: true, redirect: { original: link.original, clicks: link.clicks } });
}
