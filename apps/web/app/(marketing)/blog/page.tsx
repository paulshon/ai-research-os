"use client";

import { useTranslation } from "@/lib/i18n";

const POST_KEYS = [
  { date: "2026.05.15", titleKey: "blogPage.post1Title", descKey: "blogPage.post1Desc", tagKey: "blogPage.post1Tag", color: "#6c8cff" },
  { date: "2026.05.10", titleKey: "blogPage.post2Title", descKey: "blogPage.post2Desc", tagKey: "blogPage.post2Tag", color: "#3ecfb2" },
  { date: "2026.05.05", titleKey: "blogPage.post3Title", descKey: "blogPage.post3Desc", tagKey: "blogPage.post3Tag", color: "#e8b84b" },
  { date: "2026.04.28", titleKey: "blogPage.post4Title", descKey: "blogPage.post4Desc", tagKey: "blogPage.post4Tag", color: "#a78bfa" },
];

export default function BlogPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="pt-28 pb-16 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#e8b84b] mb-3 font-medium">Blog</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-nanum-myeongjo font-bold mb-5">{t("blogPage.heading")}</h1>
      </div>
      <div className="max-w-3xl mx-auto px-6 pb-28 space-y-5">
        {POST_KEYS.map((p, i) => (
          <article key={i} className="group p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] text-white/20 font-['JetBrains_Mono',monospace]">{p.date}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: `${p.color}12`, color: p.color }}>{t(p.tagKey)}</span>
            </div>
            <h2 className="text-[18px] font-semibold mb-2 group-hover:text-[#6c8cff] transition-colors">{t(p.titleKey)}</h2>
            <p className="text-[13px] text-white/35 leading-relaxed">{t(p.descKey)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
