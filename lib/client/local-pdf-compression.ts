import { PDFDocument } from "pdf-lib";

export type LocalPdfCompressionLevel = "low" | "medium" | "high";

function getOutputName(filename: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9._-]/gi, "-");
  return `${baseName || "document"}-compressed.pdf`;
}

/** Rewrites a PDF in the browser using object streams and a compact object layout. */
export async function compressPdfLocally(
  file: File,
  level: LocalPdfCompressionLevel
): Promise<File> {
  const pdfDocument = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });

  const objectsPerTick = level === "high" ? 25 : level === "medium" ? 50 : 100;
  const compressedBytes = await pdfDocument.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick,
  });
  const safeBytes = new Uint8Array(compressedBytes.byteLength);
  safeBytes.set(compressedBytes);

  return new File([safeBytes.buffer], getOutputName(file.name), {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}
