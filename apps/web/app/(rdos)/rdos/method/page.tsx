"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { Table } from "@/components/ui/table";
import { Icon } from "@/components/ui/icons";
import {
  CourseLayout,
  CourseLectureList,
  CourseQuizResults,
  CourseHelpCard,
  AiBoundaryCard,
} from "@/components/rdos/course-layout";
import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import { useLearnerStore } from "@/lib/project/learner";

const CONTENT = RDOS_LESSON_CONTENT.method;

const COMPARISON = [
  { row: "목적", quant: "관계·차이를 수치로 검증", qual: "의미·경험을 깊이 이해", mixed: "넓게 탐색 + 깊이 이해" },
  { row: "자료", quant: "설문·실험·척도", qual: "인터뷰·관찰·문서", mixed: "설문 + 인터뷰" },
  { row: "표본", quant: "무작위·대규모", qual: "목적 표집·소규모", mixed: "단계별로 다름" },
  { row: "분석", quant: "통계 검정", qual: "주제분석·근거이론", mixed: "통합 해석" },
  { row: "RQ 형태", quant: "'차이가 있는가', '관계가 있는가'", qual: "'어떻게', '왜'", mixed: "둘 다 포함" },
];

type Scenario = { id: string; text: string; answer: "quant" | "qual" | "mixed"; reason: string };

const SCENARIOS: Scenario[] = [
  {
    id: "s1",
    text: "대학생 500명을 대상으로 SNS 사용 시간과 수면의 질 사이에 통계적으로 유의한 관계가 있는지 검증하고 싶다.",
    answer: "quant",
    reason: "'통계적으로 유의한 관계'를 대규모 표본으로 검증하려는 목적이므로 양적 방법(설문·상관분석)이 적합합니다.",
  },
  {
    id: "s2",
    text: "AI 창작 도구를 사용해 본 예술가 8명이 자신의 창작 정체성을 어떻게 재구성하는지 깊이 있게 이해하고 싶다.",
    answer: "qual",
    reason: "소수 참여자의 경험과 의미를 깊이 탐구하는 목적이므로 질적 방법(심층 인터뷰)이 적합합니다.",
  },
  {
    id: "s3",
    text: "먼저 설문으로 어떤 유형의 사용자가 있는지 넓게 파악한 뒤, 유형별 대표 사례를 인터뷰로 깊이 파고들고 싶다.",
    answer: "mixed",
    reason: "'넓게 탐색 후 깊이 이해'라는 순차적 목적은 양적·질적을 결합하는 혼합 연구 설계의 전형적 패턴입니다.",
  },
];

export default function RdosMethodPage() {
  const { courseProgress, setCourseProgress } = useLearnerStore();
  const pct = courseProgress.method ?? 0;
  const activeIdx = Math.min(CONTENT.lessons.length - 1, Math.floor((pct / 100) * CONTENT.lessons.length));
  const active = CONTENT.lessons[activeIdx];

  const [si, setSi] = useState(0);
  const [picked, setPicked] = useState<Scenario["answer"] | null>(null);
  const scenario = SCENARIOS[si % SCENARIOS.length];

  const quizRows = useMemo(
    () =>
      CONTENT.lessons.map((l, i) => ({
        label: l.title,
        score: i < activeIdx ? 82 + ((i * 6) % 16) : 0,
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
              onClick={() => setCourseProgress("method", Math.min(100, pct + Math.round(100 / CONTENT.lessons.length)))}
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

          <Card>
            <div className="card-h">
              <h3>양적 · 질적 · 혼합 한눈에 비교</h3>
            </div>
            <Table>
              <thead>
                <tr>
                  <th style={{ width: 90 }}></th>
                  <th>양적 연구</th>
                  <th>질적 연구</th>
                  <th>혼합 연구</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r) => (
                  <tr key={r.row}>
                    <td>
                      <b>{r.row}</b>
                    </td>
                    <td>{r.quant}</td>
                    <td>{r.qual}</td>
                    <td>{r.mixed}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <div className="card-h">
              <h3>실습 · 어떤 방법이 맞을까요</h3>
            </div>
            <p className="fs-sm t1 mb3" style={{ lineHeight: 1.8 }}>
              {scenario.text}
            </p>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {(
                [
                  ["quant", "양적 연구"],
                  ["qual", "질적 연구"],
                  ["mixed", "혼합 연구"],
                ] as const
              ).map(([val, label]) => {
                const show = picked !== null;
                const isCorrect = val === scenario.answer;
                return (
                  <button
                    key={val}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => setPicked(val)}
                    className="btn"
                    style={{
                      borderColor: show && isCorrect ? "var(--ok)" : show && val === picked ? "var(--danger)" : undefined,
                      background: show && isCorrect ? "rgba(62,207,178,.12)" : show && val === picked ? "rgba(255,112,102,.12)" : undefined,
                    }}
                  >
                    {label}
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
                  background: picked === scenario.answer ? "rgba(62,207,178,.08)" : "rgba(232,184,75,.08)",
                  border: `1px solid ${picked === scenario.answer ? "rgba(62,207,178,.25)" : "rgba(232,184,75,.25)"}`,
                }}
              >
                <b className="fs-cap" style={{ color: picked === scenario.answer ? "var(--ok)" : "var(--warn)" }}>
                  {picked === scenario.answer ? "정확한 판단입니다" : "다시 생각해 보세요"}
                </b>
                <p className="fs-cap t2 mt2 mb0" style={{ lineHeight: 1.7 }}>
                  {scenario.reason}
                </p>
                <Button
                  size="sm"
                  className="mt3"
                  onClick={() => {
                    setPicked(null);
                    setSi((n) => n + 1);
                  }}
                >
                  다음 사례
                  <Icon name="arrow" size={13} />
                </Button>
              </div>
            ) : null}
          </Card>

          <AiBoundaryCard>
            AI는 여러분의 연구에 어떤 방법론이 맞는지 최종 결정을 대신 내려 주지 않습니다. RQ와 목적에 비추어{" "}
            <b style={{ color: "var(--t1)" }}>선택의 근거를 함께 점검</b>할 뿐, 방법론 선택은 연구자의 몫입니다.
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
              { label: "방법론 용어 지식 코어에서 찾기", href: "/rdos/knowledge" },
              { label: "AI 튜터에게 물어보기", href: "/rdos/tutor" },
            ]}
          />
        </>
      }
    />
  );
}
