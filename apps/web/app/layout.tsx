import type { Metadata } from "next";
import { AppProviders } from "@/components/providers";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-provider";
import MembershipNoticeBanner from "@/components/common/membership-notice-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Research OS — AI-Powered Academic Research Platform",
  description: "Cloud-Collaborative, Local-First AI Research Operating System.",
  keywords: ["AI research", "academic writing", "thesis", "논문 작성", "AI 논문"],
  openGraph: {
    title: "AI Research OS",
    description: "AI-Powered Academic Research Operating System",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark" data-theme="midnight" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
