"use client";

/* ════════════════════════════════════════════════════════════════
   v32: 랜딩 페이지 Framer Motion 쇼케이스
   - AllFeaturesMotion : AI Research OS의 전체 메뉴/기능을 그룹별로
     stagger 애니메이션 + hover 마이크로 인터랙션으로 표현
   - PaperAnalysisFlow : 논문 분석 UX 흐름(업로드→분석→결과)을
     자동 재생되는 Framer Motion 시나리오로 시각화
       PDF 업로드 ↓ fade-in
       분석 시작   ↓ progress + pulse
       분석 완료   ↓ 카드 등장(fade)
       키워드 분석 ↓ stagger
       연구방법    ↓ stagger
       참고문헌    ↓ slide-up
   기능을 만드는 것이 아니라 UI를 움직이는 도구로서 Motion을 적용한다.
═══════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";
import { ScrambleText } from "@/components/marketing/scramble-text";

/* ─── 전체 메뉴 데이터 (사이드바 IA와 동일) ─── */
const RESEARCH_FLOW = [
  { icon: "research", labelKey: "sidebar.research", color: "#6c8cff" },
  { icon: "literature", labelKey: "sidebar.literature", color: "#3ecfb2" },
  { icon: "writing", labelKey: "sidebar.writing", color: "#a78bfa" },
  { icon: "review", labelKey: "sidebar.review", color: "#ff7066" },
  { icon: "calendar", labelKey: "sidebar.schedule", color: "#e8b84b" },
];
const AI_TOOLS = [
  { icon: "structure", labelKey: "sidebar.structure", color: "#6c8cff" },
  { icon: "analyzer", labelKey: "sidebar.analyzer", color: "#f59e0b" },
  { icon: "critique", labelKey: "sidebar.critique", color: "#f472b6" },
];
const COMMON_TOOLS = [
  { icon: "library", labelKey: "sidebar.library", color: "#34d399" },
  { icon: "citation", labelKey: "sidebar.references", color: "#a78bfa" },
  { icon: "dashboard", labelKey: "sidebar.dashboard", color: "#6c8cff" },
];

/* ─── 공용 motion variants ─── */
const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

/* ════════════════ 전체 메뉴 & 기능 (Stagger) ════════════════ */
function MenuGroup({
  title,
  items,
}: {
  title: string;
  items: { icon: string; labelKey: string; color: string }[];
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className="mb-14 last:mb-0">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-[11px] lowercase tracking-[0.14em] text-white/40 font-mono">
          {title}
        </span>
        <div className="flex-1 h-px bg-white/[0.1]" />
        <span className="text-[11px] font-mono text-white/25 tabular-nums">{String(items.length).padStart(2, "0")}</span>
      </div>
      <motion.div
        variants={containerV}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        {items.map((it, idx) => (
          <motion.div
            key={it.labelKey}
            variants={itemV}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="group relative p-5 rounded-[18px] bg-[#0c0c0e] border border-white/[0.08] hover:border-white/[0.18] cursor-default overflow-hidden transition-colors"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(160px 100px at 50% 0%, ${it.color}1f, transparent)` }}
            />
            <span className="absolute top-3 right-4 text-[10px] font-mono text-white/20 tabular-nums">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div
              className="relative w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-300"
              style={{ background: `${it.color}24`, color: it.color }}
            >
              <Icon name={it.icon} size={18} />
            </div>
            <p className="relative text-[13.5px] font-bold text-white/85 leading-snug tracking-tight">
              {t(it.labelKey)}
            </p>
            <span
              className="relative block mt-2 h-px w-0 group-hover:w-full transition-all duration-500"
              style={{ background: it.color }}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function AllFeaturesMotion() {
  const { t } = useTranslation();
  return (
    <section id="all-features" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a00]" />
            <span className="text-[11px] lowercase tracking-[0.16em] text-white/40 font-mono">
              {t("landing.allMenusBadge")}
            </span>
          </div>
          <h2 className="font-nanum-bold leading-[1.15] tracking-[-0.01em] text-[clamp(1.5rem,3.6vw,2.6rem)] max-w-3xl text-white">
            {t("landing.allMenusTitle")}
          </h2>
          <p className="text-white/50 text-[15px] mt-5 max-w-xl leading-relaxed">{t("landing.allMenusSubtitle")}</p>
        </motion.div>

        <MenuGroup title={t("landing.groupResearchFlow")} items={RESEARCH_FLOW} />
        <MenuGroup title={t("landing.groupAiTools")} items={AI_TOOLS} />
        <MenuGroup title={t("landing.groupCommon")} items={COMMON_TOOLS} />
      </div>
    </section>
  );
}

/* ════════════════ 논문 분석 흐름 데모 (자동 재생) ════════════════ */
const DEMO_KEYWORDS = ["Self-Efficacy", "Motivation", "Mixed-Method", "Survey", "Regression"];
const DEMO_METHODS = [
  { k: "design", v: "Mixed-Method" },
  { k: "n", v: "N = 312" },
  { k: "tool", v: "SPSS · NVivo" },
];
const DEMO_REFS = ["Bandura (1997)", "Deci & Ryan (2000)", "Creswell (2014)"];

// 단계: 0 업로드 · 1 분석중 · 2 완료(카드) · 3 키워드 · 4 방법 · 5 참고문헌 · 6 정지
const PHASE_DELAYS = [1500, 2200, 900, 1100, 1100, 1500];

export function PaperAnalysisFlow() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-120px" });
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [runId, setRunId] = useState(0);

  // 뷰포트 진입 시 자동 시작 / 이탈 시 리셋
  useEffect(() => {
    if (inView) {
      setPhase(0);
      setProgress(0);
    }
  }, [inView, runId]);

  // 단계 자동 진행
  useEffect(() => {
    if (!inView || phase >= 6) return;
    if (reduce) {
      // 모션 최소화 설정 시 결과만 즉시 표시
      setPhase(6);
      setProgress(100);
      return;
    }
    const id = setTimeout(() => setPhase((p) => Math.min(6, p + 1)), PHASE_DELAYS[phase]);
    return () => clearTimeout(id);
  }, [phase, inView, reduce, runId]);

  // 분석중 진행률 애니메이션
  useEffect(() => {
    if (phase !== 1) return;
    setProgress(0);
    const start = Date.now();
    const id = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / PHASE_DELAYS[1]) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [phase, runId]);

  const showResults = phase >= 2;
  const replay = () => {
    setRunId((n) => n + 1);
    setPhase(0);
    setProgress(0);
  };

  return (
    <section className="py-32 px-6 bg-[#070a0f]">
      <div className="max-w-5xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff4d]" />
            <span className="text-[11px] lowercase tracking-[0.16em] text-white/35 font-mono">
              {t("landing.demoBadge")}
            </span>
          </div>
          <h2 className="font-nanum-myeongjo font-bold leading-[1.05] tracking-tight text-[clamp(2rem,5.5vw,4rem)] max-w-3xl">
            <ScrambleText text={t("landing.demoTitle")} trigger="view" speed={26} />
          </h2>
          <p className="text-white/40 text-[15px] mt-5 max-w-xl leading-relaxed">{t("landing.demoSubtitle")}</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-stretch">
          {/* ── 왼쪽: 업로드 → 분석 ── */}
          <div className="relative p-7 rounded-[20px] bg-[#13161e] border border-white/[0.05] min-h-[320px] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[12px] font-semibold text-white/55 flex items-center gap-1.5">
                <Icon name="analyzer" size={15} /> {t("sidebar.analyzer")}
              </span>
              <button
                onClick={replay}
                className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
              >
                <Icon name="refresh" size={11} /> {t("landing.demoReplay")}
              </button>
            </div>

            {/* 업로드 드롭존 */}
            <motion.div
              animate={
                phase === 0 && !reduce
                  ? { scale: [1, 1.02, 1], borderColor: ["rgba(108,140,255,0.25)", "rgba(108,140,255,0.6)", "rgba(108,140,255,0.25)"] }
                  : { scale: 1, borderColor: "rgba(255,255,255,0.08)" }
              }
              transition={{ duration: 1.4, repeat: phase === 0 ? Infinity : 0, ease: "easeInOut" }}
              className="rounded-[14px] border-2 border-dashed flex flex-col items-center justify-center py-8 px-4 text-center"
            >
              <motion.div
                animate={phase === 0 && !reduce ? { y: [0, -6, 0] } : { y: 0 }}
                transition={{ duration: 1.4, repeat: phase === 0 ? Infinity : 0, ease: "easeInOut" }}
                className="w-12 h-12 rounded-[12px] bg-[#6c8cff]/12 text-[#6c8cff] flex items-center justify-center mb-3"
              >
                <Icon name="upload" size={22} />
              </motion.div>
              <p className="text-[13px] font-medium text-white/70">{t("landing.demoUpload")}</p>
              <p className="text-[11px] text-white/30 mt-1">{t("landing.demoUploadHint")}</p>
            </motion.div>

            {/* 분석 진행 상태 */}
            <div className="mt-5 flex-1 flex flex-col justify-end">
              <AnimatePresence mode="wait">
                {phase === 1 && (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="text-white/50 flex items-center gap-1.5">
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-[#6c8cff] inline-block"
                        />
                        {t("landing.demoAnalyzing")}
                      </span>
                      <span className="text-white/40 font-mono">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#6c8cff] to-[#a78bfa]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </motion.div>
                )}
                {phase >= 2 && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-[#5ebd7c] text-[13px] font-medium"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 16 }}
                      className="w-6 h-6 rounded-full bg-[#5ebd7c]/15 flex items-center justify-center"
                    >
                      <Icon name="check" size={14} />
                    </motion.span>
                    {t("landing.demoDone")}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── 오른쪽: 결과 카드 (등장 → stagger) ── */}
          <div className="p-7 rounded-[20px] bg-[#13161e] border border-white/[0.05] min-h-[320px]">
            <AnimatePresence>
              {!showResults && (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[260px] flex flex-col items-center justify-center text-white/15"
                >
                  <Icon name="chart" size={34} />
                  <p className="text-[12px] mt-3">{t("landing.demoSubtitle")}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {showResults && (
              <div className="space-y-5">
                {/* 키워드 분석 — stagger */}
                <ResultBlock
                  icon="idea"
                  color="#f59e0b"
                  title={t("landing.demoKeywords")}
                  active={phase >= 3}
                >
                  <motion.div
                    variants={containerV}
                    initial="hidden"
                    animate={phase >= 3 ? "show" : "hidden"}
                    className="flex flex-wrap gap-2"
                  >
                    {DEMO_KEYWORDS.map((k) => (
                      <motion.span
                        key={k}
                        variants={itemV}
                        className="px-2.5 py-1 rounded-full text-[11px] bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"
                      >
                        {k}
                      </motion.span>
                    ))}
                  </motion.div>
                </ResultBlock>

                {/* 연구방법 분석 — stagger */}
                <ResultBlock
                  icon="ruler"
                  color="#6c8cff"
                  title={t("landing.demoMethod")}
                  active={phase >= 4}
                >
                  <motion.div
                    variants={containerV}
                    initial="hidden"
                    animate={phase >= 4 ? "show" : "hidden"}
                    className="grid grid-cols-3 gap-2"
                  >
                    {DEMO_METHODS.map((m) => (
                      <motion.div
                        key={m.k}
                        variants={itemV}
                        className="px-2.5 py-2 rounded-[10px] bg-[#6c8cff]/[0.07] border border-[#6c8cff]/15 text-center"
                      >
                        <p className="text-[12px] font-semibold text-white/75">{m.v}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">{m.k}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </ResultBlock>

                {/* 참고문헌 분석 — slide-up */}
                <ResultBlock
                  icon="citation"
                  color="#a78bfa"
                  title={t("landing.demoReferences")}
                  active={phase >= 5}
                >
                  <motion.div
                    variants={containerV}
                    initial="hidden"
                    animate={phase >= 5 ? "show" : "hidden"}
                    className="space-y-1.5"
                  >
                    {DEMO_REFS.map((r) => (
                      <motion.div
                        key={r}
                        variants={itemV}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] bg-white/[0.03] border border-white/[0.04]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                        <span className="text-[11px] text-white/55">{r}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </ResultBlock>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultBlock({
  icon,
  color,
  title,
  active,
  children,
}: {
  icon: string;
  color: string;
  title: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0.35, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-6 h-6 rounded-[8px] flex items-center justify-center"
          style={{ background: `${color}1a`, color }}
        >
          <Icon name={icon} size={13} />
        </span>
        <span className="text-[12px] font-semibold text-white/65">{title}</span>
      </div>
      {children}
    </motion.div>
  );
}
