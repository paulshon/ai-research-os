"use client";
import { Icon } from "@/components/ui/icon";

import { BrandLogo } from "@/components/ui/brand-logo";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";
import { AllFeaturesMotion } from "@/components/marketing/motion-showcase";
import { MenuFlowShowcase } from "@/components/marketing/menu-flow-showcase";
import { LiveClock } from "@/components/marketing/live-clock";
import { SplashGate } from "@/components/marketing/splash-screen";

/* ─── SVG Icons ─── */
function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const FEATURE_KEYS = [
  { icon: "structure", color: "#7c93ff", key: "structure" },
  { icon: "chat", color: "#3ecfb2", key: "chat" },
  { icon: "library", color: "#5ebd7c", key: "library" },
  { icon: "writing", color: "#a78bfa", key: "editor" },
  { icon: "shield", color: "#ff7066", key: "validation" },
  { icon: "workflow", color: "#e8b84b", key: "workflow" },
  { icon: "mentoring", color: "#ec4899", key: "mentoring" },
  { icon: "analyzer", color: "#f59e0b", key: "analyzer" },
  { icon: "critique", color: "#f472b6", key: "critique" },
] as const;

const RF_KEYS = ["rfStructure", "rfChat", "rfSearch", "rfAnalyzer", "rfValidation", "rfWorkflow", "rfMentoring", "rfLibrary", "rfCritique", "rfCitation"] as const;

const WORKFLOW_STEPS = [
  { num: "01", color: "#7c93ff" },
  { num: "02", color: "#3ecfb2" },
  { num: "03", color: "#e8b84b" },
  { num: "04", color: "#a78bfa" },
];

/* 연구자 플랜 (AI-Research-OS) — 등급별 제공 기능 (사양서 7절) */
const AROS_TIERS = [
  {
    key: "free", name: "Free", descKey: "landing2.freeDesc", popular: false,
    featKeys: ["", "landing2.fResearchDesign", "landing2.fLitResearch", "landing2.fWritingQuantQual"],
    featLits: ["Dashboard", "", "", ""],
    ctaKey: "landing2.freeCta", href: "/signup?plan=free",
  },
  {
    key: "basic", name: "Basic", descKey: "landing2.basicDesc", popular: false,
    featKeys: ["", "landing2.fResearchDesign", "landing2.fLitResearch", "landing2.fWritingQQME", "landing2.fReview", "landing2.fSchedule", "landing2.fAnalysis", "landing2.fCritique"],
    featLits: ["Dashboard", "", "", "", "", "", "", ""],
    ctaKey: "landing2.basicCta", href: "/signup?plan=basic",
  },
  {
    key: "scholar", name: "Scholar", descKey: "landing2.scholarDesc", popular: true,
    featKeys: ["", "landing2.fResearchDesign", "landing2.fLitResearch", "landing2.fWritingAll8", "landing2.fReview", "landing2.fSchedule", "landing2.fAnalysis", "landing2.fCritique", "landing2.fLibrary", "landing2.fReferences"],
    featLits: ["Dashboard", "", "", "", "", "", "", "", "", ""],
    ctaKey: "landing2.scholarCta", href: "/signup?plan=scholar",
  },
  {
    key: "university", name: "University", descKey: "landing2.uniDesc", popular: false,
    featKeys: ["landing2.fWritingAllTypes", "landing2.fMethodEngine", "landing2.fReviewSchedAnalysis", "landing2.fLibRef", "landing2.fQuantQualEdu", "landing2.fDesignEdu", "landing2.fInstLicense", "landing2.fProfTools"],
    featLits: ["", "", "", "", "", "", "", ""],
    ctaKey: "landing2.uniCta", href: "/signup?plan=university",
  },
] as const;

/* 연구준비자 플랜 (RDOS) — 메뉴 · 제공 내용 (사양서 6절) */
const RDOS_OFFERINGS = [
  ["landing2.rm1L", "landing2.rm1D"],
  ["landing2.rm2L", "landing2.rm2D"],
  ["landing2.rm3L", "landing2.rm3D"],
  ["landing2.rm4L", "landing2.rm4D"],
  ["landing2.rm5L", "landing2.rm5D"],
  ["landing2.rm6L", "landing2.rm6D"],
  ["landing2.rm7L", "landing2.rm7D"],
  ["landing2.rm8L", "landing2.rm8D"],
  ["landing2.rm9L", "landing2.rm9D"],
  ["landing2.rm10L", "landing2.rm10D"],
] as const;

/* blur-reveal 헤드라인 (DesignMe 권장 모션) */
const blurReveal = {
  hidden: { opacity: 0, y: 24, filter: "blur(12px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function LandingPage() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  // v45: 랜딩 진입 전 스플래시. v9: 세션 중 1회만 — 뒤로가기로 재진입 시 즉시 랜딩 표시.
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("rdos_splash_seen") === "1") setShowSplash(false);
    } catch { /* sessionStorage 불가 환경 무시 */ }
  }, []);

  useEffect(() => {
    if (showSplash) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showSplash]);

  const NAV_LINKS = [
    { href: "/rdos", label: t("startPage.navRdos") },
    { href: "/dashboard", label: t("startPage.navAros") },
    { href: "#features", label: t("nav.features") },
    { href: "#architecture", label: t("nav.architecture") },
    { href: "#workflow", label: t("nav.workflow") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: "/docs", label: t("nav.docs") },
    { href: "/blog", label: t("nav.blog") },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div data-page="landing" className="min-h-screen bg-[#070708] text-[#f4f4f5] overflow-x-hidden font-nanum-gothic antialiased">

      {/* v45: 스플래시 스크린 — 랜딩 진입 전 3초간 표시 */}
      <SplashGate show={showSplash} onDone={() => { try { sessionStorage.setItem("rdos_splash_seen", "1"); } catch { /* ignore */ } setShowSplash(false); }} />

      {/* ════════════ NAVBAR (floating, black) ════════════ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-[#070708]/85 backdrop-blur-xl border-b border-white/[0.07]" : "bg-transparent"}`}>
        <div className="max-w-[1280px] mx-auto px-6 h-[76px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0 whitespace-nowrap">
            <BrandLogo size={32} radius={9} />
            <span className="text-[17px] font-bold tracking-tight font-nanum-gothic whitespace-nowrap">AI Research <span className="text-[#ff7a00]">OS</span></span>
          </Link>
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[14px] text-white/55 hover:text-white transition-colors duration-200 font-medium whitespace-nowrap">{l.label}</a>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <div className="hidden xl:block mr-1"><LiveClock /></div>
            <LanguageSwitcher compact />
            <Link href="/login" className="px-4 py-2 text-[14px] text-white/55 hover:text-white transition rounded-lg font-medium whitespace-nowrap">{t("common.login")}</Link>
            <Link href="/signup" className="px-5 py-2.5 text-[14px] font-semibold bg-white hover:bg-white/90 text-[#070708] rounded-[12px] transition-all hover:-translate-y-[1px] whitespace-nowrap">{t("common.signupNav")}</Link>
          </div>
          <button onClick={() => setMobileNav(!mobileNav)} className="lg:hidden text-white/55 hover:text-white p-2">{mobileNav ? <Icon name="close" size={20} /> : <Icon name="menu" size={20} />}</button>
        </div>
        {mobileNav && (
          <div className="lg:hidden bg-[#0c0c0e] border-t border-white/[0.07] px-6 py-5 space-y-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileNav(false)} className="block text-[15px] text-white/70 py-2.5 px-3 rounded-lg hover:bg-white/[0.04]">{l.label}</a>
            ))}
            <div className="pt-3 border-t border-white/[0.07] mt-3 space-y-2">
              <div className="flex justify-center pb-2"><LanguageSwitcher /></div>
              <Link href="/login" className="block text-center text-[14px] text-white/70 py-2.5">{t("common.login")}</Link>
              <Link href="/signup" className="block text-center text-[14px] bg-white text-[#070708] py-3 rounded-xl font-semibold">{t("common.signupNav")}</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ════════════ HERO (center, big type, NO gradient-mesh object) ════════════ */}
      <section className="relative pt-[84px] md:pt-[150px] pb-24 px-6 overflow-hidden">
        <div className="max-w-[1080px] mx-auto text-center relative z-10 pt-2 md:pt-10">
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
            className="text-[12px] uppercase tracking-[0.22em] text-white/35 mb-7 font-mono"
          >
            {t("landing.heroEyebrow")}
          </motion.p>
          <motion.h1
            variants={blurReveal} initial="hidden" animate="show"
            className="font-nanum-bold tracking-[-0.01em] leading-[1.25] text-white mb-7 text-center mx-auto max-w-[920px] text-balance"
            style={{ fontSize: "clamp(1.92rem, 3.4vw, 2.6rem)" }}
          >
            {t("landing.heroHeadline")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="text-[16px] text-white/50 max-w-[560px] mx-auto leading-relaxed mb-10 font-nanum-gothic"
          >
            {t("landing.tagline")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/signup" className="group inline-flex items-center gap-2 px-7 py-[15px] bg-white hover:bg-white/90 text-[#070708] rounded-[13px] text-[15px] font-semibold transition-all duration-300 hover:-translate-y-[2px]">
              {t("common.signup")}
              <IconArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 px-7 py-[15px] bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] rounded-[13px] text-[15px] text-white/70 font-semibold transition-all">
              {t("nav.explore")}
            </a>
          </motion.div>

          {/* 연구 흐름 칩 */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-12"
          >
            {RF_KEYS.map((key, i) => (
              <motion.span key={key}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.45 + i * 0.03 }}
                className="px-3 py-[6px] rounded-full bg-white/[0.04] border border-white/[0.09] text-[11px] text-white/45 font-mono lowercase tracking-wide">
                {t(`landing.${key}`)}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ DUAL TRACK (연구준비자 RDOS / 연구자 AI-Research-OS) ════════════ */}
      <section id="tracks" className="py-24 px-6 border-t border-white/[0.08]">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/35 mb-4 font-mono">{t("landing.chooseTrack")}</p>
            <h2 className="font-nanum-bold tracking-[-0.01em] leading-[1.15] text-[clamp(1.5rem,3.4vw,2.3rem)]">
              {t("landing2.twoTracksTitle")}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto leading-relaxed text-[15px] mt-4">
              {t("landing2.twoTracksSub")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { href: "/rdos", accent: "#3ecfb2", title: t("startPage.rdosTitle"), sub: "RDOS · Researcher Development OS",
                audience: t("startPage.rdosAudience"), purpose: t("startPage.rdosPurpose"), cta: t("startPage.rdosCta") },
              { href: "/dashboard", accent: "#ff7a00", title: t("startPage.arosTitle"), sub: "AI-Research-OS",
                audience: t("startPage.arosAudience"), purpose: t("landing2.arosPurposeShort"), cta: t("startPage.arosCta") },
            ].map((tr) => (
              <div key={tr.href} className="flex flex-col p-8 rounded-[20px] bg-[#0c0c0e] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300">
                <h3 className="text-[20px] font-bold tracking-tight mb-1">{tr.title}</h3>
                <p className="text-[11px] font-mono mb-5" style={{ color: tr.accent }}>{tr.sub}</p>
                <p className="text-[13.5px] text-white/55 leading-[1.7] mb-1"><span className="text-white/40">{t("startPage.audienceLabel")}</span> · {tr.audience}</p>
                <p className="text-[13.5px] text-white/55 leading-[1.7] mb-7"><span className="text-white/40">{t("startPage.purposeLabel")}</span> · {tr.purpose}</p>
                <Link href={tr.href} className="mt-auto inline-flex items-center justify-center gap-2 py-3.5 rounded-[12px] text-[14px] font-semibold transition-all hover:-translate-y-[1px]" style={{ background: tr.accent, color: "#070708" }}>
                  {tr.cta}
                  <IconArrowRight />
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/start" className="text-[13px] text-white/45 hover:text-white/80 transition">{t("landing2.seeMorePlans")}</Link>
          </div>
        </div>
      </section>

      {/* ════════════ CLIENT/SOURCE LOGO BAR (monochrome, swiss grid) ════════════ */}
      <section className="py-12 px-6 border-y border-white/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-center text-[12px] text-white/35 mb-9 tracking-wide font-nanum-gothic"
          >
            {t("landing.trustBar")}
          </motion.p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-white/[0.07] border-x border-white/[0.07]">
            {["Crossref", "OpenAlex", "Semantic Scholar", "GROBID", "ORCID", "DOI"].map((src, i) => (
              <motion.div
                key={src}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-center justify-center py-5 px-2"
              >
                <span className="text-[15px] font-bold text-white/35 hover:text-white/75 transition-colors duration-300 tracking-tight">{src}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ FEATURES (editorial, swiss grid) ════════════ */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/35 mb-4 font-mono">{t("landing.featuresSubtitle")}</p>
            <h2 className="font-nanum-bold tracking-[-0.01em] leading-[1.15] text-[clamp(1.6rem,3.6vw,2.6rem)] max-w-3xl mx-auto">{t("landing.featuresTitle")}</h2>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.07] border border-white/[0.07] rounded-[20px] overflow-hidden">
            {FEATURE_KEYS.map((f) => (
              <motion.div key={f.key}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 24 } } }}
                className="group relative p-8 bg-[#070708] hover:bg-[#0e0e10] transition-colors duration-300">
                <div className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-300" style={{ background: `${f.color}1f`, color: f.color }}>
                  <Icon name={f.icon} size={21} />
                </div>
                <h3 className="text-[17px] font-bold mb-1.5 tracking-tight">{t(`features.${f.key}.title`)}</h3>
                <p className="text-[10.5px] text-white/30 font-mono mb-3">{t(`features.${f.key}.en`)}</p>
                <p className="text-[13.5px] text-white/55 leading-[1.7]">{t(`features.${f.key}.desc`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════ ALL MENUS & FEATURES (Motion) ════════════ */}
      <AllFeaturesMotion />

      {/* ════════════ 5 MENU EXECUTION FLOWS (Accordion, Motion) ════════════ */}
      <MenuFlowShowcase />

      {/* ════════════ ARCHITECTURE ════════════ */}
      <section id="architecture" className="py-32 px-6 bg-[#0c0c0e] border-y border-white/[0.07]">
        <div className="max-w-[1080px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/35 mb-4 font-mono">Architecture</p>
            <h2 className="font-nanum-bold tracking-[-0.01em] leading-[1.15] text-[clamp(1.5rem,3.4vw,2.4rem)] mb-5">{t("landing.archHeadline")}</h2>
            <p className="text-white/50 max-w-xl mx-auto leading-relaxed text-[15px]">{t("landing.archDesc")}</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-[20px] bg-[#070708] border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-[11px] bg-[#3ecfb2]/15 flex items-center justify-center text-[#3ecfb2]"><Icon name="💻" className="inline-flex align-[-0.125em]" size={16} /></div>
                <div>
                  <h3 className="text-[16px] font-bold">{t("landing.localLayer")}</h3>
                  <p className="text-[11px] text-white/35 font-mono">{t("landing.localSub")}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["PDF", "DOCX", "HWP", "Markdown", "Notes", "AI Cache", "Embeddings", "Versions", "Assets"].map((f) => (
                  <div key={f} className="px-3 py-2 rounded-[9px] bg-[#3ecfb2]/[0.1] border border-[#3ecfb2]/[0.18] text-[11px] text-[#3ecfb2] text-center font-medium">{f}</div>
                ))}
              </div>
              <p className="text-[12.5px] text-white/45 mt-5 leading-relaxed">{t("landing.localDesc")}</p>
            </div>
            <div className="p-8 rounded-[20px] bg-[#070708] border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-[11px] bg-[#7c93ff]/15 flex items-center justify-center text-[#7c93ff]"><Icon name="☁" className="inline-flex align-[-0.125em]" size={16} /></div>
                <div>
                  <h3 className="text-[16px] font-bold">{t("landing.cloudLayer")}</h3>
                  <p className="text-[11px] text-white/35 font-mono">{t("landing.cloudSub")}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["Account", "Permissions", "Collaboration", "Comments", "Invitations", "Sync Index", "Activity", "AI State", "Citations"].map((f) => (
                  <div key={f} className="px-3 py-2 rounded-[9px] bg-[#7c93ff]/[0.1] border border-[#7c93ff]/[0.18] text-[11px] text-[#7c93ff] text-center font-medium">{f}</div>
                ))}
              </div>
              <p className="text-[12.5px] text-white/45 mt-5 leading-relaxed">{t("landing.cloudDesc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ WORKFLOW ════════════ */}
      <section id="workflow" className="py-32 px-6">
        <div className="max-w-[1080px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/35 mb-4 font-mono">How it Works</p>
            <h2 className="font-nanum-bold tracking-[-0.01em] leading-[1.15] text-[clamp(1.5rem,3.4vw,2.4rem)]">{t("landing.howWorksTitle")}</h2>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {WORKFLOW_STEPS.map((w, i) => (
              <motion.div key={i}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                className="relative p-7 rounded-[18px] bg-[#0c0c0e] border border-white/[0.08] hover:border-white/[0.16] transition-all duration-300">
                <div className="text-[40px] font-extrabold mb-4 leading-none tracking-tight" style={{ color: w.color }}>{w.num}</div>
                <h3 className="text-[15px] font-bold mb-2">{t(`workflow.step${i + 1}Title`)}</h3>
                <p className="text-[13px] text-white/50 leading-relaxed">{t(`workflow.step${i + 1}Desc`)}</p>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-10 p-6 rounded-[16px] bg-[#0c0c0e] border border-white/[0.08]">
            <p className="text-[11px] text-white/35 font-mono mb-3">{t("landing.userFlow")}</p>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {[t("landing.flowPublic"), "→", t("landing.flowSignup"), "→", t("landing.flowOnboarding"), "→", t("landing.flowWorkspace"), "→", t("landing.flowGemini"), "→", t("landing.flowProject"), "→", t("landing.flowDesktop"), "→", t("landing.flowRealtime"), "→", t("landing.flowAi"), "→", t("landing.flowValidation"), "→", t("landing.flowCitation"), "→", t("landing.flowExport")].map((s, i) => (
                <span key={i} className={s === "→" ? "text-white/20" : "px-2 py-1 rounded bg-white/[0.04] text-white/50 border border-white/[0.07]"}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ PRICING — 2개 플랜 (연구자 / 연구준비자) ════════════ */}
      <section id="pricing" className="py-32 px-6 bg-[#0c0c0e] border-y border-white/[0.07]">
        <div className="max-w-[1180px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/35 mb-4 font-mono">Pricing · Dual Platform</p>
            <h2 className="font-nanum-bold tracking-[-0.01em] leading-[1.15] text-[clamp(1.5rem,3.4vw,2.4rem)]">{t("landing.pricingHeadline")}</h2>
            <p className="text-white/45 mt-4 text-[14px]">{t("landing2.dualTrackNote")}</p>
          </motion.div>

          {/* ── 연구자 플랜 (AI-Research-OS) : Free / Basic / Scholar / University ── */}
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#ff7a00]" />
            <h3 className="text-[17px] font-bold">{t("landing2.arosSectionTitle")}</h3>
            <span className="text-[12px] text-white/40">{t("startPage.arosAudience")}</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {AROS_TIERS.map((tier) => (
              <div key={tier.key} className={`relative flex flex-col p-7 rounded-[20px] border transition-all duration-300 ${tier.popular ? "bg-white border-white text-[#070708] shadow-2xl lg:scale-[1.03]" : "bg-[#070708] border-white/[0.08] hover:border-white/[0.16]"}`}>
                {tier.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#ff7a00] text-[10px] font-bold text-white tracking-wide">MOST POPULAR</div>}
                <h4 className="text-[19px] font-bold mb-1 mt-1">{tier.name}</h4>
                <p className={`text-[12.5px] mb-5 ${tier.popular ? "text-[#070708]/60" : "text-white/50"}`}>{t(tier.descKey)}</p>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {tier.featKeys.map((fk, fi) => (
                    <li key={fi} className={`flex items-start gap-2 text-[12.5px] leading-snug ${tier.popular ? "text-[#070708]/75" : "text-white/60"}`}>
                      <span className={`mt-0.5 flex-shrink-0 ${tier.popular ? "text-[#ff7a00]" : "text-[#3ecfb2]"}`}><IconCheck /></span>
                      {fk ? t(fk) : tier.featLits[fi]}
                    </li>
                  ))}
                </ul>
                <Link href={tier.href} className={`block text-center py-3 rounded-[12px] text-[14px] font-semibold transition-all duration-200 ${tier.popular ? "bg-[#070708] text-white hover:bg-[#1a1a1d]" : "bg-white hover:bg-white/90 text-[#070708]"}`}>
                  {t(tier.ctaKey)}
                </Link>
              </div>
            ))}
          </div>

          {/* ── 연구준비자 플랜 (RDOS) : 학습 메뉴 제공 ── */}
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#3ecfb2]" />
            <h3 className="text-[17px] font-bold">{t("landing2.rdosSectionTitle")}</h3>
            <span className="text-[12px] text-white/40">{t("startPage.rdosAudience")}</span>
          </div>
          <div className="rounded-[22px] border border-[#3ecfb2]/20 bg-[#070708] p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
              <div>
                <p className="text-[13px] text-white/55 leading-relaxed max-w-[560px]">
                  {t("landing2.rdosEduDesc")}
                </p>
              </div>
              <Link href="/rdos-signup" className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] text-[14px] font-semibold transition-all hover:-translate-y-[1px]" style={{ background: "#3ecfb2", color: "#070708" }}>
                {t("landing2.rdosStartCta")}
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {RDOS_OFFERINGS.map(([menuKey, providesKey]) => (
                <div key={menuKey} className="p-4 rounded-[13px] bg-[#0c0c0e] border border-white/[0.07]">
                  <p className="text-[13px] font-semibold text-white/85 leading-tight mb-1">{t(menuKey)}</p>
                  <p className="text-[11.5px] text-white/45">{t(providesKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-[640px] mx-auto text-center relative z-10">
          <motion.h2
            variants={blurReveal} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="font-nanum-bold tracking-[-0.01em] leading-[1.15] text-[clamp(1.6rem,3.6vw,2.4rem)] mb-5"
          >
            {t("landing.ctaTitle")}
          </motion.h2>
          <p className="text-white/55 mb-9 text-[16px]">{t("landing.ctaDesc")}</p>
          <Link href="/signup" className="group inline-flex items-center gap-2 px-9 py-4 bg-white hover:bg-white/90 text-[#070708] rounded-[13px] text-[16px] font-semibold transition-all duration-300 hover:-translate-y-[2px]">
            {t("common.signup")}
            <IconArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-white/[0.07] py-16 px-6 bg-[#0c0c0e]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4 flex-shrink-0 whitespace-nowrap">
                <BrandLogo size={28} radius={8} />
                <span className="text-[15px] font-bold whitespace-nowrap">AI Research <span className="text-[#ff7a00]">OS</span></span>
              </div>
              <p className="text-[12px] text-white/35 leading-[1.7]">Cloud-Collaborative, Local-First<br />AI Research Operating System</p>
            </div>
            {[
              { title: t("landing.footerProduct"), links: [[t("landing.footerFeatures"), "#features"], [t("landing.footerPricing"), "#pricing"], [t("landing.footerTutorials"), "/tutorials"], [t("landing.footerDocs"), "/docs"]] },
              { title: t("landing.footerResources"), links: [[t("landing.footerBlog"), "/blog"], [t("landing.footerContact"), "/contact"], ["GitHub", "#"], [t("landing.footerChangelog"), "#"]] },
              { title: t("landing.footerLegal"), links: [[t("landing.footerTerms"), "#"], [t("landing.footerPrivacy"), "#"], [t("landing.footerSecurity"), "#"]] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-white/35 mb-4 font-semibold">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}><a href={href} className="text-[13px] text-white/45 hover:text-white/80 transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.07] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-white/30">© 2026 AI Research OS. All rights reserved.</p>
            <div className="flex gap-5">
              {["Twitter", "GitHub", "Discord"].map((s) => (
                <a key={s} href="#" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
