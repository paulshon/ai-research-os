"use client";
import { Icon } from "@/components/ui/icon";
import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useGemini } from "@/hooks/use-gemini";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { useTranslation } from "@/lib/i18n";
import {
  RESEARCH_SECTION_TO_KEY,
  upsertLinkedResult,
  type LinkedResultKey,
} from "@/lib/writing/linked-results-bridge";

/* ─────────────────────────────────────────────
   v25: Research 페이지 개선 (Issue 1/5)
   - 6개 섹션이 모두 동일한 AI 채팅으로 연결되던 "빈 껍데기" 문제 해결
   - 각 섹션마다 고유한 AI 시스템 프롬프트 / 작업 동작 / 입력 UI 부여
   - topic: 학술 검색(트렌드) / 그 외: 섹션 특화 AI 생성
───────────────────────────────────────────── */

interface SectionDef {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  color: string;
  /** 섹션 특화 AI 시스템 프롬프트 */
  system: string;
  /** 캔버스 입력창 플레이스홀더 키 */
  placeholderKey: string;
  /** 주요 동작 버튼 라벨 키 */
  actionKey: string;
  /** topic 섹션만 학술 검색을 사용 */
  mode: "search" | "generate";
}

const RESEARCH_SECTIONS: SectionDef[] = [
  {
    id: "topic", icon: "🎯", titleKey: "researchPage.sections.topic.title", descKey: "researchPage.sections.topic.desc", color: "#6c8cff",
    system: "You are a research topic exploration expert. Suggest trending sub-topics, research gaps, and promising angles. Reply in Korean with a concise bulleted structure.",
    placeholderKey: "researchPage.sections.topic.placeholder",
    actionKey: "researchPage.sections.topic.action", mode: "search",
  },
  {
    id: "rq", icon: "❓", titleKey: "researchPage.sections.rq.title", descKey: "researchPage.sections.rq.desc", color: "#3ecfb2",
    system: "You are a research question design expert. Generate 3-5 well-formed research questions (RQ) from the user's topic, each with a one-line rationale and feasibility note. Reply in Korean.",
    placeholderKey: "researchPage.sections.rq.placeholder",
    actionKey: "researchPage.sections.rq.action", mode: "generate",
  },
  {
    id: "concept", icon: "🧠", titleKey: "researchPage.sections.concept.title", descKey: "researchPage.sections.concept.desc", color: "#a78bfa",
    system: "You are a conceptual framework expert. From the user's topic, identify key concepts, their relationships, and a candidate theoretical framework. Present as a structured concept map outline in Korean.",
    placeholderKey: "researchPage.sections.concept.placeholder",
    actionKey: "researchPage.sections.concept.action", mode: "generate",
  },
  {
    id: "method", icon: "📐", titleKey: "researchPage.sections.method.title", descKey: "researchPage.sections.method.desc", color: "#f59e0b",
    system: "You are a research methodology design expert. Recommend a suitable research design (quantitative/qualitative/mixed), sampling plan, data collection, and analysis methods. Reply in Korean with clear sections.",
    placeholderKey: "researchPage.sections.method.placeholder",
    actionKey: "researchPage.sections.method.action", mode: "generate",
  },
  {
    id: "roadmap", icon: "🗺️", titleKey: "researchPage.sections.roadmap.title", descKey: "researchPage.sections.roadmap.desc", color: "#e8b84b",
    system: "You are a research project planner. Produce a phased timeline with milestones and estimated durations for the user's research. Reply in Korean as an ordered roadmap.",
    placeholderKey: "researchPage.sections.roadmap.placeholder",
    actionKey: "researchPage.sections.roadmap.action", mode: "generate",
  },
  {
    id: "memory", icon: "💡", titleKey: "researchPage.sections.memory.title", descKey: "researchPage.sections.memory.desc", color: "#ec4899",
    system: "You are a research idea curator. Help the user refine, connect, and log their evolving research ideas. Summarize and suggest next directions in Korean.",
    placeholderKey: "researchPage.sections.memory.placeholder",
    actionKey: "researchPage.sections.memory.action", mode: "generate",
  },
];

const RD_TITLE_KEYS: Record<string, string> = {
  topic: "writingPage.linked.rdTopic",
  rq: "writingPage.linked.rdRq",
  concept: "writingPage.linked.rdConcept",
  method: "writingPage.linked.rdMethod",
  roadmap: "writingPage.linked.rdRoadmap",
  memory: "writingPage.linked.rdMemory",
};

interface ResearchDraft {
  active?: string;
  query?: string;
  canvasOutput?: string;
  copilotInput?: string;
  copilotOutput?: string;
  /** 섹션별 캔버스 결과 — 논문작성 연동용 */
  sectionOutputs?: Record<string, string>;
  sectionQueries?: Record<string, string>;
}

export default function ResearchPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState("topic");
  const [query, setQuery] = useState("");
  const [canvasOutput, setCanvasOutput] = useState("");
  const [sectionOutputs, setSectionOutputs] = useState<Record<string, string>>({});
  const [sectionQueries, setSectionQueries] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotOutput, setCopilotOutput] = useState("");
  const { generate, loading } = useGemini();

  const pushLinked = useCallback(
    (sectionId: string, body: string) => {
      const key = RESEARCH_SECTION_TO_KEY[sectionId] as LinkedResultKey | undefined;
      if (!key || !body.trim()) return;
      upsertLinkedResult({
        key,
        group: "research-design",
        title: t(RD_TITLE_KEYS[sectionId] || sectionId),
        body,
      });
    },
    [t]
  );

  // v49: 작업물 자동저장 + 프로젝트 저장 연동
  const getData = useCallback(
    (): ResearchDraft => ({
      active,
      query,
      canvasOutput,
      copilotInput,
      copilotOutput,
      sectionOutputs,
      sectionQueries,
    }),
    [active, query, canvasOutput, copilotInput, copilotOutput, sectionOutputs, sectionQueries]
  );
  const handleLoad = useCallback((data: unknown) => {
    const d = data as ResearchDraft;
    if (d.active) setActive(d.active);
    if (d.query !== undefined) setQuery(d.query);
    if (d.canvasOutput !== undefined) setCanvasOutput(d.canvasOutput);
    if (d.copilotInput !== undefined) setCopilotInput(d.copilotInput);
    if (d.copilotOutput !== undefined) setCopilotOutput(d.copilotOutput);
    if (d.sectionOutputs) setSectionOutputs(d.sectionOutputs);
    if (d.sectionQueries) setSectionQueries(d.sectionQueries);
    // 레거시: sectionOutputs 없이 canvasOutput만 있으면 현재 섹션에 복원
    if (!d.sectionOutputs && d.canvasOutput && d.active) {
      setSectionOutputs({ [d.active]: d.canvasOutput });
    }
  }, []);
  const handleReset = useCallback(() => {
    setActive("topic");
    setQuery("");
    setCanvasOutput("");
    setSectionOutputs({});
    setSectionQueries({});
    setCopilotInput("");
    setCopilotOutput("");
  }, []);
  usePagePersistence("research", handleLoad, handleReset);

  // 저장된 섹션 결과를 논문작성 브리지에 동기화
  useEffect(() => {
    for (const [sid, body] of Object.entries(sectionOutputs)) {
      if (body?.trim()) pushLinked(sid, body);
    }
  }, [sectionOutputs, pushLinked]);

  const section = useMemo(
    () => RESEARCH_SECTIONS.find((s) => s.id === active) ?? RESEARCH_SECTIONS[0],
    [active]
  );

  // 섹션 전환 시 해당 섹션의 이전 결과 복원 (다른 섹션 결과는 유지)
  const selectSection = (id: string) => {
    setActive(id);
    setCanvasOutput(sectionOutputs[id] || "");
    setQuery(sectionQueries[id] || "");
  };

  // 섹션 특화 주요 동작
  const runSectionAction = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      if (section.mode === "search") {
        const res = await fetch(`/api/scholar?q=${encodeURIComponent(query)}&region=international&limit=8`);
        const data = await res.json();
        const lines = (data?.results || [])
          .slice(0, 8)
          .map((r: { title?: string; year?: number }, i: number) => `${i + 1}. ${r.title} (${r.year || "N/A"})`);
        const trend = lines.length
          ? `${t("researchPage.recentPapersLabel").replace("{query}", query)}\n\n${lines.join("\n")}`
          : t("researchPage.searchNoResults");
        // 검색 결과를 바탕으로 AI 주제 제안도 덧붙임
        const suggest = await generate({
          systemInstruction: section.system,
          userText: `키워드: ${query}\n\n위 키워드에 대한 유망한 세부 주제, 연구 갭, 접근 각도를 제안해줘.`,
          temperature: 0.6,
        });
        const out = `${trend}\n\n──────────\n${t("researchPage.aiTopicSuggestLabel")}\n\n${suggest}`;
        setCanvasOutput(out);
        setSectionOutputs((prev) => ({ ...prev, [section.id]: out }));
        setSectionQueries((prev) => ({ ...prev, [section.id]: query }));
        pushLinked(section.id, out);
      } else {
        const out = await generate({
          systemInstruction: section.system,
          userText: query,
          temperature: 0.5,
          maxOutputTokens: 4096,
        });
        setCanvasOutput(out);
        setSectionOutputs((prev) => ({ ...prev, [section.id]: out }));
        setSectionQueries((prev) => ({ ...prev, [section.id]: query }));
        pushLinked(section.id, out);
      }
    } catch {
      setCanvasOutput(t("researchPage.processError"));
    } finally {
      setBusy(false);
    }
  };

  const askCopilot = async () => {
    if (!copilotInput.trim()) return;
    const out = await generate({
      systemInstruction: `You are an expert research design copilot focused on "${t(section.titleKey)}". Reply in Korean with actionable steps.`,
      userText: copilotInput,
      temperature: 0.5,
    });
    setCopilotOutput(out);
  };

  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <PageSaveRegistration pageId="research" getData={getData} />
      <div className="max-w-[1680px] mx-auto">
        <p className="text-[14px] text-white/20 font-mono mb-1">{t("researchPage.pageLabel")}</p>
        <h1 className="font-nanum-myeongjo text-[25px] font-bold text-[#e8eaf0] mb-1">{t("researchPage.title")}</h1>
        <p className="text-[16px] text-white/35 mb-6">{t("researchPage.subtitle")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {RESEARCH_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSection(s.id)}
              className="p-4 rounded-[14px] border text-left transition-all bg-[#13161e]"
              style={{
                borderColor: active === s.id ? s.color + "55" : "rgba(255,255,255,0.04)",
                boxShadow: active === s.id ? `0 0 0 1px ${s.color}30` : "none",
              }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span style={{ color: s.color }}><Icon name={s.icon} size={18} /></span>
                <span className="text-[17px] font-semibold text-[#e8eaf0]">{t(s.titleKey)}</span>
              </div>
              <p className="text-[15px] text-white/35 leading-relaxed">{t(s.descKey)}</p>
            </button>
          ))}
        </div>

        {/* 연구 캔버스 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="p-6 rounded-[16px] bg-[#13161e] border border-white/[0.04] min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <span style={{ color: section.color }}><Icon name={section.icon} size={16} /></span>
              <p className="text-[16px] font-semibold text-[#e8eaf0]">{t(section.titleKey)} {t("researchPage.canvasSuffix")}</p>
            </div>
            <div className="mb-4 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSectionAction()}
                className="flex-1 px-3 py-2.5 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#6c8cff]"
                placeholder={t(section.placeholderKey)}
              />
              <button
                onClick={runSectionAction}
                disabled={busy}
                className="px-4 py-2.5 rounded-lg text-[15px] font-medium text-white disabled:opacity-40 whitespace-nowrap"
                style={{ backgroundColor: section.color }}
              >
                {busy ? t("researchPage.processing") : t(section.actionKey)}
              </button>
            </div>
            <div className="h-[280px] overflow-y-auto rounded-xl border border-white/[0.04] bg-[#0f1117] p-4 text-[15px] text-white/55 whitespace-pre-wrap leading-[1.7]">
              {canvasOutput || `${t(section.descKey)}\n\n${t("researchPage.inputPrompt").replace("{action}", t(section.actionKey))}`}
            </div>
          </div>

          {/* AI Copilot 패널 */}
          <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[16px] font-semibold text-[#6c8cff] mb-3 flex items-center gap-1.5"><Icon name="engine" size={15} />{t("researchPage.copilotTitle")}</p>
            <div className="space-y-3 text-[15px] text-white/40 mb-4">
              <p>
                {(() => {
                  const [before, after] = t("researchPage.copilotDesc").split("{section}");
                  return (
                    <>
                      {before}
                      <span style={{ color: section.color }}>{t(section.titleKey)}</span>
                      {after}
                    </>
                  );
                })()}
              </p>
            </div>
            <input
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askCopilot()}
              className="w-full px-3 py-2.5 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#6c8cff]"
              placeholder={t("researchPage.copilotPlaceholder").replace("{section}", t(section.titleKey))}
            />
            <button onClick={askCopilot} disabled={loading} className="w-full mt-2 py-2 rounded-lg bg-[#6c8cff]/20 text-[#6c8cff] text-[15px] disabled:opacity-40">{loading ? t("researchPage.copilotAnalyzing") : t("researchPage.copilotAnalyze")}</button>
            {copilotOutput && <div className="mt-3 text-[15px] text-white/60 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{copilotOutput}</div>}
            <div className="mt-3 space-y-2">
              <Link href="/structure" className="block text-[14px] text-[#6c8cff] hover:underline">{t("researchPage.structureLink")}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
