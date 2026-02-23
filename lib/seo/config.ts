/**
 * SEO Configuration
 * Central configuration for all SEO-related settings
 */

export const SEO_CONFIG = {
  site: {
    name: "Marczelloo Tools",
    url: "https://tools.marczelloo.dev",
    description: "Free online tools for developers and creators. Video converter, audio extractor, image compressor, JSON formatter, and more.",
    keywords: [
      "online tools",
      "video converter",
      "audio extractor",
      "image compressor",
      "json formatter",
      "file converter",
      "privacy focused",
      "no ads",
      "free tools",
      "developer tools",
    ],
    author: "Marczelloo",
    language: "en",
    locale: "en_US",
  },
  social: {
    twitter: "@marczelloo",
    ogImage: "/og-image.png",
    twitterCard: "summary_large_image",
  },
  defaults: {
    titleTemplate: "%s | Marczelloo Tools",
    defaultTitle: "Marczelloo Tools - Free Online Utilities",
    description: "Fast, secure, and privacy-focused online tools. Convert videos, compress images, format JSON, and more.",
  },
} as const;

// Tool-specific SEO data
export const TOOL_SEO: Record<
  string,
  {
    title: string;
    description: string;
    keywords: string[];
  }
> = {
  "mp4-to-mp3": {
    title: "MP4 to MP3 Converter",
    description: "Extract audio from MP4 videos as high-quality MP3 files. Free, fast, and secure.",
    keywords: ["mp4 to mp3", "extract audio", "video to audio", "mp3 converter"],
  },
  "png-to-webp": {
    title: "PNG to WEBP Converter",
    description: "Convert PNG images to WEBP format with adjustable quality. Reduce file size while maintaining quality.",
    keywords: ["png to webp", "image converter", "webp converter", "image compression"],
  },
  "json-formatter": {
    title: "JSON Formatter & Validator",
    description: "Format, validate, and minify JSON data. Real-time syntax checking with error highlighting.",
    keywords: ["json formatter", "json validator", "json minify", "json prettify"],
  },
  "url-downloader": {
    title: "URL Downloader",
    description: "Download media from public URLs. Supports video, audio, and images from direct links.",
    keywords: ["url downloader", "media downloader", "download video", "download audio"],
  },
  "video-compressor": {
    title: "Video Compressor",
    description: "Compress video files with custom bitrate and quality settings. Reduce file size while maintaining quality.",
    keywords: ["video compressor", "compress video", "reduce video size", "video optimization"],
  },
  "hash-generator": {
    title: "Hash Generator",
    description: "Generate MD5, SHA-1, SHA-256 hashes for text and files. Cryptographic hash generator.",
    keywords: ["hash generator", "md5", "sha256", "checksum", "hash calculator"],
  },
};

// Category SEO data
export const CATEGORY_SEO: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  media: {
    title: "Media Tools",
    description: "Video, audio, and image processing tools. Convert, compress, and optimize your media files.",
  },
  dev: {
    title: "Developer Tools",
    description: "Utilities for developers. JSON formatter, hash generator, Base64 encoder, and more.",
  },
  converter: {
    title: "Converters",
    description: "File format converters. Convert between video, audio, and image formats.",
  },
  downloader: {
    title: "Downloaders",
    description: "Download media from public URLs. Direct link downloaders for videos and images.",
  },
};
