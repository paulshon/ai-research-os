"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { CourseLayout, CourseLectureList, CourseQuizResults, CourseHelpCard } from "@/components/rdos/course-layout";
import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import { useLearnerStore } from "@/lib/project/learner";

const CONTENT = RDOS_LESSON_CONTENT.basics;

export default function RdosBasicsPage() {
  const { courseProgress } = useLearnerStore();
  const pct = courseProgress.basics ?? 0;
  const [openIdx, setOpenIdx] = useState(0);
  const active = CONTENT.lessons[openIdx];

  const quizRows = CONTENT.lessons.map((l) => ({
    label: l.title,
    score: 88 + ((l.id.charCodeAt(l.id.length - 1) * 7) % 13),
  }));

  return (
    <CourseLayout
      eyebrow="1 · 기초 이해"
      title={CONTENT.label}
      description={CONTENT.intro}
      gaugePct={pct}
      gaugeLabel="수료율"
      headerContent={
        <>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <Badge variant="ok">
              <Icon name="check" size={12} />
              전체 {CONTENT.lessons.length}강 수료 완료
            </Badge>
          </div>
          <p className="t2 fs-sm mb0" style={{ lineHeight: 1.7 }}>
            {CONTENT.label} 과목을 전부 마쳤습니다. 언제든 강을 다시 열어 복습하거나, 이해도 퀴즈를 다시 풀어볼 수
            있어요.
          </p>
          <div className="row mt3">
            <LinkButton href="/rdos/design" variant="primary" size="sm">
              다음 과목으로 이동
              <Icon name="arrow" size={13} />
            </LinkButton>
          </div>
        </>
      }
      left={
        <>
          <Card>
            <div className="card-h">
              <h2>{active.title}</h2>
              <span className="sp" />
              <Badge variant="ok">완료</Badge>
            </div>
            <p className="t3 fs-cap mb3">{active.subtitle}</p>
            <div className="rdos-lesson-body" dangerouslySetInnerHTML={{ __html: active.content }} />
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
                state: i === openIdx ? "active" : "done",
                onClick: () => setOpenIdx(i),
              }))}
            />
          </Card>
          <CourseQuizResults
            rows={quizRows}
            footnote="퀴즈는 이해도 확인용입니다. 다시 풀어 점수를 올릴 수 있어요."
          />
          <CourseHelpCard
            links={[
              { label: "AI 튜터에게 물어보기", href: "/rdos/tutor" },
              { label: "지식 코어에서 용어 다시 보기", href: "/rdos/knowledge" },
            ]}
          />
        </>
      }
    />
  );
}
