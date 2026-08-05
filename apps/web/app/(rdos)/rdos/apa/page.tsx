"use client";

import { useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Inspector, InspectorSection, usePageInspector } from "@/components/inspector";
import { AiBoundaryCard, CourseHelpCard } from "@/components/rdos/course-layout";
import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import { useLearnerStore } from "@/lib/project/learner";

const CONTENT = RDOS_LESSON_CONTENT.apa;

const PARTS = [
  { label: "저자", text: "Kim, J.,", color: "var(--accent)", why: "성, 이름 이니셜 순으로 쓰고 저자가 여럿이면 &로 마지막 저자를 연결합니다." },
  { label: "연도", text: "(2023).", color: "var(--accent-2)", why: "괄호 안에 출판연도만 쓰고 마침표로 닫습니다. 같은 저자·같은 해 문헌이 여럿이면 2023a, 2023b로 구분합니다." },
  { label: "제목", text: "AI 창작과 예술적 정체성.", color: "var(--ok)", why: "논문 제목은 첫 단어와 고유명사만 대문자(국문은 그대로) 처리하고 기울임 없이 씁니다." },
  { label: "학술지", text: "커뮤니케이션학연구,", color: "var(--warn)", why: "학술지명은 기울임체로 쓰고, 각 주요 단어를 대문자로 시작합니다(국문은 그대로)." },
  { label: "권(호)", text: "31(2),", color: "var(--danger)", why: "권(Volume)은 기울임, 호(Issue)는 괄호 안에 기울임 없이 붙여 씁니다." },
  { label: "페이지", text: "45–68.", color: "var(--info)", why: "시작–끝 페이지를 붙임표(–)로 연결하고 마침표로 문헌을 닫습니다." },
];

const SOURCE = {
  author: "이서연",
  year: "2022",
  title: "대학생의 학술적 글쓰기 불안과 자기효능감의 관계",
  journal: "교육심리연구",
  volume: "36",
  issue: "1",
  pages: "77-101",
};

function checkCitation(text: string) {
  return [
    { label: "저자명이 있다", ok: /이서연|Lee|이,\s*서연/.test(text) },
    { label: "연도가 괄호 안에 있다", ok: /\(2022\)/.test(text) },
    { label: "제목 뒤에 마침표가 있다", ok: /\.\s*[가-힣A-Za-z]/.test(text) },
    { label: "권(호) 형식이 있다 — 36(1)", ok: /36\s*\(\s*1\s*\)/.test(text) },
    { label: "페이지 범위가 있다 — 77-101", ok: /77\s*[-–]\s*101/.test(text) },
    { label: "전체가 하나의 문장으로 마침표로 끝난다", ok: /\.\s*$/.test(text.trim()) },
  ];
}

export default function RdosApaPage() {
  const { apaAttempts, recordApaAttempt } = useLearnerStore();
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<ReturnType<typeof checkCitation> | null>(null);

  usePageInspector(
    <Inspector title="왜 이렇게 쓰나요" badge={{ label: "APA 7판", variant: "info" }}>
      {PARTS.map((p) => (
        <InspectorSection key={p.label} title={p.label}>
          <p className="fs-cap t2 mb0" style={{ lineHeight: 1.75 }}>
            {p.why}
          </p>
        </InspectorSection>
      ))}
    </Inspector>,
  );

  function submit() {
    setChecked(checkCitation(value));
    recordApaAttempt();
  }

  return (
    <Page eyebrow="2 · 실습 훈련" title={CONTENT.label} description={CONTENT.intro}>
      <div className="grid g-wide">
        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h2>APA 인용의 6개 부분</h2>
            </div>
            <p
              className="fs-md"
              style={{ lineHeight: 2.2, color: "var(--t1)", fontFamily: "var(--font-display)" }}
            >
              {PARTS.map((p, i) => (
                <span key={i} style={{ borderBottom: `2px solid ${p.color}`, paddingBottom: 2, marginRight: 6 }}>
                  {p.text}
                </span>
              ))}
            </p>
            <div className="row mt3" style={{ flexWrap: "wrap", gap: 10 }}>
              {PARTS.map((p) => (
                <span key={p.label} className="row" style={{ gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                  <span className="fs-cap t3">{p.label}</span>
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <div className="card-h">
              <h3>실습 · 아래 정보를 APA 형식으로 바꿔 보세요</h3>
              <span className="sp" />
              <Badge variant="mute">총 {apaAttempts}회 연습</Badge>
            </div>
            <div className="chk">
              <span className="lb">저자</span>
              <span className="vl">{SOURCE.author}</span>
            </div>
            <div className="chk">
              <span className="lb">출판연도</span>
              <span className="vl">{SOURCE.year}</span>
            </div>
            <div className="chk">
              <span className="lb">제목</span>
              <span className="vl">{SOURCE.title}</span>
            </div>
            <div className="chk">
              <span className="lb">학술지 · 권(호) · 페이지</span>
              <span className="vl">
                {SOURCE.journal}, {SOURCE.volume}({SOURCE.issue}), {SOURCE.pages}
              </span>
            </div>
            <textarea
              className="textarea mt3"
              placeholder="예) 이서연 (2022). 대학생의 학술적 글쓰기 불안과 자기효능감의 관계. 교육심리연구, 36(1), 77-101."
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="row mt3">
              <Button variant="primary" size="sm" disabled={value.trim().length < 10} onClick={submit}>
                형식 확인
                <Icon name="check" size={13} />
              </Button>
              <span className="fs-cap t3">AI는 형식을 점검할 뿐, 인용을 대신 조립해 주지 않습니다.</span>
            </div>
            {checked ? (
              <div className="col mt4" style={{ gap: 6 }}>
                {checked.map((c, i) => (
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
            ) : null}
          </Card>

          <AiBoundaryCard>
            AI는 참고문헌을 대신 조립해 주지 않습니다. 여러분이 직접 조립한 인용을 6개 형식 기준으로만 점검합니다.
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
              { label: "지식 코어에서 인용 관련 용어 보기", href: "/rdos/knowledge" },
              { label: "AI 튜터에게 물어보기", href: "/rdos/tutor" },
            ]}
          />
        </div>
      </div>
    </Page>
  );
}
