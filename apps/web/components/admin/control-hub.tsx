"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useTranslation } from "@/lib/i18n";
import LanguageSwitcher from "@/components/i18n/language-switcher";

/* 통합 관리자 허브 (v9) — 슈퍼관리자 전용.
   · 연구자(AI-Research-OS) 관리자 / 연구준비자(RDOS) 관리자 진입
   · 연구자 본페이지(/dashboard) / 연구준비자 본페이지(/rdos) 바로가기 */

const CARDS = [
  { href: "/admin", kind: "admin", titleKey: "control.cards.arosAdmin.title", descKey: "control.cards.arosAdmin.desc", badge: "👑", color: "#6c8cff" },
  { href: "/rdos/admin", kind: "admin", titleKey: "control.cards.rdosAdmin.title", descKey: "control.cards.rdosAdmin.desc", badge: "👑", color: "#e8b84b" },
  { href: "/dashboard", kind: "go", titleKey: "control.cards.arosGo.title", descKey: "control.cards.arosGo.desc", badge: "→", color: "#6c8cff" },
  { href: "/rdos", kind: "go", titleKey: "control.cards.rdosGo.title", descKey: "control.cards.rdosGo.desc", badge: "→", color: "#3ecfb2" },
];

export default function ControlHub({ adminName }: { adminName: string | null }) {
  const { t } = useTranslation();
  const displayName = adminName || t("control.defaultAdminName");
  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="max-w-[920px] mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <BrandLogo size={34} radius={9} />
            <span className="font-nanum-myeongjo text-[18px] font-semibold">AI Research <span className="text-[#e8b84b]">OS</span> <span className="text-white/40">{t("control.brandSuffix")}</span></span>
          </div>
          <LanguageSwitcher compact />
        </div>
        <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight mt-6">
          <span className="mr-2">👑</span>{t("control.title")}
        </h1>
        <p className="text-[14px] text-white/50 mt-1.5">
          {t("control.welcome").replace("{name}", displayName)}
        </p>

        <div className="mt-9 grid sm:grid-cols-2 gap-4">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href}
              className="group relative p-5 rounded-[16px] border transition-all overflow-hidden"
              style={{ background: "#10131a", borderColor: c.color + "33" }}>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `radial-gradient(420px circle at 30% 0%, ${c.color}14, transparent 70%)` }} aria-hidden />
              <div className="relative flex items-start gap-3">
                <span className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[18px] font-bold flex-shrink-0"
                  style={{ background: c.color + "1f", color: c.color }}>{c.badge}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold text-white/90">{t(c.titleKey)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: c.color + "1f", color: c.color }}>
                      {c.kind === "admin" ? t("control.badgeAdmin") : t("control.badgeGo")}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-white/50 mt-1 leading-relaxed">{t(c.descKey)}</p>
                </div>
                <span className="text-white/25 group-hover:text-white/60 transition-colors text-[18px] flex-shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-[13px] bg-[#0e1118] border border-white/[0.06]">
          <p className="text-[12px] text-white/45 leading-relaxed">
            {t("control.footerNotice")}
          </p>
        </div>
      </div>
    </div>
  );
}
