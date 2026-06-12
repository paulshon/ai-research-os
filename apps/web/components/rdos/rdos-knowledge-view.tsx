"use client";

import Link from "next/link";
import { useState } from "react";
import type { KnowledgeChapter, KnowledgeTerm, TermCategory, KnowledgeModule } from "@/lib/rdos/knowledge-core";
import { KNOWLEDGE_LESSONS } from "@/lib/rdos/knowledge-lessons";
import type { Lesson, QuizQuestion } from "@/lib/rdos/lesson-content";

const LESSON_BY_CODE: Record<string, Lesson> = Object.fromEntries(KNOWLEDGE_LESSONS.map((l) => [l.id, l]));

/* ════════════════════════════════════════════════════════════
   RDOS L0 — 지식 코어 (v6)
   논문가이드(8개 장 + 31개 용어) 탐색 + 학습목표·학습모듈(12개 도메인).
   엔진·퀘스트·레슨이 참조하는 '교과서(Knowledge Core)' 레이어.
═══════════════════════════════════════════════════════════════ */

const CAT_LABEL: Record<TermCategory, string> = {
  concept: "개념·문제설정", method: "방법·측정·분석", theory: "질적 방법론·추론",
  paradigm: "패러다임·철학", contribution: "기여·함의", process: "연구 과정·윤리",
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
  const [tab, setTab] = useState<"learn" | "chapters" | "terms">("learn");
  const [cat, setCat] = useState<TermCategory | "all">("all");
  const [q, setQ] = useState("");
  const [openTerm, setOpenTerm] = useState<KnowledgeTerm | null>(null);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);

  const cats = Array.from(new Set(terms.map((t) => t.category)));
  const filtered = terms.filter((t) =>
    (cat === "all" || t.category === cat) &&
    (q === "" || t.en.toLowerCase().includes(q.toLowerCase()) || t.ko.includes(q))
  );

  return (
    <div>
      <Link href="/rdos" className="text-[12px] text-white/40 hover:text-white/80 transition">← Dashboard</Link>

      <div className="flex items-start gap-3 mt-4 mb-2">
        <span className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-[18px] font-bold flex-shrink-0 bg-[#3ecfb2]/15 text-[#3ecfb2]">K</span>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">지식 코어 (L0 Knowledge Layer)</h1>
          <p className="text-[12px] text-white/40 font-mono">논문가이드 원천지식 · 8개 핵심 장 + {terms.length}개 연구용어</p>
        </div>
      </div>
      <p className="text-[13.5px] text-white/55 leading-relaxed max-w-[680px] mb-7">
        모든 엔진·퀘스트·레슨이 참조하는 교과서입니다. 논문의 8개 장이 어떤 질문에 답하고
        어떤 서술구조를 갖는지, 그리고 연구를 말하는 데 필요한 핵심 용어를 한곳에서 익힙니다.
      </p>

      <div className="flex gap-2 mb-6">
        {(["learn", "chapters", "terms"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition"
            style={{ background: tab === t ? "#3ecfb222" : "#161a22", color: tab === t ? "#3ecfb2" : "#8a92a6" }}>
            {t === "learn" ? "🎯 학습 목표·모듈" : t === "chapters" ? "📚 논문 8개 장" : `🔑 연구용어 (${terms.length})`}
          </button>
        ))}
      </div>

      {tab === "learn" && (
        <div className="mb-2">
          <h2 className="text-[14px] font-bold text-white/80 mb-3">학습 목표</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {objectives.map((o, i) => (
              <div key={i} className="p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07]">
                <span className="text-[11px] font-mono text-[#3ecfb2]">목표 {i + 1}</span>
                <p className="text-[12.5px] text-white/70 mt-1 leading-relaxed">{o}</p>
              </div>
            ))}
          </div>

          <h2 className="text-[14px] font-bold text-white/80 mb-1">학습 모듈 (L0 12개 도메인) · 클릭하여 학습</h2>
          <p className="text-[12px] text-white/45 mb-3">논문가이드 전체를 12개 지식 도메인으로 구조화했습니다. 카드를 누르면 학습 내용과 20문항 퀴즈가 열립니다.</p>
          <div className="space-y-3">
            {modules.map((m) => {
              const lesson = LESSON_BY_CODE[m.code];
              return (
                <button key={m.code} onClick={() => lesson && setOpenLesson(lesson)} disabled={!lesson}
                  className="w-full text-left p-4 rounded-[14px] bg-[#10131a] border border-white/[0.07] hover:border-[#3ecfb2]/30 transition disabled:opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#3ecfb2]/15 text-[#3ecfb2]">{m.code}</span>
                    <span className="text-[14px] font-bold text-white/85">{m.domain}</span>
                    <span className="text-[11px] text-white/40 font-mono">{m.en}</span>
                    <span className="ml-auto text-[11px] font-mono text-[#3ecfb2]">{lesson ? `학습 + 퀴즈 ${lesson.quiz.length}문항 →` : ""}</span>
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
          {chapters.map((c) => (
            <div key={c.id} className="p-5 rounded-[14px] bg-[#10131a] border border-white/[0.07]">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 rounded-[9px] bg-[#7c93ff]/15 text-[#7c93ff] flex items-center justify-center text-[12px] font-bold flex-shrink-0">{c.num}</span>
                <h3 className="text-[15px] font-bold text-white/90">{c.ko} <span className="text-[12px] text-white/40 font-normal">{c.en}</span></h3>
                <span className="ml-auto text-[11px] font-mono text-white/45">{c.role}</span>
              </div>
              <p className="text-[12.5px] text-white/60 leading-relaxed mb-2.5">{c.desc}</p>
              <div className="text-[11.5px] rounded-[9px] bg-[#7c93ff]/8 border-l-2 border-[#7c93ff] px-3 py-2 text-[#c9d2f0]">
                <span className="font-semibold">핵심 서술원리</span> · {c.principle}
              </div>
              <p className="text-[11px] text-white/35 mt-2 font-mono">연결 엔진: {c.engine}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="용어 검색 (영문/한글)"
              className="px-3 py-2 rounded-[9px] bg-[#10131a] border border-white/[0.1] text-[12.5px] text-white/80 outline-none focus:border-[#3ecfb2]/40 w-[200px]" />
            <button onClick={() => setCat("all")}
              className="px-3 py-1.5 rounded-full text-[11.5px] font-medium transition"
              style={{ background: cat === "all" ? "#3ecfb222" : "#161a22", color: cat === "all" ? "#3ecfb2" : "#8a92a6" }}>전체</button>
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className="px-3 py-1.5 rounded-full text-[11.5px] font-medium transition"
                style={{ background: cat === c ? CAT_COLOR[c] + "22" : "#161a22", color: cat === c ? CAT_COLOR[c] : "#8a92a6" }}>
                {CAT_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((t) => (
              <button key={t.id} onClick={() => setOpenTerm(t)}
                className="text-left p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07] hover:border-white/20 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: CAT_COLOR[t.category] + "1c", color: CAT_COLOR[t.category] }}>{t.num}</span>
                  <span className="text-[13.5px] font-bold text-white/85">{t.en}</span>
                </div>
                <p className="text-[12px] text-white/45 mb-1.5">{t.ko}</p>
                <p className="text-[12px] text-white/60 leading-relaxed line-clamp-2">{t.definition}</p>
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
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: CAT_COLOR[openTerm.category] + "1c", color: CAT_COLOR[openTerm.category] }}>{CAT_LABEL[openTerm.category]}</span>
                </div>
                <h3 className="text-[18px] font-bold text-white/90 mt-2">{openTerm.en}</h3>
                <p className="text-[12.5px] text-white/45">{openTerm.ko}</p>
              </div>
              <button onClick={() => setOpenTerm(null)} className="text-white/40 hover:text-white/80 text-[18px]">✕</button>
            </div>
            <div className="space-y-3">
              <Field label="정의" color={CAT_COLOR[openTerm.category]} text={openTerm.definition} />
              {openTerm.analogy && <Field label="비유·예시" color="#e8b84b" text={openTerm.analogy} />}
              <Field label="논문에서의 활용" color="#7c93ff" text={openTerm.usage} />
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
          {sel === q.answer ? "✓ 정답입니다. " : "✗ 오답입니다. "}{q.explanation}
        </div>
      )}
    </div>
  );
}

function KnowledgeLessonModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
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
              {tb === "content" ? "📖 학습 내용" : `📝 퀴즈 (${lesson.quiz.length})`}
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
                  style={{ background: ACCENT, color: "#070708" }}>퀴즈 풀기 →</button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-bold text-white/80 mb-3">이해도 퀴즈 · {lesson.quiz.length}문항</div>
              {lesson.quiz.map((q, i) => <KnowledgeQuizItem key={i} q={q} idx={i} />)}
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.07]">
          <button onClick={onClose} className="px-4 py-2 rounded-[9px] text-[12.5px] text-white/55 bg-[#161a22]">닫기</button>
        </div>
      </div>
    </div>
  );
}
