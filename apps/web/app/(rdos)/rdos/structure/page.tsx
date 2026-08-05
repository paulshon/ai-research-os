"use client";

import { useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { AiBoundaryCard, CourseHelpCard } from "@/components/rdos/course-layout";
import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import { useLearnerStore } from "@/lib/project/learner";

const CONTENT = RDOS_LESSON_CONTENT.structure;

const CHAPTERS = [
  { id: "bg", ko: "연구배경", role: "왜? (why)", share: 15 },
  { id: "purpose", ko: "연구목적 및 연구문제", role: "무엇을? (what)", share: 10 },
  { id: "lit", ko: "문헌연구", role: "기존은 어땠나?", share: 20 },
  { id: "method", ko: "연구방법", role: "어떻게? (how)", share: 15 },
  { id: "result", ko: "연구결과", role: "무엇이 나왔나?", share: 20 },
  { id: "discussion", ko: "논의", role: "왜 그런가? so what?", share: 20 },
];

type Snippet = { id: string; text: string; clue: string; answer: string };

const SNIPPETS: Snippet[] = [
  {
    id: "p1",
    text: "최근 생성형 AI를 활용한 창작 활동이 빠르게 확산되고 있으며, 이는 예술계 전반에 걸쳐 논쟁을 촉발하고 있다.",
    clue: "최근 …이 확산되고 있으며",
    answer: "bg",
  },
  {
    id: "p2",
    text: "선행연구들은 AI의 기술적 성능 향상에 주목해 왔으나, 일반 대중이 AI 창작을 어떻게 인식하는지는 충분히 다루지 않았다.",
    clue: "선행연구들은 …을 다루었으나",
    answer: "lit",
  },
  {
    id: "p3",
    text: "이에 본 연구는 AI 창작물에 대한 대중의 인식 유형을 분석하는 것을 목적으로 한다.",
    clue: "본 연구는 …을 목적으로 한다",
    answer: "purpose",
  },
  {
    id: "p4",
    text: "구체적으로, 본 연구는 유튜브 댓글 3,200건을 수집하여 주제분석 절차에 따라 코딩하였다.",
    clue: "구체적으로, 본 연구는 다음과 같은 절차로",
    answer: "method",
  },
  {
    id: "p5",
    text: "분석 결과, 응답자의 인식은 도구적 수용형·창작권 옹호형 등 4가지 유형으로 구분되었다.",
    clue: "분석 결과, …로 나타났다",
    answer: "result",
  },
  {
    id: "p6",
    text: "이러한 결과는 선행연구와 비교할 때, AI 창작에 대한 인식이 단일하지 않고 세분화되어 있음을 시사한다.",
    clue: "이러한 결과는 선행연구와 비교할 때",
    answer: "discussion",
  },
];

export default function RdosStructurePage() {
  const { courseProgress, setCourseProgress } = useLearnerStore();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const snip = SNIPPETS[idx % SNIPPETS.length];
  const pct = courseProgress.structure ?? 0;

  function choose(id: string) {
    if (picked) return;
    setPicked(id);
    if (id === snip.answer) {
      setCorrectCount((c) => c + 1);
      setCourseProgress("structure", Math.min(100, pct + Math.round(100 / SNIPPETS.length)));
    }
  }

  return (
    <Page eyebrow="2 · 실습 훈련" title={CONTENT.label} description={CONTENT.intro}>
      <div className="grid g-wide">
        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h2>논문 6개 장 — 역할과 분량</h2>
              <span className="sp" />
              <Badge variant="mute">{pct}% 진행</Badge>
            </div>
            <div className="macro">
              {CHAPTERS.map((c) => (
                <span key={c.id}>{c.ko}</span>
              ))}
            </div>
            <div className="col mt4" style={{ gap: 10 }}>
              {CHAPTERS.map((c) => (
                <div key={c.id} className="prow" style={{ gridTemplateColumns: "150px 1fr 48px" }}>
                  <span className="n">{c.ko}</span>
                  <div className="bar">
                    <i style={{ width: `${c.share * 4}%` }} />
                  </div>
                  <span className="p">{c.share}%</span>
                </div>
              ))}
            </div>
            <p className="fs-cap t3 mt3 mb0">
              분량은 논문 전체 대비 상대적 비중이며, 학문·저널에 따라 달라질 수 있습니다.
            </p>
          </Card>

          <Card>
            <div className="card-h">
              <h3>실습 · 이 문단은 어느 장일까요</h3>
              <span className="sp" />
              <span className="fs-cap t3">{correctCount}/{SNIPPETS.length} 정답</span>
            </div>
            <p className="fs-sm t1 mb3" style={{ lineHeight: 1.85 }}>
              {snip.text}
            </p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {CHAPTERS.map((c) => {
                const show = picked !== null;
                const isCorrect = c.id === snip.answer;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => choose(c.id)}
                    className="btn btn-sm"
                    style={{
                      borderColor: show && isCorrect ? "var(--ok)" : show && c.id === picked ? "var(--danger)" : undefined,
                      background: show && isCorrect ? "rgba(62,207,178,.12)" : show && c.id === picked ? "rgba(255,112,102,.12)" : undefined,
                    }}
                  >
                    {c.ko}
                  </button>
                );
              })}
            </div>
            {picked ? (
              <div
                className="mt3"
                style={{
                  padding: "10px 13px",
                  borderRadius: "var(--r-sm)",
                  background: picked === snip.answer ? "rgba(62,207,178,.08)" : "rgba(232,184,75,.08)",
                  border: `1px solid ${picked === snip.answer ? "rgba(62,207,178,.25)" : "rgba(232,184,75,.25)"}`,
                }}
              >
                <b className="fs-cap" style={{ color: picked === snip.answer ? "var(--ok)" : "var(--warn)" }}>
                  {picked === snip.answer ? "정확합니다" : `정답은 「${CHAPTERS.find((c) => c.id === snip.answer)?.ko}」입니다`}
                </b>
                <p className="fs-cap t2 mt2 mb0" style={{ lineHeight: 1.7 }}>
                  단서 표현 <b style={{ color: "var(--t1)" }}>"{snip.clue}"</b>가 이 문단이 속한 장을 알려줍니다.
                </p>
                <Button
                  size="sm"
                  className="mt3"
                  onClick={() => {
                    setPicked(null);
                    setIdx((n) => n + 1);
                  }}
                >
                  다음 문단
                  <Icon name="arrow" size={13} />
                </Button>
              </div>
            ) : null}
          </Card>

          <AiBoundaryCard>
            AI는 여러분의 논문 문단을 대신 배치해 주지 않습니다. 단서 표현을 스스로 찾아 판단하는 연습이며, AI는{" "}
            <b style={{ color: "var(--t1)" }}>정답 여부와 근거</b>만 알려줍니다.
          </AiBoundaryCard>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h3>학습 목표</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--t2)", fontSize: "var(--fs-sm)", lineHeight: 1.9 }}>
              {CONTENT.objectives.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </Card>
          <CourseHelpCard
            links={[
              { label: "논문 읽기 훈련과 함께 보기", href: "/rdos/reading" },
              { label: "AI 튜터에게 물어보기", href: "/rdos/tutor" },
            ]}
          />
        </div>
      </div>
    </Page>
  );
}
