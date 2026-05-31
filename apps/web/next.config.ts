import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // v23: 모노레포 루트를 명시하여 빌드 경고 제거 및 파일 트레이싱 안정화
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@ai-research-os/ui",
    "@ai-research-os/shared-types",
    "@ai-research-os/editor-core",
    "@ai-research-os/citation-core",
    "@ai-research-os/document-core",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
