"use client";

import { useEffect, useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { IconButton, LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input, Select } from "@/components/ui/form";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  EvidenceCard,
  NextStepLinks,
  Toggle,
  usePageInspector,
} from "@/components/inspector";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/lib/project/store";
import { computeProgress, daysUntil, MENU_FLOW, type Milestone } from "@/lib/project/flow";

const MENU_LABEL: Record<string, string> = {
  research: "연구 설계",
  method: "연구 방법",
  structure: "논문유형구조",
  writing: "논문 작성",
  analyzer: "논문 분석",
  validation: "검토·검증",
  critique: "논문 크리틱",
  schedule: "논문 일정",
};

const MILESTONE_TYPES = ["보고·심사", "집필", "행정", "데이터"];

function milestoneTone(days: number | null): "danger" | "warn" | "mute" {
  if (days === null) return "mute";
  if (days <= 5) return "danger";
  if (days <= 14) return "warn";
  return "mute";
}

type LaneTone = "ok" | "warn" | "danger" | "default" | "muted";

function Lane({
  label,
  left,
  width,
  text,
  tone,
}: {
  label: string;
  left: number;
  width: number;
  text: string;
  tone: LaneTone;
}) {
  return (
    <div className="prow" style={{ gridTemplateColumns: "120px 1fr", gap: 14 }}>
      <span className="n">{label}</span>
      <div style={{ position: "relative", height: 26, background: "var(--glass-1)", borderRadius: 7 }}>
        <div
          className={cn("bar", tone !== "default" && tone !== "muted" && tone)}
          style={{
            position: "absolute",
            left: `${left}%`,
            width: `${width}%`,
            top: 4,
            bottom: 4,
            height: "auto",
            borderRadius: 5,
          }}
        >
          <i
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 8px",
              height: "100%",
              width: "100%",
              borderRadius: 5,
              background: tone === "muted" ? "var(--glass-2)" : undefined,
            }}
          >
            <span className="fs-cap" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              {text}
            </span>
          </i>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const project = useProjectStore();
  const seedIfEmpty = useProjectStore((s) => s.seedIfEmpty);
  const upsertMilestone = useProjectStore((s) => s.upsertMilestone);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const [view, setView] = useState<"timeline" | "list">("timeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const progress = useMemo(() => computeProgress(project), [project]);
  const daysLeft = daysUntil(project.schedule.dueDate);

  const milestones = useMemo(
    () => [...project.schedule.milestones].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()),
    [project.schedule.milestones],
  );
  const openMilestones = milestones.filter((m) => !m.done);

  const selected = milestones.find((m) => m.id === selectedId) ?? openMilestones[0] ?? milestones[0] ?? null;

  const months = useMemo(() => {
    const arr: string[] = [];
    const d = new Date();
    for (let i = 0; i < 5; i++) {
      arr.push(`${d.getMonth() + 1}월`);
      d.setMonth(d.getMonth() + 1);
    }
    return arr;
  }, []);

  const lastRun = project.validationRuns[project.validationRuns.length - 1];
  const openFindings = lastRun?.findings.filter((f) => !f.resolved) ?? [];
  const underpowered =
    project.methodDesign.requiredN > 0 && project.methodDesign.targetN < project.methodDesign.requiredN;

  const irbMilestone = milestones.find((m) => m.title.includes("IRB"));
  const irbDays = irbMilestone ? daysUntil(irbMilestone.due) : null;

  const submitLabel = project.schedule.dueDate
    ? new Date(project.schedule.dueDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
    : "미정";

  const lanes: { label: string; left: number; width: number; text: string; tone: LaneTone }[] = [
    {
      label: "연구 설계",
      left: 0,
      width: 22,
      text: progress.design >= 100 ? "완료" : `${progress.design}%`,
      tone: progress.design >= 100 ? "ok" : "default",
    },
    {
      label: "문헌 연구",
      left: 8,
      width: 36,
      text: `${progress.lit}%`,
      tone: progress.lit >= 80 ? "ok" : "default",
    },
    {
      label: "IRB 심의",
      left: 34,
      width: 14,
      text: irbDays !== null ? `D-${irbDays}` : project.methodDesign.irb || "예정",
      tone: irbDays !== null && irbDays <= 14 ? "warn" : "muted",
    },
    {
      label: "데이터 수집",
      left: 44,
      width: 24,
      text: underpowered ? `목표 n=${project.methodDesign.targetN} (부족)` : `목표 n=${project.methodDesign.targetN}`,
      tone: underpowered ? "warn" : "default",
    },
    {
      label: "집필",
      left: 30,
      width: 50,
      text: `${progress.writing}%`,
      tone: "default",
    },
    {
      label: "검증·수정",
      left: 70,
      width: 18,
      text: openFindings.length > 0 ? `${openFindings.length}건 남음` : progress.validation >= 100 ? "완료" : "예정",
      tone: openFindings.length > 0 ? "warn" : progress.validation >= 100 ? "ok" : "muted",
    },
    {
      label: "제출",
      left: 88,
      width: 8,
      text: submitLabel,
      tone: daysLeft !== null && daysLeft <= 14 ? "danger" : "default",
    },
  ];

  const risk = underpowered
    ? {
        title: "표본 수집과 집필 일정이 겹칠 수 있습니다",
        body: `목표 표본(${project.methodDesign.targetN}명)이 검정력 분석 기준(${project.methodDesign.requiredN}명)에 못 미칩니다. 표본을 늘리면 수집 기간이 길어져 집필 가능 기간이 줄어듭니다.`,
        source: "연구 방법 · 표본 크기 기준",
        href: "/method",
        cta: "표본 계산 확인",
      }
    : openFindings.length > 0
      ? {
          title: `검증 지적 ${openFindings.length}건이 제출 전에 해결되어야 합니다`,
          body: openFindings[0]?.title ?? "",
          source: "검토·검증 · 최근 실행 결과",
          href: "/validation",
          cta: "지적 확인",
        }
      : null;

  function addCondition() {
    if (!selected) return;
    const text = prompt("추가할 완료 조건을 입력하세요");
    if (!text || !text.trim()) return;
    upsertMilestone({ ...selected, conditions: [...selected.conditions, text.trim()] });
  }

  function addMilestone() {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const m: Milestone = {
      id: `ms-${Date.now()}`,
      title: "새 마일스톤",
      due: due.toISOString(),
      type: "행정",
      conditions: [],
      linkedMenu: "schedule",
    };
    upsertMilestone(m);
    setSelectedId(m.id);
  }

  usePageInspector(
    selected ? (
      <Inspector title="마일스톤" badge={{ label: `${openMilestones.length}건 예정`, variant: "info" }}>
        <InspectorSection title="선택 항목">
          <PropertyRow label="제목">
            <Input
              value={selected.title}
              onChange={(e) => upsertMilestone({ ...selected, title: e.target.value })}
            />
          </PropertyRow>
          <PropertyRow label="기한">
            <Input
              type="date"
              value={selected.due.slice(0, 10)}
              onChange={(e) => upsertMilestone({ ...selected, due: new Date(e.target.value).toISOString() })}
            />
          </PropertyRow>
          <PropertyRow label="유형">
            <Select
              style={{ flex: 1 }}
              value={selected.type}
              onChange={(e) => upsertMilestone({ ...selected, type: e.target.value })}
            >
              {MILESTONE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow label="연동 메뉴">
            <Select
              style={{ flex: 1 }}
              value={selected.linkedMenu}
              onChange={(e) => upsertMilestone({ ...selected, linkedMenu: e.target.value })}
            >
              {Object.keys(MENU_FLOW).map((key) => (
                <option key={key} value={key}>
                  {MENU_LABEL[key] ?? key}
                </option>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow label="완료">
            <Toggle
              label="완료 여부"
              value={selected.done ? "done" : "open"}
              onChange={(v) => upsertMilestone({ ...selected, done: v === "done" })}
              options={[
                { value: "open", label: "진행 중" },
                { value: "done", label: "완료" },
              ]}
            />
          </PropertyRow>
        </InspectorSection>

        <InspectorSection title="이 마일스톤의 조건">
          <p className="fs-cap t2 mb3">아래 항목이 모두 끝나야 완료로 표시됩니다.</p>
          {selected.conditions.length ? (
            selected.conditions.map((c, i) => (
              <div className="row mb3" key={`${c}-${i}`}>
                <span className="t3">
                  <Icon name="check" size={14} />
                </span>
                <span className="fs-cap">{c}</span>
              </div>
            ))
          ) : (
            <p className="fs-cap t3 mb3">등록된 조건이 없습니다.</p>
          )}
          <button type="button" className="btn btn-sm mt2" style={{ width: "100%" }} onClick={addCondition}>
            <Icon name="plus" size={13} /> 조건 추가
          </button>
        </InspectorSection>

        <InspectorSection title="일정 위험">
          {risk ? (
            <>
              <EvidenceCard title={risk.title} body={risk.body} source={risk.source} />
              <NextStepLinks items={[{ href: risk.href, label: risk.cta, icon: "arrow" }]} />
            </>
          ) : (
            <p className="fs-cap t2">현재 감지된 일정 위험이 없습니다.</p>
          )}
        </InspectorSection>
      </Inspector>
    ) : null,
  );

  return (
    <Page
      eyebrow="현재 상황 · 일정"
      title="계획과 실제 진행을 같은 축에 둡니다"
      description="마일스톤마다 완료 조건을 걸어 두면, 다른 메뉴의 작업이 끝날 때 일정이 스스로 갱신됩니다."
    >
      <div className="grid g-main mb4">
        <Card>
          <CardHeader
            title="전체 일정"
            right={
              <Segmented
                label="일정 보기"
                value={view}
                onChange={setView}
                items={[
                  { value: "timeline", label: "타임라인" },
                  { value: "list", label: "목록" },
                ]}
              />
            }
          />
          {view === "timeline" ? (
            <>
              <div
                className="row mb4"
                style={{ justifyContent: "space-between", padding: "0 0 6px 134px", borderBottom: "1px solid var(--hairline)" }}
              >
                {months.map((m) => (
                  <span className="fs-cap t3" key={m}>
                    {m}
                  </span>
                ))}
              </div>
              {lanes.map((lane) => (
                <Lane key={lane.label} {...lane} />
              ))}
            </>
          ) : (
            <div className="list">
              {milestones.map((m) => {
                const d = daysUntil(m.due);
                return (
                  <div className="li" key={m.id}>
                    <Badge variant={m.done ? "ok" : milestoneTone(d)} className="nowrap">
                      {m.done ? "완료" : d !== null ? `D-${d}` : "—"}
                    </Badge>
                    <div className="t">
                      <b>{m.title}</b>
                      <span>
                        {m.type} · {MENU_LABEL[m.linkedMenu] ?? m.linkedMenu}
                        {m.conditions.length ? ` · 조건 ${m.conditions.length}개` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {risk ? (
            <div className="mt5" style={{ paddingTop: 16, borderTop: "1px solid var(--hairline)" }}>
              <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                <span style={{ color: "var(--warn)" }}>
                  <Icon name="alert" size={18} />
                </span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: "var(--fs-md)" }}>{risk.title}</b>
                  <p className="fs-sm t2 mt2 mb0">{risk.body}</p>
                </div>
                <LinkButton href={risk.href} size="sm" className="nowrap">
                  {risk.cta}
                </LinkButton>
              </div>
            </div>
          ) : null}
        </Card>

        <section className="col">
          <Card style={{ textAlign: "center" }}>
            <CardHeader title="제출까지" level={3} className="justify-center" />
            <div className="disp" style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em" }}>
              {daysLeft ?? "—"}
            </div>
            <div className="t3 fs-cap mt2">
              {daysLeft !== null ? "일 남음" : "제출일 미설정"}
              {project.schedule.dueDate ? ` · ${new Date(project.schedule.dueDate).toLocaleDateString("ko-KR")}` : ""}
            </div>
            <div className="bar mt4">
              <i style={{ width: `${progress.overall}%` }} />
            </div>
            <p className="fs-cap t2 mt3 mb0">
              전체 일정의 <b style={{ color: "var(--t1)" }}>{progress.overall}%</b> 지점입니다. 진행률({progress.overall}%)과
              일치합니다.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="다가오는 마일스톤"
              level={3}
              right={
                <IconButton label="마일스톤 추가" onClick={addMilestone}>
                  <Icon name="plus" size={13} />
                </IconButton>
              }
            />
            <div className="list">
              {openMilestones.length ? (
                openMilestones.map((m) => {
                  const d = daysUntil(m.due);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="li"
                      style={{
                        width: "100%",
                        border: 0,
                        background: selected?.id === m.id ? "var(--glass-1)" : "transparent",
                        cursor: "pointer",
                        font: "inherit",
                        textAlign: "left",
                      }}
                      onClick={() => setSelectedId(m.id)}
                    >
                      <Badge variant={milestoneTone(d)} className="nowrap">
                        {d !== null ? `D-${d}` : "—"}
                      </Badge>
                      <div className="t">
                        <b>{m.title}</b>
                        <span>{m.conditions[0] ?? m.type}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="t3 fs-sm">등록된 마일스톤이 없습니다.</p>
              )}
            </div>
          </Card>
        </section>
      </div>
    </Page>
  );
}
