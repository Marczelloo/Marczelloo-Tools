import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,

  // Standalone output for Docker
  output: "standalone",

  // Increase body size limit for large file uploads (videos, etc.)
  experimental: {
    // Allow up to 250MB for API route body size
    proxyClientMaxBodySize: "250mb",
  },

  // API route configuration
  serverExternalPackages: ["fluent-ffmpeg"],
};

export default nextConfig;
