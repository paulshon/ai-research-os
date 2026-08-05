"use client";

import { useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Inspector, InspectorSection, usePageInspector } from "@/components/inspector";
import { useLearnerStore } from "@/lib/project/learner";

type Level = {
  n: number;
  title: string;
  desc: string;
  href: string;
  checklist: string[];
};

const LEVELS: Level[] = [
  {
    n: 1,
    title: "글을 읽는 사람",
    desc: "논문을 순서대로 읽고 핵심 주장과 근거를 구분할 수 있습니다.",
    href: "/rdos/reading",
    checklist: ["초록·서론에서 연구목적을 찾아낸다", "주장과 근거를 구분해 표시한다", "3문장 요약을 스스로 작성한다"],
  },
  {
    n: 2,
    title: "구조를 아는 사람",
    desc: "논문 8개 장이 각각 어떤 역할을 하는지, 어디에 무엇이 있는지 압니다.",
    href: "/rdos/structure",
    checklist: ["장별 역할과 분량 배분을 설명한다", "문단을 알맞은 장에 배치한다", "단서 표현으로 장을 구분한다"],
  },
  {
    n: 3,
    title: "기초를 갖춘 사람",
    desc: "연구·연구문제·연구윤리 등 학술 탐구의 기본 개념을 설명할 수 있습니다.",
    href: "/rdos/basics",
    checklist: ["연구와 연구문제의 위계를 설명한다", "좋은 연구문제의 조건을 평가한다", "연구윤리 기본 원칙을 안다"],
  },
  {
    n: 4,
    title: "판단하는 사람",
    desc: "연구설계·방법론 중 어떤 선택이 RQ에 맞는지 스스로 판단합니다.",
    href: "/rdos/design",
    checklist: ["RQ에 맞는 변수를 구분한다", "양적·질적·혼합 방법을 구분한다", "연구설계의 타당도를 검토한다"],
  },
  {
    n: 5,
    title: "인용하는 사람",
    desc: "APA 형식으로 출처를 정확히 표기하고, 왜 그렇게 쓰는지 설명합니다.",
    href: "/rdos/apa",
    checklist: ["본문 인용 6요소를 구분한다", "직접·간접 인용을 구분해 쓴다", "참고문헌 목록을 정확히 조립한다"],
  },
  {
    n: 6,
    title: "쓰는 사람",
    desc: "주제문·근거·좋은 문장 패턴으로 학술 문단을 직접 작성합니다.",
    href: "/rdos/writing",
    checklist: ["주제문을 한 문장으로 진술한다", "근거를 논리적으로 연결한다", "AI 피드백을 받아 스스로 고친다"],
  },
];

export default function RdosRoadmapPage() {
  const { level, setLevel } = useLearnerStore();
  const [selected, setSelected] = useState(level || 1);
  const active = LEVELS.find((l) => l.n === selected) ?? LEVELS[0];

  usePageInspector(
    <Inspector title="레벨 체크리스트" badge={{ label: `L${active.n}`, variant: "info" }}>
      <InspectorSection title={`${active.title} 완료 조건`}>
        <div className="col" style={{ gap: 8 }}>
          {active.checklist.map((c, i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start", gap: 8 }}>
              <span className="t3" style={{ marginTop: 2 }}>
                <Icon name="check" size={13} />
              </span>
              <span className="fs-cap t2" style={{ lineHeight: 1.7 }}>
                {c}
              </span>
            </div>
          ))}
        </div>
      </InspectorSection>
      <InspectorSection title="진단으로 건너뛰기">
        <p className="fs-cap t2 mb3" style={{ lineHeight: 1.7 }}>
          이미 이 레벨의 역량이 있다면, 짧은 진단 퀴즈로 실력을 확인하고 바로 다음 레벨로 건너뛸 수 있습니다.
        </p>
        <Button
          size="sm"
          onClick={() => {
            if (active.n < 6) setLevel(active.n + 1);
          }}
        >
          <Icon name="target" size={14} />
          진단 퀴즈로 건너뛰기
        </Button>
      </InspectorSection>
    </Inspector>,
  );

  return (
    <Page
      eyebrow="성장 로드맵"
      title="여섯 단계로 연구자가 됩니다"
      description="각 레벨은 논문을 다루는 구체적 능력입니다. 지금 레벨을 클릭하면 체크리스트를 볼 수 있어요."
    >
      <div className="col" style={{ gap: 10 }}>
        {LEVELS.map((l) => {
          const done = l.n < level;
          const current = l.n === level;
          const on = l.n === selected;
          return (
            <button
              key={l.n}
              type="button"
              onClick={() => setSelected(l.n)}
              className="glass card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
                fontFamily: "inherit",
                border: on ? "1px solid color-mix(in srgb, var(--accent) 45%, transparent)" : undefined,
                background: on ? "color-mix(in srgb, var(--accent) 8%, transparent)" : undefined,
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  flex: "0 0 auto",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 16,
                  background: done ? "var(--ok)" : current ? "var(--accent)" : "var(--glass-2)",
                  color: done || current ? "var(--t1)" : "var(--t3)",
                }}
              >
                {done ? <Icon name="check" size={18} /> : `L${l.n}`}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <b className="fs-md" style={{ color: "var(--t1)" }}>
                    {l.title}
                  </b>
                  {current ? <Badge variant="info">현재 레벨</Badge> : null}
                  {done ? <Badge variant="ok">완료</Badge> : null}
                </div>
                <p className="fs-cap t3 mb0 mt2">{l.desc}</p>
              </div>
              <LinkButton href={l.href} size="sm" onClick={(e) => e.stopPropagation()}>
                이 레벨 학습
              </LinkButton>
            </button>
          );
        })}
      </div>
    </Page>
  );
}
