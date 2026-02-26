/**
 * FFmpeg Configuration
 * Auto-detects FFmpeg path on different platforms
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Detect FFmpeg executable path on Windows
 */
function findWindowsFFmpeg(): string | null {
  // Check environment variable first
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  // Check PATH environment variable
  const pathEnv = process.env.PATH || "";
  const pathParts = pathEnv.split(";");
  for (const part of pathParts) {
    const ffmpegPath = join(part.trim(), "ffmpeg.exe");
    if (existsSync(ffmpegPath)) {
      return ffmpegPath;
    }
  }

  // Check WinGet installations
  const userProfile = process.env.USERPROFILE || "";
  const localAppData = process.env.LOCALAPPDATA || "";

  // Common WinGet path pattern
  const winGetBase = join(localAppData, "Microsoft", "WinGet", "Packages");
  if (existsSync(winGetBase)) {
    try {
      const packages = readdirSync(winGetBase, { withFileTypes: true });
      for (const pkg of packages) {
        if (pkg.isDirectory() && pkg.name.toLowerCase().includes("ffmpeg")) {
          const ffmpegPath = join(winGetBase, pkg.name);
          // Look for bin/ffmpeg.exe in subdirectories
          try {
            const subDirs = readdirSync(ffmpegPath, { withFileTypes: true });
            for (const subDir of subDirs) {
              if (subDir.isDirectory()) {
                const binPath = join(ffmpegPath, subDir.name, "bin", "ffmpeg.exe");
                if (existsSync(binPath)) {
                  return binPath;
                }
              }
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  // Check common installation locations
  const commonPaths = [
    "C:/ffmpeg/bin/ffmpeg.exe",
    "C:/Program Files/ffmpeg/bin/ffmpeg.exe",
    join(userProfile, "scoop/apps/ffmpeg/current/bin/ffmpeg.exe"),
    "C:/ProgramData/chocolatey/bin/ffmpeg.exe",
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Detect FFmpeg executable path
 */
export function detectFFmpegPath(): string {
  // Check environment variable first
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  // On Windows, try to find FFmpeg
  if (process.platform === "win32") {
    const found = findWindowsFFmpeg();
    if (found) return found;
  }

  // In Docker/Linux, check common absolute paths
  if (process.platform === "linux") {
    const linuxPaths = ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
    for (const path of linuxPaths) {
      if (existsSync(path)) {
        return path;
      }
    }
  }

  // Default: assume ffmpeg is in PATH
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

/**
 * Detect FFprobe executable path
 */
export function detectFFprobePath(): string {
  // Check environment variable first
  const envPath = process.env.FFPROBE_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const ffmpegPath = detectFFmpegPath();

  // If we have a full path to ffmpeg, derive ffprobe path
  if (ffmpegPath.includes("/") || ffmpegPath.includes("\\")) {
    const lastSep = ffmpegPath.lastIndexOf("/");
    const lastBackSep = ffmpegPath.lastIndexOf("\\");
    const sepIndex = Math.max(lastSep, lastBackSep);

    if (sepIndex > 0) {
      const dir = ffmpegPath.substring(0, sepIndex);
      const ffprobeName = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
      const ffprobePath = join(dir, ffprobeName);
      if (existsSync(ffprobePath)) {
        return ffprobePath;
      }
    }
  }

  // In Docker/Linux, check common absolute paths
  if (process.platform === "linux") {
    const linuxPaths = ["/usr/bin/ffprobe", "/usr/local/bin/ffprobe"];
    for (const path of linuxPaths) {
      if (existsSync(path)) {
        return path;
      }
    }
  }

  return process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
}

// Export detected paths
export const FFMPEG_PATH = detectFFmpegPath();
export const FFPROBE_PATH = detectFFprobePath();

// Log FFmpeg paths in development only
if (process.env.NODE_ENV !== "production") {
  console.log("FFmpeg path detected:", FFMPEG_PATH);
  console.log("FFprobe path detected:", FFPROBE_PATH);
}
