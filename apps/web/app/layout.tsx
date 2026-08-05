import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers";
import MembershipNoticeBanner from "@/components/common/membership-notice-banner";
import { MicrosoftClarity } from "@/components/analytics/microsoft-clarity";
import { TOKENS } from "@/lib/design-tokens";
import "./globals.css";

/* iOS/안드로이드/standalone 감지 → <html data-os data-standalone> (페인트 전 적용) */
const PLATFORM_INIT_SCRIPT = `
(function(){try{
  var ua = navigator.userAgent || "";
  var iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var standalone = (window.navigator.standalone === true) ||
                   (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  var os = iOS ? "ios" : (android ? "android" : "web");
  var d = document.documentElement;
  d.setAttribute("data-os", os);
  if (standalone) d.setAttribute("data-standalone", "true");
}catch(e){}})();
`;

export const metadata: Metadata = {
  title: "AI Research OS — AI-Powered Academic Research Platform",
  description: "Cloud-Collaborative, Local-First AI Research Operating System.",
  keywords: ["AI research", "academic writing", "thesis", "논문 작성", "AI 논문"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI Research OS",
  },
  openGraph: {
    title: "AI Research OS",
    description: "AI-Powered Academic Research Operating System",
    type: "website",
  },
};

/* iOS 노치/홈인디케이터 safe-area가 동작하려면 viewportFit:"cover"가 필수 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: TOKENS.bg0,
};

/**
 * 테마는 다크 1종이다. 이전의 midnight/charcoal/black 3중 테마와
 * localStorage 초기화 스크립트는 제거했다(테마를 늘리지 않는다는 원칙).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PLATFORM_INIT_SCRIPT }} />
        {/* 본문·제목 기본 굵기 2종만 미리 받는다. 나머지 5종은 swap 으로 따라온다. */}
        <link rel="preload" href="/fonts/NanumGothic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/NanumMyeongjoBold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <MicrosoftClarity />
        <AppProviders>
          <MembershipNoticeBanner />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
