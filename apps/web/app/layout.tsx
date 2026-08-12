import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-provider";
import MembershipNoticeBanner from "@/components/common/membership-notice-banner";
import { MicrosoftClarity } from "@/components/analytics/microsoft-clarity";
import "./globals.css";

/* v49: iOS/안드로이드/standalone 감지 → <html data-os data-standalone> (페인트 전 적용) */
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
  title: "StudiumR",
  description: "AI Research Operating System for Scholars — Studium (學) + R (Research · Researcher · Ready).",
  keywords: ["Studium R", "AI research", "academic writing", "thesis", "논문 작성", "AI 논문", "학술연구 운영체제"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StudiumR",
  },
  openGraph: {
    title: "StudiumR",
    description: "AI Research Operating System for Scholars",
    type: "website",
  },
};

/* v49: iOS 노치/홈인디케이터 safe-area가 동작하려면 viewportFit:"cover"가 필수 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E1626",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark" data-theme="midnight" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PLATFORM_INIT_SCRIPT }} />
        {/* s-renew-12: 본문 폰트는 첨부 제공 NanumGothic/NanumMyeongjo 전용 (원격 웹폰트 미사용) */}
        {/* Google Material Symbols — Apache License 2.0 (문헌연구 엔진 차트·그래프) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[var(--bg,#0E1626)] text-[#F4F1EA] antialiased font-nanum-gothic">
        <MicrosoftClarity />
        <AppProviders>
          <MembershipNoticeBanner />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
