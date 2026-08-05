"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bench, BenchPane } from "@/components/bench/bench";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  usePageInspector,
  EvidenceCard,
  NextStepLinks,
} from "@/components/inspector";
import { TypeCatalog } from "@/components/structure/type-catalog";
import { TypeSummary } from "@/components/structure/type-summary";
import { ChapterCard } from "@/components/structure/chapter-card";
import { THESIS_CATEGORIES, getChapters, type Chapter } from "@/lib/research-data";
import { splitCircledName, stripLeadingEmoji } from "@/lib/structure-format";
import { useGemini } from "@/hooks/use-gemini";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { useProjectStore } from "@/lib/project/store";
import type { OutlineSection } from "@/lib/project/flow";
import { structureSystemPrompt, structureChapterPrompt } from "@/lib/i18n/ai-prompts";

interface StructureDraft {
  thesisType: string;
  expanded: number[];
  search: string;
  aiInput: string;
  aiOutput: string;
  compareTypeId: string;
}

const ALL_TYPES = THESIS_CATEGORIES.flatMap((c) => c.types.map((ty) => ({ ...ty, cat: c.cat })));

export default function StructurePage() {
  const router = useRouter();
  const { generate, loading } = useGemini();
  const setOutline = useProjectStore((s) => s.setOutline);

  const [thesisType, setThesisType] = useState("quant");
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [search, setSearch] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [compareTypeId, setCompareTypeId] = useState("qual");
  const [outlineJustCreated, setOutlineJustCreated] = useState(false);

  const getData = useCallback(
    (): StructureDraft => ({
      thesisType,
      expanded: Array.from(expanded),
      search,
      aiInput,
      aiOutput,
      compareTypeId,
    }),
    [thesisType, expanded, search, aiInput, aiOutput, compareTypeId],
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as Partial<StructureDraft>;
    if (d.thesisType) setThesisType(d.thesisType);
    if (d.expanded) setExpanded(new Set(d.expanded));
    if (d.search !== undefined) setSearch(d.search);
    if (d.aiInput !== undefined) setAiInput(d.aiInput);
    if (d.aiOutput !== undefined) setAiOutput(d.aiOutput);
    if (d.compareTypeId) setCompareTypeId(d.compareTypeId);
  }, []);

  const handleReset = useCallback(() => {
    setThesisType("quant");
    setExpanded(new Set([0]));
    setSearch("");
    setAiInput("");
    setAiOutput("");
    setCompareTypeId("qual");
  }, []);

  usePagePersistence("structure", handleLoad, handleReset);

  const currentType = ALL_TYPES.find((t) => t.id === thesisType) ?? ALL_TYPES[0];
  const currentCategory = THESIS_CATEGORIES.find((c) => c.types.some((t) => t.id === thesisType));
  const chapters = useMemo(() => getChapters(thesisType), [thesisType]);
  const { num: typeNum, name: typeName } = splitCircledName(currentType.name);

  const selectType = (id: string) => {
    setThesisType(id);
    setExpanded(new Set([0]));
  };

  const toggleChapter = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const askAi = async (promptOverride?: string) => {
    const q = promptOverride ?? aiInput;
    if (!q.trim()) return;
    try {
      const result = await generate({
        systemInstruction: structureSystemPrompt("ko", typeName),
        userText: q,
        temperature: 0.5,
      });
      setAiOutput(result);
    } catch (e) {
      setAiOutput(
        e instanceof Error && e.message === "API_KEY_MISSING"
          ? "⚠ 설정에서 API 키를 입력하세요."
          : "오류가 발생했습니다.",
      );
    }
  };

  const askChapterAi = (ch: Chapter) => {
    const prompt = structureChapterPrompt("ko", typeName, ch);
    setAiInput(prompt);
    void askAi(prompt);
  };

  const createOutline = () => {
    const sections: OutlineSection[] = chapters.map((ch, i) => ({
      id: `${thesisType}-${i}`,
      number: String(i + 1),
      title: ch.title,
      level: 1,
      targetChars: 2000,
      currentChars: 0,
      status: "empty",
    }));
    setOutline({ sections, derivedFromTypeId: thesisType });
    setOutlineJustCreated(true);
    window.setTimeout(() => router.push("/writing"), 500);
  };

  const compareType = ALL_TYPES.find((t) => t.id === compareTypeId);
  const compareChapters = useMemo(() => getChapters(compareTypeId), [compareTypeId]);
  const sharedTitles = useMemo(() => {
    const mine = new Set(chapters.map((c) => c.title.split(" (")[0]));
    return compareChapters.filter((c) => mine.has(c.title.split(" (")[0])).length;
  }, [chapters, compareChapters]);

  usePageInspector(
    <Inspector title="구조 인스펙터" badge={{ label: `${chapters.length}장`, variant: "info" }}>
      <InspectorSection title="선택된 유형">
        <PropertyRow label="유형">
          <span className="fs-sm">{typeName}</span>
        </PropertyRow>
        <PropertyRow label="분류">
          <span className="fs-sm t2">{currentCategory ? stripLeadingEmoji(currentCategory.cat) : ""}</span>
        </PropertyRow>
        <PropertyRow label="장 수">
          <span className="fs-sm t2">{chapters.length}개</span>
        </PropertyRow>
      </InspectorSection>

      <InspectorSection title="AI 구조 상담">
        <Textarea
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          rows={3}
          placeholder="이 유형·장 구조에 대해 무엇이든 물어보세요"
        />
        <Button size="sm" className="mt2" onClick={() => askAi()} disabled={loading}>
          {loading ? "문의 중…" : "질문하기"}
        </Button>
        {aiOutput ? (
          <div className="mt3">
            <EvidenceCard
              title="AI 응답"
              body={<span style={{ whiteSpace: "pre-wrap" }}>{aiOutput}</span>}
            />
          </div>
        ) : null}
      </InspectorSection>

      <InspectorSection title="유형 비교">
        <PropertyRow label="비교 대상">
          <Select value={compareTypeId} onChange={(e) => setCompareTypeId(e.target.value)}>
            {THESIS_CATEGORIES.map((cat) => (
              <optgroup key={cat.cat} label={stripLeadingEmoji(cat.cat)}>
                {cat.types
                  .filter((ty) => ty.id !== thesisType)
                  .map((ty) => (
                    <option key={ty.id} value={ty.id}>
                      {splitCircledName(ty.name).name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </PropertyRow>
        {compareType ? (
          <p className="hint mt2">
            {typeName} {chapters.length}장 · {splitCircledName(compareType.name).name} {compareChapters.length}장 ·
            제목이 겹치는 장 {sharedTitles}개
          </p>
        ) : null}
      </InspectorSection>

      <InspectorSection title="다음으로">
        <NextStepLinks
          items={[
            { href: "/writing", label: "이 구조로 집필 시작", icon: "pen" },
            { href: "/analyzer", label: "내 논문과 대조 분석", icon: "chart" },
            { href: "/method", label: "연구방법 설계로", icon: "beaker" },
          ]}
        />
      </InspectorSection>
    </Inspector>,
  );

  return (
    <Bench
      catalog
      left={
        <BenchPane
          head={
            <div className="row" style={{ width: "100%", gap: 8 }}>
              <Icon name="grid" size={15} />
              <span className="ttl">유형 카탈로그</span>
            </div>
          }
          bodyClassName="scrollbar-none"
          foot={<span className="hint">총 {ALL_TYPES.length}개 유형 · 9개 분류</span>}
        >
          <PageSaveRegistration pageId="structure" getData={getData} />
          <div className="mb3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="유형 검색…"
              aria-label="유형 검색"
            />
          </div>
          <TypeCatalog
            categories={THESIS_CATEGORIES}
            selectedId={thesisType}
            onSelect={selectType}
            filter={search}
          />
        </BenchPane>
      }
      right={
        <BenchPane
          head={
            <>
              <span className="ttl">장 구조</span>
              <div className="sp" />
              <Button size="sm" variant="primary" onClick={createOutline}>
                <Icon name="doc" size={13} />
                {outlineJustCreated ? "목차 생성됨 — 이동 중…" : "이 구조로 목차 만들기"}
              </Button>
            </>
          }
        >
          <TypeSummary
            num={typeNum}
            name={typeName}
            color={currentType.color}
            categoryLabel={currentCategory ? stripLeadingEmoji(currentCategory.cat) : ""}
            chapterCount={chapters.length}
          />
          {chapters.map((ch, i) => (
            <ChapterCard
              key={`${thesisType}-${i}`}
              chapter={ch}
              index={i}
              open={expanded.has(i)}
              onToggle={() => toggleChapter(i)}
              onAskAi={() => askChapterAi(ch)}
              askAiLoading={loading}
            />
          ))}
        </BenchPane>
      }
    />
  );
}
