"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { KnowledgeChapter, KnowledgeTerm, TermCategory, KnowledgeModule } from "@/lib/rdos/knowledge-core";
import { KNOWLEDGE_LESSONS } from "@/lib/rdos/knowledge-lessons";
import type { Lesson, QuizQuestion } from "@/lib/rdos/lesson-content";
import {
  localizeKnowledgeChapters,
  localizeKnowledgeTerms,
  localizeKnowledgeObjectives,
  localizeKnowledgeModules,
  localizeKnowledgeLesson,
} from "@/lib/rdos/knowledge-content-i18n";
import { useTranslation } from "@/lib/i18n";

const LESSON_BY_CODE: Record<string, Lesson> = Object.fromEntries(KNOWLEDGE_LESSONS.map((l) => [l.id, l]));

/* ════════════════════════════════════════════════════════════
   RDOS L0 — 지식 코어 (v6)
   논문가이드(8개 장 + 31개 용어) 탐색 + 학습목표·학습모듈(12개 도메인).
   엔진·퀘스트·레슨이 참조하는 '교과서(Knowledge Core)' 레이어.
═══════════════════════════════════════════════════════════════ */

const CAT_LABEL_KEY: Record<TermCategory, string> = {
  concept: "rdos.knowledge.catConcept", method: "rdos.knowledge.catMethod", theory: "rdos.knowledge.catTheory",
  paradigm: "rdos.knowledge.catParadigm", contribution: "rdos.knowledge.catContribution", process: "rdos.knowledge.catProcess",
};
const CAT_COLOR: Record<TermCategory, string> = {
  concept: "#3ecfb2", method: "#e8b84b", theory: "#a78bfa",
  paradigm: "#7c93ff", contribution: "#f472b6", process: "#34d399",
};

export default function RdosKnowledgeView({
  chapters, terms, objectives = [], modules = [],
}: {
  chapters: KnowledgeChapter[]; terms: KnowledgeTerm[];
  objectives?: string[]; modules?: KnowledgeModule[];
}) {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<"learn" | "chapters" | "terms">("learn");
  const [cat, setCat] = useState<TermCategory | "all">("all");
  const [q, setQ] = useState("");
  const [openTerm, setOpenTerm] = useState<KnowledgeTerm | null>(null);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);

  const locObjectives = useMemo(() => localizeKnowledgeObjectives(objectives, locale), [objectives, locale]);
  const locModules = useMemo(() => localizeKnowledgeModules(modules, locale), [modules, locale]);
  const locChapters = useMemo(() => localizeKnowledgeChapters(chapters, locale), [chapters, locale]);
  const locTerms = useMemo(() => localizeKnowledgeTerms(terms, locale), [terms, locale]);

  const cats = Array.from(new Set(locTerms.map((term) => term.category)));
  const filtered = locTerms.filter((term) =>
    (cat === "all" || term.category === cat) &&
    (q === "" ||
      term.en.toLowerCase().includes(q.toLowerCase()) ||
      term.ko.includes(q) ||
      term.definition.includes(q))
  );

  return (
    <div>
      <Link href="/rdos" className="text-[12px] text-white/40 hover:text-white/80 transition">{t("rdos.knowledge.backToDashboard")}</Link>

      <div className="flex items-start gap-3 mt-4 mb-2">
        <span className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-[18px] font-bold flex-shrink-0 bg-[#3ecfb2]/15 text-[#3ecfb2]">K</span>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">{t("rdos.knowledge.title")}</h1>
          <p className="text-[12px] text-white/40 font-mono">{t("rdos.knowledge.subtitle").replace("{count}", String(terms.length))}</p>
        </div>
      </div>
      <p className="text-[13.5px] text-white/55 leading-relaxed max-w-[680px] mb-7">
        {t("rdos.knowledge.desc")}
      </p>

      <div className="flex gap-2 mb-6">
        {(["learn", "chapters", "terms"] as const).map((tabKey) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition"
            style={{ background: tab === tabKey ? "#3ecfb222" : "#161a22", color: tab === tabKey ? "#3ecfb2" : "#8a92a6" }}>
            {tabKey === "learn" ? t("rdos.knowledge.tabLearn") : tabKey === "chapters" ? t("rdos.knowledge.tabChapters") : t("rdos.knowledge.tabTerms").replace("{count}", String(terms.length))}
          </button>
        ))}
      </div>

      {tab === "learn" && (
        <div className="mb-2">
          <h2 className="text-[14px] font-bold text-white/80 mb-3">{t("rdos.knowledge.objectivesTitle")}</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {locObjectives.map((o, i) => (
              <div key={i} className="p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07]">
                <span className="text-[11px] font-mono text-[#3ecfb2]">{t("rdos.knowledge.objectiveN").replace("{n}", String(i + 1))}</span>
                <p className="text-[12.5px] text-white/70 mt-1 leading-relaxed">{o}</p>
              </div>
            ))}
          </div>

          <h2 className="text-[14px] font-bold text-white/80 mb-1">{t("rdos.knowledge.modulesTitle")}</h2>
          <p className="text-[12px] text-white/45 mb-3">{t("rdos.knowledge.modulesDesc")}</p>
          <div className="space-y-3">
            {locModules.map((m) => {
              const rawLesson = LESSON_BY_CODE[m.code];
              const lesson = rawLesson ? localizeKnowledgeLesson(rawLesson, locale) : null;
              return (
                <button key={m.code} onClick={() => lesson && setOpenLesson(lesson)} disabled={!lesson}
                  className="w-full text-left p-4 rounded-[14px] bg-[#10131a] border border-white/[0.07] hover:border-[#3ecfb2]/30 transition disabled:opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#3ecfb2]/15 text-[#3ecfb2]">{m.code}</span>
                    <span className="text-[14px] font-bold text-white/85">{m.domain}</span>
                    {locale === "ko" && <span className="text-[11px] text-white/40 font-mono">{m.en}</span>}
                    <span className="ml-auto text-[11px] font-mono text-[#3ecfb2]">{lesson ? t("rdos.knowledge.lessonQuizLink").replace("{count}", String(lesson.quiz.length)) : ""}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.items.map((it, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[11.5px] bg-white/[0.04] text-white/60 border border-white/[0.06]">{it}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {openLesson && (
        <KnowledgeLessonModal lesson={openLesson} onClose={() => setOpenLesson(null)} />
      )}

      {tab !== "learn" && (tab === "chapters" ? (
        <div className="space-y-3">
          {locChapters.map((c) => (
            <div key={c.id} className="p-5 rounded-[14px] bg-[#10131a] border border-white/[0.07]">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-[9px] bg-[#7c93ff]/15 text-[#7c93ff] flex items-center justify-center text-[12px] font-bold flex-shrink-0">{c.num}</span>
                <h3 className="text-[15px] font-bold text-white/90">
                  {locale === "ko" ? (
                    <>{c.ko} <span className="text-[12px] text-white/40 font-normal">{c.en}</span></>
                  ) : (
                    <>{c.ko}{locale === "en" && c.en !== c.ko ? <span className="text-[12px] text-white/40 font-normal ml-1.5">{c.en}</span> : null}</>
                  )}
                </h3>
                <span className="ml-auto text-[11px] font-mono text-white/45">{c.role}</span>
              </div>
              <p className="text-[12.5px] text-white/60 leading-relaxed mb-2.5">{c.desc}</p>
              <div className="text-[11.5px] rounded-[9px] bg-[#7c93ff]/8 border-l-2 border-[#7c93ff] px-3 py-2 text-[#c9d2f0]">
                <span className="font-semibold">{t("rdos.knowledge.corePrinciple")}</span> · {c.principle}
              </div>
              <p className="text-[11px] text-white/35 mt-2 font-mono">{t("rdos.knowledge.connectedEngine").replace("{engine}", c.engine)}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rdos.knowledge.searchPlaceholder")}
              className="px-3 py-2 rounded-[9px] bg-[#10131a] border border-white/[0.1] text-[12.5px] text-white/80 outline-none focus:border-[#3ecfb2]/40 w-[200px]" />
            <button onClick={() => setCat("all")}
              className="px-3 py-1.5 rounded-full text-[11.5px] font-medium transition"
              style={{ background: cat === "all" ? "#3ecfb222" : "#161a22", color: cat === "all" ? "#3ecfb2" : "#8a92a6" }}>{t("rdos.knowledge.all")}</button>
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className="px-3 py-1.5 rounded-full text-[11.5px] font-medium transition"
                style={{ background: cat === c ? CAT_COLOR[c] + "22" : "#161a22", color: cat === c ? CAT_COLOR[c] : "#8a92a6" }}>
                {t(CAT_LABEL_KEY[c])}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((term) => (
              <button key={term.id} onClick={() => setOpenTerm(term)}
                className="text-left p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07] hover:border-white/20 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: CAT_COLOR[term.category] + "1c", color: CAT_COLOR[term.category] }}>{term.num}</span>
                  <span className="text-[13.5px] font-bold text-white/85">{term.en}</span>
                </div>
                <p className="text-[12px] text-white/45 mb-1.5">{term.ko}</p>
                <p className="text-[12px] text-white/60 leading-relaxed line-clamp-2">{term.definition}</p>
              </button>
            ))}
          </div>
        </>
      ))}

      {openTerm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpenTerm(null); }}>
          <div className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-[16px] bg-[#0d0f14] border border-white/[0.1] p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: CAT_COLOR[openTerm.category] + "1c", color: CAT_COLOR[openTerm.category] }}>{t(CAT_LABEL_KEY[openTerm.category])}</span>
                </div>
                <h3 className="text-[18px] font-bold text-white/90 mt-2">{openTerm.en}</h3>
                <p className="text-[12.5px] text-white/45">{openTerm.ko}</p>
              </div>
              <button onClick={() => setOpenTerm(null)} className="text-white/40 hover:text-white/80 text-[18px]">✕</button>
            </div>
            <div className="space-y-3">
              <Field label={t("rdos.knowledge.definition")} color={CAT_COLOR[openTerm.category]} text={openTerm.definition} />
              {openTerm.analogy && <Field label={t("rdos.knowledge.analogy")} color="#e8b84b" text={openTerm.analogy} />}
              <Field label={t("rdos.knowledge.usageInPaper")} color="#7c93ff" text={openTerm.usage} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold mb-1" style={{ color }}>{label}</div>
      <p className="text-[13px] text-white/72 leading-relaxed">{text}</p>
    </div>
  );
}

/* 지식 코어 학습 모달 — 학습 내용(HTML) + 이해도 퀴즈(로컬 채점) */
function KnowledgeQuizItem({ q, idx }: { q: QuizQuestion; idx: number }) {
  const { t } = useTranslation();
  const [sel, setSel] = useState<number | null>(null);
  const revealed = sel !== null;
  return (
    <div className="mb-5">
      <div className="text-[13.5px] font-semibold text-white/85 mb-2.5">{idx + 1}. {q.q}</div>
      {q.options.map((opt, i) => {
        const isAns = i === q.answer;
        let bg = "bg-[#10131a] border-white/[0.08]";
        if (revealed && isAns) bg = "bg-[#0f1f17] border-[#3ecfb2]/40";
        else if (revealed && sel === i && !isAns) bg = "bg-[#2a1416] border-[#ff7066]/40";
        return (
          <button key={i} onClick={() => !revealed && setSel(i)} disabled={revealed}
            className={`w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 mb-2 rounded-[10px] border text-[13px] text-white/75 transition ${bg} ${revealed ? "cursor-default" : "hover:border-white/20"}`}>
            {opt}
          </button>
        );
      })}
      {revealed && (
        <div className={`mt-1 text-[12px] leading-relaxed rounded-[9px] px-3 py-2 ${sel === q.answer ? "bg-[#3ecfb2]/10 text-[#7fe6cf]" : "bg-[#ff7066]/10 text-[#ffb0aa]"}`}>
          {sel === q.answer ? t("rdos.knowledge.correct") : t("rdos.knowledge.incorrect")}{q.explanation}
        </div>
      )}
    </div>
  );
}

function KnowledgeLessonModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"content" | "quiz">("content");
  const ACCENT = "#3ecfb2";
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[680px] max-h-[88vh] flex flex-col rounded-[16px] bg-[#0d0f14] border border-white/[0.1] overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-white/[0.07]">
          <div>
            <div className="text-[16px] font-bold text-white/90">{lesson.title}</div>
            <div className="text-[11.5px] text-white/45 mt-0.5">{lesson.subtitle}</div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-[18px] leading-none">✕</button>
        </div>
        <div className="flex gap-2 px-6 pt-4">
          {(["content", "quiz"] as const).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)}
              className="px-4 py-1.5 rounded-[8px] text-[12.5px] font-semibold transition"
              style={{ background: tab === tb ? ACCENT + "22" : "#161a22", color: tab === tb ? ACCENT : "#8a92a6" }}>
              {tb === "content" ? t("rdos.knowledge.studyContent") : t("rdos.knowledge.quizWithCount").replace("{count}", String(lesson.quiz.length))}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "content" ? (
            <>
              <div className="rdos-lesson-body text-[13.5px] text-white/75 leading-[1.75]"
                dangerouslySetInnerHTML={{ __html: lesson.content }} />
              <div className="mt-5 text-right">
                <button onClick={() => setTab("quiz")} className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold"
                  style={{ background: ACCENT, color: "#070708" }}>{t("rdos.knowledge.startQuiz")}</button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-bold text-white/80 mb-3">{t("rdos.knowledge.comprehensionQuiz").replace("{count}", String(lesson.quiz.length))}</div>
              {lesson.quiz.map((q, i) => <KnowledgeQuizItem key={i} q={q} idx={i} />)}
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.07]">
          <button onClick={onClose} className="px-4 py-2 rounded-[9px] text-[12.5px] text-white/55 bg-[#161a22]">{t("rdos.knowledge.close")}</button>
        </div>
      </div>
    </div>
  );
}
