export type LocalImageFormat = "jpeg" | "png" | "webp";

export interface LocalImageCompressionOptions {
  quality: number;
  outputFormat: LocalImageFormat;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The image could not be decoded in this browser"));
    };
    image.src = objectUrl;
  });
}

function getOutputExtension(outputFormat: LocalImageFormat): string {
  return outputFormat === "jpeg" ? "jpg" : outputFormat;
}

function getOutputMimeType(outputFormat: LocalImageFormat): string {
  return outputFormat === "jpeg" ? "image/jpeg" : `image/${outputFormat}`;
}

function getOutputName(filename: string, outputFormat: LocalImageFormat): string {
  const baseName = filename.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9._-]/gi, "-");
  return `${baseName || "image"}-compressed.${getOutputExtension(outputFormat)}`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("The browser could not encode the image"));
        }
      },
      mimeType,
      quality / 100
    );
  });
}

/**
 * Compresses an image entirely in the browser. The original pixel dimensions
 * are preserved; only the selected encoder/quality changes.
 */
export async function compressImageLocally(
  file: File,
  options: LocalImageCompressionOptions
): Promise<File> {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available in this browser");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  // JPEG has no alpha channel. Use a white background instead of letting
  // transparent pixels turn black during local conversion.
  if (options.outputFormat === "jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0);

  const blob = await canvasToBlob(
    canvas,
    getOutputMimeType(options.outputFormat),
    Math.min(100, Math.max(1, options.quality))
  );

  return new File([blob], getOutputName(file.name, options.outputFormat), {
    type: blob.type || getOutputMimeType(options.outputFormat),
    lastModified: Date.now(),
  });
}
