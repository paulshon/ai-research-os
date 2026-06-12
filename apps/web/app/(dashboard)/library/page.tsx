"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useMemo, useCallback } from "react";
import { getChapters, getThesisTypeName } from "@/lib/research-data";
import { useGemini } from "@/hooks/use-gemini";
import { useTranslation } from "@/lib/i18n";
import { localizeCategories, localizeChapters } from "@/lib/i18n/research-labels";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";

interface LibraryDraft {
  thesisType: string;
  selectedChapter: number | null;
  patterns: string;
}

export default function LibraryPage() {
  const { t, locale } = useTranslation();
  const [thesisType, setThesisType] = useState("quant");
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [patterns, setPatterns] = useState("");
  const { generate, loading } = useGemini();
  const [mobileSidebar, setMobileSidebar] = useState(false); // v23: 모바일 좌측 패널 드로어

  const getData = useCallback(
    (): LibraryDraft => ({ thesisType, selectedChapter, patterns }),
    [thesisType, selectedChapter, patterns]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as LibraryDraft;
    if (d.thesisType) setThesisType(d.thesisType);
    if (d.selectedChapter !== undefined) setSelectedChapter(d.selectedChapter);
    if (d.patterns !== undefined) setPatterns(d.patterns);
  }, []);

  const handleReset = useCallback(() => {
    setThesisType("quant");
    setSelectedChapter(null);
    setPatterns("");
  }, []);

  usePagePersistence("library", handleLoad, handleReset);

  const categories = useMemo(() => localizeCategories(t), [t]);
  const chapters = useMemo(
    () => localizeChapters(getChapters(thesisType), thesisType, locale, t),
    [thesisType, locale, t]
  );

  const loadPatterns = async (chapterIdx: number) => {
    setSelectedChapter(chapterIdx);
    setMobileSidebar(false); // v23: 모바일에서 챕터 선택 시 드로어 닫기
    const ch = chapters[chapterIdx];
    if (!ch) return;
    try {
      const result = await generate({
        systemInstruction: `Academic sentence pattern expert for ${getThesisTypeName(thesisType)}.`,
        userText: `Provide sentence patterns for chapter "${ch.title}".`,
        temperature: 0.6,
      });
      setPatterns(result);
    } catch (e: unknown) {
      setPatterns(e instanceof Error && e.message === "API_KEY_MISSING" ? "API" : "Error");
    }
  };

  return (
    <div className="flex flex-col md:flex-row font-nanum-gothic">
      <PageSaveRegistration pageId="library" getData={getData} />

      {/* v23: 모바일 좌측 패널 토글 바 */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] bg-[#0d0f14] sticky top-0 z-[40]">
        <button
          onClick={() => setMobileSidebar(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white/70 active:scale-95 transition-transform"
        >
          <Icon name="📚" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("library.title")}
        </button>
        {selectedChapter !== null && chapters[selectedChapter] && (
          <span className="text-[13px] text-white/30 truncate">{chapters[selectedChapter].title}</span>
        )}
      </div>

      {/* v23: 모바일 드로어 백드롭 */}
      {mobileSidebar && (
        <div className="md:hidden fixed inset-0 z-[7800] bg-black/60" onClick={() => setMobileSidebar(false)} aria-hidden />
      )}

      {/* 좌측 사이드바 (데스크탑=고정 / 모바일=드로어) — 데스크탑과 동일 UI */}
      <div className={`${mobileSidebar ? "fixed inset-y-0 left-0 z-[7900] flex animate-slide-in-left" : "hidden"} md:relative md:z-auto md:flex w-80 max-w-[85vw] border-r border-white/[0.04] bg-[#0d0f14] flex-col overflow-y-auto flex-shrink-0`}>
        <div className="md:hidden flex justify-end px-3 pt-2 -mb-2">
          <button
            onClick={() => setMobileSidebar(false)}
            className="text-white/40 hover:text-white/70 text-[23px] leading-none px-2 py-1"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="p-4 border-b border-white/[0.04]">
          <h2 className="text-[17px] font-semibold"><Icon name="📚" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("library.title")}</h2>
          <p className="text-[14px] text-white/25 mt-1">{t("library.desc")}</p>
        </div>
        <div className="p-3">
          <select value={thesisType} onChange={e => { setThesisType(e.target.value); setSelectedChapter(null); setPatterns(""); }}
            className="w-full px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white/60 mb-3">
            {categories.map(cat => (
              <optgroup key={cat.cat} label={cat.cat}>
                {cat.types.map(ty => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="space-y-1">
            {chapters.map((ch, i) => (
              <button key={i} onClick={() => loadPatterns(i)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] transition-colors ${
                  selectedChapter === i ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"
                }`}>
                <span className="text-[13px] font-['JetBrains_Mono',monospace] mr-2" style={{ color: ch.color }}>{ch.num}</span>
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {patterns ? (
          <div className="max-w-[1080px]">
            <h3 className="text-[19px] font-semibold mb-4">
              {selectedChapter !== null && chapters[selectedChapter] ? `${chapters[selectedChapter].title} — ${t("library.patterns")}` : t("library.patterns")}
            </h3>
            <div className="text-[16px] text-white/70 leading-[1.8] whitespace-pre-wrap">{patterns}</div>
          </div>
        ) : loading ? (
          <div className="text-center py-20"><p className="text-white/25">{t("library.generating")}</p></div>
        ) : (
          <div className="text-center py-20 text-white/15">
            <p className="text-[27px] mb-2 flex justify-center"><Icon name="library" size={28} /></p>
            <p className="text-[17px]">{t("library.emptyTitle")}</p>
            <button
              onClick={() => setMobileSidebar(true)}
              className="md:hidden mt-4 px-4 py-2 rounded-lg bg-[#6c8cff]/15 border border-[#6c8cff]/30 text-[#6c8cff] text-[15px] font-medium inline-flex items-center gap-1.5"
            >
              <Icon name="menu" size={13} /> 챕터 선택하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
