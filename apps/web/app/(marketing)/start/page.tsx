"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TRACK_ENTRIES } from "@/lib/rdos/gateway";
import { useTranslation } from "@/lib/i18n";

/* ─── inline icons (랜딩 페이지와 동일 패턴) ─── */
function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconCheck({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const TRACK_BULLET_KEYS: Record<"rdos" | "aros", string[]> = {
  rdos: [
    "startPage.rdosBullet1",
    "startPage.rdosBullet2",
    "startPage.rdosBullet3",
    "startPage.rdosBullet4",
  ],
  aros: [
    "startPage.arosBullet1",
    "startPage.arosBullet2",
    "startPage.arosBullet3",
    "startPage.arosBullet4",
  ],
};

export default function StartGatewayPage() {
  const { t } = useTranslation();
  const rdos = TRACK_ENTRIES.rdos;
  const aros = TRACK_ENTRIES.aros;

  return (
    <div className="min-h-screen bg-[#070708] text-[#f4f4f5] font-nanum-gothic antialiased">
      {/* ── 상위 메뉴 (플랜 진입) ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#070708]/85 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-[1280px] mx-auto px-6 h-[76px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo size={32} radius={9} />
            <span className="text-[17px] font-bold tracking-tight">AI Research <span className="text-[#ff7a00]">OS</span></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href={rdos.enterRoute} className="px-4 py-2 text-[14px] text-white/70 hover:text-white transition rounded-lg font-medium">
              {t("startPage.navRdos")}
            </Link>
            <Link href={aros.enterRoute} className="px-4 py-2 text-[14px] text-white/70 hover:text-white transition rounded-lg font-medium">
              {t("startPage.navAros")}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 중간 랜딩: 두 플랜 진입 버튼 ── */}
      <section className="pt-[140px] pb-28 px-6">
        <div className="max-w-[1080px] mx-auto text-center mb-14">
          <p className="text-[12px] uppercase tracking-[0.22em] text-white/35 mb-6 font-mono">{t("startPage.kicker")}</p>
          <h1 className="font-nanum-bold tracking-[-0.01em] leading-[1.25] mb-5" style={{ fontSize: "clamp(1.7rem, 3.2vw, 2.4rem)" }}>
            {t("startPage.heading")}
          </h1>
          <p className="text-[15px] text-white/50 max-w-[560px] mx-auto leading-relaxed">
            {t("startPage.subheading1")}
            {" "}{t("startPage.subheading2")} <span className="text-[#3ecfb2]">RDOS</span> {t("startPage.subheading3")}
            {" "}{t("startPage.subheading4")} <span className="text-[#ff7a00]">AI-Research-OS</span>.
          </p>
        </div>

        <div className="max-w-[920px] mx-auto grid md:grid-cols-2 gap-6">
          {[rdos, aros].map((tr) => {
            const bulletKeys = TRACK_BULLET_KEYS[tr.id];
            return (
              <div
                key={tr.id}
                className="relative flex flex-col p-8 rounded-[22px] bg-[#0c0c0e] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300"
              >
                <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center mb-6"
                  style={{ background: `${tr.accent}1f`, color: tr.accent }}>
                  <BrandLogo size={22} radius={6} />
                </div>
                <h2 className="text-[21px] font-bold tracking-tight mb-1">{t(tr.titleKey)}</h2>
                <p className="text-[11px] font-mono mb-4" style={{ color: tr.accent }}>{tr.service}</p>
                <p className="text-[13.5px] text-white/55 leading-[1.7] mb-1"><span className="text-white/40">{t("startPage.audienceLabel")}</span> · {t(tr.audienceKey)}</p>
                <p className="text-[13.5px] text-white/55 leading-[1.7] mb-5"><span className="text-white/40">{t("startPage.purposeLabel")}</span> · {t(tr.purposeKey)}</p>

                <ul className="space-y-2.5 mb-8">
                  {bulletKeys.map((key) => (
                    <li key={key} className="flex items-start gap-2.5 text-[13px] text-white/60">
                      <span className="mt-0.5 flex-shrink-0"><IconCheck color={tr.accent} /></span>
                      {t(key)}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tr.enterRoute}
                  className="group mt-auto inline-flex items-center justify-center gap-2 py-3.5 rounded-[13px] text-[15px] font-semibold transition-all duration-200 hover:-translate-y-[1px]"
                  style={{ background: tr.accent, color: "#070708" }}
                >
                  {t(tr.ctaKey)}
                  <IconArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="max-w-[920px] mx-auto mt-10 p-5 rounded-[16px] bg-[#0c0c0e] border border-white/[0.08]">
          <p className="text-[11px] text-white/35 font-mono mb-3">{t("startPage.userFlowLabel")}</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {[
              t("startPage.flowLanding"), "→",
              t("startPage.flowPlanSelect"), "→",
              t("startPage.flowSignup"), "→",
              t("startPage.flowAuth"), "→",
              t("startPage.flowAdminApproval"), "→",
              t("startPage.flowFinal"),
            ].map((s, i) => (
              <span key={i} className={s === "→" ? "text-white/20" : "px-2 py-1 rounded bg-white/[0.04] text-white/50 border border-white/[0.07]"}>{s}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
