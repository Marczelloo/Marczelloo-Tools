import { type NextRequest, NextResponse } from "next/server";
import { readFile, stat, unlink } from "fs/promises";
import { downloadExists, getContentType, getDownloadPath } from "@/lib/downloads";

interface DownloadParams {
  params: Promise<{ tool: string; filename: string[] }>;
}

export async function GET(
  _request: NextRequest,
  { params }: DownloadParams
): Promise<NextResponse> {
  const { tool, filename } = await params;
  const filepath = getDownloadPath(tool, filename);

  if (!filepath) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_FILENAME", message: "Invalid download path" } },
      { status: 400 }
    );
  }

  if (!downloadExists(filepath)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "FILE_NOT_FOUND", message: "File not found or has expired" },
      },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = await readFile(filepath);
    const stats = await stat(filepath);
    const filenameHeader = filename[filename.length - 1] ?? "download";
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": getContentType(filenameHeader),
        "Content-Length": stats.size.toString(),
        "Content-Disposition": `attachment; filename="${filenameHeader.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

    setTimeout(() => unlink(filepath).catch(() => {}), 1000);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "DOWNLOAD_FAILED", message: "Failed to read file" } },
      { status: 500 }
    );
  }
}
