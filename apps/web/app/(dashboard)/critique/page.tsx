"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useGemini } from "@/hooks/use-gemini";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { useTranslation } from "@/lib/i18n";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import { critiqueAnalyzeSystemPrompt, critiqueAnalyzeUserPrompt } from "@/lib/i18n/ai-prompts";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  normalizeCritiqueDraft,
  type CritiqueDraft,
  type CritiqueCardDraft,
  type CritiquePdfPageDraft,
} from "@/lib/critique-draft";
import { savePageDraft } from "@/lib/project-save";
import {
  processDocument,
  toFormattedText,
  isSupportedFile,
  UODE_ACCEPT,
  formatLabel,
  type UODEBlock,
} from "@/lib/uode";
import DocumentReproduction from "@/components/uode/document-reproduction";

/* ────────────────── 타입 ────────────────── */
type CritiqueCard = CritiqueCardDraft;
type PdfPage = CritiquePdfPageDraft;

/* ────────────────── PDF 전체 페이지 렌더링 ────────────────── */
async function renderAllPages(
  arrayBuffer: ArrayBuffer,
  onProgress: (current: number, total: number) => void
): Promise<PdfPage[]> {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) return [];

  const typedArray = new Uint8Array(arrayBuffer);
  const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
  const totalPages = pdf.numPages;
  const pages: PdfPage[] = [];

  // 대용량 PDF 메모리 안전장치:
  // - 120페이지 초과 PDF는 썸네일 이미지를 생략하고 텍스트만 추출한다.
  //   크리틱은 텍스트만 있으면 완전히 동작하므로 400p도 문제없이 처리된다.
  // - 20~120p 구간은 해상도/품질을 단계적으로 낮춰 메모리 사용을 줄인다.
  const IMAGE_PAGE_CAP = 120; // 이미지로 렌더할 최대 페이지 수
  const renderImages = totalPages <= IMAGE_PAGE_CAP;
  const scale   = totalPages > 60 ? 1.1 : totalPages > 20 ? 1.3 : 1.5;
  const quality = totalPages > 60 ? 0.6 : 0.75;

  for (let i = 1; i <= totalPages; i++) {
    onProgress(i, totalPages);
    const page = await pdf.getPage(i);

    let dataUrl = "";
    if (renderImages) {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
      // 캔버스 즉시 해제 — GC가 메모리를 빠르게 회수하도록 유도
      canvas.width = 0;
      canvas.height = 0;
    }

    // 텍스트 추출 (모든 페이지 — 크리틱 분석의 핵심 소스)
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ").trim();

    pages.push({ pageNum: i, dataUrl, text });

    // pdf.js 페이지 객체 정리
    page.cleanup?.();
  }
  return pages;
}

/* ────────────────── 컴포넌트 ────────────────── */
export default function CritiquePage() {
  const { t, locale } = useTranslation();
  const TYPES = useMemo(
    () => [
      { id: "logic", label: t("critique.typeLogic"), color: "#ff7066" },
      { id: "evidence", label: t("critique.typeEvidence"), color: "#e8b84b" },
      { id: "concept", label: t("critique.typeConcept"), color: "#a78bfa" },
      { id: "style", label: t("critique.typeStyle"), color: "#6c8cff" },
      { id: "structure", label: t("critique.typeStructure"), color: "#5ebd7c" },
    ],
    [t]
  );
  const [fileName, setFileName]       = useState("");
  const [pdfPages, setPdfPages]       = useState<PdfPage[]>([]);
  const [docText, setDocText]         = useState(""); // txt/md 전용
  const [cards, setCards]             = useState<CritiqueCard[]>([]);
  const [activeType, setActiveType]   = useState("logic");
  const [filter, setFilter]           = useState("all");
  const [fontSize, setFontSize]       = useState(13);
  const [selText, setSelText]         = useState("");
  const [selPopup, setSelPopup]       = useState<{ x: number; y: number; pageNum: number } | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [isPdf, setIsPdf]             = useState(false);
  // 텍스트 모드 (txt/md) 블록 표시
  const [revealedLines, setRevealedLines] = useState(0);
  const [loadingText, setLoadingText] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pendingPdfBase64, setPendingPdfBase64] = useState<string | null>(null);
  // UODE 추출 블록 (PDF 외 포맷의 원문 형식 재현용)
  const [uodeBlocks, setUodeBlocks] = useState<UODEBlock[]>([]);
  const [uodeMeta, setUodeMeta] = useState("");
  // 모바일 3-pane 전환 ('structure' | 'viewer' | 'critique')
  const [mobilePane, setMobilePane] = useState<"structure" | "viewer" | "critique">("viewer");

  const fileRef   = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const { generate, loading } = useGemini();

  const buildDraft = useCallback((): CritiqueDraft => {
    const lineCount = docText.split(/\n{2,}/).filter((l) => l.trim()).length;
    return {
      version: 2,
      fileName,
      docText,
      cards,
      activeType,
      filter,
      fontSize,
      isPdf,
      pdfPages,
      pdfBase64,
      revealedLines: loadingText ? lineCount : revealedLines,
      uodeBlocks: uodeBlocks.length
        ? uodeBlocks.map((b) => ({
            index: b.index,
            type: b.type,
            text: b.text,
            level: b.level,
            table: b.table,
            page: b.page,
          }))
        : undefined,
      uodeMeta: uodeMeta || undefined,
    };
  }, [
    fileName,
    docText,
    cards,
    activeType,
    filter,
    fontSize,
    isPdf,
    pdfPages,
    pdfBase64,
    revealedLines,
    loadingText,
    uodeBlocks,
    uodeMeta,
  ]);

  const getData = useCallback((): CritiqueDraft => buildDraft(), [buildDraft]);

  const applyDraft = useCallback((raw: unknown) => {
    const d = normalizeCritiqueDraft(raw);
    if (d.fileName !== undefined) setFileName(d.fileName);
    if (d.docText !== undefined) setDocText(d.docText);
    if (d.cards) setCards(d.cards);
    if (d.activeType) setActiveType(d.activeType);
    if (d.filter) setFilter(d.filter);
    if (d.fontSize) setFontSize(d.fontSize);
    if (d.isPdf !== undefined) setIsPdf(d.isPdf);

    const pages = d.pdfPages ?? [];
    const hasThumbnails = pages.some((p) => p.dataUrl);
    if (hasThumbnails) {
      setPdfPages(pages);
      setPendingPdfBase64(null);
    } else if (pages.length > 0) {
      setPdfPages(pages);
    }

    if (d.pdfBase64) setPdfBase64(d.pdfBase64);
    if (!hasThumbnails && d.pdfBase64) {
      setPendingPdfBase64(d.pdfBase64);
    }

    if (d.revealedLines !== undefined) {
      setRevealedLines(d.revealedLines);
      setLoadingText(false);
    } else if (d.docText) {
      const lines = d.docText.split(/\n{2,}/).filter((l) => l.trim()).length;
      setRevealedLines(lines);
      setLoadingText(false);
    }

    if (d.uodeBlocks && d.uodeBlocks.length) {
      setUodeBlocks(
        d.uodeBlocks.map((b) => ({
          index: b.index,
          type: b.type as UODEBlock["type"],
          text: b.text,
          level: b.level,
          table: b.table,
          page: b.page,
        }))
      );
    } else {
      setUodeBlocks([]);
    }
    if (d.uodeMeta !== undefined) setUodeMeta(d.uodeMeta || "");
  }, []);

  const handleLoad = useCallback((data: unknown) => applyDraft(data), [applyDraft]);

  const handleReset = useCallback(() => {
    setFileName("");
    setPdfPages([]);
    setDocText("");
    setCards([]);
    setActiveType("logic");
    setFilter("all");
    setFontSize(13);
    setIsPdf(false);
    setRevealedLines(0);
    setPdfBase64(null);
    setPendingPdfBase64(null);
    setLoadingText(false);
    setUodeBlocks([]);
    setUodeMeta("");
  }, []);

  /* PDF 미리보기·원문·변환텍스트·크리틱 변경 시 프로젝트 임시저장용 draft 동기화 */
  useEffect(() => {
    if (!fileName && pdfPages.length === 0 && !docText && cards.length === 0) return;
    savePageDraft("critique", buildDraft());
  }, [buildDraft, fileName, pdfPages, docText, cards, pdfBase64]);

  /* 저장본에 PDF만 있고 썸네일 없을 때 재렌더 */
  useEffect(() => {
    if (!pendingPdfBase64 || !pdfJsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const buf = base64ToArrayBuffer(pendingPdfBase64);
        const pages = await renderAllPages(buf, () => {});
        if (!cancelled) {
          setPdfPages(pages);
          setPendingPdfBase64(null);
        }
      } catch {
        if (!cancelled) setPendingPdfBase64(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingPdfBase64, pdfJsLoaded]);

  usePagePersistence("critique", handleLoad, handleReset);

  /* PDF.js CDN 동적 로드 */
  useEffect(() => {
    if ((window as any).pdfjsLib) { setPdfJsLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  /* 텍스트 모드 순차 reveal */
  const textLines = docText.split(/\n{2,}/).filter(l => l.trim());
  useEffect(() => {
    if (!loadingText || textLines.length === 0) return;
    setRevealedLines(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setRevealedLines(i);
      if (i >= textLines.length) { clearInterval(t); setLoadingText(false); }
    }, 90);
    return () => clearInterval(t);
  }, [loadingText]); // eslint-disable-line

  /* 파일 업로드 핸들러 */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCards([]);
    setPdfPages([]);
    setDocText("");
    setPdfBase64(null);
    setPendingPdfBase64(null);
    setUodeBlocks([]);
    setUodeMeta("");
    setMobilePane("viewer");

    const isPdfFile = file.type === "application/pdf" || file.name.endsWith(".pdf");
    setIsPdf(isPdfFile);

    if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const text = await file.text();
      setDocText(text);
      setLoadingText(true);
    } else if (isPdfFile) {
      /* PDF → 전체 페이지 이미지 렌더링 */
      if (!pdfJsLoaded) {
        alert(t("critique.pdfJsLoading"));
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const buf = ev.target?.result as ArrayBuffer;
        setPdfBase64(arrayBufferToBase64(buf));
        setRenderProgress({ current: 0, total: 1 });
        try {
          const pages = await renderAllPages(buf, (cur, tot) => {
            setRenderProgress({ current: cur, total: tot });
          });
          setPdfPages(pages);
        } catch (err) {
          alert(t("critique.pdfRenderError"));
        } finally {
          setRenderProgress(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (isSupportedFile(file.name)) {
      /* DOCX/XLSX/PPTX/HWP/HWPX 등 → UODE 통합 엔진으로 추출 */
      setRenderProgress({ current: 0, total: 1 });
      try {
        const doc = await processDocument(file, {
          onProgress: (p) =>
            setRenderProgress({
              current: Math.max(0, p.percent),
              total: 100,
            }),
        });
        // 원문 형식 재현용 구조화 블록 저장 (PDF의 페이지 이미지에 대응)
        setUodeBlocks(doc.blocks as UODEBlock[]);
        const note = doc.notes.length ? ` · ${doc.notes.join(" / ")}` : "";
        setUodeMeta(
          `${formatLabel(doc.format)} · ${doc.charCount.toLocaleString()}자 · ` +
            `${doc.pageCount}p · 신뢰도 ${doc.confidence}%${note}`
        );
        // 텍스트 분석/검색용으로 원문 형식 보존 텍스트도 보관
        setDocText(toFormattedText(doc));
        setLoadingText(false);
        setRevealedLines(
          toFormattedText(doc).split(/\n{2,}/).filter((l) => l.trim()).length
        );
      } catch (err: any) {
        setDocText(
          `[${file.name}]\n문서 추출에 실패했습니다: ${
            err?.message || "알 수 없는 오류"
          }\n텍스트를 직접 입력하거나 붙여넣기 하세요.`
        );
        setLoadingText(true);
      } finally {
        setRenderProgress(null);
      }
    } else {
      setDocText(
        `[${file.name}]\n지원하지 않는 형식입니다. 텍스트를 직접 입력하거나 붙여넣기 하세요.`
      );
      setLoadingText(true);
    }
    e.target.value = "";
  };

  /* 텍스트 직접 입력 */
  const addTextMode = () => {
    const text = prompt(t("critique.pastePrompt"));
    if (text) {
      setDocText(text);
      setPdfPages([]);
      setIsPdf(false);
      setPdfBase64(null);
      setPendingPdfBase64(null);
      setUodeBlocks([]);
      setUodeMeta("");
      setCards([]);
      setLoadingText(true);
    }
  };

  /* 드래그 선택 핸들러 */
  const handleMouseUp = useCallback((e: React.MouseEvent, pageNum = 0) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 3) { setSelPopup(null); return; }
    setSelText(text);
    setSelPopup({ x: e.clientX, y: e.clientY, pageNum });
  }, []);

  const createCritiqueFromSelection = () => {
    if (!selText) return;
    const num = cards.length + 1;
    const newCard: CritiqueCard = {
      id: Date.now().toString(), num, type: activeType,
      text: selText, note: "", editNote: "",
      status: "open",
      pageNum: selPopup?.pageNum || 0,
    };
    setCards(prev => [...prev, newCard]);
    setEditingId(newCard.id);
    setSelPopup(null);
    window.getSelection()?.removeAllRanges();
    setMobilePane("critique");
  };

  /* 페이지 이미지에 크리틱 버튼 */
  const addPageCritique = (pageNum: number) => {
    const num = cards.length + 1;
    const newCard: CritiqueCard = {
      id: Date.now().toString(), num, type: activeType,
      text: `[${pageNum}페이지 전체]`, note: "", editNote: "",
      status: "open", pageNum,
    };
    setCards(prev => [...prev, newCard]);
    setEditingId(newCard.id);
    setMobilePane("critique");
  };

  /* AI 자동 분석 */
  const aiAnalyze = async () => {
    // 분석 텍스트 소스를 우선순위로 수집: PDF 페이지 텍스트 → UODE 블록 → docText
    let analysisText = "";
    if (isPdf && pdfPages.length > 0) {
      analysisText = pdfPages
        .map((p) => `[페이지 ${p.pageNum}]\n${p.text}`)
        .join("\n\n")
        .trim();
    }
    if (!analysisText && uodeBlocks.length > 0) {
      analysisText = uodeBlocks.map((b) => b.text).join("\n\n").trim();
    }
    if (!analysisText && docText.trim()) {
      analysisText = docText.trim();
    }
    analysisText = analysisText.slice(0, 8000);

    if (!analysisText.trim()) {
      // 이미지 전용(스캔) PDF 등 텍스트가 없을 때 명확히 안내
      alert(t("critique.noTextAlert"));
      return;
    }
    try {
      const result = await generate({
        systemInstruction: critiqueAnalyzeSystemPrompt(locale),
        userText: critiqueAnalyzeUserPrompt(locale, analysisText),
        temperature: 0.4,
      });
      try {
        const clean = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(clean);
        // 카드의 페이지 번호 보정: AI가 page 필드를 반환하지 않을 때
        // 카드 텍스트 앞 24자를 PDF 페이지 텍스트에서 검색해 pageNum을 자동 매핑한다.
        const findPageForText = (snippet: string): number => {
          if (!snippet || pdfPages.length === 0) return 0;
          const key = snippet.trim().slice(0, 24);
          if (!key) return 0;
          const hit = pdfPages.find((pg) => pg.text && pg.text.includes(key));
          return hit ? hit.pageNum : 0;
        };
        const newCards: CritiqueCard[] = parsed.map((p: any, i: number) => {
          const pageNum = p.page || findPageForText(p.text || "") || 0;
          return {
            id: Date.now() + "-" + i, num: cards.length + i + 1,
            type: p.type || "logic", text: p.text || "",
            note: p.note || "", editNote: p.note || "",
            status: "open" as const, pageNum,
          };
        });
        setCards(prev => [...prev, ...newCards]);
        // 크리틱 결과가 보이도록 모바일에서 크리틱 패널로 전환
        if (newCards.length > 0) setMobilePane("critique");
      } catch {
        setCards(prev => [...prev, {
          id: Date.now().toString(), num: prev.length + 1,
          type: "logic", text: "", note: result, editNote: result,
          status: "open", pageNum: 0,
        }]);
        setMobilePane("critique");
      }
    } catch (e: any) {
      alert(e.message === "API_KEY_MISSING" ? t("critique.apiKeyAlert") : t("critique.errorGeneric"));
    }
  };

  const updateStatus = (id: string, status: CritiqueCard["status"]) =>
    setCards(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  const saveNote = (id: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, note: c.editNote } : c));
    setEditingId(null);
  };
  const deleteCard = (id: string) =>
    setCards(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, num: i + 1 })));

  const filteredCards = filter === "all" ? cards : cards.filter(c => c.status === filter);

  /* ────────────────── 렌더 ────────────────── */
  return (
    <div className="flex flex-col lg:flex-row font-nanum-gothic" style={{ minHeight: "0" }}>
      <PageSaveRegistration pageId="critique" getData={getData} />

      {/* ─── 모바일 3-pane 전환 탭 (lg 미만에서만) ─── */}
      <div className="lg:hidden flex items-center gap-1 px-2 py-1.5 border-b border-white/[0.04] bg-[#13161e] flex-shrink-0">
        {([
          { id: "structure", icon: "folder", label: t("critique.paperStructure") },
          { id: "viewer", icon: "litReview", label: t("pages.critique.viewer") },
          { id: "critique", icon: "chat", label: t("critique.panel") },
        ] as const).map((p) => (
          <button
            key={p.id}
            onClick={() => setMobilePane(p.id)}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${
              mobilePane === p.id
                ? "bg-[#1e2230] text-white"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            <Icon name={p.icon} size={13} /> {p.label}
            {p.id === "critique" && cards.length > 0 && (
              <span className="ml-0.5 text-[9px] bg-[#ff7066] text-white px-1 rounded-full">{cards.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1" style={{ minHeight: "0" }}>

      {/* ─── LEFT: 논문 구조 패널 ─── */}
      <div className={`${mobilePane === "structure" ? "flex" : "hidden"} lg:flex w-full lg:w-52 border-r border-white/[0.04] bg-[#0d0f14] flex-col flex-shrink-0`}>
        <div className="p-3 flex-shrink-0">
          <p className="text-[12px] font-semibold text-white/60 mb-2"><Icon name="📂" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("critique.paperStructure")}</p>
          <div onClick={() => fileRef.current?.click()}
            className="p-4 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:border-[#6c8cff]/40 transition-colors mb-3">
            <p className="text-[20px] mb-1"><Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
            <p className="text-[10px] text-white/30">{t("pages.critique.upload")}</p>
            <p className="text-[9px] text-white/20">{t("critique.uploadFormats")}</p>
          </div>
          <input ref={fileRef} type="file" className="hidden" accept={UODE_ACCEPT} onChange={handleFile} />
          {fileName && <p className="text-[10px] text-[#6c8cff] mb-2 truncate"><Icon name="📎" className="inline-flex align-[-0.125em] mr-1" size={15} />{fileName}</p>}
          {renderProgress && (
            <div className="mb-2">
              <div className="flex justify-between text-[9px] text-white/30 mb-1">
                <span>{t("critique.rendering")}</span>
                <span>{renderProgress.current}/{renderProgress.total}p</span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-[#6c8cff] rounded-full transition-all"
                  style={{ width: `${(renderProgress.current / renderProgress.total) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* 페이지 목록 썸네일 네비게이션 */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {pdfPages.length > 0 ? (
            <>
              <p className="text-[10px] font-semibold text-white/30 mb-1.5 px-1">
                <Icon name="📑" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("critique.pageCount").replace("{n}", String(pdfPages.length))}
              </p>
              <div className="space-y-1.5">
                {pdfPages.map((pg) => {
                  const pgCards = cards.filter(c => c.pageNum === pg.pageNum);
                  return (
                    <div key={pg.pageNum}
                      className="relative cursor-pointer rounded-lg overflow-hidden border border-white/[0.05] hover:border-[#6c8cff]/40 transition-colors"
                      onClick={() => {
                        document.getElementById(`page-${pg.pageNum}`)?.scrollIntoView({ behavior: "smooth" });
                      }}>
                      {pg.dataUrl ? (
                        <img src={pg.dataUrl} alt={`${pg.pageNum}페이지`}
                          className="w-full" style={{ display: "block" }} />
                      ) : (
                        <div className="w-full h-10 bg-[#1a1e2a] flex items-center justify-center">
                          <span className="text-[9px] text-white/20">{pg.pageNum}p</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 flex items-center justify-between">
                        <span className="text-[9px] text-white/50">{pg.pageNum}p</span>
                        {pgCards.length > 0 && (
                          <span className="text-[8px] bg-[#ff7066] text-white px-1 rounded-full">{pgCards.length}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-white/30 mb-1 px-1"><Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("critique.paragraphStatus")}</p>
              <div className="space-y-0.5">
                {docText.split(/\n{2,}/).filter(p => p.trim()).slice(0, 20).map((p, i) => {
                  const cnt = cards.filter(c => c.text && p.includes(c.text.slice(0, 20))).length;
                  return (
                    <div key={i} className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-white/[0.02]">
                      <span className="text-[10px] text-white/20 min-w-[14px]">{i + 1}.</span>
                      <span className="text-[10px] text-white/25 truncate flex-1">{p.slice(0, 30)}</span>
                      {cnt > 0 && <span className="text-[8px] bg-[#ff7066]/20 text-[#ff7066] px-1 rounded">{cnt}</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── CENTER: 원문 뷰어 ─── */}
      <div className={`${mobilePane === "viewer" ? "flex" : "hidden"} lg:flex flex-1 flex-col border-r border-white/[0.04]`} style={{ minWidth: 0 }}>
        {/* 툴바 */}
        <div className="border-b border-white/[0.04] flex flex-wrap items-center gap-1.5 px-3 py-2 lg:h-10 lg:flex-nowrap lg:py-0 flex-shrink-0">
          <p className="text-[12px] font-semibold text-white/60 flex items-center gap-1"><Icon name="litReview" size={14} />{t("pages.critique.viewer")}</p>
          {pdfPages.length > 0 && (
            <span className="text-[10px] text-white/25 border border-white/[0.06] px-2 py-0.5 rounded">
              {t("critique.pageCount").replace("{n}", String(pdfPages.length))}
            </span>
          )}
          <div className="hidden lg:block flex-1" />
          <div className="flex items-center gap-1.5 flex-wrap ml-auto lg:ml-0">
            <button onClick={addTextMode}
              className="px-2.5 py-1.5 rounded-md text-[11px] bg-white/[0.04] border border-white/[0.06] text-white/45 hover:text-white/75 flex items-center gap-1">
              <Icon name="pencil" size={12} />{t("pages.critique.textInput")}
            </button>
            <button onClick={aiAnalyze}
              disabled={loading || (pdfPages.length === 0 && uodeBlocks.length === 0 && !docText.trim())}
              className="px-3 py-1.5 rounded-md text-[11px] bg-[#4a6cf7] text-white disabled:opacity-30 font-medium flex items-center gap-1">
              <Icon name="engine" size={12} />{loading ? t("pages.critique.analyzing") : `${t("pages.critique.aiAnalyze")}`}
            </button>
            <div className="relative">
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1.5 rounded-md text-[11px] bg-[#1a1e2a] border border-white/[0.06] text-white/45 outline-none">
                <option value="all">{t("critique.filterAll")}</option>
                <option value="open">{t("critique.filterOpen")}</option>
                <option value="in-revision">{t("critique.filterRevision")}</option>
                <option value="approved">{t("critique.filterApproved")}</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30"><Icon name="chevronDown" size={11} /></span>
            </div>
            <div className="flex items-center gap-0.5 border border-white/[0.06] rounded-md px-1 py-0.5">
              <button onClick={() => setFontSize(s => Math.max(10, s - 1))} className="text-[12px] text-white/35 hover:text-white/60 px-1.5">A−</button>
              <span className="text-[9px] text-white/25 min-w-[26px] text-center">{fontSize}px</span>
              <button onClick={() => setFontSize(s => Math.min(20, s + 1))} className="text-[12px] text-white/35 hover:text-white/60 px-1.5">A+</button>
            </div>
          </div>
        </div>

        {/* ── 뷰어 본문 ── */}
        <div ref={viewerRef} className="flex-1 overflow-y-auto" style={{ fontSize }}>
          {/* 렌더링 진행 중 */}
          {renderProgress && (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <p className="text-[32px] mb-4 animate-pulse"><Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
              <p className="text-[14px] mb-2">{t("critique.pdfRendering")}</p>
              <p className="text-[12px] mb-4">{renderProgress.current} / {renderProgress.total} {t("critique.pages")}</p>
              <div className="w-64 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#6c8cff] to-[#a78bfa] rounded-full transition-all"
                  style={{ width: `${(renderProgress.current / renderProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* ── PDF 전체 페이지 이미지 모드 ── */}
          {!renderProgress && pdfPages.length > 0 && (
            <div className="px-6 py-4 space-y-6">
              {pdfPages.map((pg) => {
                const pgCards = cards.filter(c => c.pageNum === pg.pageNum);
                return (
                  <div key={pg.pageNum} id={`page-${pg.pageNum}`}>
                    {/* 페이지 번호 헤더 */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] text-white/25 bg-white/[0.04] px-2 py-0.5 rounded">
                        {t("critique.pageN")} {pg.pageNum}
                      </span>
                      {pgCards.length > 0 && (
                        <span className="text-[9px] text-[#ff7066] bg-[#ff7066]/10 px-2 py-0.5 rounded">
                          {t("critique.critiqueOnPage").replace("{n}", String(pgCards.length))}
                        </span>
                      )}
                      <div className="flex-1 h-px bg-white/[0.04]" />
                    </div>

                    {/* 페이지 이미지 — 클릭 시 크리틱 팝업 (이미지가 있을 때만) */}
                    <div className="relative group max-w-[640px] mx-auto">
                      {pg.dataUrl ? (
                        <img
                          src={pg.dataUrl}
                          alt={`${pg.pageNum}페이지`}
                          className="w-full rounded-xl border border-white/[0.06] shadow-xl select-none"
                          style={{ display: "block" }}
                          draggable={false}
                        />
                      ) : (
                        // 120p 초과 PDF는 이미지 생략 → 텍스트-온리 플레이스홀더
                        <div className="w-full rounded-xl border border-white/[0.06] bg-[#13161e] px-5 py-4 min-h-[60px] flex items-center justify-center">
                          <span className="text-[11px] text-white/25">
                            {t("critique.pageN")} {pg.pageNum} · {t("critique.textOnlyPage")}
                          </span>
                        </div>
                      )}
                      {/* 크리틱 번호 오버레이 */}
                      {pgCards.map((c) => {
                        const typeInfo = TYPES.find(t => t.id === c.type);
                        return (
                          <span key={c.id}
                            className="absolute top-2 left-2 w-5 h-5 rounded-full text-white text-[9px] flex items-center justify-center font-bold shadow-lg"
                            style={{ backgroundColor: typeInfo?.color }}>
                            {c.num}
                          </span>
                        );
                      })}
                      {/* 호버 시 크리틱 추가 버튼 */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => addPageCritique(pg.pageNum)}
                          className="px-2.5 py-1 rounded-lg text-[10px] bg-[#4a6cf7] text-white font-medium shadow-lg hover:bg-[#5d7dff] transition-colors"
                        >
                          {t("critique.addCritique")}
                        </button>
                      </div>
                    </div>

                    {/* 페이지 변환 텍스트 — 드래그 선택 가능 */}
                    {pg.text && (
                      <div className="max-w-[640px] mx-auto mt-3 mb-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-px bg-white/[0.04]" />
                          <span className="text-[9px] text-white/15">{t("critique.convertedText")}</span>
                          <div className="flex-1 h-px bg-white/[0.04]" />
                        </div>
                        <p
                          className="text-white/40 leading-[1.8] text-[11px] select-text cursor-text px-1"
                          onMouseUp={(e) => handleMouseUp(e, pg.pageNum)}
                        >
                          {pg.text}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── UODE 원문 재현 모드 (PDF 외 포맷: DOCX/XLSX/PPTX/HWP 등) ── */}
          {!renderProgress && pdfPages.length === 0 && uodeBlocks.length > 0 && (
            <div>
              {uodeMeta && (
                <div className="px-6 pt-3">
                  <div className="max-w-[680px] mx-auto text-[10px] text-white/35 border border-white/[0.06] rounded px-2 py-1">
                    <Icon name="📑" className="inline-flex align-[-0.125em] mr-1" size={15} />{uodeMeta}
                  </div>
                </div>
              )}
              <DocumentReproduction
                blocks={uodeBlocks}
                fontSize={fontSize}
                onMouseUp={(e, pageNum) => handleMouseUp(e, pageNum)}
                renderPageBadge={(pageNum) => {
                  const n = cards.filter((c) => c.pageNum === pageNum).length;
                  return n > 0 ? (
                    <span className="text-[9px] text-[#ff7066] bg-[#ff7066]/10 px-2 py-0.5 rounded">
                      {t("critique.critiqueOnPage").replace("{n}", String(n))}
                    </span>
                  ) : null;
                }}
              />
            </div>
          )}

          {/* ── 텍스트 모드 (txt/md) ── */}
          {!renderProgress && pdfPages.length === 0 && uodeBlocks.length === 0 && (
            docText ? (
              <div className="px-5 py-4 space-y-4 select-text"
                onMouseUp={(e) => handleMouseUp(e, 0)}>
                {textLines.map((line, i) => {
                  if (i >= revealedLines && loadingText) return null;
                  const relatedNums = cards
                    .filter(c => c.text && line.includes(c.text.slice(0, 15)))
                    .map(c => c.num);
                  return (
                    <div key={i} className="relative" style={{ animation: "fadeIn 0.2s ease-out" }}>
                      <p className="text-white/70 leading-[1.9] whitespace-pre-wrap">{line}</p>
                      {relatedNums.length > 0 && (
                        <span className="absolute -right-1 top-0 flex gap-0.5">
                          {relatedNums.map(n => (
                            <span key={n} className="w-4 h-4 rounded-full bg-[#ff7066] text-white text-[8px] flex items-center justify-center font-bold">{n}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/15">
                <p className="text-[40px] mb-3"><Icon name="📝" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
                <p className="text-[14px] mb-1">{t("critique.emptyUploadTitle")}</p>
                <p className="text-[12px] text-white/10">{t("critique.emptyUploadDesc")}</p>
              </div>
            )
          )}
        </div>

        {/* 드래그 선택 팝업 */}
        {selPopup && selText && (
          <div className="fixed z-50 bg-[#1e2230] border border-white/10 rounded-xl shadow-2xl p-3 min-w-[210px]"
            style={{ left: selPopup.x - 105, top: selPopup.y - 90 }}>
            <p className="text-[10px] text-white/40 mb-2 truncate">
              "{selText.slice(0, 50)}{selText.length > 50 ? "..." : ""}"
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setActiveType(t.id)}
                  className={`px-2 py-0.5 rounded text-[9px] border transition-colors ${activeType === t.id ? "text-white border-white/20" : "text-white/30 border-white/[0.06]"}`}
                  style={activeType === t.id ? { backgroundColor: t.color + "20", borderColor: t.color + "50" } : {}}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createCritiqueFromSelection}
                className="flex-1 py-1.5 bg-[#4a6cf7] text-white rounded-lg text-[11px] font-medium">
                {t("critique.createCritique").replace("{n}", String(cards.length + 1))}
              </button>
              <button onClick={() => { setSelPopup(null); window.getSelection()?.removeAllRanges(); }}
                className="px-3 py-1.5 bg-white/[0.04] text-white/30 rounded-lg text-[11px]">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── RIGHT: 크리틱 패널 ─── */}
      <div className={`${mobilePane === "critique" ? "flex" : "hidden"} lg:flex w-full lg:w-[280px] flex-col flex-shrink-0 border-l border-white/[0.04]`}>
        <div className="p-3 border-b border-white/[0.04] flex-shrink-0 sticky top-0 z-10 bg-[#13161e]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold"><Icon name="💬" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("critique.panel")}</p>
            <span className="text-[10px] text-white/20">{cards.length}{t("critique.countUnit")}</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-1">
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setActiveType(t.id)}
                className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${activeType === t.id ? "text-white border-white/20" : "border-white/[0.04] text-white/25"}`}
                style={activeType === t.id ? { backgroundColor: t.color + "20", borderColor: t.color + "40" } : {}}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-white/15">{t("critique.dragHint")}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{WebkitOverflowScrolling:"touch"}}>
          {filteredCards.length === 0 ? (
            <div className="text-center py-8 text-white/15">
              <p className="text-[24px] mb-2"><Icon name="💬" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
              <p className="text-[11px]">{t("critique.noCritiquesTitle")}</p>
              <p className="text-[10px] mt-1 whitespace-pre-line">{t("critique.noCritiquesHint")}</p>
            </div>
          ) : (
            filteredCards.map((c) => {
              const typeInfo = TYPES.find(t => t.id === c.type);
              return (
                <div key={c.id} className="rounded-xl bg-[#13161e] border border-white/[0.04] overflow-hidden"
                  style={{ borderLeftColor: typeInfo?.color, borderLeftWidth: "3px" }}>
                  <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                    <span className="w-5 h-5 rounded-full text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0"
                      style={{ backgroundColor: typeInfo?.color }}>
                      {c.num}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: (typeInfo?.color || "#6c8cff") + "20", color: typeInfo?.color }}>
                      {typeInfo?.label.split(" ")[1]}
                    </span>
                    {c.pageNum ? (
                      <span className="text-[8px] text-white/20 bg-white/[0.04] px-1 rounded">{c.pageNum}p</span>
                    ) : null}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ml-auto ${
                      c.status === "open" ? "bg-[#ff7066]/10 text-[#ff7066]" :
                      c.status === "approved" ? "bg-[#5ebd7c]/10 text-[#5ebd7c]" :
                      c.status === "resubmitted" ? "bg-[#6c8cff]/10 text-[#6c8cff]" :
                      "bg-[#e8b84b]/10 text-[#e8b84b]"
                    }`}>{c.status}</span>
                    <button onClick={() => deleteCard(c.id)} className="text-[9px] text-white/15 hover:text-[#ff7066] ml-1"><Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} /></button>
                  </div>
                  {c.text && (
                    <p className="text-[10px] text-white/30 px-3 pb-1 italic leading-relaxed">
                      "{c.text.slice(0, 70)}{c.text.length > 70 ? "..." : ""}"
                    </p>
                  )}
                  <div className="px-3 pb-2">
                    {editingId === c.id ? (
                      <>
                        <textarea value={c.editNote}
                          onChange={e => setCards(prev => prev.map(x => x.id === c.id ? { ...x, editNote: e.target.value } : x))}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#1a1e2a] border border-white/[0.08] text-[11px] text-white/70 focus:outline-none focus:border-[#6c8cff]/50 resize-none"
                          placeholder={t("critique.editNotePlaceholder")} rows={3} autoFocus />
                        <div className="flex gap-1.5 mt-1.5">
                          <button onClick={() => saveNote(c.id)} className="flex-1 py-1 bg-[#4a6cf7] text-white rounded-md text-[10px] font-medium">{t("common.ok")}</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white/[0.04] text-white/30 rounded-md text-[10px]">{t("common.cancel")}</button>
                        </div>
                      </>
                    ) : (
                      c.note
                        ? <p className="text-[11px] text-white/60 leading-relaxed cursor-pointer hover:text-white/80" onClick={() => setEditingId(c.id)}>{c.note}</p>
                        : <button onClick={() => setEditingId(c.id)} className="text-[10px] text-white/20 hover:text-[#6c8cff]">{t("critique.addEditNote")}</button>
                    )}
                  </div>
                  <div className="flex gap-1 px-3 pb-2.5">
                    <button onClick={() => updateStatus(c.id, "in-revision")} className="flex-1 py-0.5 text-[9px] rounded bg-[#e8b84b]/10 text-[#e8b84b] hover:bg-[#e8b84b]/20">{t("critique.requestRevision")}</button>
                    <button onClick={() => updateStatus(c.id, "resubmitted")} className="flex-1 py-0.5 text-[9px] rounded bg-[#6c8cff]/10 text-[#6c8cff] hover:bg-[#6c8cff]/20">{t("critique.resubmit")}</button>
                    <button onClick={() => updateStatus(c.id, "approved")} className="flex-1 py-0.5 text-[9px] rounded bg-[#5ebd7c]/10 text-[#5ebd7c] hover:bg-[#5ebd7c]/20">{t("critique.approve")}</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-white/[0.04] flex-shrink-0">
          <p className="text-[10px] font-semibold text-white/40 mb-0.5">{t("critique.aiCritiqueTip")}</p>
          <p className="text-[9px] text-white/20">{t("critique.aiCritiqueDesc")}</p>
        </div>
      </div>

      </div>{/* /flex flex-1 min-h-0 (mobile pane wrapper) */}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
