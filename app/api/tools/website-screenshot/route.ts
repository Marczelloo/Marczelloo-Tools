/**
 * Website Screenshot API
 *
 * POST /api/tools/website-screenshot
 *
 * Captures screenshots of websites
 * Note: This is a simplified implementation that returns metadata
 * Full screenshot capture requires Puppeteer/Playwright
 */

import { type NextRequest, NextResponse } from "next/server";
import { isToolEnabled } from "@/lib/featureFlags";

const TOOL_ID = "website-screenshot";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchPageInfo(url: string): Promise<{ title: string; description: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarczellooTools/1.0)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { title: url, description: "Unable to fetch page info" };
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? url;

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch?.[1]?.trim() ?? "No description available";

    return { title, description };
  } catch {
    return { title: url, description: "Unable to fetch page info" };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const url = body.url as string | undefined;
    const viewport = body.viewport || { width: 1280, height: 720 };
    const format = body.format || "png";

    if (!url) {
      return NextResponse.json({ success: false, error: { code: "MISSING_URL", message: "Please provide a URL" } }, { status: 400 });
    }

    if (!isValidUrl(url)) {
      return NextResponse.json({ success: false, error: { code: "INVALID_URL", message: "Please enter a valid HTTP or HTTPS URL" } }, { status: 400 });
    }

    // Fetch page info
    const pageInfo = await fetchPageInfo(url);

    // For a full implementation, you would use Puppeteer/Playwright here:
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setViewport(viewport);
    // await page.goto(url);
    // const screenshot = await page.screenshot({ type: format });
    // await browser.close();

    // For now, return metadata and a placeholder message
    return NextResponse.json({
      success: true,
      screenshot: {
        url,
        title: pageInfo.title,
        description: pageInfo.description,
        viewport,
        format,
        note: "Full screenshot capture requires Puppeteer installation. This returns page metadata only.",
        // In production: screenshotUrl: `/api/download/website-screenshot/${filename}`,
      },
    });
  } catch (error) {
    console.error("Website screenshot error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to capture screenshots" } }, { status: 405 });
}
