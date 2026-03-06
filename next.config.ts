import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,

  // Standalone output for Docker
  output: "standalone",

  // API route configuration
  serverExternalPackages: ["fluent-ffmpeg"],

  // Increase body size limit for large file uploads
  experimental: {
    middlewareClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
