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
import { RemoteUrlError, validateRemoteUrl } from "@/lib/security/remote-url";
import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { chromium } from "playwright-core";

const TOOL_ID = "website-screenshot";

function getBrowserExecutablePath(): string | undefined {
  return process.env.BROWSER_EXECUTABLE_PATH || (
    process.platform === "win32"
      ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      : process.env.CHROMIUM_PATH || "/usr/bin/chromium"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isToolEnabled(TOOL_ID)) {
    return NextResponse.json({ success: false, error: { code: "TOOL_DISABLED", message: "This tool is currently disabled" } }, { status: 403 });
  }

  try {
    const body = await request.json();
    const url = body.url as string | undefined;
    const viewport = {
      width: Math.min(2400, Math.max(320, Number(body.viewport?.width) || 1280)),
      height: Math.min(2000, Math.max(240, Number(body.viewport?.height) || 720)),
    };
    const format = body.format === "jpeg" || body.format === "webp" ? body.format : "png";

    if (!url) {
      return NextResponse.json({ success: false, error: { code: "MISSING_URL", message: "Please provide a URL" } }, { status: 400 });
    }

    try { await validateRemoteUrl(url); }
    catch (error) {
      return NextResponse.json({ success: false, error: { code: "INVALID_URL", message: error instanceof RemoteUrlError ? error.message : "Please enter a valid public HTTP or HTTPS URL" } }, { status: 400 });
    }

    const executablePath = getBrowserExecutablePath();
    const browser = await chromium.launch({ headless: true, executablePath });
    let screenshotPath: string | null = null;
    try {
      const page = await browser.newPage({ viewport });
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const outputDir = "./tmp/processed/website-screenshot";
      await mkdir(outputDir, { recursive: true });
      const filename = `${randomUUID()}.${format}`;
      screenshotPath = join(outputDir, filename);
      await page.screenshot({ path: screenshotPath, type: format, fullPage: false });
      const pageInfo = { title: await page.title(), description: "" };
      const description = await page.locator('meta[name="description"]').getAttribute("content").catch(() => null);
      pageInfo.description = description?.trim() || "No description available";
      const outputSize = (await stat(screenshotPath)).size;

      return NextResponse.json({
        success: true,
        screenshot: {
          url,
          title: pageInfo.title || url,
          description: pageInfo.description,
          viewport,
          format,
          filename,
          size: outputSize,
          downloadUrl: `/api/download/website-screenshot/${filename}`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Website screenshot error:", error);
    if (error instanceof RemoteUrlError) {
      return NextResponse.json({ success: false, error: { code: "INVALID_URL", message: error.message } }, { status: 400 });
    }
    if (error instanceof Error && /executable|browser|launch/i.test(error.message)) {
      return NextResponse.json({ success: false, error: { code: "BROWSER_UNAVAILABLE", message: "Screenshot browser is not configured. Set BROWSER_EXECUTABLE_PATH or install Chromium." } }, { status: 503 });
    }
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to capture screenshots" } }, { status: 405 });
}
