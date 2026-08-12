"use client";

import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";

const DOC_SECTIONS = [
  {
    titleKey: "docGettingStarted",
    itemKeys: ["docItem1", "docItem2", "docItem3", "docItem4"],
    color: "#6c8cff",
  },
  {
    titleKey: "docCore",
    items: [
      "sidebar.structure",
      "sidebar.editor",
      "sidebar.analyzer",
      "sidebar.validation",
      "sidebar.schedule",
      "sidebar.library",
      "sidebar.critique",
    ],
    color: "#3ecfb2",
  },
  {
    titleKey: "docArchitecture",
    items: ["Monorepo", "Frontend (Next.js)", "Backend (FastAPI)", "Desktop (Electron)", "Realtime (Hocuspocus)", "Database (Supabase)"],
    color: "#a78bfa",
    raw: true,
  },
  {
    titleKey: "docApi",
    items: ["/ai/generate", "/projects/*", "/citations/*", "/validation/*", "/workflows/*", "/parsers/*"],
    color: "#e8b84b",
    raw: true,
  },
] as const;

export default function DocsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher compact />
      </div>
      <div className="pt-28 pb-16 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c8cff] mb-3 font-medium">
          {t("marketing.docsBadge")}
        </p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-nanum-myeongjo font-bold mb-5">{t("marketing.docsTitle")}</h1>
        <p className="text-white/35 max-w-lg mx-auto">{t("marketing.docsSubtitle")}</p>
      </div>
      <div className="max-w-4xl mx-auto px-6 pb-28 grid sm:grid-cols-2 gap-6">
        {DOC_SECTIONS.map((sec, i) => (
          <div key={i} className="p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
            <h3 className="text-[16px] font-semibold mb-4" style={{ color: sec.color }}>
              {t(`marketing.${sec.titleKey}`)}
            </h3>
            <ul className="space-y-2">
              {"itemKeys" in sec
                ? sec.itemKeys.map((key) => (
                    <li
                      key={key}
                      className="text-[13px] text-white/40 hover:text-white/60 cursor-pointer transition-colors py-1 px-3 rounded-lg hover:bg-white/[0.03]"
                    >
                      {t(`marketing.${key}`)}
                    </li>
                  ))
                : sec.items.map((item) => (
                    <li
                      key={item}
                      className="text-[13px] text-white/40 hover:text-white/60 cursor-pointer transition-colors py-1 px-3 rounded-lg hover:bg-white/[0.03]"
                    >
                      {"raw" in sec && sec.raw ? item : t(item)}
                    </li>
                  ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
