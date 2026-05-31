"use client";
import { Icon } from "@/components/ui/icon";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";

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
  { icon: "structure", color: "#6c8cff", key: "structure" },
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
  { num: "01", color: "#6c8cff" },
  { num: "02", color: "#3ecfb2" },
  { num: "03", color: "#e8b84b" },
  { num: "04", color: "#a78bfa" },
];

const PLAN_KEYS = ["free", "pro", "university"] as const;

/* ─── Component ─── */
export default function LandingPage() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const NAV_LINKS = [
    { href: "#features", label: t("nav.features") },
    { href: "#architecture", label: t("nav.architecture") },
    { href: "#workflow", label: t("nav.workflow") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: "/docs", label: t("nav.docs") },
    { href: "/blog", label: t("nav.blog") },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div data-page="landing" className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] overflow-x-hidden font-nanum-gothic">

      {/* ════════════ NAVBAR ════════════ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-[#0d0f14]/92 backdrop-blur-2xl border-b border-white/[0.04] shadow-lg shadow-black/20" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center text-[13px] font-bold shadow-lg shadow-[#6c8cff]/20 group-hover:shadow-[#6c8cff]/30 transition-shadow"><Icon name="logo" size={16} /></div>
            <span className="font-nanum-myeongjo text-[17px] font-semibold tracking-tight">AI Research <span className="text-[#e8b84b]">OS</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[13px] text-white/40 hover:text-white/80 transition-colors duration-200">{l.label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link href="/login" className="px-4 py-2 text-[13px] text-white/50 hover:text-white transition rounded-lg hover:bg-white/[0.04]">{t("common.login")}</Link>
            <Link href="/signup" className="px-5 py-2.5 text-[13px] font-medium bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[10px] transition-all shadow-lg shadow-[#4a6cf7]/25 hover:shadow-[#4a6cf7]/35 hover:-translate-y-[1px]">{t("common.signup")}</Link>
          </div>
          <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden text-white/50 hover:text-white p-2 text-xl">{mobileNav ? <Icon name="close" size={20} /> : <Icon name="menu" size={20} />}</button>
        </div>
        {mobileNav && (
          <div className="md:hidden bg-[#13161e]/98 backdrop-blur-xl border-t border-white/[0.04] px-6 py-5 space-y-1 animate-fade-in">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileNav(false)} className="block text-[14px] text-white/50 py-2.5 px-3 rounded-lg hover:bg-white/[0.04]">{l.label}</a>
            ))}
            <div className="pt-3 border-t border-white/[0.04] mt-3 space-y-2">
              <div className="flex justify-center pb-2"><LanguageSwitcher /></div>
              <Link href="/login" className="block text-center text-[13px] text-white/60 py-2.5">{t("common.login")}</Link>
              <Link href="/signup" className="block text-center text-[13px] bg-[#4a6cf7] text-white py-3 rounded-xl font-medium">{t("common.signup")}</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ════════════ HERO ════════════ */}
      <section ref={heroRef} className="relative pt-36 pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] bg-[#4a6cf7]/[0.06] rounded-full blur-[150px]" />
          <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] bg-[#a78bfa]/[0.05] rounded-full blur-[130px]" />
          <div className="absolute top-[25%] right-[25%] w-[350px] h-[350px] bg-[#e8b84b]/[0.03] rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>
        <div className="max-w-[900px] mx-auto text-center relative z-10">
          <div className="font-nanum-myeongjo font-extrabold leading-[1.5] mb-10 tracking-tight text-center px-2 text-white/85" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
            <p className="text-center">{t("landing.heroDescLine1")}</p>
            <p className="text-center">{t("landing.heroDescLine2")}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link href="/signup" className="group flex items-center gap-2 px-8 py-[15px] bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[15px] font-medium transition-all duration-300 shadow-xl shadow-[#4a6cf7]/25 hover:shadow-[#4a6cf7]/40 hover:-translate-y-[2px]">
              {t("common.signup")}
              <IconArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#features" className="flex items-center gap-2 px-8 py-[15px] border border-white/[0.08] hover:border-white/[0.15] rounded-[12px] text-[15px] text-white/50 hover:text-white/80 transition-all hover:bg-white/[0.02]">
              {t("nav.explore")}
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {RF_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2 px-4 py-[7px] rounded-full bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-white/35">{t(`landing.${key}`)}</span>
              </div>
            ))}
            <div className="w-full text-center mt-2">
              <span className="text-[12px] text-white/25">{t("landing.frameworksNote")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FEATURES ════════════ */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c8cff] mb-3 font-medium">{t("landing.featuresSubtitle")}</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-nanum-myeongjo font-bold mb-5">{t("landing.featuresTitle")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {FEATURE_KEYS.map((f) => (
              <div key={f.key} className="group relative p-6 rounded-[6px] bg-[#13161e] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 hover:-translate-y-[3px] hover:shadow-lg hover:shadow-black/20">
                <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300" style={{ background: `${f.color}12`, color: f.color }}>
                  <Icon name={f.icon} size={22} />
                </div>
                <h3 className="text-[16px] font-semibold mb-1">{t(`features.${f.key}.title`)}</h3>
                <p className="text-[10.5px] text-white/25 font-mono mb-3">{t(`features.${f.key}.en`)}</p>
                <p className="text-[13px] text-white/40 leading-[1.7]">{t(`features.${f.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ ARCHITECTURE ════════════ */}
      <section id="architecture" className="py-28 px-6 bg-[#0a0c10]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#e8b84b] mb-3 font-medium">Architecture</p>
            <h2 className="text-[clamp(1.4rem,3vw,2.8rem)] font-nanum-myeongjo font-bold mb-5">{t("landing.archHeadline")}</h2>
            <p className="text-white/35 max-w-xl mx-auto leading-relaxed">{t("landing.archDesc")}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Local Storage */}
            <div className="p-7 rounded-[20px] bg-[#13161e] border border-white/[0.04]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-[10px] bg-[#3ecfb2]/10 flex items-center justify-center text-[#3ecfb2] text-sm"><Icon name="💻" className="inline-flex align-[-0.125em] mr-1" size={15} /></div>
                <div>
                  <h3 className="text-[15px] font-semibold">{t("landing.localLayer")}</h3>
                  <p className="text-[11px] text-white/25 font-mono">{t("landing.localSub")}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["PDF", "DOCX", "HWP", "Markdown", "Notes", "AI Cache", "Embeddings", "Versions", "Assets"].map((f) => (
                  <div key={f} className="px-3 py-2 rounded-[8px] bg-[#3ecfb2]/[0.06] border border-[#3ecfb2]/[0.08] text-[11px] text-[#3ecfb2]/80 text-center">{f}</div>
                ))}
              </div>
              <p className="text-[12px] text-white/25 mt-4 leading-relaxed">{t("landing.localDesc")}</p>
            </div>
            {/* Cloud Metadata */}
            <div className="p-7 rounded-[20px] bg-[#13161e] border border-white/[0.04]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-[10px] bg-[#6c8cff]/10 flex items-center justify-center text-[#6c8cff] text-sm"><Icon name="☁" className="inline-flex align-[-0.125em] mr-1" size={15} /></div>
                <div>
                  <h3 className="text-[15px] font-semibold">{t("landing.cloudLayer")}</h3>
                  <p className="text-[11px] text-white/25 font-mono">{t("landing.cloudSub")}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["Account", "Permissions", "Collaboration", "Comments", "Invitations", "Sync Index", "Activity", "AI State", "Citations"].map((f) => (
                  <div key={f} className="px-3 py-2 rounded-[8px] bg-[#6c8cff]/[0.06] border border-[#6c8cff]/[0.08] text-[11px] text-[#6c8cff]/80 text-center">{f}</div>
                ))}
              </div>
              <p className="text-[12px] text-white/25 mt-4 leading-relaxed">{t("landing.cloudDesc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ WORKFLOW ════════════ */}
      <section id="workflow" className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#3ecfb2] mb-3 font-medium">How it Works</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-nanum-myeongjo font-bold mb-5">{t("landing.howWorksTitle")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WORKFLOW_STEPS.map((w, i) => (
              <div key={i} className="relative p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04] group hover:border-white/[0.08] transition-all duration-300">
                <div className="text-[36px] font-nanum-myeongjo font-bold mb-4 leading-none" style={{ color: `${w.color}15` }}>{w.num}</div>
                <h3 className="text-[15px] font-semibold mb-2">{t(`workflow.step${i + 1}Title`)}</h3>
                <p className="text-[13px] text-white/35 leading-relaxed">{t(`workflow.step${i + 1}Desc`)}</p>
                <div className="absolute top-6 right-6 w-2 h-2 rounded-full transition-colors" style={{ background: `${w.color}30` }} />
              </div>
            ))}
          </div>
          {/* 전체 사용자 흐름 */}
          <div className="mt-12 p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[11px] text-white/25 font-mono mb-3">{t("landing.userFlow")}</p>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {[t("landing.flowPublic"), "→", t("landing.flowSignup"), "→", t("landing.flowOnboarding"), "→", t("landing.flowWorkspace"), "→", t("landing.flowGemini"), "→", t("landing.flowProject"), "→", t("landing.flowDesktop"), "→", t("landing.flowRealtime"), "→", t("landing.flowAi"), "→", t("landing.flowValidation"), "→", t("landing.flowCitation"), "→", t("landing.flowExport")].map((s, i) => (
                <span key={i} className={s === "→" ? "text-white/15" : "px-2 py-1 rounded bg-white/[0.03] text-white/35 border border-white/[0.04]"}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ PRICING ════════════ */}
      <section id="pricing" className="py-28 px-6 bg-[#0a0c10]">
        <div className="max-w-[1050px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-3 font-medium">Pricing</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-nanum-myeongjo font-bold mb-5">{t("landing.pricingHeadline")}</h2>
            <p className="text-white/30 text-[13px]"></p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PLAN_KEYS.map((key, i) => {
              const highlight = key === "pro";
              const prices: Record<string, { price: string; period: string }> = {
                free: { price: "₩0", period: "" },
                pro: { price: "", period: "" },
                university: { price: "", period: "" },
              };
              const featureCount = key === "free" ? 5 : key === "pro" ? 7 : 6;
              return (
              <div key={key} className={`relative p-7 rounded-[20px] border transition-all duration-300 ${highlight ? "bg-gradient-to-b from-[#4a6cf7]/[0.06] to-[#13161e] border-[#4a6cf7]/25 shadow-2xl shadow-[#4a6cf7]/[0.06] md:scale-[1.03]" : "bg-[#13161e] border-white/[0.04] hover:border-white/[0.08]"}`}>
                {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#4a6cf7] text-[10px] font-semibold text-white tracking-wide shadow-lg shadow-[#4a6cf7]/30">MOST POPULAR</div>}
                <h3 className="text-[20px] font-bold mb-1 mt-1">{t(`plans.${key}.name`)}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  {prices[key].price && <span className="text-[32px] font-bold tracking-tight">{prices[key].price}</span>}
                  {prices[key].period && <span className="text-[13px] text-white/25">{prices[key].period}</span>}
                </div>
                <p className="text-[13px] text-white/35 mb-6">{t(`plans.${key}.desc`)}</p>
                <ul className="space-y-3 mb-8">
                  {Array.from({ length: featureCount }, (_, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-[13px] text-white/50">
                      <span className="mt-0.5 text-[#5ebd7c] flex-shrink-0"><IconCheck /></span>
                      {t(`plans.${key}.feat${fi + 1}`)}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block text-center py-3.5 rounded-[12px] text-[14px] font-medium transition-all duration-200 ${highlight ? "bg-[#4a6cf7] hover:bg-[#5d7dff] text-white shadow-lg shadow-[#4a6cf7]/20 hover:-translate-y-[1px]" : "bg-white/[0.04] hover:bg-white/[0.07] text-white/60 border border-white/[0.06]"}`}>
                  {t(`plans.${key}.cta`)}
                </Link>
              </div>
            );})}
          </div>
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4a6cf7]/[0.04] rounded-full blur-[150px]" />
        </div>
        <div className="max-w-[600px] mx-auto text-center relative z-10">
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-nanum-myeongjo font-bold mb-5 leading-tight">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-white/35 mb-8 text-[15px]">{t("landing.ctaDesc")}</p>
          <Link href="/signup" className="group inline-flex items-center gap-2 px-9 py-4 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[16px] font-medium transition-all duration-300 shadow-xl shadow-[#4a6cf7]/25 hover:shadow-[#4a6cf7]/40 hover:-translate-y-[2px]">
            {t("common.signup")}
            <IconArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-white/[0.04] py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center font-bold"><Icon name="logo" size={14} /></div>
                <span className="font-nanum-myeongjo text-[15px] font-semibold">AI Research <span className="text-[#e8b84b]">OS</span></span>
              </div>
              <p className="text-[12px] text-white/20 leading-[1.7]">Cloud-Collaborative, Local-First<br />AI Research Operating System</p>
            </div>
            {[
              { title: t("landing.footerProduct"), links: [[t("landing.footerFeatures"), "#features"], [t("landing.footerPricing"), "#pricing"], [t("landing.footerTutorials"), "/tutorials"], [t("landing.footerDocs"), "/docs"]] },
              { title: t("landing.footerResources"), links: [[t("landing.footerBlog"), "/blog"], [t("landing.footerContact"), "/contact"], ["GitHub", "#"], [t("landing.footerChangelog"), "#"]] },
              { title: t("landing.footerLegal"), links: [[t("landing.footerTerms"), "#"], [t("landing.footerPrivacy"), "#"], [t("landing.footerSecurity"), "#"]] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-white/25 mb-4 font-medium">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}><a href={href} className="text-[13px] text-white/30 hover:text-white/60 transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.04] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-white/15">© 2026 AI Research OS. All rights reserved.</p>
            <div className="flex gap-5">
              {["Twitter", "GitHub", "Discord"].map((s) => (
                <a key={s} href="#" className="text-[11px] text-white/15 hover:text-white/35 transition-colors">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
