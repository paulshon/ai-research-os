"use client";

import LanguageSwitcher from "@/components/i18n/language-switcher";

/** Minimal unobtrusive top bar for the (auth) route group — just a language switcher, top-right. */
export default function AuthTopBar() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <LanguageSwitcher compact />
    </div>
  );
}
