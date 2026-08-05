"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, LinkButton, type ButtonVariant } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/table";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/ui/icons";
import { Inspector, InspectorSection, PropertyRow, Toggle, usePageInspector } from "@/components/inspector";
import { useProjectStore } from "@/lib/project/store";
import type { ValidationFinding } from "@/lib/project/flow";

type Tab = "open" | "resolved" | "ignored";
type Severity = ValidationFinding["severity"];

const SEV_LABEL: Record<Severity, string> = { danger: "치명", warn: "주의", info: "권고" };
const SEV_BADGE: Record<Severity, BadgeVariant> = { danger: "danger", warn: "warn", info: "mute" };
const SEV_MEANING: Record<Severity, string> = {
  danger: "심사에서 반려될 수 있음",
  warn: "지적받을 가능성이 높음",
  info: "고치면 완성도가 오름",
};
const SEV_RANK: Record<Severity, number> = { danger: 0, warn: 1, info: 2 };

function actionVariant(kind: "primary" | "default" | "ghost"): ButtonVariant {
  return kind;
}

function formatRunAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ValidationPage() {
  const validationRuns = useProjectStore((s) => s.validationRuns);
  const outline = useProjectStore((s) => s.outline);
  const addValidationRun = useProjectStore((s) => s.addValidationRun);
  const resolveFinding = useProjectStore((s) => s.resolveFinding);
  const unresolveFinding = useProjectStore((s) => s.unresolveFinding);
  const ignoreFinding = useProjectStore((s) => s.ignoreFinding);
  const unignoreFinding = useProjectStore((s) => s.unignoreFinding);

  const [tab, setTab] = useState<Tab>("open");
  const [scope, setScope] = useState<"all" | "dangerOnly">("all");
  const [plagiarismOn, setPlagiarismOn] = useState(true);
  const [statsOn, setStatsOn] = useState(true);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [passedOpen, setPassedOpen] = useState(false);
  const [compareAt, setCompareAt] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);

  const latestRun = validationRuns[validationRuns.length - 1] ?? null;
  const allFindings = latestRun?.findings ?? [];

  const findings = useMemo(
    () =>
      allFindings.filter((f) => (plagiarismOn || f.category !== "표절") && (statsOn || f.category !== "통계 보고")),
    [allFindings, plagiarismOn, statsOn],
  );

  const dangerFindings = findings.filter((f) => f.severity === "danger" && !f.resolved && !f.ignored);
  const warnFindings = findings.filter((f) => f.severity === "warn" && !f.resolved && !f.ignored);
  const infoFindings = findings.filter((f) => f.severity === "info" && !f.resolved && !f.ignored);
  const passedFindings = findings.filter((f) => f.resolved);
  const ignoredFindings = findings.filter((f) => f.ignored);
  const openFindings = [...dangerFindings, ...warnFindings, ...infoFindings].sort(
    (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity],
  );

  const scopedOpen = scope === "dangerOnly" ? openFindings.filter((f) => f.severity === "danger") : openFindings;

  const listed = tab === "open" ? scopedOpen : tab === "resolved" ? passedFindings : ignoredFindings;

  function sectionLabel(sectionId?: string) {
    if (!sectionId) return null;
    const s = outline.sections.find((x) => x.id === sectionId);
    return s ? `${s.number}절` : null;
  }

  function handleAction(f: ValidationFinding, a: NonNullable<ValidationFinding["actions"]>[number]) {
    if (a.href) return;
    if (a.effect === "resolve") resolveFinding(f.rule);
    else if (a.effect === "ignore") ignoreFinding(f.rule);
    else setExpandedRule((r) => (r === f.rule ? null : f.rule));
  }

  async function recheck() {
    if (!latestRun) return;
    setRechecking(true);
    await new Promise((r) => setTimeout(r, 500));
    addValidationRun({ at: new Date().toISOString(), findings: latestRun.findings.map((f) => ({ ...f })) });
    setRechecking(false);
  }

  const compareRun = validationRuns.find((r) => r.at === compareAt) ?? null;
  const compareDelta = useMemo(() => {
    if (!compareRun || !latestRun) return null;
    const count = (run: typeof latestRun, sev: Severity) => run.findings.filter((f) => f.severity === sev && !f.resolved && !f.ignored).length;
    const dOld = count(compareRun, "danger");
    const dNew = count(latestRun, "danger");
    const tOld = compareRun.findings.filter((f) => !f.resolved && !f.ignored).length;
    const tNew = latestRun.findings.filter((f) => !f.resolved && !f.ignored).length;
    return { danger: dNew - dOld, total: tNew - tOld };
  }, [compareRun, latestRun]);

  usePageInspector(
    <Inspector title="검사 규칙" badge={{ label: `${findings.length}개`, variant: "info" }}>
      <InspectorSection title="규칙 세트">
        <PropertyRow label="학위 규정">
          <Select style={{ flex: 1 }} defaultValue="default">
            <option value="default">OO대 대학원 2025</option>
            <option value="journal">학술지 투고 규정</option>
          </Select>
        </PropertyRow>
        <PropertyRow label="표절 검사">
          <Toggle
            label="표절 검사 사용 여부"
            value={plagiarismOn ? "on" : "off"}
            onChange={(v) => setPlagiarismOn(v === "on")}
            options={[
              { value: "on", label: "켬" },
              { value: "off", label: "끔" },
            ]}
          />
        </PropertyRow>
        <PropertyRow label="통계 보고">
          <Toggle
            label="통계 보고 검사 사용 여부"
            value={statsOn ? "on" : "off"}
            onChange={(v) => setStatsOn(v === "on")}
            options={[
              { value: "on", label: "켬" },
              { value: "off", label: "끔" },
            ]}
          />
        </PropertyRow>
      </InspectorSection>

      <InspectorSection title="심각도 기준">
        {(["danger", "warn", "info"] as Severity[]).map((sev) => (
          <div className="row mb3" key={sev}>
            <Badge variant={SEV_BADGE[sev]} className="nowrap">
              {SEV_LABEL[sev]}
            </Badge>
            <span className="fs-cap t2">{SEV_MEANING[sev]}</span>
          </div>
        ))}
        <PropertyRow label="표시 범위">
          <Toggle
            label="지적사항 표시 범위"
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "전체" },
              { value: "dangerOnly", label: "치명만" },
            ]}
          />
        </PropertyRow>
      </InspectorSection>

      <InspectorSection title="검사 이력">
        {validationRuns.length === 0 ? (
          <p className="fs-cap t2 mb0">검사 이력이 없습니다.</p>
        ) : (
          <div className="list">
            {[...validationRuns].reverse().map((run) => {
              const isCurrent = run.at === latestRun?.at;
              const dangerCount = run.findings.filter((f) => f.severity === "danger" && !f.resolved && !f.ignored).length;
              const openCount = run.findings.filter((f) => !f.resolved && !f.ignored).length;
              return (
                <div className="li" key={run.at}>
                  <div className="t">
                    <b>{formatRunAt(run.at)}</b>
                    <span>
                      지적 {openCount}건 (치명 {dangerCount})
                    </span>
                  </div>
                  {isCurrent ? (
                    <Badge variant="warn">현재</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setCompareAt((v) => (v === run.at ? null : run.at))}>
                      비교
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {compareDelta ? (
          <p className="fs-cap t2 mt3 mb0">
            선택한 검사 대비 전체 {compareDelta.total > 0 ? "+" : ""}
            {compareDelta.total}건, 치명 {compareDelta.danger > 0 ? "+" : ""}
            {compareDelta.danger}건
          </p>
        ) : null}
      </InspectorSection>
    </Inspector>,
  );

  return (
    <Page
      eyebrow="4단계 · 검증 · 규칙 검사"
      title="규정에 걸리는 곳을 먼저 잡습니다"
      description="학위 규정·인용 형식·표절·통계 보고 규칙으로 검사하고, 심사에서 반려될 항목을 맨 위에 둡니다."
    >
      <div className="grid g4 mb4">
        <Kpi label="치명" value={dangerFindings.length} delta="반드시 수정" tone={dangerFindings.length > 0 ? "danger" : "flat"} />
        <Kpi label="주의" value={warnFindings.length} delta="심사 지적 예상" tone={warnFindings.length > 0 ? "warn" : "flat"} />
        <Kpi label="권고" value={infoFindings.length} delta="여유 있을 때" tone="flat" />
        <Kpi label="통과" value={passedFindings.length} delta={`${findings.length}개 규칙 중`} tone={passedFindings.length > 0 ? "up" : "flat"} />
      </div>

      <Card className="mb4">
        <CardHeader
          title="지적사항"
          right={
            <>
              <Segmented
                label="지적사항 상태"
                value={tab}
                onChange={setTab}
                items={[
                  { value: "open", label: `미해결 ${scopedOpen.length}` },
                  { value: "resolved", label: `해결됨 ${passedFindings.length}` },
                  { value: "ignored", label: `무시 ${ignoredFindings.length}` },
                ]}
              />
              <Button size="sm" variant="primary" onClick={recheck} disabled={rechecking || !latestRun}>
                <Icon name="check" size={13} /> {rechecking ? "검사 중…" : "다시 검사"}
              </Button>
            </>
          }
        />

        {listed.length === 0 ? (
          <EmptyState
            icon={<Icon name="check" size={26} />}
            title={tab === "open" ? "미해결 지적사항이 없습니다" : tab === "resolved" ? "아직 해결한 항목이 없습니다" : "무시한 항목이 없습니다"}
            description={tab === "open" ? "현재 조건에서는 검토할 항목이 없습니다." : undefined}
          />
        ) : (
          listed.map((f) => {
            const tone = f.severity === "danger" ? "danger" : f.severity === "warn" ? "warn" : undefined;
            return (
              <div
                key={f.rule}
                className="glass-flat mb3"
                style={{
                  padding: 16,
                  borderColor: tone ? `color-mix(in srgb, var(--${tone}) 30%, transparent)` : undefined,
                  background: tone === "danger" ? "color-mix(in srgb, var(--danger) 5%, transparent)" : undefined,
                }}
              >
                <div className="row mb3" style={{ flexWrap: "wrap", gap: 6 }}>
                  <Badge variant={SEV_BADGE[f.severity]}>{SEV_LABEL[f.severity]}</Badge>
                  <Badge variant="mute">{f.category}</Badge>
                  <span className="sp" />
                  <span className="fs-cap t3">
                    규칙 {f.rule}
                    {sectionLabel(f.sectionId) ? ` · ${sectionLabel(f.sectionId)}` : ""}
                  </span>
                </div>
                <b style={{ fontSize: "var(--fs-md)" }}>{f.title}</b>
                <p className="fs-sm t2 mt2 mb0" style={{ lineHeight: 1.75 }}>
                  {f.detail}
                </p>
                {expandedRule === f.rule && f.regulation ? (
                  <p className="fs-cap t3 mt2 mb0">근거: {f.regulation}</p>
                ) : null}
                <div className="row mt4" style={{ flexWrap: "wrap", gap: 6 }}>
                  {tab === "open" &&
                    (f.actions ?? []).map((a) =>
                      a.href ? (
                        <LinkButton key={a.label} href={a.href} variant={actionVariant(a.kind)} size="sm">
                          {a.label}
                        </LinkButton>
                      ) : (
                        <Button key={a.label} variant={actionVariant(a.kind)} size="sm" onClick={() => handleAction(f, a)}>
                          {a.label}
                        </Button>
                      ),
                    )}
                  {tab === "resolved" ? (
                    <Button size="sm" variant="ghost" onClick={() => unresolveFinding(f.rule)}>
                      미해결로 되돌리기
                    </Button>
                  ) : null}
                  {tab === "ignored" ? (
                    <Button size="sm" variant="ghost" onClick={() => unignoreFinding(f.rule)}>
                      다시 표시하기
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </Card>

      <Card>
        <CardHeader
          title="통과한 검사"
          level={3}
          right={
            <>
              <span className="fs-cap t3">{passedFindings.length}개 · 접어 두었습니다</span>
              <Button size="sm" variant="ghost" onClick={() => setPassedOpen((v) => !v)}>
                {passedOpen ? "접기" : "펼치기"}
              </Button>
            </>
          }
        />
        {passedOpen ? (
          passedFindings.length ? (
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {passedFindings.map((f) => (
                <Badge key={f.rule} variant="ok">
                  <Icon name="check" size={11} /> {f.title}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="fs-sm t2 mb0">통과한 항목이 없습니다.</p>
          )
        ) : null}
      </Card>
    </Page>
  );
}
