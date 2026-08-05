"use client";
import { Icon } from "@/components/ui/icon";

import Link from "next/link";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";

const ENGINES = [
  { icon: "⬡", color: "#6c8cff", key: "structure", detailPrefix: "featStructure" },
  { icon: "◈", color: "#3ecfb2", key: "chat", detailPrefix: "featChat" },
  { icon: "✍", color: "#a78bfa", key: "editor", detailPrefix: "featEditor" },
  { icon: "🔬", color: "#f59e0b", key: "analyzer", detailPrefix: "featAnalyzer" },
  { icon: "🛡", color: "#ff7066", key: "validation", detailPrefix: "featValidation" },
  { icon: "📋", color: "#e8b84b", key: "workflow", detailPrefix: "featWorkflow" },
  { icon: "🧑‍🏫", color: "#ec4899", key: "mentoring", detailPrefix: "featMentoring" },
  { icon: "📚", color: "#5ebd7c", key: "library", detailPrefix: "featLibrary" },
  { icon: "📝", color: "#f472b6", key: "critique", detailPrefix: "featCritique" },
] as const;

export default function FeaturesPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher compact />
      </div>
      <div className="pt-28 pb-16 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c8cff] mb-3 font-medium">
          {t("marketing.featuresBadge")}
        </p>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-nanum-myeongjo font-bold mb-5">
          {t("marketing.featuresTitle")}
        </h1>
        <p className="text-white/35 max-w-xl mx-auto leading-relaxed">{t("marketing.featuresSubtitle")}</p>
      </div>
      <div className="max-w-4xl mx-auto px-6 pb-28 space-y-6">
        {ENGINES.map((e) => (
          <div
            key={e.key}
            className="p-8 rounded-[6px] bg-[#13161e] border border-white/[0.04] hover:border-white/[0.08] transition-all"
          >
            <div className="flex items-start gap-5 mb-5">
              <div
                className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
                style={{ background: `${e.color}12`, color: e.color }}
              >
                <Icon name={e.icon} className="inline-flex align-[-0.125em]" size={15} />
              </div>
              <div>
                <h2 className="text-[20px] font-bold">{t(`features.${e.key}.title`)}</h2>
                <p className="text-[11px] text-white/25 font-['JetBrains_Mono',monospace]">
                  {t(`features.${e.key}.en`)}
                </p>
              </div>
            </div>
            <p className="text-[14px] text-white/45 mb-5 leading-relaxed">{t(`features.${e.key}.desc`)}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex items-start gap-2.5 text-[13px] text-white/40 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]" style={{ background: e.color }} />
                  {t(`marketing.${e.detailPrefix}D${n}`)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="pb-28 text-center px-6">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[15px] font-medium transition-all shadow-xl shadow-[#4a6cf7]/25"
        >
          {t("common.signup")}
        </Link>
      </div>
    </div>
  );
}
