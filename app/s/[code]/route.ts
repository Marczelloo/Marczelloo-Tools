import { type NextRequest, NextResponse } from "next/server";
import { getShortLink } from "@/lib/url-shortener-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const { code } = await params;
  const link = await getShortLink(code, true);
  if (!link)
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Short URL not found" } },
      { status: 404 }
    );
  return NextResponse.redirect(link.original, 307);
}
