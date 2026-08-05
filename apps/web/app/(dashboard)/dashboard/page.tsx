"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Page } from "@/components/shell/app-shell";
import { useProjectStore, savedAgoLabel } from "@/lib/project/store";
import { computeProgress, daysUntil } from "@/lib/project/flow";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ProgressRow } from "@/components/ui/progress";
import { Gauge } from "@/components/ui/gauge";
import { Steps, type StepState } from "@/components/ui/steps";
import { DataList, DataItem } from "@/components/ui/data-list";
import { Icon, type IconName } from "@/components/ui/icons";

function stepState(pct: number): StepState {
  if (pct >= 100) return "done";
  if (pct > 0) return "now";
  return "todo";
}

function milestoneTone(days: number | null): "danger" | "warn" | "mute" {
  if (days === null) return "mute";
  if (days <= 5) return "danger";
  if (days <= 14) return "warn";
  return "mute";
}

export default function DashboardPage() {
  const project = useProjectStore();
  const seedIfEmpty = useProjectStore((s) => s.seedIfEmpty);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const progress = useMemo(() => computeProgress(project), [project]);
  const daysLeft = daysUntil(project.schedule.dueDate);

  const upcomingMilestones = useMemo(
    () =>
      [...project.schedule.milestones]
        .filter((m) => !m.done)
        .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
        .slice(0, 3),
    [project.schedule.milestones],
  );

  const missingDoi = project.literature.filter((l) => l.inLibrary && !l.doi);
  const lastRun = project.validationRuns[project.validationRuns.length - 1];
  const openFindings = lastRun?.findings.filter((f) => !f.resolved) ?? [];
  const dangerFindings = openFindings.filter((f) => f.severity === "danger");
  const underpowered =
    project.methodDesign.requiredN > 0 && project.methodDesign.targetN < project.methodDesign.requiredN;
  const aiDrafts = project.manuscript.filter((b) => b.origin === "ai" && !b.accepted);

  const draftSections = project.outline.sections.filter((s) => s.status !== "done" && s.targetChars > 0);
  const nextSection = [...draftSections].sort(
    (a, b) => a.currentChars / a.targetChars - b.currentChars / b.targetChars,
  )[0];

  type Insight = { tone: "info" | "warn" | "danger"; tag: string; title: string; evidence: string; href: string; cta: string };
  const insights: Insight[] = [];
  if (missingDoi.length > 0) {
    insights.push({
      tone: "danger",
      tag: "인용",
      title: `참고문헌 ${missingDoi.length}건의 DOI가 확인되지 않습니다`,
      evidence: missingDoi.slice(0, 3).map((l) => `${l.authors}(${l.year})`).join(", "),
      href: "/references",
      cta: "수정",
    });
  }
  if (underpowered) {
    insights.push({
      tone: "warn",
      tag: "방법",
      title: `표본 크기 ${project.methodDesign.targetN}은 검정력 분석 기준에 부족할 수 있습니다`,
      evidence: `필요 n=${project.methodDesign.requiredN} (α=.05, 1–β=.80 기준)`,
      href: "/method",
      cta: "계산",
    });
  }
  if (dangerFindings.length > 0) {
    insights.push({
      tone: "danger",
      tag: "검증",
      title: `치명 지적 ${dangerFindings.length}건이 해결되지 않았습니다`,
      evidence: dangerFindings[0]?.title ?? "",
      href: "/validation",
      cta: "확인",
    });
  }

  type NextUp = { icon: IconName; label: string; href: string };
  const nextUps: NextUp[] = [];
  if (aiDrafts.length > 0) nextUps.push({ icon: "pen", label: "이어 쓰기", href: "/writing" });
  if (openFindings.length > 0)
    nextUps.push({ icon: "shield", label: `지적사항 ${openFindings.length}건 해결`, href: "/validation" });
  nextUps.push({ icon: "book", label: "연구 갭 재분석", href: "/literature" });
  if (missingDoi.length > 0)
    nextUps.push({ icon: "quote", label: `DOI 미확인 ${missingDoi.length}건`, href: "/references" });

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <Page eyebrow={today} title={project.name} description="설계·문헌·집필·검증 전 과정의 상태를 한 화면에서 봅니다. 다음에 할 일은 항상 맨 위에 있습니다.">
      <div className="grid g-main mb4">
        <Card>
          <CardHeader
            title="지금 이 논문의 상태"
            right={
              <Badge variant="info">
                <Icon name="grid" size={11} /> 자동 계산
              </Badge>
            }
          />
          <div className="row" style={{ gap: 28, alignItems: "flex-start" }}>
            <Gauge value={progress.overall} label="전체 진행" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <ProgressRow label="연구 설계" value={progress.design} tone={progress.design >= 100 ? "ok" : "default"} />
              <ProgressRow label="문헌 연구" value={progress.lit} tone={progress.lit >= 80 ? "ok" : "default"} />
              <ProgressRow label="논문 작성" value={progress.writing} tone="default" />
              <ProgressRow
                label="검토·검증"
                value={progress.validation}
                tone={openFindings.length > 0 ? "warn" : "ok"}
              />
              <ProgressRow label="제출 준비" value={progress.submit} tone="default" />
            </div>
          </div>
          <div className="mt5" style={{ paddingTop: 18, borderTop: "1px solid var(--hairline)" }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <Badge variant="warn" className="nowrap">
                다음 할 일
              </Badge>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: "var(--fs-md)" }}>
                  {nextSection
                    ? `${nextSection.number} ${nextSection.title} — 문단이 비어 있습니다`
                    : "다음 연구문제를 확정하세요"}
                </b>
                <p className="t2 fs-sm mb0 mt2">
                  {aiDrafts.length > 0
                    ? `AI가 작성한 초안 ${aiDrafts.length}건이 수락 대기 중입니다. 확인 후 반영하세요.`
                    : "문헌 연구에서 확보한 근거를 바탕으로 초안을 만들 수 있습니다."}
                </p>
              </div>
              <LinkButton href="/writing" variant="primary" className="nowrap">
                이어 쓰기 <Icon name="arrow" size={14} />
              </LinkButton>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="마감까지" level={3} />
          <div style={{ textAlign: "center", padding: "6px 0 14px" }}>
            <div className="disp" style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em" }}>
              {daysLeft ?? "—"}
              {daysLeft !== null ? <span style={{ fontSize: 20, color: "var(--t3)", marginLeft: 4 }}>일</span> : null}
            </div>
            <div className="t3 fs-cap mt2">
              {project.schedule.dueDate
                ? `${new Date(project.schedule.dueDate).toLocaleDateString("ko-KR")} · 심사본 제출`
                : "제출일이 설정되지 않았습니다"}
            </div>
          </div>
          <Steps
            className="mb4"
            items={[
              { title: "설계", state: stepState(progress.design) },
              { title: "문헌", state: stepState(progress.lit) },
              { title: "집필", state: stepState(progress.writing) },
              { title: "검증", state: stepState(progress.validation) },
              { title: "제출", state: stepState(progress.submit) },
            ]}
          />
          <DataList>
            {upcomingMilestones.length ? (
              upcomingMilestones.map((m) => {
                const d = daysUntil(m.due);
                return (
                  <DataItem
                    key={m.id}
                    lead={
                      <Badge variant={milestoneTone(d) === "mute" ? "mute" : milestoneTone(d)} className="nowrap">
                        {d !== null ? `D-${d}` : "—"}
                      </Badge>
                    }
                    title={m.title}
                    sub={m.conditions[0]}
                  />
                );
              })
            ) : (
              <p className="t3 fs-sm">등록된 마일스톤이 없습니다.</p>
            )}
          </DataList>
        </Card>
      </div>

      <div className="grid g4 mb4">
        <Kpi label="수집 문헌" value={project.literature.length} delta="서재에 담긴 문헌" tone="flat" />
        <Kpi
          label="인용 확정"
          value={project.literature.filter((l) => l.citedInBody > 0).length}
          delta="본문에 인용됨"
          tone="up"
        />
        <Kpi
          label="본문 분량"
          value={progress.humanChars.toLocaleString()}
          unit="자"
          delta={`목표 24,000자 대비 ${progress.writing}%`}
        />
        <Kpi
          label="미해결 지적"
          value={openFindings.length}
          delta="검증 엔진 발견 · 확인 필요"
          tone={openFindings.length > 0 ? "warn" : "flat"}
        />
      </div>

      <div className="grid g-wide">
        <Card>
          <CardHeader
            title="오늘의 AI 제안"
            level={3}
            right={<span className="fs-cap t3">근거가 있는 제안만 표시합니다</span>}
          />
          <DataList>
            {insights.length ? (
              insights.map((it) => (
                <DataItem
                  key={it.title}
                  lead={
                    <Badge variant={it.tone} className="nowrap">
                      {it.tag}
                    </Badge>
                  }
                  title={it.title}
                  sub={it.evidence}
                  action={
                    <LinkButton href={it.href} size="sm">
                      {it.cta}
                    </LinkButton>
                  }
                />
              ))
            ) : (
              <p className="t3 fs-sm">지금은 근거를 갖춘 새 제안이 없습니다.</p>
            )}
          </DataList>
        </Card>

        <Card>
          <CardHeader title="이어서 하기" level={3} />
          <div className="col" style={{ gap: 8 }}>
            {nextUps.map((it) => (
              <Link
                key={it.href + it.label}
                href={it.href}
                className="nav-item"
                style={{ border: "1px solid var(--hairline)" }}
              >
                <span className="ico">
                  <Icon name={it.icon} size={17} />
                </span>
                <span className="lbl">{it.label}</span>
                <Icon name="arrow" size={14} />
              </Link>
            ))}
          </div>
          <div className="mt5" style={{ paddingTop: 14, borderTop: "1px solid var(--hairline)" }}>
            <div className="row">
              <Badge variant="ok">
                <Icon name="check" size={12} /> 저장됨
              </Badge>
              <span className="fs-cap t3">{savedAgoLabel(project.savedAt)} · 자동</span>
            </div>
            <p className="fs-cap t3 mt2 mb0">모든 메뉴의 작업은 프로젝트 하나에 자동 저장됩니다.</p>
          </div>
        </Card>
      </div>
    </Page>
  );
}
