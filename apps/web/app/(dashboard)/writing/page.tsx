"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  EvidenceCard,
  Toggle,
  usePageInspector,
} from "@/components/inspector";
import { AiDraftBlock } from "@/components/writing/ai-draft-block";
import { useProjectStore, savedAgoLabel } from "@/lib/project/store";
import { MENU_FLOW, type LiteratureItem, type ManuscriptBlock, type OutlineSection } from "@/lib/project/flow";
import { useGemini } from "@/hooks/use-gemini";

const WRITING_TARGET = 24000;

const NEXT_PARAGRAPH_SUGGESTIONS: Record<string, string[]> = {
  "1": ["연구의 배경과 필요성", "선행연구의 한계", "연구 목적 진술"],
  "2": ["핵심 개념 정의", "이론적 모형 제시", "가설 도출 근거"],
  "3": ["연구 설계 개요", "변수 조작적 정의", "분석 전략"],
  "4": ["응답률과 최종 분석 표본", "표본의 인구통계학적 특성", "윤리적 고려사항"],
  "5": ["기술통계 결과", "가설 검증 결과", "추가 분석"],
  "6": ["결과 요약", "이론적·실무적 함의", "연구의 한계와 제언"],
};

function charCount(text: string): number {
  return text.replace(/\s/g, "").length;
}

function isCounted(b: ManuscriptBlock): boolean {
  return b.origin === "human" || b.accepted;
}

function totalChars(manuscript: ManuscriptBlock[]): number {
  return manuscript.filter(isCounted).reduce((n, b) => n + charCount(b.content), 0);
}

function sectionChars(manuscript: ManuscriptBlock[], sectionId: string): number {
  return manuscript
    .filter((b) => b.sectionId === sectionId && isCounted(b))
    .reduce((n, b) => n + charCount(b.content), 0);
}

function resolveSourceLabel(src: string, literature: LiteratureItem[]): string {
  const lit = literature.find((l) => l.id === src);
  if (!lit) return src;
  const lastAuthor = lit.authors.split(/[,&·]/)[0]?.trim() || lit.authors;
  return `${lastAuthor}(${lit.year})`;
}

export default function WritingPage() {
  const project = useProjectStore();
  const setOutline = useProjectStore((s) => s.setOutline);
  const upsertBlock = useProjectStore((s) => s.upsertBlock);
  const acceptAiBlock = useProjectStore((s) => s.acceptAiBlock);
  const discardAiBlock = useProjectStore((s) => s.discardAiBlock);
  const retryAiBlock = useProjectStore((s) => s.retryAiBlock);
  const useSnippetAction = useProjectStore((s) => s.useSnippet);
  const { outline, manuscript, methodDesign, literature, snippets } = project;
  const { generate } = useGemini();

  const chapters = useMemo(() => outline.sections.filter((s) => s.level === 1), [outline.sections]);

  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => {
    const drafts = outline.sections.filter((s) => s.level === 1 && s.status === "draft");
    return drafts[drafts.length - 1]?.id ?? outline.sections.find((s) => s.level === 1)?.id ?? null;
  });
  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId) ?? chapters[0] ?? null,
    [chapters, activeChapterId],
  );

  const subsections = useMemo(
    () => (activeChapter ? outline.sections.filter((s) => s.level === 2 && s.number.startsWith(`${activeChapter.number}.`)) : []),
    [outline.sections, activeChapter],
  );
  const writableUnits: OutlineSection[] = subsections.length ? subsections : activeChapter ? [activeChapter] : [];

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const activeSection = useMemo(
    () => writableUnits.find((s) => s.id === activeSectionId) ?? writableUnits[0] ?? null,
    [writableUnits, activeSectionId],
  );

  const [draftText, setDraftText] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [genBusy, setGenBusy] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState<string | null>(null);

  const [tone, setTone] = useState<"formal" | "plain">("formal");
  const [person, setPerson] = useState<"study" | "researcher">("study");
  const [citeStyle, setCiteStyle] = useState<"apa7" | "kr">("apa7");

  const sectionBlocks = useMemo(
    () => (activeSection ? manuscript.filter((b) => b.sectionId === activeSection.id) : []),
    [manuscript, activeSection],
  );
  const acceptedBlocks = sectionBlocks.filter(isCounted);
  const pendingAi = sectionBlocks.filter((b) => b.origin === "ai" && !b.accepted);

  const total = totalChars(manuscript);
  const current = activeSection ? sectionChars(manuscript, activeSection.id) : 0;
  const target = activeSection?.targetChars ?? 0;
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;

  const suggestions = NEXT_PARAGRAPH_SUGGESTIONS[activeChapter?.number.split(".")[0] ?? "1"] ?? NEXT_PARAGRAPH_SUGGESTIONS["1"];

  const matchingSnippets = useMemo(
    () => (activeSection ? snippets.filter((s) => s.sectionId === activeSection.id) : []),
    [snippets, activeSection],
  );
  const relevantLiterature = useMemo(
    () => literature.filter((l) => l.inLibrary && l.citedInBody > 0).sort((a, b) => b.citedInBody - a.citedInBody),
    [literature],
  );

  function addChapter() {
    const title = window.prompt("새 장의 제목을 입력하세요");
    if (!title?.trim()) return;
    const nextNum = String(Math.max(0, ...chapters.map((c) => parseInt(c.number, 10) || 0)) + 1);
    const id = `ch-${Date.now()}`;
    setOutline({
      derivedFromTypeId: outline.derivedFromTypeId,
      sections: [
        ...outline.sections,
        { id, number: nextNum, title: title.trim(), level: 1, targetChars: 2000, currentChars: 0, status: "empty" },
      ],
    });
    setActiveChapterId(id);
    setActiveSectionId(null);
  }

  function addParagraph() {
    const text = draftText.trim();
    if (!text || !activeSection) return;
    upsertBlock({
      id: `blk-${Date.now()}`,
      sectionId: activeSection.id,
      origin: "human",
      accepted: true,
      content: text,
      sources: [],
    });
    setDraftText("");
  }

  function beginEditBlock(b: ManuscriptBlock) {
    setEditingBlockId(b.id);
    setEditText(b.content);
  }
  function saveEditBlock() {
    if (!editingBlockId) return;
    const b = manuscript.find((x) => x.id === editingBlockId);
    if (b) upsertBlock({ ...b, content: editText });
    setEditingBlockId(null);
  }

  async function generateDraft(topicHint?: string) {
    if (!activeSection) return;
    const busyKey = topicHint ?? "new";
    setGenBusy(busyKey);
    try {
      const personLabel = person === "study" ? "'본 연구는'으로 시작하는 3인칭 서술" : "'연구자는'으로 시작하는 서술";
      const toneLabel = tone === "formal" ? "격식 있는 학술 문체" : "평이한 학술 문체";
      const citeLabel = citeStyle === "apa7" ? "APA 7판" : "한국심리학회 형식";
      const materials = [
        `절: ${activeSection.number} ${activeSection.title}`,
        methodDesign.type ? `연구방법: ${methodDesign.type} · 모집단 ${methodDesign.population || "미정"} · 표집 ${methodDesign.sampling || "미정"} · 표본 ${methodDesign.targetN}명` : "",
        topicHint ? `이번 문단 주제: ${topicHint}` : "",
        acceptedBlocks.length ? `직전 문단: ${acceptedBlocks[acceptedBlocks.length - 1].content.slice(0, 200)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const text = await generate({
        systemInstruction: `당신은 학술 논문 집필을 돕는 전문가입니다. ${toneLabel}로, ${personLabel}를 사용해 한국어 문단 하나를 작성하세요. 인용이 필요하면 ${citeLabel} 형식의 (저자, 연도)를 사용하세요. 다른 설명 없이 문단만 출력하세요.`,
        userText: materials,
        temperature: 0.5,
      });
      const clean = text.trim();
      if (clean) {
        upsertBlock({
          id: `blk-ai-${Date.now()}`,
          sectionId: activeSection.id,
          origin: "ai",
          accepted: false,
          content: clean,
          sources: topicHint ? [`AI 생성 · ${topicHint}`] : ["AI 생성"],
        });
      }
    } catch {
      /* 네트워크 오류 시 조용히 무시 — 사용자는 다시 시도할 수 있다 */
    } finally {
      setGenBusy(null);
    }
  }

  async function retryBlock(b: ManuscriptBlock) {
    if (!activeSection) return;
    setGenBusy(b.id);
    try {
      const text = await generate({
        systemInstruction: "당신은 학술 논문 집필을 돕는 전문가입니다. 아래 문단을 같은 내용을 유지하되 다른 표현으로 다시 쓰세요. 다른 설명 없이 문단만 출력하세요.",
        userText: b.content,
        temperature: 0.6,
      });
      const clean = text.trim();
      if (clean) retryAiBlock(b.id, clean);
    } catch {
      /* 무시 */
    } finally {
      setGenBusy(null);
    }
  }

  function insertCitation() {
    const top = relevantLiterature[0];
    if (!top) return;
    const lastAuthor = top.authors.split(/[,&·]/)[0]?.trim() || top.authors;
    setDraftText((v) => `${v}${v ? " " : ""}(${lastAuthor}, ${top.year})`);
  }

  function insertMaterial(text: string) {
    setDraftText((v) => `${v}${v ? " " : ""}${text}`);
  }

  function insertSnippet(id: string, text: string) {
    insertMaterial(text);
    useSnippetAction(id);
  }

  usePageInspector(
    activeSection ? (
      <Inspector title="집필 도우미" badge={{ label: genBusy ? "생성 중" : "대기", variant: genBusy ? "info" : "mute" }}>
        <InspectorSection title="지금 쓰는 곳">
          <PropertyRow label="절">
            <Select style={{ flex: 1 }} value={activeSection.id} onChange={(e) => setActiveSectionId(e.target.value)}>
              {writableUnits.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number} {s.title}
                </option>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow label="목표">
            <Input
              type="number"
              min={0}
              value={targetInput ?? activeSection.targetChars}
              onChange={(e) => setTargetInput(e.target.value)}
              onBlur={() => {
                if (targetInput === null) return;
                const n = Math.max(0, Number(targetInput) || 0);
                setOutline({
                  derivedFromTypeId: outline.derivedFromTypeId,
                  sections: outline.sections.map((s) => (s.id === activeSection.id ? { ...s, targetChars: n } : s)),
                });
                setTargetInput(null);
              }}
            />
            <span className="fs-cap t3">자</span>
          </PropertyRow>
          <PropertyRow label="현재">
            <span className="fs-sm mono" style={{ color: pct >= 100 ? "var(--ok)" : "var(--warn)" }}>
              {current.toLocaleString()}자 ({pct}%)
            </span>
          </PropertyRow>
          <div className={`bar mt2 ${pct >= 100 ? "" : "warn"}`}>
            <i style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </InspectorSection>

        <InspectorSection title="이 절에 쓸 재료">
          {MENU_FLOW.writing.consumes.map((artifact) => {
            if (artifact === "Outline") {
              return (
                <EvidenceCard
                  key={artifact}
                  title="개요 · 목표 분량"
                  body={`${activeSection.number} ${activeSection.title} · 목표 ${activeSection.targetChars.toLocaleString()}자 중 ${current.toLocaleString()}자 작성`}
                  source="구조 설계에서 가져옴"
                />
              );
            }
            if (artifact === "MethodDesign") {
              if (!methodDesign.type) return null;
              return (
                <EvidenceCard
                  key={artifact}
                  title="연구 방법 · 표집"
                  body={`${methodDesign.sampling || "표집 방법 미정"} · ${methodDesign.population || "모집단 미정"} · n=${methodDesign.targetN || methodDesign.requiredN || "미정"}`}
                  source="연구 방법에서 가져옴"
                />
              );
            }
            if (artifact === "Snippets") {
              return matchingSnippets.length ? (
                <div key={artifact}>
                  {matchingSnippets.slice(0, 2).map((s) => (
                    <EvidenceCard
                      key={s.id}
                      title="문장 라이브러리"
                      body={s.text}
                      source={`${s.origin === "mine" ? "내가 저장한 표현" : "인용"} · ${s.useCount}회 사용`}
                    />
                  ))}
                  <Button size="sm" style={{ width: "100%" }} onClick={() => insertSnippet(matchingSnippets[0].id, matchingSnippets[0].text)}>
                    <Icon name="doc" size={12} /> 본문에 삽입
                  </Button>
                </div>
              ) : (
                <p key={artifact} className="fs-cap t2 mb0">
                  이 절에 저장된 문장이 없습니다.
                </p>
              );
            }
            if (artifact === "Literature") {
              return relevantLiterature.length ? (
                <EvidenceCard
                  key={artifact}
                  title="선행연구 근거"
                  body={`서재의 인용 가능 문헌 ${relevantLiterature.length}편 (${relevantLiterature
                    .slice(0, 2)
                    .map((l) => resolveSourceLabel(l.id, literature))
                    .join(", ")} 외)`}
                  source="문헌 연구에서 가져옴"
                />
              ) : (
                <p key={artifact} className="fs-cap t2 mb0">
                  연동된 문헌이 없습니다.
                </p>
              );
            }
            return null;
          })}
        </InspectorSection>

        <InspectorSection title="생성 방식">
          <PropertyRow label="어조">
            <Select style={{ flex: 1 }} value={tone} onChange={(e) => setTone(e.target.value as "formal" | "plain")}>
              <option value="formal">학술 · 격식</option>
              <option value="plain">학술 · 평이</option>
            </Select>
          </PropertyRow>
          <PropertyRow label="인칭">
            <Toggle
              label="서술 인칭"
              value={person}
              onChange={setPerson}
              options={[
                { value: "study", label: "본 연구" },
                { value: "researcher", label: "연구자" },
              ]}
            />
          </PropertyRow>
          <PropertyRow label="인용 형식">
            <Select style={{ flex: 1 }} value={citeStyle} onChange={(e) => setCiteStyle(e.target.value as "apa7" | "kr")}>
              <option value="apa7">APA 7th</option>
              <option value="kr">한국심리학회</option>
            </Select>
          </PropertyRow>
          <Button
            size="sm"
            variant="primary"
            className="mt3"
            style={{ width: "100%" }}
            onClick={() => generateDraft()}
            disabled={genBusy === "new"}
          >
            <Icon name="spark" size={13} /> {genBusy === "new" ? "생성 중…" : "이 재료로 초안 쓰기"}
          </Button>
          <p className="fs-cap t3 mt3 mb0">
            생성된 문장은 <b>점선 카드</b>로 표시되며, 수락하기 전까지 본문 분량에 포함되지 않습니다.
          </p>
        </InspectorSection>
      </Inspector>
    ) : null,
  );

  if (!activeSection) {
    return (
      <Page eyebrow="3단계 · 집필" title="4장 연구방법" description="구조 설계에서 장·절을 먼저 만들어야 집필을 시작할 수 있습니다.">
        <Card>
          <p className="fs-sm t2 mb3">아직 논문 구조가 없습니다.</p>
          <LinkButton href="/structure" variant="primary">
            논문유형구조에서 목차 만들기
          </LinkButton>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="3단계 · 집필"
      title={`${activeChapter?.number}장 ${activeChapter?.title}`}
      description="다른 메뉴에서 만든 재료를 오른쪽에서 끌어와 문단으로 씁니다. AI가 쓴 문장은 항상 구분해서 보여줍니다."
    >
      <div className="glass card mb4" style={{ padding: "14px 20px" }}>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="seg" role="tablist" aria-label="장 선택">
            {chapters.map((ch) => (
              <button
                key={ch.id}
                type="button"
                role="tab"
                aria-selected={activeChapter?.id === ch.id}
                className={activeChapter?.id === ch.id ? "on" : undefined}
                onClick={() => {
                  setActiveChapterId(ch.id);
                  setActiveSectionId(null);
                }}
              >
                {ch.number}장 {ch.title}
              </button>
            ))}
            <button type="button" aria-label="장 추가" onClick={addChapter}>
              <Icon name="plus" size={13} />
            </button>
          </div>
          <span className="sp" />
          <Badge variant="ok">
            <Icon name="check" size={11} /> {savedAgoLabel(project.savedAt)}
          </Badge>
          <Badge variant="mute">
            {total.toLocaleString()}자 · 목표 {WRITING_TARGET.toLocaleString()}자
          </Badge>
          <Button size="sm" onClick={insertCitation} disabled={relevantLiterature.length === 0}>
            <Icon name="link" size={13} /> 인용 삽입
          </Button>
          <LinkButton href="/validation" size="sm">
            <Icon name="shield" size={13} /> 이 절 검증
          </LinkButton>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "28px 40px 40px", minHeight: 460 }}>
          <div className="fs-cap t3 mb3">
            {activeSection.number} {activeSection.title}
          </div>

          {acceptedBlocks.length === 0 ? (
            <p className="fs-sm t2 mb4">아직 작성된 문단이 없습니다. 아래에서 문단을 추가하거나 AI 초안을 생성해 보세요.</p>
          ) : null}

          {acceptedBlocks.map((b) =>
            editingBlockId === b.id ? (
              <div key={b.id} className="mb3">
                <Textarea rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} style={{ width: "100%" }} />
                <div className="row mt2">
                  <Button size="sm" variant="primary" onClick={saveEditBlock}>
                    저장
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingBlockId(null)}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <p
                key={b.id}
                onClick={() => beginEditBlock(b)}
                style={{ fontSize: "var(--fs-md)", lineHeight: 2.05, color: "var(--t1)", margin: "0 0 18px", cursor: "text" }}
                title="눌러서 수정"
              >
                {b.content}
              </p>
            ),
          )}

          {pendingAi.map((b) => (
            <AiDraftBlock
              key={b.id}
              content={b.content}
              sourceLabels={b.sources.map((s) => resolveSourceLabel(s, literature))}
              busy={genBusy === b.id}
              onAccept={() => acceptAiBlock(b.id)}
              onRetry={() => retryBlock(b)}
              onDiscard={() => discardAiBlock(b.id)}
            />
          ))}

          <div className="mt4">
            <Textarea
              rows={3}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="새 문단을 직접 써 보세요…"
              style={{ width: "100%" }}
            />
            <div className="row mt3">
              <Button variant="primary" onClick={addParagraph} disabled={!draftText.trim()}>
                <Icon name="plus" size={14} /> 문단 추가
              </Button>
              <Button onClick={() => generateDraft()} disabled={genBusy === "new"}>
                <Icon name="spark" size={13} /> {genBusy === "new" ? "생성 중…" : "AI 초안 생성"}
              </Button>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--hairline)", background: "var(--glass-1)" }}>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <span className="fs-cap t3">이 절의 다음 문단 제안:</span>
            {suggestions.map((s) => (
              <Button key={s} size="sm" onClick={() => generateDraft(s)} disabled={!!genBusy}>
                {s}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </Page>
  );
}
