import type { MetadataRoute } from "next";

/* s-renew-14: 아이콘 URL 에 ?v=14 를 붙여 설치된 PWA 의
   구 펜촉 아이콘 캐시를 무효화한다.
   s-renew-12: Studium R PWA manifest — iOS '홈 화면에 추가' 시 standalone 앱처럼 실행되도록 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudiumR — AI Research Operating System for Scholars",
    short_name: "StudiumR",
    description: "AI Research Operating System for Scholars",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0E1626",
    theme_color: "#0E1626",
    lang: "ko",
    categories: ["education", "productivity"],
    icons: [
      { src: "/images/icon-192.png?v=14", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/icon-512.png?v=14", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/images/icon-maskable-512.png?v=14", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
