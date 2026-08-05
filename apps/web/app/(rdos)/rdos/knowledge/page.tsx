"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/table";
import { Icon } from "@/components/ui/icons";
import { Inspector, InspectorSection, usePageInspector } from "@/components/inspector";
import { KNOWLEDGE_TERMS, type TermCategory } from "@/lib/rdos/knowledge-core";
import { useLearnerStore } from "@/lib/project/learner";

const CATEGORY_LABEL: Record<TermCategory, string> = {
  concept: "개념",
  method: "방법",
  theory: "이론",
  paradigm: "패러다임",
  contribution: "기여",
  process: "절차",
};

function scoreTone(score: number) {
  if (score >= 70) return "ok" as const;
  if (score >= 35) return "warn" as const;
  return "danger" as const;
}

export default function RdosKnowledgePage() {
  const { vocabulary, addVocab, reviewVocab } = useLearnerStore();
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

  const selected = KNOWLEDGE_TERMS.find((t) => t.id === selectedId) ?? null;
  const related = useMemo(
    () => (selected ? KNOWLEDGE_TERMS.filter((t) => t.category === selected.category && t.id !== selected.id).slice(0, 6) : []),
    [selected],
  );

  usePageInspector(
    selected ? (
      <Inspector title="논문 속 문장 예시" badge={{ label: selected.ko, variant: "info" }}>
        <InspectorSection title="정의">
          <p className="fs-cap t2 mb0" style={{ lineHeight: 1.75 }}>
            {selected.definition}
          </p>
        </InspectorSection>
        <InspectorSection title="이렇게 씁니다">
          <p className="fs-cap t2 mb0" style={{ lineHeight: 1.75 }}>
            {selected.usage}
          </p>
        </InspectorSection>
        <InspectorSection title="쉽게 이해하기">
          <p className="fs-cap t2 mb0" style={{ lineHeight: 1.75 }}>
            {selected.analogy}
          </p>
        </InspectorSection>
      </Inspector>
    ) : null,
  );

  const mineSorted = [...vocabulary].sort((a, b) => a.score - b.score);

  return (
    <Page eyebrow="3 · 상시 지원" title="지식 코어" description="논문을 읽고 쓰며 마주친 용어를 모으고, 잊기 전에 복습합니다.">
      <div className="row mb4">
        <Segmented
          label="용어 보기 전환"
          value={tab}
          onChange={setTab}
          items={[
            { value: "mine", label: "내가 배운 용어" },
            { value: "all", label: "전체 용어집" },
          ]}
        />
      </div>

      <div className="grid g-wide">
        <div className="col" style={{ gap: 16 }}>
          {tab === "mine" ? (
            <Card>
              <div className="card-h">
                <h3>내가 배운 용어 · {vocabulary.length}개</h3>
              </div>
              {mineSorted.length === 0 ? (
                <EmptyState
                  icon={<Icon name="brain" size={22} />}
                  title="아직 저장한 용어가 없어요"
                  description="논문 읽기 훈련이나 AI 튜터 대화에서 낯선 용어를 만나면 지식 코어에 추가할 수 있습니다."
                  actions={
                    <Button size="sm" onClick={() => setTab("all")}>
                      전체 용어집 보기
                    </Button>
                  }
                />
              ) : (
                <div className="list">
                  {mineSorted.map((v) => {
                    const term = KNOWLEDGE_TERMS.find((t) => t.ko === v.term);
                    return (
                      <div key={v.term} className="li">
                        <div className="t">
                          <b>{v.term}</b>
                          <span>{term?.en ?? "복습 대상"}</span>
                        </div>
                        <Badge variant={scoreTone(v.score)}>숙련도 {v.score}</Badge>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (term) setSelectedId(term.id);
                            setFlipped(false);
                          }}
                        >
                          복습하기
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div className="card-h">
                <h3>전체 용어집 · {KNOWLEDGE_TERMS.length}개</h3>
              </div>
              <div className="tlist">
                {KNOWLEDGE_TERMS.map((t) => {
                  const added = vocabulary.some((v) => v.term === t.ko);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={selectedId === t.id ? "ty on" : "ty"}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <span className="tno" style={{ background: "var(--glass-2)", color: "var(--t2)" }}>
                        {t.num}
                      </span>
                      <span className="tnm">
                        {t.ko} <span className="t3">· {t.en}</span>
                      </span>
                      <span className="tch">{CATEGORY_LABEL[t.category]}</span>
                      {!added ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            addVocab(t.ko);
                          }}
                        >
                          추가
                        </Button>
                      ) : (
                        <Icon name="check" size={14} />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {selected ? (
            <Card>
              <div className="card-h">
                <h3>{flipped ? "정의 다시 보기" : `"${selected.ko}" 기억나시나요?`}</h3>
                <span className="sp" />
                <Badge variant="info">{CATEGORY_LABEL[selected.category]}</Badge>
              </div>
              {!flipped ? (
                <>
                  <p className="fs-md t1 mb3">스스로 정의를 떠올려 본 뒤 확인해 보세요.</p>
                  <Button size="sm" onClick={() => setFlipped(true)}>
                    정의 확인하기
                  </Button>
                </>
              ) : (
                <>
                  <p className="fs-sm t2 mb3" style={{ lineHeight: 1.8 }}>
                    {selected.definition}
                  </p>
                  <div className="row" style={{ gap: 8 }}>
                    <Button
                      size="sm"
                      onClick={() => {
                        reviewVocab(selected.ko, 20);
                        setFlipped(false);
                      }}
                    >
                      <Icon name="check" size={13} />
                      기억났어요
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        reviewVocab(selected.ko, -10);
                        setFlipped(false);
                      }}
                    >
                      가물가물해요
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ) : null}
        </div>

        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h3>개념 지도</h3>
            </div>
            {selected ? (
              <>
                <div
                  className="glass-flat"
                  style={{ padding: "12px 14px", textAlign: "center", marginBottom: 12 }}
                >
                  <b style={{ color: "var(--accent)" }}>{selected.ko}</b>
                  <div className="fs-cap t3">{CATEGORY_LABEL[selected.category]}</div>
                </div>
                <div className="col" style={{ gap: 6 }}>
                  {related.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className="row"
                      style={{
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--hairline)",
                        borderLeft: "2px solid var(--accent)",
                        background: "var(--glass-1)",
                        cursor: "pointer",
                        width: "100%",
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                    >
                      <Icon name="link" size={13} />
                      <span className="fs-cap t2">{r.ko}</span>
                    </button>
                  ))}
                  {related.length === 0 ? <p className="fs-cap t3 mb0">같은 범주의 다른 용어가 없습니다.</p> : null}
                </div>
              </>
            ) : (
              <p className="fs-cap t3 mb0">용어를 선택하면 같은 범주의 관련 개념을 보여줍니다.</p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
