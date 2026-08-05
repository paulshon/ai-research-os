"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Table } from "@/components/ui/table";
import { Icon, type IconName } from "@/components/ui/icons";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  EvidenceCard,
  Toggle,
  usePageInspector,
} from "@/components/inspector";
import { useGemini } from "@/hooks/use-gemini";
import { useProjectStore } from "@/lib/project/store";
import { daysUntil, type MethodDesign } from "@/lib/project/flow";
import { minSampleSizeF2, achievedPower } from "@/lib/stats/power";

const METHOD_TYPES: { id: "quant" | "qual" | "mixed"; icon: IconName; title: string; desc: string }[] = [
  { id: "quant", icon: "chart", title: "양적 연구", desc: "설문·통계 분석으로 변수 간 관계를 검증합니다. 조절·매개 가설 검증에 적합합니다." },
  { id: "qual", icon: "chat", title: "질적 연구", desc: "면담·관찰로 현상의 의미를 해석합니다. 과정과 맥락을 볼 때 적합합니다." },
  { id: "mixed", icon: "layers", title: "혼합 연구", desc: "양적 결과를 질적 자료로 보완합니다. 기간·비용이 가장 큽니다." },
];

function statusFor(hasValue: boolean, warn = false): { variant: BadgeVariant; text: string } {
  if (warn) return { variant: "warn", text: "수정 권장" };
  return hasValue ? { variant: "ok", text: "확정" } : { variant: "mute", text: "미정" };
}

export default function MethodPage() {
  const project = useProjectStore();
  const setMethodDesign = useProjectStore((s) => s.setMethodDesign);
  const upsertBlock = useProjectStore((s) => s.upsertBlock);
  const { generate, loading } = useGemini();
  const { methodDesign, outline } = project;

  const [editingField, setEditingField] = useState<keyof MethodDesign | null>(null);
  const [editValue, setEditValue] = useState("");
  const [draftState, setDraftState] = useState<"idle" | "loading" | "done">("idle");

  const [f2, setF2] = useState(0.15);
  const [alpha, setAlpha] = useState(0.05);
  const [powerTarget, setPowerTarget] = useState(0.8);
  const [predictors, setPredictors] = useState(5);

  const underpowered = methodDesign.requiredN > 0 && methodDesign.targetN < methodDesign.requiredN;

  const computedMinN = useMemo(
    () => minSampleSizeF2({ f2, alpha, power: powerTarget, predictors }),
    [f2, alpha, powerTarget, predictors],
  );

  const chart = useMemo(() => {
    const anchor = Math.max(computedMinN ?? 0, methodDesign.targetN, predictors + 10);
    const nMin = predictors + 2;
    const nMax = Math.round(anchor * 1.4);
    const steps = 28;
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const n = Math.round(nMin + (i / steps) * (nMax - nMin));
      const p = achievedPower({ f2, alpha, n, predictors }) ?? 0;
      return { n, p: p / 100 };
    });
    const x = (n: number) => 30 + ((n - nMin) / (nMax - nMin)) * 220;
    const y = (p: number) => 112 - p * 100;
    return {
      nMin,
      nMax,
      x,
      y,
      poly: points.map((pt) => `${x(pt.n).toFixed(1)},${y(pt.p).toFixed(1)}`).join(" "),
      targetPower: (achievedPower({ f2, alpha, n: methodDesign.targetN, predictors }) ?? 0) / 100,
    };
  }, [f2, alpha, predictors, computedMinN, methodDesign.targetN]);

  function beginEdit(field: keyof MethodDesign, initial: string) {
    setEditingField(field);
    setEditValue(initial);
  }

  function commitEdit() {
    if (!editingField) return;
    if (editingField === "targetN") {
      setMethodDesign({ targetN: Math.max(0, Number(editValue) || 0) });
    } else if (editingField === "instruments") {
      setMethodDesign({
        instruments: editValue
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } else {
      setMethodDesign({ [editingField]: editValue } as Partial<MethodDesign>);
    }
    setEditingField(null);
  }

  async function generateDraft() {
    setDraftState("loading");
    try {
      const prompt = `연구 유형: ${methodDesign.type ?? "미정"} · 모집단: ${methodDesign.population || "미정"} · 표집: ${methodDesign.sampling || "미정"} · 표본 크기: ${methodDesign.targetN}명(필요 ${methodDesign.requiredN}명) · 측정도구: ${methodDesign.instruments.join(", ") || "미정"} · 분석 방법: ${methodDesign.analysis || "미정"}`;
      const text = await generate({
        systemInstruction:
          "당신은 학술 논문의 연구방법(4장) 집필을 돕는 전문가입니다. 주어진 설계 정보를 바탕으로 모집단·표집·절차를 설명하는 학술적 문단 하나를 한국어로 작성하세요. 다른 설명 없이 문단만 출력하세요.",
        userText: prompt,
        temperature: 0.4,
      });
      const clean = text.trim();
      const targetSection = outline.sections.find((s) => s.number.startsWith("4")) ?? outline.sections[0];
      if (clean && targetSection) {
        upsertBlock({
          id: `blk-method-${Date.now()}`,
          sectionId: targetSection.id,
          origin: "ai",
          accepted: false,
          content: clean,
          sources: ["연구 방법 설계서"],
        });
      }
      setDraftState("done");
    } catch {
      setDraftState("idle");
    }
  }

  const methodMilestones = project.schedule.milestones.filter((m) => m.linkedMenu === "method");

  const rows: {
    field: keyof MethodDesign;
    label: string;
    content: string;
    sub?: string;
    badge?: { variant: BadgeVariant; text: string };
    status: { variant: BadgeVariant; text: string };
    type: "text" | "number" | "textarea";
  }[] = [
    {
      field: "population",
      label: "모집단",
      content: methodDesign.population || "미정",
      status: statusFor(!!methodDesign.population),
      type: "text",
    },
    {
      field: "sampling",
      label: "표집 방법",
      content: methodDesign.sampling || "미정",
      status: statusFor(!!methodDesign.sampling),
      type: "text",
    },
    {
      field: "targetN",
      label: "표본 크기",
      content: `${methodDesign.targetN}명`,
      sub: methodDesign.requiredN > 0 ? `검정력 분석 기준 필요 ${methodDesign.requiredN}명` : undefined,
      badge: underpowered ? { variant: "warn", text: `필요 ${methodDesign.requiredN}명` } : undefined,
      status: statusFor(methodDesign.targetN > 0, underpowered),
      type: "number",
    },
    {
      field: "instruments",
      label: "측정도구",
      content: methodDesign.instruments.length ? `${methodDesign.instruments.length}개 척도` : "미정",
      sub: methodDesign.instruments[0],
      status: statusFor(methodDesign.instruments.length > 0),
      type: "textarea",
    },
    {
      field: "analysis",
      label: "분석 방법",
      content: methodDesign.analysis || "미정",
      status: statusFor(!!methodDesign.analysis),
      type: "text",
    },
    {
      field: "irb",
      label: "윤리심의(IRB)",
      content: methodDesign.irb || "미정",
      status: methodDesign.irb ? { variant: "info", text: "계획" } : { variant: "mute", text: "미정" },
      type: "text",
    },
  ];

  const irbType = methodDesign.irb.includes("정규") ? "정규심의" : methodDesign.irb.includes("면제") ? "면제" : "신속심의";
  const consentNeeded = !methodDesign.irb.includes("불필요");
  const irbMilestone = project.schedule.milestones.find((m) => m.title.includes("IRB"));
  const irbDays = irbMilestone ? daysUntil(irbMilestone.due) : null;
  const unresolvedDocs = methodMilestones.filter((m) => !m.done).length;

  function setIrbType(v: string) {
    setMethodDesign({ irb: `${v} · ${consentNeeded ? "동의서 필요" : "동의서 불필요"}` });
  }
  function setConsent(v: "yes" | "no") {
    setMethodDesign({ irb: `${irbType} · ${v === "yes" ? "동의서 필요" : "동의서 불필요"}` });
  }

  usePageInspector(
    <Inspector title="설계 파라미터" badge={{ label: methodDesign.type ?? "미정", variant: "info" }}>
      <InspectorSection title="검정력 분석">
        <PropertyRow label="효과크기 f²">
          <Input type="number" step="0.01" min={0} value={f2} onChange={(e) => setF2(Number(e.target.value) || 0)} />
        </PropertyRow>
        <PropertyRow label="유의수준 α">
          <Input type="number" step="0.01" min={0} max={1} value={alpha} onChange={(e) => setAlpha(Number(e.target.value) || 0)} />
        </PropertyRow>
        <PropertyRow label="검정력 1–β">
          <Input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={powerTarget}
            onChange={(e) => setPowerTarget(Number(e.target.value) || 0)}
          />
        </PropertyRow>
        <PropertyRow label="예측변인">
          <Input type="number" min={1} value={predictors} onChange={(e) => setPredictors(Math.max(1, Number(e.target.value) || 1))} />
        </PropertyRow>
        <div
          className="mt3"
          style={{ padding: 12, borderRadius: "var(--r-sm)", background: "rgba(232,184,75,.07)", border: "1px solid rgba(232,184,75,.22)" }}
        >
          <div className="fs-cap t2">필요 최소 표본</div>
          <div className="disp" style={{ fontSize: 26, fontWeight: 800, color: "var(--warn)", lineHeight: 1.2 }}>
            {computedMinN !== null ? `${computedMinN}명` : "계산 불가"}
          </div>
          {computedMinN !== null ? (
            <div className="fs-cap t2 mt2">
              현재 계획 {methodDesign.targetN}명 ·{" "}
              {methodDesign.targetN >= computedMinN ? (
                <b style={{ color: "var(--ok)" }}>충족</b>
              ) : (
                <b style={{ color: "var(--warn)" }}>{computedMinN - methodDesign.targetN}명 부족</b>
              )}
            </div>
          ) : null}
        </div>
        {computedMinN !== null && methodDesign.targetN < computedMinN ? (
          <Button size="sm" variant="primary" className="mt3" style={{ width: "100%" }} onClick={() => setMethodDesign({ targetN: computedMinN })}>
            계획 표본을 {computedMinN}명으로 수정
          </Button>
        ) : null}
      </InspectorSection>

      <InspectorSection title="측정도구">
        {methodDesign.instruments.length ? (
          methodDesign.instruments.map((ins, i) => {
            const m = ins.match(/^(.*?)\s*\((.*)\)$/);
            return <EvidenceCard key={i} title={m ? m[1] : ins} body={m ? m[2] : "세부 정보가 등록되지 않았습니다."} />;
          })
        ) : (
          <p className="fs-cap t2">등록된 측정도구가 없습니다.</p>
        )}
        <LinkButton href="/literature" size="sm" style={{ width: "100%" }}>
          <Icon name="search" size={13} /> 조절변인 도구 찾기
        </LinkButton>
      </InspectorSection>

      <InspectorSection title="윤리 · IRB">
        <PropertyRow label="심의 유형">
          <Select style={{ flex: 1 }} value={irbType} onChange={(e) => setIrbType(e.target.value)}>
            <option value="신속심의">신속심의</option>
            <option value="정규심의">정규심의</option>
            <option value="면제">면제</option>
          </Select>
        </PropertyRow>
        <PropertyRow label="동의서">
          <Toggle
            label="동의서 필요 여부"
            value={consentNeeded ? "yes" : "no"}
            onChange={setConsent}
            options={[
              { value: "yes", label: "필요" },
              { value: "no", label: "불필요" },
            ]}
          />
        </PropertyRow>
        {unresolvedDocs > 0 ? (
          <div className="row mt3">
            <span style={{ color: "var(--warn)" }}>
              <Icon name="alert" size={14} />
            </span>
            <span className="fs-cap" style={{ color: "var(--warn)" }}>
              {irbDays !== null ? `제출 D-${irbDays} · ` : ""}서류 {unresolvedDocs}건 미작성
            </span>
          </div>
        ) : (
          <p className="fs-cap t2 mt3">제출 서류가 모두 준비되었습니다.</p>
        )}
      </InspectorSection>
    </Inspector>,
  );

  return (
    <Page
      eyebrow="1단계 · 연구 설계"
      title="방법을 정하면 4장이 채워집니다"
      description="설계 유형을 고르면 표집·측정·분석·윤리 항목이 한 장의 설계서로 정리되고, 검정력까지 계산합니다."
    >
      <div className="grid g3 mb4">
        {METHOD_TYPES.map((m) => {
          const selected = methodDesign.type === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className="glass card"
              style={{
                textAlign: "left",
                cursor: "pointer",
                borderColor: selected ? "color-mix(in srgb, var(--accent) 34%, transparent)" : undefined,
                background: selected ? "color-mix(in srgb, var(--accent) 7%, transparent)" : undefined,
              }}
              onClick={() => setMethodDesign({ type: m.id })}
            >
              <div className="row mb3">
                <Icon name={m.icon} size={18} />
                <b className="disp" style={{ fontSize: "var(--fs-lg)" }}>
                  {m.title}
                </b>
                <span className="sp" />
                {selected ? <Badge variant="info">선택됨</Badge> : null}
              </div>
              <p className="fs-sm t2 mb0">{m.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="grid g-wide">
        <Card>
          <CardHeader
            title={`${METHOD_TYPES.find((m) => m.id === methodDesign.type)?.title ?? "연구"} 설계서`}
            right={
              <>
                {underpowered ? (
                  <Badge variant="warn">
                    <Icon name="alert" size={11} /> 확인 필요 1건
                  </Badge>
                ) : null}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={generateDraft}
                  disabled={loading || draftState === "loading"}
                >
                  <Icon name="spark" size={13} /> {draftState === "loading" ? "생성 중…" : "4장 초안 생성"}
                </Button>
              </>
            }
          />
          <div style={{ overflowX: "auto" }}>
            <Table>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>항목</th>
                  <th>내용</th>
                  <th style={{ width: 96 }}>상태</th>
                  <th style={{ width: 64 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.field}>
                    <td className="t3">{r.label}</td>
                    <td>
                      {editingField === r.field ? (
                        <div className="row" style={{ gap: 6 }}>
                          {r.type === "textarea" ? (
                            <Textarea
                              rows={3}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{ flex: 1 }}
                            />
                          ) : (
                            <Input
                              type={r.type === "number" ? "number" : "text"}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{ flex: 1 }}
                            />
                          )}
                          <Button size="sm" variant="primary" onClick={commitEdit}>
                            저장
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                            취소
                          </Button>
                        </div>
                      ) : (
                        <>
                          <b>{r.content}</b>
                          {r.badge ? (
                            <>
                              {" "}
                              <Badge variant={r.badge.variant}>{r.badge.text}</Badge>
                            </>
                          ) : null}
                          {r.sub ? (
                            <>
                              <br />
                              <span className="fs-cap t3">{r.sub}</span>
                            </>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td>
                      <Badge variant={r.status.variant}>{r.status.text}</Badge>
                    </td>
                    <td>
                      {editingField === r.field ? null : (
                        <Button
                          size="sm"
                          variant={r.status.variant === "warn" ? "default" : "ghost"}
                          onClick={() =>
                            beginEdit(
                              r.field,
                              r.field === "instruments"
                                ? methodDesign.instruments.join("\n")
                                : String(methodDesign[r.field] ?? ""),
                            )
                          }
                        >
                          {r.status.variant === "warn" ? "수정" : "편집"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="row mt5">
            <LinkButton href="/structure">
              <Icon name="layers" size={14} /> 유형별 4장 규범 보기
            </LinkButton>
            <LinkButton href="/writing" variant="primary">
              <Icon name="pen" size={14} /> 4장 집필 시작
            </LinkButton>
          </div>
        </Card>

        <section className="col">
          <Card>
            <CardHeader title="표본 부족 시뮬레이션" level={3} />
            <svg viewBox="0 0 260 140" style={{ width: "100%", height: "auto" }} role="img" aria-label="표본 크기별 검정력 곡선">
              <line x1={30} y1={112} x2={250} y2={112} stroke="var(--stroke)" />
              <line x1={30} y1={12} x2={30} y2={112} stroke="var(--stroke)" />
              <line
                x1={30}
                y1={chart.y(powerTarget)}
                x2={250}
                y2={chart.y(powerTarget)}
                stroke="var(--warn)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text x={246} y={chart.y(powerTarget) - 4} textAnchor="end" fontSize={9.5} fill="var(--warn)" fontFamily="NanumGothic">
                {Math.round(powerTarget * 100)}% 기준
              </text>
              <polyline points={chart.poly} fill="none" stroke="var(--accent)" strokeWidth={2.2} />
              <circle cx={chart.x(methodDesign.targetN)} cy={chart.y(chart.targetPower)} r={4.5} fill={underpowered ? "var(--warn)" : "var(--ok)"} />
              <text
                x={chart.x(methodDesign.targetN)}
                y={chart.y(chart.targetPower) + 16}
                textAnchor="middle"
                fontSize={9.5}
                fill={underpowered ? "var(--warn)" : "var(--ok)"}
                fontFamily="NanumGothic"
              >
                {methodDesign.targetN} ({chart.targetPower.toFixed(2)})
              </text>
              {computedMinN !== null ? (
                <>
                  <circle cx={chart.x(computedMinN)} cy={chart.y(powerTarget)} r={4.5} fill="var(--ok)" />
                  <text x={chart.x(computedMinN) + 6} y={chart.y(powerTarget) - 8} fontSize={9.5} fill="var(--ok)" fontFamily="NanumGothic">
                    {computedMinN} ({powerTarget.toFixed(2)})
                  </text>
                </>
              ) : null}
              <text x={140} y={132} textAnchor="middle" fontSize={9.5} fill="var(--t3)" fontFamily="NanumGothic">
                표본 크기 →
              </text>
            </svg>
            <p className="fs-cap t2 mt3 mb0">
              {underpowered ? (
                <>
                  {methodDesign.targetN}명으로 진행하면 목표한 효과를 발견하지 못할 확률이{" "}
                  <b style={{ color: "var(--warn)" }}>{Math.round((1 - chart.targetPower) * 100)}%</b>입니다.
                </>
              ) : (
                <>현재 계획 표본은 목표 검정력을 충족합니다.</>
              )}
            </p>
          </Card>

          <Card>
            <CardHeader title="제출 서류" level={3} />
            <div className="list">
              {methodMilestones.length ? (
                methodMilestones.map((m) => {
                  const d = daysUntil(m.due);
                  return (
                    <div className="li" key={m.id}>
                      {m.done ? (
                        <Icon name="check" size={15} />
                      ) : (
                        <span style={{ color: "var(--warn)" }}>
                          <Icon name="alert" size={15} />
                        </span>
                      )}
                      <div className="t">
                        <b>{m.title}</b>
                        <span>{m.done ? "완료" : d !== null ? `미작성 · D-${d}` : "미작성"}</span>
                      </div>
                      {!m.done ? (
                        <LinkButton href="/schedule" size="sm">
                          확인
                        </LinkButton>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="t3 fs-sm">연동된 제출 서류가 없습니다.</p>
              )}
            </div>
          </Card>
        </section>
      </div>
    </Page>
  );
}
