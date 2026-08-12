"use client";

import { useTranslation, type Locale } from "@/lib/i18n";

const LOCALES: { id: Locale; short: string }[] = [
  { id: "ko", short: "KO" },
  { id: "en", short: "EN" },
  { id: "zh", short: "ZH" },
];

interface LanguageSwitcherProps {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      className={`flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 ${
        compact ? "" : ""
      }`}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLocale(l.id)}
          title={t(`lang.${l.id}`)}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            locale === l.id
              ? "bg-[#4a6cf7] text-white shadow-sm"
              : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
          }`}
        >
          {compact ? l.short : t(`lang.${l.id}`)}
        </button>
      ))}
    </div>
  );
}
