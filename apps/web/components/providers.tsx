"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { I18nProvider } from "@/lib/i18n";
import { CitationProvider } from "@/components/citation/citation-context";
import { TOKENS } from "@/lib/design-tokens";
import type { ReactNode } from "react";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Clerk 은 CSS 변수를 읽지 못하므로 토큰 원시값을 넘긴다.
 * 나머지 세부 스타일은 globals.css 의 .cl-* 규칙이 토큰으로 맞춘다.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: TOKENS.trackR,
    colorBackground: TOKENS.bg1,
    colorInputBackground: TOKENS.bg2,
    colorInputText: TOKENS.t1,
    colorText: TOKENS.t1,
    colorTextSecondary: TOKENS.t2,
    colorTextOnPrimaryBackground: TOKENS.white,
    colorNeutral: TOKENS.t1,
    colorDanger: TOKENS.danger,
    colorSuccess: TOKENS.ok,
    borderRadius: "12px",
    fontFamily: "'NanumGothic'",
    fontSize: "15px",
    spacingUnit: "16px",
  },
};

export function AppProviders({ children }: { children: ReactNode }) {
  const tree = (
    <I18nProvider>
      <CitationProvider>{children}</CitationProvider>
    </I18nProvider>
  );

  if (!clerkKey) return tree;

  return (
    <ClerkProvider publishableKey={clerkKey} appearance={clerkAppearance}>
      {tree}
    </ClerkProvider>
  );
}
