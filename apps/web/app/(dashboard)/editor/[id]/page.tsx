"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import { getChapters, getThesisTypeName } from "@/lib/research-data";
import { useGemini } from "@/hooks/use-gemini";
import { useTranslation } from "@/lib/i18n";
import { localizeChapters } from "@/lib/i18n/research-labels";
import {
  editorSystemPrompt,
  editorUserPrompt,
  apiKeyMissingMessage,
  genericErrorMessage,
} from "@/lib/i18n/ai-prompts";

export default function EditorPage() {
  const { t, locale } = useTranslation();
  const [thesisType] = useState("quant");
  const [selectedSection, setSelectedSection] = useState<{ch: number; sec: number} | null>(null);
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [allData, setAllData] = useState<Record<string, string>>({});
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [saveFileName, setSaveFileName] = useState("thesis-draft");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { generate, loading } = useGemini();

  const chapters = useMemo(
    () => localizeChapters(getChapters(thesisType), thesisType, locale, t),
    [thesisType, locale, t]
  );
  const currentChapter = selectedSection ? chapters[selectedSection.ch] : null;
  const currentMicro = selectedSection && currentChapter ? currentChapter.micro[selectedSection.sec] : null;

  const getSectionKey = (ch: number, sec: number) => `${ch}-${sec}`;

  const getData = useCallback(() => {
    const data = { ...allData };
    if (selectedSection) {
      const key = getSectionKey(selectedSection.ch, selectedSection.sec);
      data[key] = content;
    }
    return { thesisType, selectedSection, content, allData: data };
  }, [thesisType, selectedSection, content, allData]);

  const handleLoad = useCallback((data: unknown) => {
    const d = data as {
      thesisType?: string;
      selectedSection?: { ch: number; sec: number } | null;
      content?: string;
      allData?: Record<string, string>;
    };
    if (d.allData) setAllData(d.allData);
    if (d.selectedSection !== undefined) {
      setSelectedSection(d.selectedSection);
      if (d.selectedSection && d.allData) {
        const key = getSectionKey(d.selectedSection.ch, d.selectedSection.sec);
        setContent(d.allData[key] ?? d.content ?? "");
      } else {
        setContent(d.content ?? "");
      }
    } else if (d.content !== undefined) {
      setContent(d.content);
    }
  }, []);

  const handleReset = useCallback(() => {
    setSelectedSection(null);
    setContent("");
    setAllData({});
    setSaved(false);
  }, []);

  usePagePersistence("editor", handleLoad, handleReset);

  const handleSectionSelect = (ch: number, sec: number) => {
    // save current content before switching
    if (selectedSection) {
      const key = getSectionKey(selectedSection.ch, selectedSection.sec);
      setAllData(prev => ({ ...prev, [key]: content }));
    }
    setSelectedSection({ ch, sec });
    const key = getSectionKey(ch, sec);
    setContent(allData[key] || "");
  };

  const generateAI = async () => {
    if (!currentChapter || !currentMicro) return;
    try {
      const result = await generate({
        systemInstruction: editorSystemPrompt(locale, getThesisTypeName(thesisType), currentChapter.title),
        userText: editorUserPrompt(locale, currentMicro),
        temperature: 0.6,
      });
      setContent(result);
    } catch (e: any) {
      setContent(
        e.message === "API_KEY_MISSING" ? apiKeyMissingMessage(locale) : genericErrorMessage(locale)
      );
    }
  };

  const save = () => {
    // save current section to allData
    const updatedData = { ...allData };
    if (selectedSection) {
      const key = getSectionKey(selectedSection.ch, selectedSection.sec);
      updatedData[key] = content;
      setAllData(updatedData);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 로컬 저장: 파일명 지정 다이얼로그 → JSON 다운로드
  const saveToLocal = () => {
    const updatedData = { ...allData };
    if (selectedSection) {
      const key = getSectionKey(selectedSection.ch, selectedSection.sec);
      updatedData[key] = content;
    }
    const blob = new Blob([JSON.stringify({ thesisType, savedAt: new Date().toISOString(), data: updatedData }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // saveFileName에 날짜 붙여서 저장
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `${saveFileName || "thesis-draft"}-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveDialog(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 로컬 불러오기: JSON 파일 로드
  const loadFromLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.data) {
          setAllData(parsed.data);
          setSelectedSection(null);
          setContent("");
        }
      } catch {
        alert("파일을 읽을 수 없습니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex h-full font-nanum-gothic">
      <PageSaveRegistration pageId="editor" getData={getData} />
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={loadFromLocal} />

      {/* ── 로컬저장 다이얼로그 ── */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1e2a] border border-white/10 rounded-2xl p-6 w-[360px] shadow-2xl">
            <h3 className="text-[18px] font-semibold mb-1">{t("editor.saveDialogTitle")}</h3>
            <p className="text-[14px] text-white/35 mb-4">{t("editor.saveDialogDesc")}</p>
            <div className="mb-3">
              <label className="text-[14px] text-white/40 block mb-1">{t("editor.fileName")}</label>
              <div className="flex items-center gap-2">
                <input
                  value={saveFileName}
                  onChange={e => setSaveFileName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveToLocal()}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#0d0f14] border border-white/[0.08] text-[16px] text-white focus:border-[#6c8cff] focus:outline-none"
                  placeholder="thesis-draft"
                  autoFocus
                />
                <span className="text-[14px] text-white/25 whitespace-nowrap">
                  -{new Date().toISOString().slice(0, 10)}.json
                </span>
              </div>
            </div>
            <p className="text-[13px] text-white/20 mb-4">{t("editor.saveHint")}</p>
            <div className="flex gap-2">
              <button onClick={saveToLocal} className="flex-1 py-2 bg-[#4a6cf7] text-white rounded-xl text-[16px] font-medium hover:bg-[#5d7dff] transition-colors">
                {t("save.save")}
              </button>
              <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 bg-white/[0.04] text-white/40 rounded-xl text-[16px] hover:bg-white/[0.08] transition-colors">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모바일: 섹션 선택 드로어 */}
      {showSectionPicker && (
        <div
          className="fixed inset-0 z-[9000] lg:hidden flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSectionPicker(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-h-[72vh] overflow-hidden bg-[#1a1e2a] border-t border-white/10 rounded-t-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <h3 className="text-[16px] font-semibold">{t("editor.selectSection")}</h3>
              <button
                onClick={() => setShowSectionPicker(false)}
                className="w-8 h-8 rounded-md bg-white/[0.04] text-white/50 hover:bg-white/[0.08] transition-colors"
              >
                <Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} />
              </button>
            </div>
            <div className="overflow-y-auto p-3">
              {chapters.map((ch, ci) => (
                <div key={ci} className="mb-2">
                  <p className="text-[14px] font-semibold text-white/40 px-2 py-1" style={{ color: ch.color }}>
                    {ch.num} {ch.title.split("(")[0]}
                  </p>
                  {ch.micro.map((m, mi) => {
                    const isActive = selectedSection?.ch === ci && selectedSection?.sec === mi;
                    return (
                      <button
                        key={mi}
                        onClick={() => {
                          handleSectionSelect(ci, mi);
                          setShowSectionPicker(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-[14px] transition-colors ${
                          isActive
                            ? "bg-white/[0.06] text-white"
                            : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
                        }`}
                      >
                        {m.split(":").pop()?.trim() || m}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LEFT: 섹션 네비게이터 */}
      <div className="hidden md:block w-56 border-r border-white/[0.04] bg-[#0d0f14] overflow-y-auto flex-shrink-0">
        <div className="p-3">
          {chapters.map((ch, ci) => (
            <div key={ci} className="mb-2">
              <p className="text-[14px] font-semibold text-white/40 px-2 py-1" style={{ color: ch.color }}>
                {ch.num} {ch.title.split("(")[0]}
              </p>
              {ch.micro.map((m, mi) => {
                const isActive = selectedSection?.ch === ci && selectedSection?.sec === mi;
                return (
                  <button key={mi} onClick={() => handleSectionSelect(ci, mi)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-[14px] transition-colors ${
                      isActive ? "bg-white/[0.06] text-white" : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
                    }`}>
                    {m.split(":").pop()?.trim() || m}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: 에디터 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-10 border-b border-white/[0.04] flex items-center px-4 gap-2">
          <div className="flex-1 min-w-0">
            {/* Mobile section picker trigger */}
            <button
              type="button"
              onClick={() => setShowSectionPicker(true)}
              className="md:hidden w-full text-left text-[16px] font-medium truncate"
              disabled={chapters.length === 0}
            >
              {currentMicro || t("editor.selectSection")}
            </button>
            <span className="hidden md:block text-[16px] font-medium">
              {currentMicro || t("editor.selectSection")}
            </span>
          </div>
          <button onClick={generateAI} disabled={loading || !selectedSection} className="px-3 py-1 rounded-md text-[14px] bg-[#4a6cf7]/10 text-[#6c8cff] border border-[#4a6cf7]/20 disabled:opacity-30">
            {loading ? t("editor.generating") : t("editor.aiGenerate")}
          </button>
          <button onClick={() => navigator.clipboard.writeText(content)} className="px-3 py-1 rounded-md text-[14px] bg-white/[0.04] border border-white/[0.06] text-white/40">
            {t("editor.copy")}
          </button>
          <button onClick={save} className="px-3 py-1 rounded-md text-[14px] bg-[#4a6cf7] text-white">
            {saved ? t("editor.saved") : t("save.save")}
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 px-6 py-4 bg-transparent text-[17px] text-white/80 leading-[1.9] focus:outline-none resize-none font-nanum-myeongjo"
          placeholder={selectedSection ? t("editor.placeholderWrite") : t("editor.selectLeft")}
          disabled={!selectedSection}
        />
      </div>

      {/* RIGHT: AI Copilot 컨텍스트 패널 (데스크탑에서만) */}
      <aside className="hidden lg:block w-80 border-l border-white/[0.04] bg-[#0d0f14] overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-white/[0.04]">
            <h3 className="text-[16px] font-semibold text-white/90">AI Copilot</h3>
            <p className="text-[14px] text-white/30 mt-1">
              현재 섹션에 맞춰 도움을 받으세요.
            </p>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/library"
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[15px] text-white/70 hover:bg-white/[0.07] hover:text-white transition-colors flex items-center gap-2"
              >
                <span><Icon name="library" className="inline-flex align-[-0.125em] mr-1" size={15} /></span>
                <span>{t("sidebar.library")}</span>
              </Link>
              <Link
                href="/validation"
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[15px] text-white/70 hover:bg-white/[0.07] hover:text-white transition-colors flex items-center gap-2"
              >
                <span><Icon name="🛡" className="inline-flex align-[-0.125em] mr-1" size={15} /></span>
                <span>{t("sidebar.validation")}</span>
              </Link>
              <Link
                href="/structure"
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[15px] text-white/70 hover:bg-white/[0.07] hover:text-white transition-colors flex items-center gap-2"
              >
                <span><Icon name="⬡" className="inline-flex align-[-0.125em] mr-1" size={15} /></span>
                <span>{t("sidebar.structure")}</span>
              </Link>
              <Link
                href="/critique"
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[15px] text-white/70 hover:bg-white/[0.07] hover:text-white transition-colors flex items-center gap-2"
              >
                <span><Icon name="📝" className="inline-flex align-[-0.125em] mr-1" size={15} /></span>
                <span>{t("sidebar.critique")}</span>
              </Link>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[13px] text-white/30">현재 선택</p>
              {currentChapter && currentMicro && selectedSection ? (
                <p className="text-[15px] text-white/80 mt-1">
                  {currentChapter.num}. {currentChapter.title.split("(")[0]} · {currentMicro}
                </p>
              ) : (
                <p className="text-[15px] text-white/40 mt-1">{t("editor.selectLeft")}</p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
