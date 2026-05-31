"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useRef, useCallback } from "react";
import { useGemini } from "@/hooks/use-gemini";
import { useTranslation } from "@/lib/i18n";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import {
  processDocument,
  toFormattedText,
  isSupportedFile,
  UODE_ACCEPT,
  formatLabel,
  type UODEBlock,
} from "@/lib/uode";
import DocumentReproduction from "@/components/uode/document-reproduction";

interface AnalyzerDraft {
  text: string;
  fileName: string;
  tab: string;
  results: Record<string, string>;
}

export default function AnalyzerPage() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [tab, setTab] = useState("overall");
  const [results, setResults] = useState<Record<string, string>>({});
  const [uodeMsg, setUodeMsg] = useState("");
  const [uodeBlocks, setUodeBlocks] = useState<UODEBlock[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { generate, loading } = useGemini();

  const TABS = [
    { id: "source", label: t("analyzer.tabSource") },
    { id: "overall", label: t("analyzer.tabOverall") },
    { id: "micro", label: t("analyzer.tabMicro") },
    { id: "sentence", label: t("analyzer.tabSentence") },
    { id: "bert", label: t("analyzer.tabBert") },
    { id: "suggestions", label: t("analyzer.tabSuggestions") },
  ];

  const getData = useCallback(
    (): AnalyzerDraft => ({ text, fileName, tab, results }),
    [text, fileName, tab, results]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as AnalyzerDraft;
    if (d.text !== undefined) setText(d.text);
    if (d.fileName !== undefined) setFileName(d.fileName);
    if (d.tab) setTab(d.tab);
    if (d.results) setResults(d.results);
  }, []);

  const handleReset = useCallback(() => {
    setText("");
    setFileName("");
    setTab("overall");
    setResults({});
    setUodeMsg("");
    setUodeBlocks([]);
  }, []);

  usePagePersistence("analyzer", handleLoad, handleReset);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setUodeBlocks([]);
    // 평문류는 즉시 읽기
    if (
      file.type === "text/plain" ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".txt")
    ) {
      setText(await file.text());
      setUodeMsg("");
      return;
    }
    if (!isSupportedFile(file.name)) {
      setUodeMsg(`지원하지 않는 형식입니다: ${file.name}`);
      return;
    }
    // UODE 통합 엔진으로 모든 오피스 문서 추출
    try {
      const doc = await processDocument(file, {
        onProgress: (p) => setUodeMsg(`${p.message}`),
      });
      // 원문 형식을 보존한 텍스트로 출력 + 원문 재현 블록 저장
      setText(toFormattedText(doc));
      setUodeBlocks(doc.blocks as UODEBlock[]);
      setTab("source"); // 원문 재현 탭으로 전환
      const note = doc.notes.length ? ` · ${doc.notes.join(" / ")}` : "";
      setUodeMsg(
        `${formatLabel(doc.format)} · ${doc.charCount.toLocaleString()}자 · ` +
          `${doc.pageCount}p · 신뢰도 ${doc.confidence}%${note}`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "추출 실패";
      setUodeMsg(`${msg}`);
    }
  };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); };

  const runAnalysis = async (mode: string) => {
    if (!text.trim()) return;
    const prompts: Record<string, string> = {
      overall: "Analyze overall structure, logic flow, strengths and weaknesses.",
      micro: "Analyze paragraph-level micro-structure and connections.",
      sentence: "Analyze key sentences for academic appropriateness.",
      bert: "Validate core claims from a logical evidence perspective.",
      suggestions: "Provide section-by-section improvement suggestions.",
    };
    try {
      const result = await generate({
        systemInstruction: "You are an academic paper analysis expert. Respond in the user's language.",
        userText: `${prompts[mode]}\n\n---\n${text.slice(0, 15000)}\n---`,
        maxOutputTokens: 16384,
        temperature: 0.4,
      });
      setResults(prev => ({ ...prev, [mode]: result }));
      setTab(mode);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message === "API_KEY_MISSING" ? "API" : "Error";
      setResults(prev => ({ ...prev, [mode]: msg }));
    }
  };

  return (
    <div className="flex flex-col md:flex-row font-nanum-gothic">
      <PageSaveRegistration pageId="analyzer" getData={getData} />
      <div className="flex md:w-72 w-full md:border-r border-b md:border-b-0 border-white/[0.04] bg-[#0d0f14] flex-col md:overflow-y-auto flex-shrink-0 p-3 md:max-h-none max-h-[50vh] md:max-h-none overflow-y-auto">
        <p className="text-[12px] font-semibold text-white/60 mb-3"><Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("analyzer.title")}</p>
        <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
          className="p-6 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:border-[#6c8cff]/30 transition-colors mb-3">
          <p className="text-[24px] mb-2"><Icon name="📁" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
          <p className="text-[12px] text-white/50">{t("analyzer.pdfUpload")}</p>
          <p className="text-[10px] text-white/25">{t("analyzer.dragHint")}</p>
          <p className="text-[9px] text-white/20 mt-1">PDF · DOCX · XLSX · PPTX · HWP/HWPX · TXT · MD</p>
        </div>
        <input ref={fileRef} type="file" className="hidden" accept={UODE_ACCEPT} onChange={onFileChange} />
        {fileName && <p className="text-[11px] text-[#6c8cff] mb-2"><Icon name="📎" className="inline-flex align-[-0.125em] mr-1" size={15} />{fileName}</p>}
        {uodeMsg && <p className="text-[10px] text-white/40 mb-2 whitespace-pre-wrap leading-snug">{uodeMsg}</p>}
        <p className="text-[11px] text-white/20 mb-1">{t("analyzer.orText")}</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          className="flex-1 min-h-[80px] md:min-h-[120px] px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12px] text-white/70 focus:border-[#6c8cff] focus:outline-none resize-none mb-3"
          placeholder={t("analyzer.placeholder")} />
        <div className="space-y-1.5">
          <button onClick={() => runAnalysis("overall")} disabled={loading || !text.trim()} className="w-full py-2 bg-[#4a6cf7] text-white rounded-lg text-[12px] font-medium disabled:opacity-30">{t("analyzer.btnOverall")}</button>
          <button onClick={() => runAnalysis("micro")} disabled={loading || !text.trim()} className="w-full py-2 bg-white/[0.04] border border-white/[0.06] text-white/50 rounded-lg text-[12px] disabled:opacity-30">{t("analyzer.btnMicro")}</button>
          <button onClick={() => runAnalysis("sentence")} disabled={loading || !text.trim()} className="w-full py-2 bg-white/[0.04] border border-white/[0.06] text-white/50 rounded-lg text-[12px] disabled:opacity-30">{t("analyzer.btnSentence")}</button>
          <button onClick={() => runAnalysis("bert")} disabled={loading || !text.trim()} className="w-full py-2 bg-white/[0.04] border border-white/[0.06] text-[#60a5fa] rounded-lg text-[12px] disabled:opacity-30">{t("analyzer.btnBert")}</button>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-10 border-b border-white/[0.04] flex items-center px-3 gap-0.5 overflow-x-auto scrollbar-none flex-shrink-0">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-3 py-1 rounded-md text-[12px] transition-colors whitespace-nowrap flex-shrink-0 ${tab === tb.id ? "bg-[#1e2230] text-white" : "text-white/30 hover:text-white/50"}`}>
              {tb.label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto p-4 md:p-6">
          {loading && <div className="text-center py-10 text-white/25">{t("analyzer.analyzing")}</div>}
          {tab === "source" ? (
            uodeBlocks.length > 0 ? (
              <div className="-mx-6 -my-0">
                <DocumentReproduction blocks={uodeBlocks} fontSize={13} />
              </div>
            ) : text ? (
              <div className="text-[13px] text-white/70 leading-[1.8] whitespace-pre-wrap max-w-3xl">{text}</div>
            ) : !loading && (
              <div className="text-center py-20 text-white/15">
                <p className="text-[32px] mb-3"><Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
                <p className="text-[14px]">{t("analyzer.sourceEmpty")}</p>
              </div>
            )
          ) : results[tab] ? (
            <div className="text-[13px] text-white/70 leading-[1.8] whitespace-pre-wrap max-w-3xl">{results[tab]}</div>
          ) : !loading && (
            <div className="text-center py-20 text-white/15">
              <p className="text-[32px] mb-3"><Icon name="🔬" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
              <p className="text-[14px]">{t("analyzer.empty")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
