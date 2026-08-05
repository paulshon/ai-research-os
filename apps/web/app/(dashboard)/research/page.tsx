"use client";

import { useEffect, useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card, CardHeader, CardSub } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { Steps, type StepState } from "@/components/ui/steps";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  EvidenceCard,
  ConfidenceMeter,
  NextStepLinks,
  Toggle,
  Slider,
  usePageInspector,
} from "@/components/inspector";
import { useGemini } from "@/hooks/use-gemini";
import { useProjectStore } from "@/lib/project/store";
import type { RqCandidate } from "@/lib/project/flow";

const STAGE_OPTIONS = ["주제 탐색", "연구문제 도출", "개념 틀", "가설 수립", "설계 확정"] as const;

function confidenceTone(v: number): "ok" | "warn" | "danger" {
  if (v >= 70) return "ok";
  if (v >= 40) return "warn";
  return "danger";
}

export default function ResearchPage() {
  const project = useProjectStore();
  const seedIfEmpty = useProjectStore((s) => s.seedIfEmpty);
  const adoptRq = useProjectStore((s) => s.adoptRq);
  const addRqCandidate = useProjectStore((s) => s.addRqCandidate);
  const updateRqCandidate = useProjectStore((s) => s.updateRqCandidate);
  const setMethodDesign = useProjectStore((s) => s.setMethodDesign);
  const { generate, loading } = useGemini();

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [manualText, setManualText] = useState("");
  const [constraint, setConstraint] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [stage, setStage] = useState<(typeof STAGE_OPTIONS)[number]>("연구문제 도출");
  const [field, setField] = useState("경영학 · 조직행동");
  const [creativity, setCreativity] = useState(35);
  const [count, setCount] = useState(5);
  const [requireEvidence, setRequireEvidence] = useState<"required" | "optional">("required");
  const [language, setLanguage] = useState<"ko" | "en">("ko");

  const { researchDesign, methodDesign } = project;
  const adopted = researchDesign.rqCandidates.find((c) => c.id === researchDesign.adoptedRqId) ?? null;
  const others = researchDesign.rqCandidates.filter((c) => c.id !== researchDesign.adoptedRqId);

  const stepStates = useMemo(() => {
    const hasTopic = !!researchDesign.topic;
    const hasRq = !!researchDesign.adoptedRqId;
    const hasConcept = !!researchDesign.conceptFramework;
    const hasHypo = researchDesign.hypotheses.length > 0;
    const hasDesign = !!methodDesign.type;
    const st = (done: boolean, now: boolean): StepState => (done ? "done" : now ? "now" : "todo");
    return [
      { title: "주제 탐색", detail: hasTopic ? researchDesign.topic : "주제 미정", state: st(hasTopic, !hasTopic) },
      {
        title: "연구문제 도출",
        detail: `RQ ${researchDesign.rqCandidates.length}개 검토중`,
        state: st(hasRq, hasTopic && !hasRq),
      },
      { title: "개념 틀", detail: "변수 관계 정의", state: st(hasConcept, hasRq && !hasConcept) },
      {
        title: "가설 수립",
        detail: hasHypo ? `H1–H${researchDesign.hypotheses.length}` : "가설 없음",
        state: st(hasHypo, hasConcept && !hasHypo),
      },
      { title: "설계 확정", detail: "지도교수 승인", state: st(hasDesign, hasHypo && !hasDesign) },
    ];
  }, [researchDesign, methodDesign.type]);

  const currentIdx = stepStates.findIndex((s) => s.state === "now");
  const doneCount = stepStates.filter((s) => s.state === "done").length;
  const stepNumber = currentIdx >= 0 ? currentIdx + 1 : Math.min(doneCount + 1, stepStates.length);

  async function regenerate() {
    if (!constraint.trim()) return;
    try {
      const text = await generate({
        systemInstruction:
          language === "ko"
            ? `당신은 연구방법론 전문가입니다. 주제 "${researchDesign.topic || "미정"}"에 대해 사용자의 조건을 반영한 새로운 연구문제(RQ) 하나를 한국어 한 문장으로 제안하세요. 다른 설명 없이 RQ 문장만 출력하세요.`
            : `You are a research methodology expert. Propose one new research question in English for the topic "${researchDesign.topic || "unspecified"}", honoring the user's constraint. Output only the RQ sentence.`,
        userText: constraint,
        temperature: Math.min(1, Math.max(0, creativity / 100)),
      });
      const clean = text.trim().replace(/^["'“”]|["'“”]$/g, "");
      if (!clean) return;
      const c: RqCandidate = {
        id: `rq-${Date.now()}`,
        text: clean,
        confidence: 50,
        evidence: requireEvidence === "required" ? ["AI 생성 — 근거 확인 전, 채택 전 직접 검증하세요"] : [],
      };
      addRqCandidate(c);
      setConstraint("");
    } catch {
      // 실패 시 조용히 무시 — 입력을 보존해 재시도할 수 있게 한다.
    }
  }

  function addManual() {
    if (!manualText.trim()) return;
    const c: RqCandidate = {
      id: `rq-${Date.now()}`,
      text: manualText.trim(),
      confidence: 50,
      evidence: ["직접 작성"],
    };
    addRqCandidate(c);
    setManualText("");
  }

  function startEdit(c: RqCandidate) {
    setEditingId(c.id);
    setEditText(c.text);
  }

  function saveEdit() {
    if (!editingId) return;
    updateRqCandidate(editingId, { text: editText });
    setEditingId(null);
  }

  usePageInspector(
    <Inspector title="AI 코파일럿" badge={{ label: "연결됨", variant: "ok" }}>
      <InspectorSection title="현재 단계" action={<Badge variant="info">{stepNumber} / {stepStates.length}</Badge>}>
        <PropertyRow label="단계">
          <Select style={{ flex: 1 }} value={stage} onChange={(e) => setStage(e.target.value as (typeof STAGE_OPTIONS)[number])}>
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </PropertyRow>
        <PropertyRow label="학문 분야">
          <Input value={field} onChange={(e) => setField(e.target.value)} />
        </PropertyRow>
        <PropertyRow label="연구 유형">
          <Toggle
            label="연구 유형"
            value={methodDesign.type ?? "quant"}
            onChange={(v) => setMethodDesign({ type: v })}
            options={[
              { value: "quant", label: "양적" },
              { value: "qual", label: "질적" },
              { value: "mixed", label: "혼합" },
            ]}
          />
        </PropertyRow>
      </InspectorSection>

      <InspectorSection title="생성 옵션">
        <PropertyRow label="창의성">
          <Slider label="창의성" value={creativity} onChange={setCreativity} />
          <span className="fs-cap t3 mono">{(creativity / 100).toFixed(2)}</span>
        </PropertyRow>
        <PropertyRow label="개수">
          <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </PropertyRow>
        <PropertyRow label="근거 인용">
          <Toggle
            label="근거 인용"
            value={requireEvidence}
            onChange={setRequireEvidence}
            options={[
              { value: "required", label: "필수" },
              { value: "optional", label: "선택" },
            ]}
          />
        </PropertyRow>
        <PropertyRow label="언어">
          <Select style={{ flex: 1 }} value={language} onChange={(e) => setLanguage(e.target.value as "ko" | "en")}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </Select>
        </PropertyRow>
      </InspectorSection>

      <InspectorSection title="이 결과의 근거">
        {adopted ? (
          <>
            {adopted.evidence.length ? (
              adopted.evidence.map((e, i) => {
                const [head, ...rest] = e.split(" — ");
                return (
                  <EvidenceCard
                    key={i}
                    title={rest.length ? head : `근거 ${i + 1}`}
                    body={rest.length ? rest.join(" — ") : e}
                  />
                );
              })
            ) : (
              <p className="fs-cap t2">등록된 근거가 없습니다.</p>
            )}
            <ConfidenceMeter
              value={adopted.confidence}
              reason="신뢰도는 근거 문헌 수·인용지수·최신성으로 계산됩니다. 60% 미만이면 채택 전 직접 확인하세요."
            />
          </>
        ) : (
          <p className="fs-cap t2">채택된 RQ가 없습니다.</p>
        )}
      </InspectorSection>

      <InspectorSection title="다음으로">
        <NextStepLinks
          items={[
            { href: "/method", label: "이 RQ로 연구방법 설계", icon: "beaker" },
            { href: "/structure", label: "이 RQ에 맞는 논문 유형 보기", icon: "layers" },
          ]}
        />
      </InspectorSection>
    </Inspector>,
  );

  return (
    <Page
      eyebrow="1단계 · 연구 설계"
      title="연구문제를 확정합니다"
      description="주제에서 시작해 검증 가능한 연구문제와 개념 틀까지 다섯 단계로 좁혀갑니다."
    >
      <Card className="mb4" style={{ padding: "20px 24px 18px" }}>
        <Steps items={stepStates} />
      </Card>

      <div className="grid g-wide">
        <Card>
          <CardHeader
            title="연구문제(RQ) 후보"
            right={
              <Segmented
                label="RQ 입력 방식"
                value={mode}
                onChange={setMode}
                items={[
                  { value: "ai", label: "AI 제안" },
                  { value: "manual", label: "내가 작성" },
                ]}
              />
            }
          />
          <CardSub>채택한 RQ는 연구방법·논문구조·집필에 자동으로 이어집니다. 하나만 고르세요.</CardSub>

          {adopted ? (
            <div
              className="glass-flat mb3"
              style={{
                padding: 16,
                borderColor: "color-mix(in srgb, var(--accent) 34%, transparent)",
                background: "color-mix(in srgb, var(--accent) 7%, transparent)",
              }}
            >
              <div className="row mb3">
                <Badge variant="info">RQ · 채택됨</Badge>
                <span className="sp" />
                <span className="fs-cap t3">신뢰도 {adopted.confidence}%</span>
              </div>
              {editingId === adopted.id ? (
                <>
                  <Textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} className="mb3" />
                  <div className="row">
                    <Button size="sm" variant="primary" onClick={saveEdit}>
                      저장
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      취소
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 10px", fontSize: "var(--fs-md)", lineHeight: 1.7 }}>{adopted.text}</p>
                  <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                    {methodDesign.instruments.length > 0 ? (
                      <Badge variant="ok">
                        <Icon name="check" size={11} /> 측정도구 확보
                      </Badge>
                    ) : null}
                    <Badge variant="mute">근거 {adopted.evidence.length}건</Badge>
                  </div>
                  <div className="row mt4">
                    <LinkButton href="/method" variant="primary" size="sm">
                      이 RQ로 진행
                    </LinkButton>
                    <Button size="sm" onClick={() => startEdit(adopted)}>
                      수정
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expandedId === adopted.id ? null : adopted.id)}
                    >
                      근거 {adopted.evidence.length}건 보기
                    </Button>
                  </div>
                  {expandedId === adopted.id && adopted.evidence.length ? (
                    <div className="mt3">
                      {adopted.evidence.map((e, i) => (
                        <p key={i} className="fs-cap t2 mb2">
                          · {e}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {others.map((c) => {
            const tone = confidenceTone(c.confidence);
            const head = c.evidence[0]?.split(" — ")[0] ?? "근거 검토 필요";
            return (
              <div className="glass-flat mb3" style={{ padding: 16 }} key={c.id}>
                <div className="row mb3">
                  <Badge variant="mute">RQ</Badge>
                  <span className="sp" />
                  <span className="fs-cap t3">신뢰도 {c.confidence}%</span>
                </div>
                {editingId === c.id ? (
                  <>
                    <Textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} className="mb3" />
                    <div className="row">
                      <Button size="sm" variant="primary" onClick={saveEdit}>
                        저장
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        취소
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ margin: "0 0 10px", fontSize: "var(--fs-md)", lineHeight: 1.7 }}>{c.text}</p>
                    <div className="row">
                      <Badge variant={tone}>
                        <Icon name={tone === "ok" ? "check" : "alert"} size={11} />
                        {head}
                        {tone === "danger" ? " · 채택 비권장" : ""}
                      </Badge>
                      <span className="sp" />
                      <Button size="sm" onClick={() => adoptRq(c.id)}>
                        채택
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                        수정
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {!researchDesign.rqCandidates.length ? (
            <p className="t3 fs-sm">아직 RQ 후보가 없습니다. 아래에서 직접 입력하거나 AI에게 제안을 요청하세요.</p>
          ) : null}

          <div className="mt5">
            {mode === "manual" ? (
              <div className="field">
                <label htmlFor="rq-manual">직접 연구문제를 입력하세요</label>
                <div className="row">
                  <Input
                    id="rq-manual"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="예: 재택근무 빈도는 조직몰입에 어떤 영향을 미치는가?"
                  />
                  <Button variant="primary" className="nowrap" onClick={addManual}>
                    추가
                  </Button>
                </div>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="rq-in">직접 입력하거나 조건을 덧붙이세요</label>
                <div className="row">
                  <Input
                    id="rq-in"
                    value={constraint}
                    onChange={(e) => setConstraint(e.target.value)}
                    placeholder="예: 공공기관 표본으로 한정해서 다시 제안해줘"
                  />
                  <Button
                    variant="primary"
                    className="nowrap"
                    onClick={regenerate}
                    disabled={loading || !constraint.trim()}
                  >
                    <Icon name="spark" size={14} /> {loading ? "생성 중…" : "다시 제안"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <section className="col">
          <Card>
            <CardHeader title="개념 틀 미리보기" level={3} />
            {researchDesign.conceptFramework ? (
              <p className="fs-sm t2" style={{ lineHeight: 1.75 }}>
                {researchDesign.conceptFramework}
              </p>
            ) : (
              <p className="fs-sm t3">아직 개념 틀이 정의되지 않았습니다.</p>
            )}
            {researchDesign.hypotheses.length ? (
              <ul className="col mt3" style={{ gap: 8, paddingLeft: 18, margin: 0 }}>
                {researchDesign.hypotheses.map((h) => (
                  <li key={h} className="fs-cap t2">
                    {h}
                  </li>
                ))}
              </ul>
            ) : null}
            <LinkButton href="/structure" size="sm" className="mt3" style={{ width: "100%" }}>
              논문유형구조에서 장 구성 보기
            </LinkButton>
          </Card>

          <Card>
            <CardHeader title="이 설계의 위험" level={3} />
            <div className="list">
              {methodDesign.requiredN > 0 && methodDesign.targetN < methodDesign.requiredN ? (
                <div className="li">
                  <Badge variant="warn" className="nowrap">
                    중
                  </Badge>
                  <div className="t">
                    <b>표본 부족</b>
                    <span>
                      필요 n={methodDesign.requiredN} / 계획 n={methodDesign.targetN}
                    </span>
                  </div>
                </div>
              ) : null}
              {methodDesign.type === "quant" && methodDesign.instruments.length > 0 ? (
                <div className="li">
                  <Badge variant="mute" className="nowrap">
                    하
                  </Badge>
                  <div className="t">
                    <b>동일방법편의(CMB)</b>
                    <span>자기보고 단일 설문 · Harman 검정 권장</span>
                  </div>
                </div>
              ) : null}
              {!(methodDesign.requiredN > 0 && methodDesign.targetN < methodDesign.requiredN) &&
              !(methodDesign.type === "quant" && methodDesign.instruments.length > 0) ? (
                <p className="t3 fs-sm">현재 감지된 설계 위험이 없습니다.</p>
              ) : null}
            </div>
          </Card>
        </section>
      </div>
    </Page>
  );
}
