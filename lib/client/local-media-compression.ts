export interface LocalMediaProgress {
  progress: number;
  message: string;
}

export interface LocalVideoCompressionOptions {
  videoBitsPerSecond: number;
  onProgress?: (progress: LocalMediaProgress) => void;
}

export interface LocalAudioCompressionOptions {
  audioBitsPerSecond: number;
  sampleRate: number;
  onProgress?: (progress: LocalMediaProgress) => void;
}

function getOutputName(filename: string, extension: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9._-]/gi, "-");
  return `${baseName || "media"}-local.${extension}`;
}

function getSupportedMimeType(types: string[]): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function loadMediaElement<T extends HTMLMediaElement>(
  element: T,
  file: File
): { objectUrl: string; ready: Promise<T> } {
  const objectUrl = URL.createObjectURL(file);
  const ready = new Promise<T>((resolve, reject) => {
    element.onloadedmetadata = () => resolve(element);
    element.onerror = () => reject(new Error("The media could not be decoded in this browser"));
    element.src = objectUrl;
    element.load();
  });
  return { objectUrl, ready };
}

function getCaptureStream(video: HTMLVideoElement): MediaStream | null {
  const captureStream = (video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  }).captureStream ?? (video as HTMLVideoElement & {
    mozCaptureStream?: () => MediaStream;
  }).mozCaptureStream;

  return captureStream ? captureStream.call(video) : null;
}

export async function compressVideoLocally(
  file: File,
  options: LocalVideoCompressionOptions
): Promise<File> {
  const mimeType = getSupportedMimeType([
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ]);
  if (!mimeType) {
    throw new Error("This browser cannot encode WebM video locally");
  }

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  const { objectUrl, ready } = loadMediaElement(video, file);

  try {
    await ready;
    const stream = getCaptureStream(video);
    if (!stream) throw new Error("This browser cannot capture video locally");

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond,
    });

    const result = await new Promise<Blob>((resolve, reject) => {
      const progressTimer = window.setInterval(() => {
        const progress = video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0;
        options.onProgress?.({ progress, message: "Encoding video on this computer..." });
      }, 250);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("Local video encoding failed"));
      recorder.onstop = () => {
        window.clearInterval(progressTimer);
        resolve(new Blob(chunks, { type: mimeType }));
      };
      video.onended = () => recorder.stop();

      recorder.start(1000);
      void video.play().catch(() => reject(new Error("The browser blocked local video playback")));
    });

    return new File([result], getOutputName(file.name, "webm"), {
      type: "video/webm",
      lastModified: Date.now(),
    });
  } finally {
    video.pause();
    video.src = "";
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compressAudioLocally(
  file: File,
  options: LocalAudioCompressionOptions
): Promise<File> {
  const mimeType = getSupportedMimeType([
    "audio/ogg;codecs=opus",
    "audio/webm;codecs=opus",
    "audio/webm",
  ]);
  if (!mimeType) {
    throw new Error("This browser cannot encode OGG/WebM audio locally");
  }

  const AudioContextConstructor = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error("Web Audio is not available in this browser");

  const audioContext = new AudioContextConstructor({ sampleRate: options.sampleRate });
  try {
    const audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());
    const source = audioContext.createBufferSource();
    const destination = audioContext.createMediaStreamDestination();
    source.buffer = audioBuffer;
    source.connect(destination);

    const recorder = new MediaRecorder(destination.stream, {
      mimeType,
      audioBitsPerSecond: options.audioBitsPerSecond,
    });
    const chunks: Blob[] = [];
    const result = await new Promise<Blob>((resolve, reject) => {
      const progressTimer = window.setInterval(() => {
        const progress = audioBuffer.duration > 0
          ? Math.min(100, (audioContext.currentTime / audioBuffer.duration) * 100)
          : 0;
        options.onProgress?.({ progress, message: "Encoding audio on this computer..." });
      }, 250);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("Local audio encoding failed"));
      recorder.onstop = () => {
        window.clearInterval(progressTimer);
        resolve(new Blob(chunks, { type: mimeType }));
      };
      source.onended = () => recorder.stop();
      recorder.start(1000);
      source.start();
    });

    return new File([result], getOutputName(file.name, "ogg"), {
      type: "audio/ogg",
      lastModified: Date.now(),
    });
  } finally {
    await audioContext.close();
  }
}
