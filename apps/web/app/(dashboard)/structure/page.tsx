"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSafeUser } from "@/hooks/use-safe-clerk";
import { getChapters, getThesisTypeName, type Chapter } from "@/lib/research-data";
import { useGemini } from "@/hooks/use-gemini";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { ResizableRightPanel } from "@/components/ui/resizable-right-panel";
import { useTranslation } from "@/lib/i18n";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import { localizeCategories, localizeChapters } from "@/lib/i18n/research-labels";
import {
  structureSystemPrompt,
  structureChapterPrompt,
  apiKeyMissingMessage,
  genericErrorMessage,
} from "@/lib/i18n/ai-prompts";

interface StructureDraft {
  thesisType: string;
  expanded: number[];
  aiInput: string;
  aiOutput: string;
}

export default function StructurePage() {
  const { t, locale } = useTranslation();
  // v63: 구조엔진 페이지 좌측 ⬡ 버튼은 관리자 진입용 — 지정 계정에게만 활성화한다.
  const ADMIN_ENTRY_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_ENTRY_EMAIL || "").toLowerCase();
  const { user } = useSafeUser();
  const isAdminEntry =
    !!ADMIN_ENTRY_EMAIL &&
    !!user?.emailAddresses?.some((e) => e.emailAddress.toLowerCase() === ADMIN_ENTRY_EMAIL);
  const [thesisType, setThesisType] = useState("quant");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [aiInput, setAiInput] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [copilotEnabled, setCopilotEnabled] = useState(true);
  const [showMobileAI, setShowMobileAI] = useState(false);
  const { generate, loading } = useGemini();

  const getData = useCallback(
    (): StructureDraft => ({
      thesisType,
      expanded: Array.from(expanded),
      aiInput,
      aiOutput,
    }),
    [thesisType, expanded, aiInput, aiOutput]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as StructureDraft;
    if (d.thesisType) setThesisType(d.thesisType);
    if (d.expanded) setExpanded(new Set(d.expanded));
    if (d.aiInput !== undefined) setAiInput(d.aiInput);
    if (d.aiOutput !== undefined) setAiOutput(d.aiOutput);
  }, []);

  const handleReset = useCallback(() => {
    setThesisType("quant");
    setExpanded(new Set());
    setAiInput("");
    setAiOutput("");
  }, []);

  usePagePersistence("structure", handleLoad, handleReset);

  const categories = useMemo(() => localizeCategories(t), [t]);
  const chapters = useMemo(
    () => localizeChapters(getChapters(thesisType), thesisType, locale, t),
    [thesisType, locale, t]
  );

  const toggle = (i: number) => {
    const next = new Set(expanded);
    next.has(i) ? next.delete(i) : next.add(i);
    setExpanded(next);
  };

  const askAI = async (prompt?: string) => {
    const q = prompt || aiInput;
    if (!q.trim()) return;
    try {
      const typeName =
        categories.flatMap((c) => c.types).find((ty) => ty.id === thesisType)?.name ??
        getThesisTypeName(thesisType);
      const result = await generate({
        systemInstruction: structureSystemPrompt(locale, typeName),
        userText: q,
        temperature: 0.5,
      });
      setAiOutput(result);
    } catch (e: any) {
      setAiOutput(
        e.message === "API_KEY_MISSING" ? apiKeyMissingMessage(locale) : genericErrorMessage(locale)
      );
    }
  };

  const askChapterAI = (ch: Chapter) => {
    const typeName =
      categories.flatMap((c) => c.types).find((ty) => ty.id === thesisType)?.name ??
      getThesisTypeName(thesisType);
    const prompt = structureChapterPrompt(locale, typeName, ch);
    setAiInput(prompt);
    askAI(prompt);
  };

  // Current thesis type info (v16: localized via categories)
  const currentTypeInfo = categories.flatMap((c) => c.types).find((ty) => ty.id === thesisType);

  return (
    <div className="flex flex-col md:flex-row font-nanum-gothic">
      <PageSaveRegistration pageId="structure" getData={getData} />

      {/* v21: 모바일 AI 패널 토글 버튼 */}
      <div className="md:hidden flex items-center justify-end px-3 py-1.5 border-b border-white/[0.04] bg-[#0d0f14]">
        <button
          onClick={() => setShowMobileAI(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6c8cff]/10 text-[#6c8cff] text-[14px] border border-[#6c8cff]/20"
        >
          <Icon name="🤖" className="inline-flex align-[-0.125em] mr-1" size={15} />AI Copilot
        </button>
      </div>
      {/* Left: Chapter Structure & Thesis Type Selection */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Breadcrumb + 상단 메뉴(자동저장·상세에디터) — v6: 우측 패널에서 상단으로 이동, 한 줄 */}
        <div className="flex items-center justify-between gap-2 mb-4 text-[15px] text-white/30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{chapters[0]?.title?.split(" (")[0] ?? t("structurePage.introLabel")} ({chapters[0]?.title?.split(" (")[1]?.replace(")", "") ?? "Introduction"})</span>
            <span className="text-white/10">|</span>
            <span className="truncate">AI Copilot: Structure</span>
          </div>
          <div className="flex items-center gap-3 text-[14px] flex-shrink-0">
            <span className="text-white/20">{chapters.reduce((a, c) => a + c.micro.length, 0)} {t("structurePage.chaptersUnit")}</span>
            <span className="text-[#5ebd7c] inline-flex items-center gap-1"><Icon name="dot" size={10} /> {t("structurePage.autoSaved")}</span>
            <Link href="/editor/new" className="text-[#a78bfa] hover:underline inline-flex items-center"><Icon name="✦" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("structurePage.detailEditor")}</Link>
          </div>
        </div>

        <div className="mb-5">
          <h1 className="text-[23px] font-bold font-nanum-myeongjo mb-1 flex items-center gap-2">
            {isAdminEntry ? (
              <Link href="/admin" className="hover:opacity-70 transition-opacity" title={t("structurePage.adminPage")}><Icon name="⬡" className="inline-flex align-[-0.125em] mr-1" size={15} /></Link>
            ) : (
              <span className="opacity-30 cursor-not-allowed select-none" title={t("structurePage.adminOnly")} aria-disabled="true"><Icon name="⬡" className="inline-flex align-[-0.125em] mr-1" size={15} /></span>
            )}
            {t("pages.structure.title")}
          </h1>
          <p className="text-[16px] text-white/35">{t("pages.structure.desc")}</p>
        </div>

        {/* 논문 유형 선택 */}
        <div className="mb-6">
          {categories.map((cat, ci) => (
            <div key={ci} className="mb-3">
              <p className="text-[14px] text-white/25 mb-1.5">{cat.cat}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.types.map((ty) => (
                  <button key={ty.id} onClick={() => { setThesisType(ty.id); setExpanded(new Set()); }}
                    className={`px-3 py-1.5 rounded-lg text-[14px] border transition-all ${thesisType === ty.id ? "text-white border-white/20" : "text-white/30 border-white/[0.04] hover:border-white/10"}`}
                    style={thesisType === ty.id ? { backgroundColor: ty.color + "20", borderColor: ty.color + "40" } : {}}>
                    {ty.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Chapter overview with structure */}
        <div className="mb-4 p-4 rounded-2xl bg-[#13161e] border border-dashed border-white/[0.08]">
          <h2 className="font-nanum-myeongjo text-[21px] font-bold text-[#e8eaf0] mb-1">
            {chapters[0]?.title ?? t("structurePage.introDefaultTitle")}
          </h2>
          <p className="text-[15px] text-white/30 mb-3">{chapters[0]?.desc ?? ""}</p>
          <p className="text-[16px] text-white/50 leading-relaxed">
            {t("structurePage.introSample")}
          </p>
        </div>

        {/* Chapter cards with detailed micro/macro structure */}
        <div className="space-y-1">
          {chapters.map((ch, i) => (
            <div key={i} className="rounded-lg bg-[#13161e] border border-white/[0.04] overflow-hidden">
              <button onClick={() => toggle(i)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold font-['JetBrains_Mono',monospace]"
                  style={{ backgroundColor: ch.color + "20", color: ch.color }}>
                  {ch.num.replace("CH.", "")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold truncate">{ch.title}</p>
                </div>
                <span className="text-white/20 text-[14px]">{expanded.has(i) ? <Icon name="chevronUp" size={12} /> : <Icon name="chevronDown" size={12} />}</span>
              </button>

              {expanded.has(i) && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/[0.03]">
                  {/* Micro structure items */}
                  <div className="pt-3">
                    <p className="text-[14px] text-white/20 mb-2">{t("structure.microStructure")}</p>
                    {ch.micro.map((m, mi) => (
                      <p key={mi} className="text-[15px] text-white/40 pl-3 border-l-2 border-white/[0.06] mb-1.5 leading-relaxed">{m}</p>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[14px] text-[#5ebd7c] mb-1">{t("structure.goodPatterns")}</p>
                      {ch.goodPatterns.map((g, gi) => (
                        <span key={gi} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded text-[13px] bg-[#5ebd7c]/10 text-[#5ebd7c]">{g}</span>
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] text-[#ff7066] mb-1">{t("structure.badPatterns")}</p>
                      {ch.badPatterns.map((b, bi) => (
                        <span key={bi} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded text-[13px] bg-[#ff7066]/10 text-[#ff7066]">{b}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => askChapterAI(ch)} disabled={loading}
                    className="w-full mt-2 py-2 bg-[#4a6cf7]/10 text-[#6c8cff] rounded-lg text-[15px] border border-[#4a6cf7]/20 hover:bg-[#4a6cf7]/20 disabled:opacity-40 transition-colors">
                    {t("structure.aiChapterBtn")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: AI Writing Copilot */}
      <ResizableRightPanel storageKey="structure" className={`border-l border-white/[0.04] flex-col bg-[#0d0f14] overflow-y-auto ${showMobileAI ? "flex absolute inset-0 z-20 lg:relative" : "hidden md:flex"}`}>

        {/* v21: 모바일 닫기 버튼 */}
        <div className="md:hidden flex justify-end px-3 pt-2">
          <button onClick={() => setShowMobileAI(false)} className="text-white/30 hover:text-white/70 text-[21px] px-2"><Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} /></button>
        </div>
        {/* 헤더: 논문유형 + 자동저장 + 상세에디터 */}
        <div className="flex-shrink-0 border-b border-white/[0.04] bg-[#0d0f14]">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <select
                  value={thesisType}
                  onChange={(e) => { setThesisType(e.target.value); setExpanded(new Set()); }}
                  className="px-2 py-1 rounded-md bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white/50 focus:outline-none focus:border-[#6c8cff]"
                >
                  {categories.map((cat) =>
                    cat.types.map((ty) => (
                      <option key={ty.id} value={ty.id}>
                        {ty.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex items-center gap-2 text-[14px]">
                <span className="text-white/20">{chapters.reduce((a, c) => a + c.micro.length, 0)} {t("structurePage.chaptersUnit")}</span>
              </div>
            </div>

            <h3 className="text-[17px] font-semibold"><Icon name="🤖" className="inline-flex align-[-0.125em] mr-1" size={15} />AI Writing Copilot</h3>

            {/* Copilot toggle */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setCopilotEnabled(!copilotEnabled)}
                className={`relative w-8 h-4 rounded-full transition-colors ${copilotEnabled ? "bg-[#6c8cff]" : "bg-white/10"}`}
              >
                <div className={`absolute w-3 h-3 rounded-full bg-white top-0.5 transition-all ${copilotEnabled ? "left-4" : "left-0.5"}`} />
              </button>
              <span className="text-[14px] text-white/40">{copilotEnabled ? t("structurePage.on") : t("structurePage.off")}</span>
              <div className="flex-1" />
              <span className="text-[13px] text-white/20">1 {t("structurePage.chatUnit")}</span>
              <span className="text-[13px] text-white/20">0 {t("structurePage.validationUnit")}</span>
              <span className="text-[13px] text-white/20">1 {t("structurePage.citationUnit")}</span>
            </div>
          </div>

          {/* Copilot context info */}
          <div className="px-4 pb-3">
            <p className="text-[14px] text-white/25 mt-1">{t("structurePage.contextInfo")}</p>
          </div>

          {/* 입력창 + 전송버튼 */}
          <div className="px-3 pb-3 flex gap-2">
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), askAI())}
              className="flex-1 px-3 py-2 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[16px] text-white focus:border-[#6c8cff] focus:outline-none resize-none"
              placeholder={t("pages.structure.aiPlaceholder")}
              rows={2}
            />
            <button
              onClick={() => askAI()}
              disabled={loading}
              className="px-4 self-end py-2 bg-[#4a6cf7] text-white rounded-xl text-[15px] font-medium disabled:opacity-40 hover:bg-[#5d7dff] transition-colors"
            >
              {loading ? "..." : t("structurePage.runCopilot")}
            </button>
          </div>
        </div>

        {/* AI 응답 출력 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto p-4">
          {aiOutput ? (
            <div className="text-[16px] text-white/70 leading-relaxed whitespace-pre-wrap">{aiOutput}</div>
          ) : (
            <div className="text-center py-16 text-white/15">
              <p className="text-[23px] mb-2"><Icon name="⬡" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
              <p className="text-[15px] whitespace-pre-line">{t("structure.aiEmpty")}</p>
            </div>
          )}
        </div>
      </ResizableRightPanel>
    </div>
  );
}
