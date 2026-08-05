"use client";

/* ════════════════════════════════════════════════════════════════
   v33: 랜딩 페이지 — 5개 핵심 메뉴의 "실행 과정" Framer Motion 쇼케이스
   각 메뉴의 실제 동작 흐름을 자동 재생 데모로 시각화한다.

   ① 문헌연구      키워드 검색 → 결과 목록(stagger) → 갭 분석(slide-up)
   ② 논문구조엔진  논문 유형 선택 → 6개 챕터 구조 생성(stagger) → Good/Bad 패턴
   ③ 논문크리틱    PDF 업로드(pulse) → AI 크리틱 → 번호 배지 + 패널 카드(연동 강조)
   ④ 참고문헌정리  DOI 입력 → 출처 체인 확인 → 인용 스타일 전환 → 목록
   ⑤ 문장라이브러리 유형·챕터 선택 → AI 생성 → 문장 패턴 등장(stagger)

   Framer Motion은 기능을 만드는 것이 아니라 UI를 "움직이는" 도구로 사용한다.
═══════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";

/* ─── 공용 variants ─── */
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const pop: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 22 },
  },
};

/* ─── phase 진행 훅 (마운트 시 0부터 자동 진행, reduce면 즉시 마지막) ─── */
function usePhases(count: number, delays: number[], reduce: boolean) {
  const [phase, setPhase] = useState(reduce ? count - 1 : 0);
  useEffect(() => {
    if (reduce || phase >= count - 1) return;
    const id = setTimeout(
      () => setPhase((p) => Math.min(count - 1, p + 1)),
      delays[phase] ?? 1000
    );
    return () => clearTimeout(id);
  }, [phase, count, reduce, delays]);
  return phase;
}

const Spinner = ({ color }: { color: string }) => (
  <motion.span
    animate={{ rotate: 360 }}
    transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/15"
    style={{ borderTopColor: color }}
  />
);

/* ════════════ ① 문헌연구 ════════════ */
function LiteratureFlow({ reduce }: { reduce: boolean }) {
  const { t } = useTranslation();
  const C = "#3ecfb2";
  // 실제 흐름: 0 검색중 · 1 추천논문 · 2 인용관리(담기) · 3 갭분석
  const phase = usePhases(4, [1400, 1500, 1400], reduce);
  const RESULTS = [
    { title: "자기효능감과 학업동기의 관계", authors: "Bandura 외", year: 2023, cite: 412 },
    { title: "교육 연구의 혼합방법 설계", authors: "Creswell", year: 2022, cite: 289 },
    { title: "설문 타당화: 메타리뷰", authors: "Kline 외", year: 2021, cite: 156 },
  ];
  return (
    <div className="space-y-3">
      {/* 1단계: 논문 검색 */}
      <div className="flex items-center gap-2 rounded-xl bg-[#0d0f14] border border-white/[0.07] px-3 py-2.5">
        <Icon name="search" size={15} className="text-white/30" />
        <span className="text-[12px] text-white/55 flex-1 truncate">자기효능감 혼합방법 연구</span>
        {phase === 0 ? (
          <Spinner color={C} />
        ) : (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#5ebd7c]">
            <Icon name="check" size={14} />
          </motion.span>
        )}
      </div>

      {/* 2단계: 추천 논문 결과 (+ 3단계: 인용에 담김 표시) */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={phase >= 1 ? "show" : "hidden"}
        className="space-y-1.5"
      >
        {RESULTS.map((r, i) => (
          <motion.div
            key={r.title}
            variants={pop}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.05]"
          >
            <span className="text-[10px] text-white/25 font-mono w-4">{i + 1}</span>
            <span style={{ color: C }}><Icon name="file" size={13} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] text-white/70 truncate">{r.title}</span>
              <span className="block text-[9px] text-white/30 truncate">{r.authors} · {r.year} · 피인용 {r.cite}</span>
            </span>
            {phase >= 2 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                style={{ background: `${C}1f`, color: C }}
              >
                <Icon name="check" size={9} /> 인용 담김
              </motion.span>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* 4단계: 갭 분석 */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border px-3 py-2.5"
            style={{ background: `${C}0f`, borderColor: `${C}33` }}
          >
            <p className="text-[11px] font-semibold mb-1 flex items-center gap-1.5" style={{ color: C }}>
              <Icon name="research" size={13} /> {t("landing.flowGapTitle")}
            </p>
            <p className="text-[11px] text-white/55 leading-relaxed">{t("landing.flowGapText")}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════ ② 논문구조엔진 ════════════ */
function StructureFlow({ reduce }: { reduce: boolean }) {
  const { t } = useTranslation();
  const C = "#6c8cff";
  // 실제 흐름: 0 유형선택 · 1 챕터 생성 · 2 선택 챕터의 세부 단락 펼침
  const phase = usePhases(3, [1300, 1800], reduce);
  const TYPES = ["양적연구", "질적연구", "혼합연구", "실험연구"];
  // 실제 엔진은 서론·본론·결론 + 각 챕터의 micro 단락을 생성
  const CHAPTERS = [
    { t: "서론 (Introduction)", micro: ["연구 배경", "문제 제기", "연구 목적"] },
    { t: "이론적 배경", micro: ["선행연구", "이론 틀"] },
    { t: "연구 방법", micro: ["연구 설계", "표본·도구", "분석 방법"] },
    { t: "연구 결과", micro: ["기술통계", "가설 검정"] },
    { t: "논의", micro: ["결과 해석", "시사점"] },
    { t: "결론", micro: ["요약", "한계·제언"] },
  ];
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] text-white/30 mb-1.5">{t("landing.flowSelectType")}</p>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((ty, i) => (
            <motion.span
              key={ty}
              animate={
                i === 2
                  ? { backgroundColor: `${C}26`, borderColor: `${C}66`, color: "#cdd6ff" }
                  : {}
              }
              transition={{ delay: 0.3 }}
              className="px-2.5 py-1 rounded-full text-[10.5px] border border-white/[0.07] text-white/40"
            >
              {ty}
            </motion.span>
          ))}
        </div>
      </div>

      {/* AI 챕터 구조 생성 */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={phase >= 1 ? "show" : "hidden"}
        className="grid grid-cols-2 gap-1.5"
      >
        {CHAPTERS.map((ch, i) => (
          <motion.div
            key={ch.t}
            variants={pop}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#13161e] border border-white/[0.05]"
            style={i === 2 && phase >= 2 ? { borderColor: `${C}66`, background: `${C}0f` } : {}}
          >
            <span
              className="w-4 h-4 rounded text-white text-[8px] flex items-center justify-center font-bold flex-shrink-0"
              style={{ background: C }}
            >
              {i + 1}
            </span>
            <span className="text-[11px] text-white/65 truncate">{ch.t}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* 선택한 챕터(연구 방법)의 세부 단락 펼침 */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-lg border px-3 py-2.5 overflow-hidden"
            style={{ background: `${C}0d`, borderColor: `${C}33` }}
          >
            <p className="text-[10px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: C }}>
              <Icon name="structure" size={12} /> 연구 방법 · 세부 단락
            </p>
            <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-wrap gap-1.5">
              {CHAPTERS[2].micro.map((m) => (
                <motion.span
                  key={m}
                  variants={pop}
                  className="px-2 py-1 rounded-md text-[10px] bg-white/[0.04] border border-white/[0.06] text-white/60"
                >
                  {m}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════ ③ 논문크리틱 ════════════ */
function CritiqueFlow({ reduce }: { reduce: boolean }) {
  const C = "#f472b6";
  const phase = usePhases(5, [1100, 1100, 1300, 1500], reduce);
  // 0 업로드 · 1 페이지 · 2 분석중 · 3 번호+카드 · 4 연동강조
  const CARDS = [
    { n: 1, c: "#ff7066", top: "18%" },
    { n: 2, c: "#a78bfa", top: "46%" },
    { n: 3, c: "#5ebd7c", top: "72%" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 h-full">
      {/* 원문 페이지 */}
      <div className="relative rounded-xl bg-[#0d0f14] border border-white/[0.07] p-3 overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === 0 ? (
            <motion.div
              key="drop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <motion.div
                animate={reduce ? {} : { y: [0, -5, 0] }}
                transition={{ duration: 1.3, repeat: Infinity }}
                className="w-10 h-10 rounded-[10px] bg-[#6c8cff]/12 text-[#6c8cff] flex items-center justify-center mb-2"
              >
                <Icon name="upload" size={18} />
              </motion.div>
              <span className="text-[10px] text-white/35">PDF</span>
            </motion.div>
          ) : (
            <motion.div key="page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
              <div className="h-1.5 rounded bg-white/15 w-3/4" />
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className={`h-1 rounded bg-white/[0.08] ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
              ))}
              {/* 번호 배지 */}
              {phase >= 3 &&
                CARDS.map((c) => (
                  <motion.span
                    key={c.n}
                    initial={{ scale: 0 }}
                    animate={{
                      scale: phase >= 4 && c.n === 1 ? 1.25 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 14, delay: c.n * 0.12 }}
                    className="absolute w-4 h-4 rounded-full text-white text-[8px] flex items-center justify-center font-bold"
                    style={{
                      background: c.c,
                      top: c.top,
                      right: "10%",
                      boxShadow: phase >= 4 && c.n === 1 ? "0 0 0 3px rgba(255,255,255,0.5)" : "none",
                    }}
                  >
                    {c.n}
                  </motion.span>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 크리틱 패널 */}
      <div className="rounded-xl bg-[#0d0f14] border border-white/[0.07] p-2.5 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2">
          <span style={{ color: C }}><Icon name="chat" size={12} /></span>
          <span className="text-[10px] font-semibold text-white/55">Critique</span>
          {phase === 2 && <span className="ml-auto"><Spinner color={C} /></span>}
        </div>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={phase >= 3 ? "show" : "hidden"}
          className="space-y-1.5 flex-1"
        >
          {CARDS.map((c) => (
            <motion.div
              key={c.n}
              variants={pop}
              animate={
                phase >= 4 && c.n === 1
                  ? { borderColor: "rgba(108,140,255,0.6)", boxShadow: "0 0 0 1px rgba(108,140,255,0.4)" }
                  : {}
              }
              className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-[#13161e] border border-white/[0.05]"
              style={{ borderLeft: `2px solid ${c.c}` }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full text-white text-[7px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5"
                style={{ background: c.c }}
              >
                {c.n}
              </span>
              <div className="flex-1 space-y-1">
                <div className="h-1 rounded bg-white/15 w-full" />
                <div className="h-1 rounded bg-white/[0.08] w-3/5" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ════════════ ④ 참고문헌정리 ════════════ */
function ReferencesFlow({ reduce }: { reduce: boolean }) {
  const { t } = useTranslation();
  const C = "#a78bfa";
  const phase = usePhases(4, [1100, 1400, 1500], reduce);
  // 실제: DOI 입력 → Crossref→OpenAlex→Semantic Scholar 조회 → 7개 스타일 렌더
  const SOURCES = ["Crossref", "OpenAlex", "Semantic Scholar"];
  // 실제 엔진의 7개 인용 스타일
  const STYLES = ["APA7", "MLA9", "Chicago", "IEEE", "Vancouver", "Harvard", "Nature"];
  const [style, setStyle] = useState(0);
  useEffect(() => {
    if (phase < 3 || reduce) return;
    const id = setInterval(() => setStyle((s) => (s + 1) % STYLES.length), 950);
    return () => clearInterval(id);
  }, [phase, reduce]);

  // 스타일별 실제 렌더 형식
  const RENDER: Record<number, string> = {
    0: "Bandura, A. (1997). Self-efficacy. Freeman.",
    1: "Bandura, Albert. Self-Efficacy. Freeman, 1997.",
    2: "Bandura, Albert. 1997. Self-Efficacy. New York: Freeman.",
    3: "A. Bandura, Self-efficacy. New York: Freeman, 1997.",
    4: "Bandura A. Self-efficacy. New York: Freeman; 1997.",
    5: "Bandura, A. (1997) Self-efficacy. New York: Freeman.",
    6: "Bandura, A. Self-efficacy. (Freeman, 1997).",
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-[#0d0f14] border border-white/[0.07] px-3 py-2.5">
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${C}26`, color: C }}>
          DOI
        </span>
        <span className="text-[11px] text-white/55 flex-1 truncate font-mono">10.1037/0003-066X.52.4.366</span>
        {phase === 1 ? <Spinner color={C} /> : phase >= 2 ? (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#5ebd7c]"><Icon name="check" size={13} /></motion.span>
        ) : null}
      </div>

      {/* 출처 체인 (Crossref → OpenAlex → Semantic Scholar) */}
      <div className="flex items-center gap-1.5">
        {SOURCES.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-1">
            <motion.div
              animate={phase >= 1 ? { opacity: 1, borderColor: `${C}40` } : { opacity: 0.3 }}
              transition={{ delay: 0.25 * i }}
              className="flex-1 text-center px-1 py-1 rounded-md bg-[#13161e] border border-white/[0.05] text-[9px] text-white/50"
            >
              {s}
            </motion.div>
            {i < SOURCES.length - 1 && <Icon name="chevronRight" size={10} className="text-white/20" />}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {phase >= 2 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[9px] text-white/30 mr-0.5">인용 스타일</span>
              {STYLES.map((s, i) => (
                <span
                  key={s}
                  className="px-1.5 py-0.5 rounded text-[9px] border transition-colors"
                  style={
                    phase >= 3 && i === style
                      ? { background: `${C}26`, borderColor: `${C}66`, color: "#d8ccff" }
                      : { borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.32)" }
                  }
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="rounded-lg bg-[#13161e] border border-white/[0.05] px-3 py-2.5 min-h-[44px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={phase >= 3 ? style : "init"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-[11px] text-white/65 leading-relaxed"
                >
                  {RENDER[phase >= 3 ? style : 0]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════ ⑤ 문장라이브러리 ════════════ */
function LibraryFlow({ reduce }: { reduce: boolean }) {
  const { t } = useTranslation();
  const C = "#34d399";
  const phase = usePhases(3, [1200, 1500], reduce); // 0 선택 · 1 생성중 · 2 패턴
  // 실제: 논문 유형 → 챕터 선택 → AI 문장 패턴(맥락/공백/목적/기여) 생성
  const TAGS = [
    { k: "맥락 제시", s: "선행 연구에 따르면 …은 …와 밀접한 관련이 있다." },
    { k: "연구 공백", s: "그러나 …에 관한 실증 연구는 여전히 부족하다." },
    { k: "연구 목적", s: "본 연구는 …을 규명하는 것을 목적으로 한다." },
    { k: "학술 기여", s: "이를 통해 …에 대한 이론적·실천적 함의를 제공한다." },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="px-2 py-1 rounded-md text-[10px] bg-[#13161e] border border-white/[0.06] text-white/50">
          양적연구
        </span>
        <Icon name="chevronRight" size={11} className="text-white/20" />
        <motion.span
          animate={{ background: `${C}1f`, borderColor: `${C}55`, color: "#bff3dd" }}
          className="px-2 py-1 rounded-md text-[10px] border border-white/[0.06] text-white/50"
        >
          연구 방법
        </motion.span>
        {phase === 1 && <span className="ml-auto flex items-center gap-1.5 text-[10px] text-white/40"><Spinner color={C} /> {t("landing.flowGenerating")}</span>}
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate={phase >= 2 ? "show" : "hidden"}
        className="space-y-1.5"
      >
        {TAGS.map((tag) => (
          <motion.div
            key={tag.k}
            variants={pop}
            className="rounded-lg bg-[#13161e] border border-white/[0.05] px-3 py-2"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${C}1f`, color: C }}>
                {tag.k}
              </span>
              <Icon name="paperclip" size={10} className="text-white/15 ml-auto" />
            </div>
            <p className="text-[10.5px] text-white/55 leading-relaxed">{tag.s}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/* ════════════ 부모: 탭 + 자동 순환 ════════════ */
const TABS = [
  { id: "literature", icon: "literature", color: "#3ecfb2", labelKey: "sidebar.literature", capKey: "landing.flowLiteratureCap", Demo: LiteratureFlow },
  { id: "structure", icon: "structure", color: "#6c8cff", labelKey: "sidebar.structure", capKey: "landing.flowStructureCap", Demo: StructureFlow },
  { id: "critique", icon: "critique", color: "#f472b6", labelKey: "sidebar.critique", capKey: "landing.flowCritiqueCap", Demo: CritiqueFlow },
  { id: "references", icon: "citation", color: "#a78bfa", labelKey: "sidebar.references", capKey: "landing.flowReferencesCap", Demo: ReferencesFlow },
  { id: "library", icon: "library", color: "#34d399", labelKey: "sidebar.library", capKey: "landing.flowLibraryCap", Demo: LibraryFlow },
] as const;

export function MenuFlowShowcase() {
  const { t } = useTranslation();
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLDivElement>(null);
  // 아코디언: 현재 펼쳐진 항목 인덱스 (기본 0번 펼침)
  const [open, setOpen] = useState<number>(0);
  const toggle = (i: number) => setOpen((cur) => (cur === i ? -1 : i));

  return (
    <section className="py-32 px-6 relative">
      <div className="max-w-[1080px] mx-auto" ref={sectionRef}>
        {/* 소문자 섹션 라벨 */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a00]" />
            <span className="text-[11px] lowercase tracking-[0.16em] text-white/40 font-mono">
              {t("landing.flowsBadge")}
            </span>
          </div>
          <h2 className="font-nanum-bold leading-[1.3] tracking-[-0.01em] text-[clamp(1.4rem,3.2vw,2.3rem)] max-w-[640px] text-white text-left text-balance">
            {t("landing.flowsTitle")}
          </h2>
          {t("landing.flowsSubtitle") && (
            <p className="text-white/50 text-[15px] mt-5 max-w-xl leading-relaxed">{t("landing.flowsSubtitle")}</p>
          )}
        </motion.div>

        {/* DesignMe식 아코디언 리스트 (+/-, 펼침/접힘) */}
        <div className="border-t border-white/[0.1]">
          {TABS.map((tab, i) => {
            const isOpen = open === i;
            const Demo = tab.Demo;
            return (
              <div key={tab.id} className="border-b border-white/[0.1]">
                {/* 헤더 행: 01  제목  +/- */}
                <button
                  onClick={() => toggle(i)}
                  className="group w-full flex items-center gap-5 sm:gap-8 py-7 sm:py-9 text-left transition-colors"
                >
                  <span
                    className="text-[26px] sm:text-[34px] font-extrabold tabular-nums leading-none tracking-tight transition-colors"
                    style={{ color: isOpen ? tab.color : "rgba(255,255,255,0.3)" }}
                  >
                    0{i + 1}
                  </span>
                  <span className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        background: isOpen ? `${tab.color}24` : "rgba(255,255,255,0.05)",
                        color: isOpen ? tab.color : "rgba(255,255,255,0.45)",
                      }}
                    >
                      <Icon name={tab.icon} size={17} />
                    </span>
                    <span
                      className="font-nanum-bold text-[20px] sm:text-[28px] tracking-tight transition-colors truncate"
                      style={{ color: isOpen ? "#fff" : "rgba(255,255,255,0.62)" }}
                    >
                      {t(tab.labelKey)}
                    </span>
                  </span>
                  {/* +/- 토글 아이콘 */}
                  <span className="relative w-7 h-7 flex-shrink-0 flex items-center justify-center">
                    <span className="absolute w-[18px] h-[2px] rounded-full transition-colors" style={{ background: isOpen ? tab.color : "rgba(255,255,255,0.6)" }} />
                    <motion.span
                      animate={{ rotate: isOpen ? 0 : 90, opacity: isOpen ? 0 : 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute w-[18px] h-[2px] rounded-full"
                      style={{ background: "rgba(255,255,255,0.6)" }}
                    />
                  </span>
                </button>

                {/* 펼침 영역: 좌측 데모 프레임 + 우측 단계 설명 */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 pb-10 items-start">
                        {/* 데모 프레임 (다크 디바이스 목업) */}
                        <div className="relative rounded-[18px] bg-[#0a0a0c] border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/40">
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                            <span className="ml-2 text-[10px] font-mono text-white/25 lowercase tracking-wide">ai-research-os / {tab.id}</span>
                            <span className="ml-auto text-[10px] font-mono text-white/20">live demo</span>
                          </div>
                          <div className="p-5 sm:p-7 min-h-[280px]">
                            <Demo reduce={reduce} />
                          </div>
                        </div>

                        {/* 단계 설명 (캡션을 화살표 단계로 분해) */}
                        <div className="pt-1">
                          <p className="text-[13px] text-white/55 leading-relaxed mb-5">{t(tab.capKey)}</p>
                          <ol className="space-y-2.5">
                            {t(tab.capKey).split("→").map((step, si) => (
                              <li key={si} className="flex items-start gap-3">
                                <span
                                  className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                  style={{ background: `${tab.color}24`, color: tab.color }}
                                >
                                  {si + 1}
                                </span>
                                <span className="text-[13px] text-white/65 leading-snug">{step.trim()}</span>
                              </li>
                            ))}
                          </ol>
                          <Link
                            href="/signup"
                            className="inline-flex items-center gap-1.5 mt-6 text-[13px] font-semibold transition-colors hover:gap-2.5"
                            style={{ color: tab.color }}
                          >
                            {t(tab.labelKey)} {t("nav.explore")}
                            <Icon name="arrowRight" size={14} />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
