import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/focus",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/generate",
        destination: `${backendUrl}/api/generate`,
      },
      {
        source: "/api/generate/stream/:path*",
        destination: `${backendUrl}/api/generate/stream/:path*`,
      },
      {
        source: "/api/status/:path*",
        destination: `${backendUrl}/api/status/:path*`,
      },
      {
        source: "/api/audio-url",
        destination: `${backendUrl}/api/audio-url`,
      },
      {
        source: "/api/history",
        destination: `${backendUrl}/api/history`,
      },
      {
        source: "/media/:path*",
        destination: `${backendUrl}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
