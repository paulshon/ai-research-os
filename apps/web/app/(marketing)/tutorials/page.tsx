"use client";

import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";

const TUTORIALS = [
  { num: "01", color: "#6c8cff", titleKey: "tut1Title", descKey: "tut1Desc", duration: "5" },
  { num: "02", color: "#3ecfb2", titleKey: "tut2Title", descKey: "tut2Desc", duration: "3" },
  { num: "03", color: "#a78bfa", titleKey: "tut3Title", descKey: "tut3Desc", duration: "8" },
  { num: "04", color: "#e8b84b", titleKey: "tut4Title", descKey: "tut4Desc", duration: "10" },
  { num: "05", color: "#ec4899", titleKey: "tut5Title", descKey: "tut5Desc", duration: "7" },
  { num: "06", color: "#ff7066", titleKey: "tut6Title", descKey: "tut6Desc", duration: "6" },
  { num: "07", color: "#5ebd7c", titleKey: "tut7Title", descKey: "tut7Desc", duration: "5" },
  { num: "08", color: "#f472b6", titleKey: "tut8Title", descKey: "tut8Desc", duration: "5" },
] as const;

export default function TutorialsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher compact />
      </div>
      <div className="pt-28 pb-16 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#3ecfb2] mb-3 font-medium">
          {t("marketing.tutorialsBadge")}
        </p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-nanum-myeongjo font-bold mb-5">
          {t("marketing.tutorialsTitle")}
        </h1>
        <p className="text-white/35 max-w-lg mx-auto">{t("marketing.tutorialsSubtitle")}</p>
      </div>
      <div className="max-w-3xl mx-auto px-6 pb-28 space-y-4">
        {TUTORIALS.map((item) => (
          <div
            key={item.num}
            className="group flex items-center gap-5 p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer"
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[14px] font-bold flex-shrink-0 font-nanum-myeongjo"
              style={{ background: `${item.color}12`, color: item.color }}
            >
              {item.num}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold mb-0.5">{t(`marketing.${item.titleKey}`)}</h3>
              <p className="text-[13px] text-white/35 truncate">{t(`marketing.${item.descKey}`)}</p>
            </div>
            <span className="text-[11px] text-white/20 flex-shrink-0 font-['JetBrains_Mono',monospace]">
              {item.duration}
              {t("marketing.durationMin")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
