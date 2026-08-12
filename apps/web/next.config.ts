import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // v15: Electron 패키징 — 자체 포함 Node 서버(server.js)를 생성해 오프라인 구동 가능하게 함
  output: "standalone",
  // v23: 모노레포 루트를 명시하여 빌드 경고 제거 및 파일 트레이싱 안정화
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@ai-research-os/ui",
    "@ai-research-os/rdos-core",
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
    // v4(감사 Medium): 전역 CORS `*` 제거. 자격증명 기반 관리자 API 와 함께
    // 쓰일 때 위험하므로 허용 출처를 화이트리스트로 제한한다.
    // ALLOWED_ORIGINS(콤마 구분) 미설정 시 앱 자체 출처만 허용.
    const allowed =
      (process.env.ALLOWED_ORIGINS ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)[0] || "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowed },
          { key: "Vary", value: "Origin" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
