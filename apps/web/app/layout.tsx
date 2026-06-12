import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-provider";
import MembershipNoticeBanner from "@/components/common/membership-notice-banner";
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

/* v49: iOS 노치/홈인디케이터 safe-area가 동작하려면 viewportFit:"cover"가 필수 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0f14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark" data-theme="midnight" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PLATFORM_INIT_SCRIPT }} />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0d0f14] text-[#e8eaf0] antialiased font-nanum-gothic">
        <AppProviders>
          <MembershipNoticeBanner />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
