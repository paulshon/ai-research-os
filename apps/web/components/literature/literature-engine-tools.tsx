"use client";

import { useState } from "react";
import { MaterialSymbol } from "@/components/literature/material-symbol";
import { useGemini } from "@/hooks/use-gemini";

export interface EnginePaper {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  abstract: string;
  keywords: string[];
  doi: string;
  url: string;
  citations: number;
  source: string;
}

export interface ResearchCardData {
  paperId: string;
  title: string;
  markdown: string;
}

type ToolId =
  | "summary"
  | "method"
  | "compare"
  | "critical"
  | "reviewDraft"
  | "cards";

const TOOLS: { id: ToolId; label: string; icon: string; desc: string }[] = [
  { id: "summary", label: "구조화 요약", icon: "article", desc: "연구목적·방법·결과·한계·관련성" },
  { id: "method", label: "연구방법 요약", icon: "science", desc: "양적/질적 방법론 자동 추출" },
  { id: "compare", label: "논문 비교", icon: "compare", desc: "선택 논문 표 비교" },
  { id: "critical", label: "AI 연구 비평", icon: "fact_check", desc: "설계·표본·통계·Gap" },
  { id: "reviewDraft", label: "문헌고찰 초안", icon: "library_books", desc: "동향·공백·향후 연구" },
  { id: "cards", label: "연구 카드", icon: "auto_awesome", desc: "논문별 Research Card" },
];

export default function LiteratureEngineTools({
  papers,
  locale,
  thesisType,
  projectTitle,
}: {
  papers: EnginePaper[];
  locale: string;
  thesisType: string;
  projectTitle?: string;
}) {
  const { generate, loading } = useGemini();
  const [active, setActive] = useState<ToolId>("summary");
  const [output, setOutput] = useState("");
  const [cards, setCards] = useState<ResearchCardData[]>([]);
  const [focusPaperId, setFocusPaperId] = useState<string | null>(null);

  const lang =
    locale === "ko"
      ? "반드시 한국어로 응답하세요."
      : locale === "zh"
        ? "请用中文回答。"
        : "Respond in the same language as the paper titles.";

  const paperBlock = (list: EnginePaper[]) =>
    list
      .map(
        (p, i) =>
          `[${i + 1}] "${p.title}" (${p.year}) ${p.journal}\nAuthors: ${p.authors}\nAbstract: ${p.abstract}\nKeywords: ${p.keywords.join(", ")}\nDOI: ${p.doi || "—"}`,
      )
      .join("\n\n");

  const run = async (tool: ToolId) => {
    if (papers.length === 0) return;
    setActive(tool);
    const ctx = projectTitle ? `현재 프로젝트: ${projectTitle}\n연구 유형: ${thesisType}\n\n` : "";

    try {
      if (tool === "compare" && papers.length >= 2) {
        const result = await generate({
          systemInstruction: `Create a markdown comparison table for literature review. Columns: 연구방법, 표본수, 분석기법, 한계 (and paper columns). ${lang}`,
          userText: `${ctx}Compare:\n\n${paperBlock(papers.slice(0, 6))}`,
          temperature: 0.4,
          maxOutputTokens: 8192,
        });
        setOutput(result);
        return;
      }

      if (tool === "cards") {
        const target = focusPaperId
          ? papers.filter((p) => p.id === focusPaperId)
          : papers.slice(0, 3);
        const next: ResearchCardData[] = [];
        for (const p of target) {
          const md = await generate({
            systemInstruction: `Generate a Research Card in markdown with sections: 논문 정보, 핵심 키워드, 연구 질문, 연구방법, 데이터/표본, 분석기법, 주요 결과, 한계, 내 프로젝트 관련성, 인용 추천(장), 유사 논문. ${lang}`,
            userText: `${ctx}${paperBlock([p])}`,
            temperature: 0.45,
            maxOutputTokens: 4096,
          });
          next.push({ paperId: p.id, title: p.title, markdown: md });
        }
        setCards(next);
        setOutput("");
        return;
      }

      const selected =
        tool === "summary" || tool === "method" || tool === "critical"
          ? focusPaperId
            ? papers.filter((p) => p.id === focusPaperId)
            : papers.slice(0, 1)
          : papers.slice(0, 20);

      const instructions: Record<Exclude<ToolId, "compare" | "cards">, string> = {
        summary: `Structured summary: 연구 목적/질문, 방법, 표본, 분석, 주요 결과, 한계, 향후 연구, 프로젝트 관련성. ${lang}`,
        method: `Method-focused extraction for ${thesisType} context. If qualitative: phenomenology, data collection, sample N, analysis (e.g. Colaizzi), trustworthiness, ethics. If quantitative: N, instrument, reliability, validity, hypotheses, stats, effect size, p-values. ${lang}`,
        critical: `Critical review: 연구설계 적절성, 표본 충분성, 통계/질적 분석 적절성, 한계, 재현 가능성, 연구 공백(Gap). ${lang}`,
        reviewDraft: `Literature review draft: 연구 동향, 공통점, 차이점, 연구 공백, 향후 연구 방향 (up to 20 papers). ${lang}`,
      };

      const result = await generate({
        systemInstruction: instructions[tool as keyof typeof instructions],
        userText: `${ctx}${paperBlock(selected)}`,
        temperature: 0.5,
        maxOutputTokens: 8192,
      });
      setOutput(result);
    } catch (e: unknown) {
      setOutput(e instanceof Error && e.message === "API_KEY_MISSING" ? "API" : "Error");
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-start gap-2">
        <MaterialSymbol name="insights" size={22} className="text-[#3ecfb2] mt-0.5" />
        <div>
          <h3 className="text-[18px] font-semibold">연구 맥락 인사이트</h3>
          <p className="text-[14px] text-white/30 mt-0.5">
            검색 → 구조화 요약 → 방법 분석 → 비교 → 공백 → 문헌고찰 (프로젝트 유형: {thesisType})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={loading || papers.length === 0}
            onClick={() => run(t.id)}
            className={`text-left p-3 rounded-xl border transition-all disabled:opacity-35 ${
              active === t.id
                ? "border-[#3ecfb2]/40 bg-[#3ecfb2]/10"
                : "border-white/[0.06] bg-[#13161e] hover:border-white/[0.12]"
            }`}
          >
            <MaterialSymbol name={t.icon} size={18} className="text-[#6c8cff] mb-1" />
            <p className="text-[14px] font-medium text-white/80">{t.label}</p>
            <p className="text-[12px] text-white/30 mt-0.5 leading-snug">{t.desc}</p>
          </button>
        ))}
      </div>

      {papers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-white/35">대상 논문:</span>
          <select
            value={focusPaperId ?? ""}
            onChange={(e) => setFocusPaperId(e.target.value || null)}
            className="max-w-md px-2 py-1.5 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-white/70"
          >
            <option value="">(자동 — 상위 논문)</option>
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title.slice(0, 60)}
              </option>
            ))}
          </select>
          <span className="text-white/20">{papers.length}편 선택됨</span>
        </div>
      )}

      {loading && (
        <p className="text-[14px] text-[#e8b84b] animate-pulse">Gemini 분석 중...</p>
      )}

      {cards.length > 0 && active === "cards" && (
        <div className="space-y-4">
          {cards.map((c) => (
            <div key={c.paperId} className="p-4 rounded-xl bg-[#13161e] border border-white/[0.06]">
              <p className="text-[15px] font-semibold text-[#3ecfb2] mb-2">{c.title}</p>
              <div className="text-[14px] text-white/70 whitespace-pre-wrap leading-relaxed">{c.markdown}</div>
            </div>
          ))}
        </div>
      )}

      {output && active !== "cards" && (
        <div className="p-4 rounded-xl bg-[#13161e] border border-white/[0.06] text-[15px] text-white/75 whitespace-pre-wrap leading-[1.75]">
          {output}
        </div>
      )}

      {papers.length === 0 && (
        <p className="text-center py-12 text-white/20 text-[15px]">
          논문을 검색·선택하면 인사이트 도구를 사용할 수 있습니다.
        </p>
      )}
    </div>
  );
}
