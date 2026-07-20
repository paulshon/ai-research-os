"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LessonContent, Lesson, QuizQuestion } from "@/lib/rdos/lesson-content";
import { localizeLessonContent } from "@/lib/rdos/rdos-content-i18n";
import { useTranslation } from "@/lib/i18n";

/* ════════════════════════════════════════════════════════════
   RDOS 메뉴 학습 페이지 (v4)
   - 레슨 본문(HTML) + 이해도 퀴즈 모달
   - 퀴즈를 모두 풀어야 "레슨 완료" 가능 (index(3) 개선안 반영)
   - 완료 시 /api/rdos/complete 로 진행(완료 레슨 수) 저장 → 커널 도출 입력
═══════════════════════════════════════════════════════════════ */

function QuizItem({ q, idx, onAnswer }: { q: QuizQuestion; idx: number; onAnswer: (i: number, correct: boolean) => void }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  function pick(i: number) {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    onAnswer(idx, i === q.answer);
  }
  return (
    <div className="mb-5">
      <div className="text-[13.5px] font-semibold text-white/85 mb-2.5">{idx + 1}. {q.q}</div>
      {q.options.map((opt, i) => {
        const isPicked = selected === i;
        const isAnswer = i === q.answer;
        let bg = "bg-[#10131a] border-white/[0.08]";
        if (revealed && isAnswer) bg = "bg-[#0f1f17] border-[#3ecfb2]/40";
        else if (isPicked && !isAnswer) bg = "bg-[#2a1416] border-[#ff7066]/40";
        return (
          <button key={i} onClick={() => pick(i)} disabled={revealed}
            className={`w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 mb-2 rounded-[10px] border text-[13px] text-white/75 transition ${bg} ${revealed ? "cursor-default" : "hover:border-white/20"}`}>
            <span className="w-4 h-4 rounded-full border border-white/25 flex items-center justify-center text-[9px] flex-shrink-0"
              style={{ background: isPicked ? (isAnswer ? "#3ecfb2" : "#ff7066") : "transparent", color: "#fff" }}>
              {isPicked ? "●" : ""}
            </span>
            {opt}
          </button>
        );
      })}
      {revealed && (
        <div className={`mt-1 text-[12px] leading-relaxed rounded-[9px] px-3 py-2 ${selected === q.answer ? "bg-[#3ecfb2]/10 text-[#7fe6cf]" : "bg-[#ff7066]/10 text-[#ffb0aa]"}`}>
          {selected === q.answer ? t("rdos.lesson.correct") : t("rdos.lesson.incorrect")}{q.explanation}
        </div>
      )}
    </div>
  );
}

function LessonModal({ lesson, accent, alreadyDone, onClose, onComplete }: {
  lesson: Lesson; accent: string; alreadyDone: boolean; onClose: () => void; onComplete: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"content" | "quiz">("content");
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const allAnswered = lesson.quiz.every((_, i) => answers[i] !== undefined);
  const canComplete = tab === "quiz" && allAnswered;

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
              style={{ background: tab === tb ? accent + "22" : "#161a22", color: tab === tb ? accent : "#8a92a6" }}>
              {tb === "content" ? t("rdos.lesson.studyContent") : t("rdos.lesson.quizTab")}
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
                  style={{ background: accent, color: "#070708" }}>{t("rdos.lesson.startQuiz")}</button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-bold text-white/80 mb-3">{t("rdos.lesson.comprehensionQuiz")}</div>
              {lesson.quiz.map((q, i) => (
                <QuizItem key={i} q={q} idx={i} onAnswer={(idx, c) => setAnswers((p) => ({ ...p, [idx]: c }))} />
              ))}
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/[0.07]">
          <button onClick={onClose} className="px-4 py-2 rounded-[9px] text-[12.5px] text-white/55 bg-[#161a22]">{t("rdos.lesson.close")}</button>
          {alreadyDone ? (
            <span className="text-[12px] text-[#3ecfb2]">{t("rdos.lesson.alreadyDone")}</span>
          ) : (
            <button onClick={() => canComplete && onComplete()} disabled={!canComplete}
              className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition disabled:cursor-not-allowed"
              style={{ background: canComplete ? "#065f46" : "#161a22", color: canComplete ? "#6ee7b7" : "#475569" }}>
              {tab !== "quiz" ? t("rdos.lesson.needQuizFirst") : allAnswered ? t("rdos.lesson.lessonComplete") : t("rdos.lesson.answerAllFirst")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RdosLessonView({ content: rawContent, initialDone }: { content: LessonContent; initialDone: number }) {
  const { t, locale } = useTranslation();
  // v17: localize module + lesson structural content for the current locale.
  const content = useMemo(() => localizeLessonContent(rawContent, locale), [rawContent, locale]);
  const [done, setDone] = useState(initialDone);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const total = content.lessons.length;
  const pct = Math.round((done / total) * 100);
  const ACCENT = content.color;

  function persist(next: number) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/rdos/complete", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menuKey: content.key, lessonsDone: next }),
        });
        const json = await res.json().catch(() => ({}));
        setMsg(json.persisted ? t("rdos.lesson.savedNotice") : t("rdos.lesson.localOnlyNotice"));
        router.refresh();
      } catch {
        setMsg(t("rdos.lesson.saveFailed"));
      }
    });
  }

  function completeLesson(i: number) {
    // 순차 완료: 현재 진행 위치의 레슨만 완료 처리
    if (i === done && done < total) {
      const next = done + 1;
      setDone(next);
      persist(next);
    }
    setOpenIdx(null);
  }

  function status(i: number): "done" | "active" | "locked" {
    if (i < done) return "done";
    if (i === done) return "active";
    return "locked";
  }

  return (
    <div>
      <Link href="/rdos" className="text-[12px] text-white/40 hover:text-white/80 transition">{t("rdos.lesson.backToDashboard")}</Link>

      <div className="flex items-start gap-3 mt-4 mb-5">
        <span className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-[18px] font-bold flex-shrink-0" style={{ background: ACCENT + "1f", color: ACCENT }}>{content.label.slice(0, 1)}</span>
        <div className="flex-1">
          <h1 className="text-[24px] font-bold tracking-tight">{content.label}</h1>
          <p className="text-[12px] text-white/40 font-mono">{t("rdos.lesson.provides").replace("{provides}", content.provides).replace("{engine}", content.engine)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[11px] text-white/40 font-mono">{t("rdos.lesson.missionProgress")}</p>
          <p className="text-[18px] font-bold" style={{ color: ACCENT }}>{pct}%</p>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mb-7">
        <div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: ACCENT }} />
      </div>

      <p className="text-[14px] text-white/60 leading-relaxed max-w-[640px] mb-8">{content.intro}</p>

      <h2 className="text-[14px] font-bold text-white/80 mb-3">{t("rdos.lesson.objectivesTitle")}</h2>
      <div className="grid sm:grid-cols-3 gap-3 mb-9">
        {content.objectives.map((o, i) => (
          <div key={i} className="p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07]">
            <span className="text-[11px] font-mono" style={{ color: ACCENT }}>{t("rdos.lesson.objectiveN").replace("{n}", String(i + 1))}</span>
            <p className="text-[12.5px] text-white/70 mt-1 leading-relaxed">{o}</p>
          </div>
        ))}
      </div>

      <h2 className="text-[14px] font-bold text-white/80 mb-3">{t("rdos.lesson.modulesTitle")}</h2>
      <div className="space-y-3 mb-7">
        {content.lessons.map((lesson, i) => {
          const st = status(i);
          const clickable = st !== "locked";
          return (
            <button key={i} disabled={!clickable} onClick={() => clickable && setOpenIdx(i)}
              className={`w-full text-left flex items-center gap-4 p-4 rounded-[14px] border transition ${st === "done" ? "bg-[#0f1512] border-[#3ecfb2]/20" : st === "active" ? "bg-[#10131a] border-white/[0.12] hover:border-white/25" : "bg-[#0c0e13] border-white/[0.05] opacity-60 cursor-not-allowed"}`}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: st === "done" ? "#3ecfb222" : ACCENT + "22", color: st === "done" ? "#3ecfb2" : ACCENT }}>{st === "done" ? "✓" : i + 1}</span>
              <div className="flex-1">
                <p className="text-[14px] text-white/80">{lesson.title}</p>
                <p className="text-[12px] text-white/45">{lesson.subtitle} · {t("rdos.lesson.quizCount").replace("{count}", String(lesson.quiz.length))}</p>
              </div>
              <span className="text-[11px] font-mono flex-shrink-0" style={{ color: st === "done" ? "#3ecfb2" : st === "active" ? ACCENT : "rgba(255,255,255,0.3)" }}>{st === "done" ? t("rdos.lesson.done") : st === "active" ? t("rdos.lesson.continueStudy") : t("rdos.lesson.locked")}</span>
            </button>
          );
        })}
      </div>

      {msg && <p className="text-[12px] text-white/45 mb-6">{msg}</p>}

      <div className="p-5 rounded-[14px] bg-[#0e1118] border border-white/[0.06]">
        <p className="text-[12px] text-white/45 mb-2">{t("rdos.lesson.rewardTitle")}</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] bg-[#ff7a00]/12 text-[#ff7a00] border border-[#ff7a00]/20">{t("rdos.lesson.xpPerLesson")}</span>
          {content.reward.map((r) => (
            <span key={r} className="px-2.5 py-1 rounded-full text-[11px] border" style={{ background: ACCENT + "12", color: ACCENT, borderColor: ACCENT + "33" }}>{r}</span>
          ))}
        </div>
        <p className="text-[11px] text-white/35 mt-3">
          {t("rdos.lesson.connectedEngine").split("{engine}")[0]}
          <span style={{ color: ACCENT }}>{content.engine}</span>
          {t("rdos.lesson.connectedEngine").split("{engine}")[1]}
        </p>
      </div>

      {openIdx !== null && (
        <LessonModal lesson={content.lessons[openIdx]} accent={ACCENT}
          alreadyDone={openIdx < done}
          onClose={() => setOpenIdx(null)}
          onComplete={() => completeLesson(openIdx)} />
      )}
    </div>
  );
}
