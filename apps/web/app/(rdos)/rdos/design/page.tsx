"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { Icon } from "@/components/ui/icons";
import {
  CourseLayout,
  CourseLectureList,
  CourseQuizResults,
  CourseHelpCard,
  AiBoundaryCard,
} from "@/components/rdos/course-layout";
import { RDOS_LESSON_CONTENT, type QuizQuestion } from "@/lib/rdos/lesson-content";
import { useLearnerStore } from "@/lib/project/learner";

const CONTENT = RDOS_LESSON_CONTENT.design;

function Practice({ quiz, lessonId }: { quiz: QuizQuestion[]; lessonId: string }) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [passed, setPassed] = useState(0);
  const q = quiz[qi % quiz.length];

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setPassed((p) => p + 1);
  }

  function next() {
    setPicked(null);
    setQi((n) => n + 1);
  }

  return (
    <Card key={lessonId}>
      <div className="card-h">
        <h3>실습 · 이해도 확인</h3>
        <span className="sp" />
        <span className="fs-cap t3">{passed}문항 통과</span>
      </div>
      <p className="fs-sm t1 mb3" style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
        {q.q}
      </p>
      <div className="col" style={{ gap: 8 }}>
        {q.options.map((opt, i) => {
          const isCorrect = i === q.answer;
          const show = picked !== null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={picked !== null}
              className="glass-flat"
              style={{
                textAlign: "left",
                padding: "10px 13px",
                fontFamily: "inherit",
                fontSize: "var(--fs-sm)",
                color: "var(--t1)",
                cursor: picked === null ? "pointer" : "default",
                borderColor: show && isCorrect ? "var(--ok)" : show && i === picked ? "var(--danger)" : undefined,
                background: show && isCorrect ? "rgba(62,207,178,.10)" : show && i === picked ? "rgba(255,112,102,.10)" : undefined,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null ? (
        <div
          className="mt3"
          style={{
            padding: "10px 13px",
            borderRadius: "var(--r-sm)",
            background: picked === q.answer ? "rgba(62,207,178,.08)" : "rgba(232,184,75,.08)",
            border: `1px solid ${picked === q.answer ? "rgba(62,207,178,.25)" : "rgba(232,184,75,.25)"}`,
          }}
        >
          <b className="fs-cap" style={{ color: picked === q.answer ? "var(--ok)" : "var(--warn)" }}>
            {picked === q.answer ? "정확합니다" : "다시 생각해 보세요"}
          </b>
          <p className="fs-cap t2 mt2 mb0" style={{ lineHeight: 1.7 }}>
            {q.explanation}
          </p>
          <Button size="sm" className="mt3" onClick={next}>
            다음 문항
            <Icon name="arrow" size={13} />
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export default function RdosDesignPage() {
  const { courseProgress, setCourseProgress } = useLearnerStore();
  const pct = courseProgress.design ?? 0;
  const activeIdx = Math.min(CONTENT.lessons.length - 1, Math.floor((pct / 100) * CONTENT.lessons.length));
  const active = CONTENT.lessons[activeIdx];

  const quizRows = useMemo(
    () =>
      CONTENT.lessons.map((l, i) => ({
        label: l.title,
        score: i < activeIdx ? 84 + ((i * 5) % 14) : i === activeIdx ? 0 : 0,
      })),
    [activeIdx],
  );

  return (
    <CourseLayout
      eyebrow="1 · 기초 이해"
      title={CONTENT.label}
      description={CONTENT.intro}
      gaugePct={pct}
      gaugeLabel="진행률"
      headerContent={
        <>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <Badge variant="info">진행 중</Badge>
            <span className="fs-cap t3">
              {activeIdx + 1}강 / {CONTENT.lessons.length}강
            </span>
          </div>
          <b className="fs-lg disp" style={{ display: "block", marginBottom: 6 }}>
            {active.title}
          </b>
          <ProgressBar value={pct} label={`${CONTENT.label} 진행률`} />
          <div className="row mt3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setCourseProgress("design", Math.min(100, pct + Math.round(100 / CONTENT.lessons.length)))}
            >
              이 강 완료 표시
              <Icon name="check" size={13} />
            </Button>
          </div>
        </>
      }
      left={
        <>
          <Card>
            <div className="card-h">
              <h2>{active.title}</h2>
            </div>
            <p className="t3 fs-cap mb3">{active.subtitle}</p>
            <div className="rdos-lesson-body" dangerouslySetInnerHTML={{ __html: active.content }} />
          </Card>
          <Practice quiz={active.quiz} lessonId={active.id} />
          <AiBoundaryCard>
            AI는 여러분의 연구문제·RQ 초안을 대신 완성해 주지 않습니다. 스스로 쓴 초안에 대해{" "}
            <b style={{ color: "var(--t1)" }}>구체성 · RQ 형태 · 범위</b> 기준으로만 판단해 코멘트를 드립니다.
          </AiBoundaryCard>
        </>
      }
      right={
        <>
          <Card>
            <div className="card-h">
              <h3>이 과목 {CONTENT.lessons.length}강</h3>
            </div>
            <CourseLectureList
              items={CONTENT.lessons.map((l, i) => ({
                id: l.id,
                title: l.title,
                meta: l.subtitle,
                state: i < activeIdx ? "done" : i === activeIdx ? "active" : "todo",
              }))}
            />
          </Card>
          <CourseQuizResults rows={quizRows} footnote="아직 풀지 않은 강은 0점으로 표시됩니다." />
          <CourseHelpCard
            links={[
              { label: "왜 이 개념이 필요한지 AI 튜터에게 묻기", href: "/rdos/tutor" },
              { label: "연구설계 관련 용어 지식 코어에서 보기", href: "/rdos/knowledge" },
            ]}
          />
        </>
      }
    />
  );
}
