"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { I18nProvider } from "@/lib/i18n";
import { CitationProvider } from "@/components/citation/citation-context";
import { ThemeProvider } from "@/components/theme/theme-provider";
import type { ReactNode } from "react";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const clerkAppearance = {
  variables: {
    colorPrimary: "#4a6cf7",
    colorBackground: "#13161e",
    colorInputBackground: "#1a1e2a",
    colorInputText: "#e8eaf0",
    colorText: "#e8eaf0",
    colorTextSecondary: "#9ba3b8",
    colorTextOnPrimaryBackground: "#ffffff",
    colorNeutral: "#e8eaf0",
    colorShimmer: "rgba(255,255,255,0.06)",
    colorDanger: "#ff7066",
    colorSuccess: "#5ebd7c",
    borderRadius: "12px",
    fontFamily: "'NanumGothic', 'IBM Plex Sans KR', sans-serif",
    fontSize: "15px",
    spacingUnit: "16px",
  },
};

export function AppProviders({ children }: { children: ReactNode }) {
  if (!clerkKey) {
    return (
      <ThemeProvider>
        <I18nProvider>
          <CitationProvider>{children}</CitationProvider>
        </I18nProvider>
      </ThemeProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkKey} appearance={clerkAppearance}>
      <ThemeProvider>
        <I18nProvider>
          <CitationProvider>{children}</CitationProvider>
        </I18nProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
