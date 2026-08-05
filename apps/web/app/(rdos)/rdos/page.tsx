"use client";

import { useMemo } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Gauge } from "@/components/ui/gauge";
import { Kpi } from "@/components/ui/kpi";
import { ProgressRow } from "@/components/ui/progress";
import { DataList, DataItem } from "@/components/ui/data-list";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { CourseHelpCard } from "@/components/rdos/course-layout";
import { useLearnerStore } from "@/lib/project/learner";

const AXES: { id: string; label: string; href: string }[] = [
  { id: "basics", label: "연구 기초", href: "/rdos/basics" },
  { id: "design", label: "연구설계 기초", href: "/rdos/design" },
  { id: "method", label: "연구방법론 기초", href: "/rdos/method" },
  { id: "reading", label: "논문 읽기 훈련", href: "/rdos/reading" },
  { id: "writing", label: "학술 글쓰기 훈련", href: "/rdos/writing" },
  { id: "apa", label: "APA 학습", href: "/rdos/apa" },
];

const TODAY = new Date();
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export default function RdosDashboardPage() {
  const { courseProgress, streakDays, heatmap, readingSessions, writingSubmissions, certificationRequirements } =
    useLearnerStore();

  const overallPct = useMemo(() => {
    const vals = AXES.map((a) => courseProgress[a.id] ?? 0);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [courseProgress]);

  const next = useMemo(() => {
    const open = AXES.filter((a) => (courseProgress[a.id] ?? 0) < 100).sort(
      (a, b) => (courseProgress[a.id] ?? 0) - (courseProgress[b.id] ?? 0),
    );
    return open[0] ?? AXES[0];
  }, [courseProgress]);

  const upNext = useMemo(
    () => AXES.filter((a) => (courseProgress[a.id] ?? 0) < 100 && a.id !== next.id).slice(0, 3),
    [courseProgress, next],
  );

  const completedLessons = Math.round(
    AXES.reduce((sum, a) => sum + (courseProgress[a.id] ?? 0), 0) / 100,
  );
  const remainingReqs = certificationRequirements.filter((r) => !r.done).length;

  return (
    <Page
      eyebrow={`${TODAY.getMonth() + 1}월 ${TODAY.getDate()}일 · ${DOW[TODAY.getDay()]}요일`}
      title="오늘도 20분이면 충분합니다"
      description="한 번에 다 하려 하지 않아도 됩니다. 오늘의 한 가지만 마치면 진도가 이어집니다."
    >
      <div className="grid g-main mb4">
        <Card>
          <div className="card-h">
            <h2>오늘의 한 가지</h2>
          </div>
          <div className="row" style={{ alignItems: "flex-start", gap: 18, marginBottom: 18 }}>
            <Gauge value={overallPct} label="인증까지" size={84} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="t2 fs-sm mb0" style={{ lineHeight: 1.7 }}>
                지금은 <b className="t1">{next.label}</b>을(를) 이어갈 차례입니다. 약 12분이면 다음 강까지 마칠 수
                있어요.
              </p>
              <div className="row mt3">
                <LinkButton href={next.href} variant="primary" size="sm">
                  <Icon name="arrow" size={14} />
                  이어서 학습하기
                </LinkButton>
                <span className="fs-cap t3">예상 소요 12분</span>
              </div>
            </div>
          </div>
          <div className="card-h">
            <h3>6개 학습 축</h3>
          </div>
          {AXES.map((a) => (
            <ProgressRow
              key={a.id}
              label={a.label}
              value={courseProgress[a.id] ?? 0}
              tone={(courseProgress[a.id] ?? 0) >= 100 ? "ok" : "default"}
            />
          ))}
        </Card>

        <Card>
          <div className="card-h">
            <h2>연속 학습</h2>
          </div>
          <div className="row" style={{ alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <b className="disp" style={{ fontSize: "var(--fs-2xl)" }}>
              {streakDays}
            </b>
            <span className="t2 fs-sm">일째 이어가는 중</span>
          </div>
          <p className="t3 fs-cap mb4">최근 28일의 학습 기록입니다. 진하게 채워질수록 그날 더 많이 학습했어요.</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 5,
            }}
            role="img"
            aria-label={`최근 28일 중 ${heatmap.filter((v) => v > 0).length}일 학습`}
          >
            {heatmap.map((v, i) => (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  aspectRatio: "1",
                  borderRadius: 5,
                  background:
                    v === 0
                      ? "var(--glass-2)"
                      : `color-mix(in srgb, var(--accent) ${20 + v * 20}%, transparent)`,
                  border: "1px solid var(--hairline)",
                }}
              />
            ))}
          </div>
          <div className="card-h mt5">
            <h3>최근 활동</h3>
          </div>
          <DataList>
            <DataItem
              lead={<Icon name="check" size={15} />}
              title="논문 읽기 훈련"
              sub={`총 ${readingSessions}회 완료`}
            />
            <DataItem
              lead={<Icon name="pen" size={15} />}
              title="학술 글쓰기 훈련"
              sub={`총 ${writingSubmissions}회 제출`}
            />
            <DataItem
              lead={<Icon name="medal" size={15} />}
              title="연구 준비자 인증"
              sub={`요건 ${certificationRequirements.length - remainingReqs}/${certificationRequirements.length}개 충족`}
            />
          </DataList>
        </Card>
      </div>

      <div className="grid g4 mb4">
        <Kpi label="수료한 강" value={completedLessons} unit="강" />
        <Kpi label="읽은 논문" value={readingSessions} unit="편" />
        <Kpi label="쓴 문단" value={writingSubmissions} unit="개" />
        <Kpi label="인증까지 남은 요건" value={remainingReqs} unit="개" tone={remainingReqs === 0 ? "up" : undefined} />
      </div>

      <div className="grid g-wide">
        <Card>
          <div className="card-h">
            <h3>이어서 하기</h3>
          </div>
          <DataList>
            {[next, ...upNext].map((a) => (
              <DataItem
                key={a.id}
                lead={<Icon name="arrow" size={15} />}
                title={a.label}
                sub={`${Math.round(courseProgress[a.id] ?? 0)}% 진행됨`}
                action={
                  <LinkButton href={a.href} size="sm">
                    계속하기
                  </LinkButton>
                }
              />
            ))}
          </DataList>
        </Card>
        <CourseHelpCard
          title="막히면"
          links={[
            { label: "AI 튜터에게 물어보기", href: "/rdos/tutor" },
            { label: "지식 코어에서 용어 찾기", href: "/rdos/knowledge" },
            { label: "성장 로드맵 다시 보기", href: "/rdos/roadmap" },
          ]}
        />
      </div>
    </Page>
  );
}
