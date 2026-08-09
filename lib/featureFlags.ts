/**
 * Feature Flags System
 * Centralized control for tool visibility, access, and feature rollout
 */

import { z } from "zod";

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export type ToolCategory = "media" | "image" | "document" | "web" | "dev";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  accent: "blue" | "cyan" | "emerald" | "green" | "orange" | "yellow" | "red" | "purple" | "pink";
  layout: "upload-center" | "split-panel" | "form-heavy" | "live-playground";
  enabled: boolean;
  route: string;
  maxFileSize?: number; // in MB
  new?: boolean;
}

/**
 * Tool Registry - All available tools with their configurations
 */
export const toolRegistry: readonly ToolDefinition[] = [
  // ============================================================================
  // 🎥 MEDIA TOOLS
  // ============================================================================
  {
    id: "video-converter",
    name: "Video Converter",
    description: "Convert video files or extract audio",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/video-converter",
    maxFileSize: 200,
  },
  {
    id: "audio-converter",
    name: "Audio Converter",
    description: "Convert audio files between formats",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/audio-converter",
    maxFileSize: 100,
  },
  {
    id: "video-compressor",
    name: "Video Compressor",
    description: "Compress videos with custom quality settings",
    category: "media",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/media/video-compressor",
    maxFileSize: 200,
  },
  {
    id: "audio-compressor",
    name: "Audio Compressor",
    description: "Compress audio files to reduce size",
    category: "media",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/media/audio-compressor",
    maxFileSize: 100,
  },
  {
    id: "video-trimmer",
    name: "Video Trimmer",
    description: "Trim and cut video clips",
    category: "media",
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/media/video-trimmer",
    maxFileSize: 200,
    new: true,
  },
  {
    id: "audio-trimmer",
    name: "Audio Trimmer",
    description: "Trim and cut audio files",
    category: "media",
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/media/audio-trimmer",
    maxFileSize: 100,
  },
  {
    id: "mp4-to-mp3",
    name: "Extract Audio",
    description: "Extract audio from MP4 videos as MP3",
    category: "media",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/media/mp4-to-mp3",
    maxFileSize: 200,
  },
  {
    id: "volume-booster",
    name: "Volume Booster",
    description: "Increase audio volume levels",
    category: "media",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/media/volume-booster",
    maxFileSize: 100,
    new: true,
  },

  // ============================================================================
  // 🖼 IMAGE TOOLS
  // ============================================================================
  {
    id: "image-converter",
    name: "Image Converter",
    description: "Convert images between different formats",
    category: "image",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/image/image-converter",
    maxFileSize: 50,
  },
  {
    id: "image-compressor",
    name: "Image Compressor",
    description: "Compress images without quality loss",
    category: "image",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/image/image-compressor",
    maxFileSize: 50,
  },
  {
    id: "background-remover",
    name: "Background Remover",
    description: "Remove background from images",
    category: "image",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/image/background-remover",
    maxFileSize: 20,
    new: true,
  },
  {
    id: "image-cropper",
    name: "Image Cropper",
    description: "Crop and resize images",
    category: "image",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/image/image-cropper",
    maxFileSize: 20,
  },
  {
    id: "png-to-webp",
    name: "PNG to WebP",
    description: "Convert PNG images to optimized WebP files",
    category: "image",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/image/png-to-webp",
    maxFileSize: 50,
    new: true,
  },

  // ============================================================================
  // 📄 DOCUMENT TOOLS
  // ============================================================================
  {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs into one",
    category: "document",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/document/pdf-merge",
    maxFileSize: 100,
  },
  {
    id: "pdf-split",
    name: "PDF Split",
    description: "Split PDF into separate pages",
    category: "document",
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/document/pdf-split",
    maxFileSize: 100,
  },
  {
    id: "pdf-compressor",
    name: "PDF Compressor",
    description: "Reduce PDF file size",
    category: "document",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/document/pdf-compressor",
    maxFileSize: 100,
  },
  {
    id: "pdf-to-word",
    name: "PDF ↔ Word",
    description: "Convert between PDF and Word formats",
    category: "document",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/document/pdf-to-word",
    maxFileSize: 50,
  },
  {
    id: "ocr",
    name: "OCR",
    description: "Extract text from images and PDFs",
    category: "document",
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/document/ocr",
    maxFileSize: 50,
    new: true,
  },

  // ============================================================================
  // 🌐 WEB TOOLS
  // ============================================================================
  {
    id: "url-shortener",
    name: "URL Shortener",
    description: "Create short, shareable links",
    category: "web",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/web/url-shortener",
    new: true,
  },
  {
    id: "qr-generator",
    name: "QR Generator",
    description: "Generate QR codes for any data",
    category: "web",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/web/qr-generator",
  },
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format, validate, and minify JSON",
    category: "web",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/web/json-formatter",
  },
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64 strings",
    category: "web",
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/web/base64-encoder",
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA-1, SHA-256 hashes",
    category: "web",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/web/hash-generator",
  },
  {
    id: "website-screenshot",
    name: "Website Screenshot",
    description: "Capture screenshots of websites",
    category: "web",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/web/website-screenshot",
    new: true,
  },

  // ============================================================================
  // 🧑‍💻 DEV TOOLS
  // ============================================================================
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate unique identifiers",
    category: "dev",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/dev/uuid-generator",
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode and verify JWT tokens",
    category: "dev",
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/dev/jwt-decoder",
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Test regular expressions",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/regex-tester",
  },
  {
    id: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert between timestamps and dates",
    category: "dev",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/dev/timestamp-converter",
  },
  {
    id: "color-palette",
    name: "Color Palette Generator",
    description: "Generate beautiful color palettes",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/color-palette",
    new: true,
  },
  {
    id: "css-gradient",
    name: "CSS Gradient Generator",
    description: "Create CSS gradients visually",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/css-gradient",
  },
  {
    id: "box-shadow",
    name: "Box Shadow Generator",
    description: "Generate CSS box shadows",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/box-shadow",
  },
  {
    id: "flexbox-playground",
    name: "Flexbox Playground",
    description: "Interactive flexbox learning tool",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/flexbox-playground",
  },
  {
    id: "grid-generator",
    name: "Grid Generator",
    description: "Create CSS Grid layouts",
    category: "dev",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/dev/grid-generator",
  },
  {
    id: "favicon-generator",
    name: "Favicon Generator",
    description: "Generate favicons for websites",
    category: "dev",
    accent: "blue",
    layout: "upload-center",
    enabled: true,
    route: "/app/dev/favicon-generator",
  },
  {
    id: "meta-preview",
    name: "Meta Tag Preview",
    description: "Preview social media link previews",
    category: "dev",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/dev/meta-preview",
    new: true,
  },

  // ============================================================================
  // 📥 DOWNLOADER TOOLS
  // ============================================================================
  {
    id: "url-downloader",
    name: "URL Downloader",
    description: "Download media from public URLs",
    category: "web",
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/downloader/url-downloader",
    maxFileSize: 200,
  },
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get tool by ID
 */
export function getToolById(id: string): ToolDefinition | undefined {
  return toolRegistry.find((t) => t.id === id);
}

/**
 * Get tool by route
 */
export function getToolByRoute(route: string): ToolDefinition | undefined {
  return toolRegistry.find((t) => t.route === route);
}

/**
 * Get all enabled tools
 */
export function getEnabledTools(): ToolDefinition[] {
  return toolRegistry.filter((t) => t.enabled);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return toolRegistry.filter((t) => t.category === category);
}

/**
 * Check if tool is enabled
 */
export function isToolEnabled(toolId: string): boolean {
  const tool = getToolById(toolId);
  return tool?.enabled ?? false;
}

/**
 * Get all categories
 */
export function getCategories(): ToolCategory[] {
  return [...new Set(toolRegistry.map((t) => t.category))];
}

/**
 * Get enabled tools grouped by category
 */
export function getEnabledToolsByCategory(): Record<ToolCategory, ToolDefinition[]> {
  const categories = getCategories();
  return categories.reduce(
    (acc, category) => {
      acc[category] = getToolsByCategory(category).filter((t) => t.enabled);
      return acc;
    },
    {} as Record<ToolCategory, ToolDefinition[]>
  );
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const toolIdSchema = z.string().min(1);
export const categorySchema = z.enum(["media", "image", "document", "web", "dev"]);

// ============================================================================
// FEATURE FLAGS (for non-tool features)
// ============================================================================

export const features = {
  /** Enable telemetry */
  telemetry: process.env.TELEMETRY_ENABLED === "true",

  /** Enable ads */
  ads: process.env.ADS_ENABLED !== "false",

  /** Enable search */
  search: false,

  /** Enable dark mode toggle */
  themeToggle: false,

  /** Enable file history (future) */
  fileHistory: false,

  /** Enable user accounts (future) */
  accounts: false,
} as const;
