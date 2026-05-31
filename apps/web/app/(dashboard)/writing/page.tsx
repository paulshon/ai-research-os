"use client";
import { Icon } from "@/components/ui/icon";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useGemini } from "@/hooks/use-gemini";
import { getChapters, THESIS_CATEGORIES, type Chapter } from "@/lib/research-data";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import { useTranslation } from "@/lib/i18n";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/editor/rich-text-editor";
import CitationInsertPanel from "@/components/citation/citation-insert-panel";

const COPILOT_TABS = [
  { key: "chat", icon: "💬", label: "AI 채팅" },
  { key: "verify", icon: "🛡", label: "검증 연결" },
  { key: "critique", icon: "📝", label: "논문 크리틱" },
];

interface WritingDraft {
  thesisType: string;
  activeChapter: string;
  activeSection: string;
  contents: Record<string, string>;
  copilotTab: number;
}

export default function WritingPage() {
  const { t } = useTranslation();
  const [thesisType, setThesisType] = useState("quant");
  const [activeChapter, setActiveChapter] = useState("CH.01");
  const [activeSection, setActiveSection] = useState("");
  const [contents, setContents] = useState<Record<string, string>>({
    "CH.01-0": "본 연구는 AI 기반 학술 연구 운영체제의 효과를 분석하기 위해...",
  });
  const [copilotTab, setCopilotTab] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showMobileCopilot, setShowMobileCopilot] = useState(false);
  const [showCitePanel, setShowCitePanel] = useState(false);
  const { generate, loading } = useGemini();

  // Persistence
  const getData = useCallback(
    (): WritingDraft => ({
      thesisType,
      activeChapter,
      activeSection,
      contents,
      copilotTab,
    }),
    [thesisType, activeChapter, activeSection, contents, copilotTab]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as WritingDraft;
    if (d.thesisType) setThesisType(d.thesisType);
    if (d.activeChapter) setActiveChapter(d.activeChapter);
    if (d.activeSection) setActiveSection(d.activeSection);
    if (d.contents) setContents(d.contents);
    if (d.copilotTab !== undefined) setCopilotTab(d.copilotTab);
  }, []);

  const handleReset = useCallback(() => {
    setThesisType("quant");
    setActiveChapter("CH.01");
    setActiveSection("");
    setContents({ "CH.01-0": "" });
    setCopilotTab(0);
  }, []);

  usePagePersistence("writing", handleLoad, handleReset);

  // Get chapters from structure engine based on thesis type
  const chapters = useMemo(() => getChapters(thesisType), [thesisType]);

  // Current chapter
  const currentChapter = useMemo(
    () => chapters.find((ch) => ch.num === activeChapter) ?? chapters[0],
    [chapters, activeChapter]
  );

  // Ensure activeChapter is valid when thesis type changes
  useEffect(() => {
    if (!chapters.find((ch) => ch.num === activeChapter)) {
      setActiveChapter(chapters[0]?.num ?? "CH.01");
    }
  }, [chapters, activeChapter]);

  const contentKey = activeSection || `${activeChapter}-0`;
  const content = contents[contentKey] ?? "";
  const setContent = (text: string) => {
    setContents((prev) => ({ ...prev, [contentKey]: text }));
  };

  // Active section title for header
  const sectionTitle = activeSection
    ? currentChapter?.micro.find((m) => m === activeSection) ?? currentChapter?.title
    : currentChapter?.title;

  // Current thesis type display
  const currentTypeName = THESIS_CATEGORIES.flatMap((c) => c.types).find((t) => t.id === thesisType)?.name ?? "양적 연구";

  const askCopilot = async () => {
    if (!prompt.trim()) return;
    const out = await generate({
      systemInstruction: "You are an academic writing copilot. Improve structure, tone, and coherence in Korean.",
      userText: `논문 유형: ${currentTypeName}\n현재 챕터: ${currentChapter?.title}\n문서 내용:\n${content.slice(0, 4000)}\n\n요청:\n${prompt}`,
      temperature: 0.4,
    });
    setResponse(out);
  };

  const handleThesisTypeChange = (typeId: string) => {
    setThesisType(typeId);
    setShowTypeMenu(false);
    // Reset to first chapter of new type
    const newChapters = getChapters(typeId);
    if (newChapters.length > 0) {
      setActiveChapter(newChapters[0].num);
      setActiveSection("");
    }
  };

  return (
    <div className="flex flex-col font-nanum-gothic h-full">
      {/* Top Bar */}
      <div className="h-11 bg-[#13161e] border-b border-white/[0.04] flex items-center px-3 md:px-4 gap-2 flex-shrink-0">
        {/* 현재 섹션 표시 (데스크탑) */}
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <Icon name="writing" size={14} className="text-[#a78bfa] flex-shrink-0" />
          <span className="text-[12px] text-white/55 truncate">{sectionTitle || "섹션을 선택하세요"}</span>
        </div>
        {/* 모바일 타이틀 */}
        <span className="md:hidden text-[12px] font-medium text-white/70 truncate flex-1">{sectionTitle || "논문 작성"}</span>

        <div className="hidden md:block flex-1" />

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* v31: 참고문헌 인용 삽입 버튼 */}
          <button
            onClick={() => setShowCitePanel(true)}
            className="h-8 px-2 md:px-2.5 flex items-center gap-1 rounded-lg bg-[#6c8cff]/10 text-[#6c8cff] border border-[#6c8cff]/20 hover:bg-[#6c8cff]/20 transition-colors"
            aria-label="참고문헌 인용"
            title="참고문헌 인용 삽입"
          >
            <Icon name="citation" size={14} />
            <span className="hidden sm:inline text-[11px]">인용</span>
          </button>
          <button
            onClick={() => setShowMobileCopilot((v) => !v)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20"
            aria-label="AI Copilot"
            title="AI Copilot"
          >
            <Icon name="engine" size={15} />
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(content.replace(/<[^>]+>/g, ""))}
            className="w-8 h-8 md:w-auto md:px-2.5 md:h-8 flex items-center justify-center gap-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
            aria-label="복사"
            title="복사"
          >
            <Icon name="files" size={14} />
            <span className="hidden md:inline text-[11px]">복사</span>
          </button>
          <button
            className="px-3 h-8 flex items-center gap-1 rounded-lg bg-[#e8b84b] text-[11px] text-black font-medium"
          >
            <Icon name="save" size={13} />
            <span className="hidden sm:inline">저장</span>
          </button>
        </div>
      </div>

      {/* 모바일 챕터/섹션 선택 (md 미만) */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] bg-[#0d0f14] flex-shrink-0">
        <div className="relative flex-1">
          <select
            value={activeChapter}
            onChange={(e) => { setActiveChapter(e.target.value); setActiveSection(""); }}
            className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12.5px] text-white/80 outline-none focus:border-[#6c8cff]"
          >
            {chapters.map((ch) => (
              <option key={ch.num} value={ch.num}>{ch.title}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30">
            <Icon name="chevronDown" size={13} />
          </span>
        </div>
        {currentChapter && currentChapter.micro.length > 0 && (
          <div className="relative flex-1">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12.5px] text-white/80 outline-none focus:border-[#6c8cff]"
            >
              <option value="">소절 선택</option>
              {currentChapter.micro.map((m, mi) => (
                <option key={mi} value={m}>{m}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30">
              <Icon name="chevronDown" size={13} />
            </span>
          </div>
        )}
      </div>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex" style={{minHeight:0}}>
        {/* Left: Chapter & Section Tree */}
        <div className="w-72 border-r border-white/[0.04] bg-[#0d0f14] overflow-y-auto flex-shrink-0 hidden md:block">
          <div className="p-3">
            {chapters.map((ch) => (
              <div key={ch.num} className="mb-2">
                <button
                  onClick={() => { setActiveChapter(ch.num); setActiveSection(""); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-all ${
                    activeChapter === ch.num
                      ? "bg-white/[0.06] text-white font-semibold"
                      : "text-white/40 hover:text-white/60 hover:bg-white/[0.02]"
                  }`}
                >
                  <span className="font-bold" style={{ color: ch.color }}>{ch.num}</span>
                  <span className="ml-1.5">{ch.title.replace(ch.num + " ", "")}</span>
                </button>
                {/* Sub-sections (micro) */}
                {activeChapter === ch.num && ch.micro.map((m, mi) => (
                  <button
                    key={mi}
                    onClick={() => setActiveSection(m)}
                    className={`w-full text-left pl-8 pr-3 py-1.5 text-[11px] transition-all ${
                      activeSection === m
                        ? "text-[#6c8cff] bg-[#6c8cff]/5"
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Editor */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10" style={{WebkitOverflowScrolling:"touch"}}>
          <div className="max-w-[680px] mx-auto">
            <h2 className="font-nanum-myeongjo text-[22px] font-bold text-[#e8eaf0] mb-2">{sectionTitle}</h2>
            {currentChapter && (
              <p className="text-[12px] text-white/25 mb-6">{currentChapter.desc}</p>
            )}
            <RichTextEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              placeholder="여기에 논문을 작성하세요..."
              minHeight={500}
            />
          </div>
        </div>

        {/* Right: AI Copilot Panel */}
        <div className={`border-l border-white/[0.04] bg-[#0f1117] overflow-y-auto flex-col flex-shrink-0 ${showMobileCopilot ? "flex w-full absolute inset-0 z-20 lg:relative lg:w-72" : "hidden lg:flex lg:w-72"}`}>
          <div className="p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[13px] font-semibold text-white/70">AI Copilot</p>
              <button onClick={() => setShowMobileCopilot(false)} className="lg:hidden text-white/30 hover:text-white/70 text-[18px] px-2"><Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} /></button>
            </div>
            <p className="text-[10px] text-white/25 mb-3">현재 작업에 대해 노움을 받으세요.</p>

            {/* Copilot tabs */}
            <div className="flex gap-1 mb-3">
              {COPILOT_TABS.map((tab, i) => (
                <button
                  key={tab.key}
                  onClick={() => setCopilotTab(i)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] border transition-all ${
                    copilotTab === i
                      ? "bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30"
                      : "text-white/30 border-white/[0.04] hover:text-white/50"
                  }`}
                >
                  <span><Icon name={tab.icon} className="inline-flex align-[-0.125em]" size={15} /></span> {tab.label}
                </button>
              ))}
            </div>

            {/* Thesis Type Selector */}
            <div className="relative mb-3">
              <button
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[11px] text-white/50 hover:border-white/[0.12] transition-all"
              >
                <span>현재 선택</span>
                <span className="text-white/30"><Icon name="chevronDown" size={12} /></span>
              </button>
              <p className="text-[10px] text-white/20 mt-1">좌측에서 섹션을 선택하세요</p>

              {showTypeMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1e2a] border border-white/[0.08] rounded-xl shadow-2xl z-50 max-h-[400px] overflow-y-auto">
                  {THESIS_CATEGORIES.map((cat, ci) => (
                    <div key={ci}>
                      <p className="px-3 pt-2 pb-1 text-[10px] text-white/20 font-medium">{cat.cat}</p>
                      {cat.types.map((ty) => (
                        <button
                          key={ty.id}
                          onClick={() => handleThesisTypeChange(ty.id)}
                          className={`w-full text-left px-3 py-2 text-[11px] hover:bg-white/[0.04] transition-colors ${
                            thesisType === ty.id ? "text-[#6c8cff] bg-[#6c8cff]/5" : "text-white/50"
                          }`}
                        >
                          {ty.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 text-[12px] text-white/35">
              {copilotTab === 0 && <p>현재 문서 컨텍스트를 기반으로 AI가 도움을 드립니다.</p>}
              {copilotTab === 1 && <p>논리 흐름, 인용 일관성, 어조 검증</p>}
              {copilotTab === 2 && <p>논문 크리틱 및 개선 제안</p>}
            </div>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askCopilot()}
              className="w-full mt-4 px-3 py-2.5 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]"
              placeholder="AI에게 질문하세요..."
            />
            <button onClick={askCopilot} disabled={loading} className="w-full mt-2 py-2 rounded-lg bg-[#a78bfa]/20 text-[#a78bfa] text-[12px] disabled:opacity-40">
              {loading ? "..." : "Copilot 실행"}
            </button>
            {response && (
              <div className="mt-3">
                <div className="text-[12px] text-white/60 whitespace-pre-wrap mb-2">{response}</div>
                <button
                  onClick={() => editorRef.current?.insertText(response)}
                  className="w-full py-1.5 rounded-lg bg-[#6c8cff]/15 text-[#6c8cff] text-[11px] font-medium hover:bg-[#6c8cff]/25 transition-all flex items-center justify-center gap-1"
                >
                  <Icon name="download" size={12} /> 에디터에 삽입
                </button>
              </div>
            )}
          </div>

          {/* 기본모드 버튼 (하단) */}
          <div className="mt-auto p-3 border-t border-white/[0.04]">
            <Link
              href="/structure"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12px] text-white/50 hover:text-white/80 hover:border-white/[0.12] transition-all"
            >
              ← 기본모드로 페이지 이동
            </Link>
          </div>
        </div>
      </div>

      {/* v31: 참고문헌 인용 삽입 패널 — 집필 중 바로 인용 삽입 */}
      <CitationInsertPanel
        open={showCitePanel}
        onClose={() => setShowCitePanel(false)}
        onInsertInText={(citation) => {
          editorRef.current?.insertText(citation);
        }}
      />
    </div>
  );
}
