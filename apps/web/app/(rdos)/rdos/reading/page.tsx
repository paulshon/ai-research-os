"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Steps, type StepItem } from "@/components/ui/steps";
import { Icon } from "@/components/ui/icons";
import { AiBoundaryCard, CourseHelpCard } from "@/components/rdos/course-layout";
import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import { KNOWLEDGE_TERMS } from "@/lib/rdos/knowledge-core";
import { useLearnerStore } from "@/lib/project/learner";

const CONTENT = RDOS_LESSON_CONTENT.reading;

const PROCEDURE: { title: string; detail: string }[] = [
  { title: "제목·초록 훑기", detail: "무엇을, 왜, 어떻게 연구했는지 3줄로 예측한다" },
  { title: "서론에서 목적 찾기", detail: "연구목적·RQ에 밑줄을 긋는다" },
  { title: "결과 먼저 훑기", detail: "해석 없이 '무엇이 나왔는지'만 확인한다" },
  { title: "논의에서 의미 파악", detail: "결과가 왜 중요한지, 기존 연구와 어떻게 다른지 본다" },
  { title: "전체 재구성", detail: "목적–방법–결과–의미를 내 언어로 3문장 요약한다" },
];

const READING_TERMS = KNOWLEDGE_TERMS.slice(0, 6);

function reviewSummary(text: string) {
  const sentences = text
    .split(/[.!?。]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const checks = [
    { label: "3문장 내외로 작성했다", ok: sentences.length >= 2 && sentences.length <= 5 },
    { label: "연구 목적이 드러난다", ok: /목적|밝히|알아보|분석|검증/.test(text) },
    { label: "핵심 결과나 방법이 드러난다", ok: /결과|방법|발견|나타났|보였/.test(text) },
    { label: "본인 언어로 재구성했다 (원문 그대로 붙여넣지 않음)", ok: text.length > 20 && text.length < 600 },
  ];
  return { sentences, checks };
}

export default function RdosReadingPage() {
  const { readingSessions, writingSubmissions, vocabulary, addVocab, recordReadingSession } = useLearnerStore();
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const review = useMemo(() => (submitted !== null ? reviewSummary(submitted) : null), [submitted]);
  const stepItems: StepItem[] = PROCEDURE.map((p, i) => ({
    title: p.title,
    detail: p.detail,
    state: i < 4 ? "done" : "now",
  }));

  return (
    <Page
      eyebrow="2 · 실습 훈련"
      title={CONTENT.label}
      description={CONTENT.intro}
    >
      <div className="grid g-wide">
        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h2>효율적으로 논문 읽는 5단계</h2>
            </div>
            <Steps items={stepItems} />
          </Card>

          <Card>
            <div className="card-h">
              <h3>실습 · 3문장 요약 쓰기</h3>
              <span className="sp" />
              <Badge variant="mute">총 {readingSessions}회 완료</Badge>
            </div>
            <p className="fs-cap t2 mb3" style={{ lineHeight: 1.7 }}>
              방금 읽은 논문(또는 최근 읽은 논문)을 목적–방법–결과가 드러나도록 3문장으로 요약해 보세요.
            </p>
            <textarea
              className="textarea"
              placeholder="예) 이 연구는 …을 밝히기 위해 …명을 대상으로 …을 조사했다. 그 결과 …로 나타났다. 이는 …라는 점에서 의미가 있다."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <div className="row mt3">
              <Button
                variant="primary"
                size="sm"
                disabled={summary.trim().length < 10}
                onClick={() => {
                  setSubmitted(summary);
                  recordReadingSession();
                }}
              >
                AI에게 검토 요청
                <Icon name="arrow" size={13} />
              </Button>
              <span className="fs-cap t3">AI는 기준에 따라 검토만 합니다 — 요약을 대신 써 주지 않습니다.</span>
            </div>

            {review ? (
              <div className="crq mt4">
                <div className="crq-h">
                  <span className="no">AI 검토</span>
                  <span className="st">
                    <Badge variant={review.checks.every((c) => c.ok) ? "ok" : "warn"}>
                      {review.checks.filter((c) => c.ok).length}/{review.checks.length} 기준 충족
                    </Badge>
                  </span>
                </div>
                <blockquote>{submitted}</blockquote>
                <div className="col" style={{ gap: 6 }}>
                  {review.checks.map((c, i) => (
                    <div key={i} className="row" style={{ gap: 8 }}>
                      <span style={{ color: c.ok ? "var(--ok)" : "var(--t3)" }}>
                        <Icon name={c.ok ? "check" : "close"} size={13} />
                      </span>
                      <span className="fs-cap" style={{ color: c.ok ? "var(--t2)" : "var(--warn)" }}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <AiBoundaryCard>
            AI는 논문을 대신 읽거나 요약을 대신 써 주지 않습니다. 여러분이 작성한 요약을{" "}
            <b style={{ color: "var(--t1)" }}>목적 · 방법/결과 · 재구성 여부</b> 기준으로만 점검합니다.
          </AiBoundaryCard>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h3>만난 용어 → 지식 코어</h3>
            </div>
            <p className="fs-cap t3 mb3">읽으면서 낯설었던 용어를 지식 코어에 저장해 두면 나중에 복습할 수 있어요.</p>
            <div className="list">
              {READING_TERMS.map((t) => {
                const added = vocabulary.some((v) => v.term === t.ko);
                return (
                  <div key={t.id} className="li">
                    <div className="t">
                      <b>{t.ko}</b>
                      <span>{t.en}</span>
                    </div>
                    <Button size="sm" variant={added ? "ghost" : "default"} disabled={added} onClick={() => addVocab(t.ko)}>
                      {added ? "추가됨" : "추가"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>

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
              { label: `쓰기 훈련으로 이어가기 (${writingSubmissions}회 제출)`, href: "/rdos/writing" },
              { label: "AI 튜터에게 물어보기", href: "/rdos/tutor" },
            ]}
          />
        </div>
      </div>
    </Page>
  );
}
