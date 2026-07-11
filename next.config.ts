import type { NextConfig } from "next";

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
        destination: "http://localhost:8000/api/generate",
      },
      {
        source: "/api/generate/stream/:path*",
        destination: "http://localhost:8000/api/generate/stream/:path*",
      },
      {
        source: "/api/status/:path*",
        destination: "http://localhost:8000/api/status/:path*",
      },
      {
        source: "/api/history",
        destination: "http://localhost:8000/api/history",
      },
      {
        source: "/media/:path*",
        destination: "http://localhost:8000/media/:path*",
      },
    ];
  },
};

export default nextConfig;
