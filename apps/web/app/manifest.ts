import type { MetadataRoute } from "next";

/* v49: PWA manifest — iOS '홈 화면에 추가' 시 standalone 앱처럼 실행되도록 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Research OS",
    short_name: "Research OS",
    description: "AI-Powered Academic Research Operating System",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0f14",
    theme_color: "#0d0f14",
    lang: "ko",
    categories: ["education", "productivity"],
    icons: [
      { src: "/images/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
