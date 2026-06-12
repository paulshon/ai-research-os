"use client";
import { Icon } from "@/components/ui/icon";
import { ResizableRightPanel } from "@/components/ui/resizable-right-panel";

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
import { convertHwpToPdf, isHwpFile } from "@/lib/hwp-convert";
import { aiProgress } from "@/lib/ai-progress";

/* ────────────────── 타입 ────────────────── */
type CritiqueCard = CritiqueCardDraft;
type PdfPage = CritiquePdfPageDraft;

/* ────────────────── PDF 텍스트 추출(전 페이지) + 문서 핸들 보존 ──────────────────
   v32 핵심 개선 — 400페이지 이상 대용량 PDF도 "원문 이미지"가 항상 보이도록 변경.
   기존 v31은 120페이지 초과 PDF의 이미지를 통째로 생략(텍스트만)했기 때문에
   "원문은 안 나오고 변환텍스트만 나오는" 문제가 있었다.

   새 방식:
   - 업로드 즉시 모든 페이지의 "텍스트"만 추출한다 (크리틱 분석의 핵심 소스, 매우 가벼움).
   - 원문 페이지 이미지는 화면(뷰포트) 근처에 들어온 페이지만 그 순간 캔버스로 렌더한다(LazyPdfPage).
   ⇒ 페이지 수와 무관하게 메모리 사용이 일정하게 유지되며, 원문이 항상 표시된다. */
async function extractPdf(
  arrayBuffer: ArrayBuffer,
  onProgress: (current: number, total: number) => void
): Promise<{ doc: any; pages: PdfPage[] }> {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) return { doc: null, pages: [] };

  // getDocument가 입력 버퍼를 detach 할 수 있으므로 복사본을 전달
  const typedArray = new Uint8Array(arrayBuffer.slice(0));
  const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
  const totalPages = doc.numPages;
  const pages: PdfPage[] = [];

  for (let i = 1; i <= totalPages; i++) {
    onProgress(i, totalPages);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ").trim();
    pages.push({ pageNum: i, dataUrl: "", text });
    page.cleanup?.();
  }
  return { doc, pages };
}

/* ────────────────── 지연 렌더링 PDF 페이지 이미지 ──────────────────
   IntersectionObserver로 뷰포트 근처에 들어온 페이지만 캔버스로 렌더하고,
   멀어지면 이미지를 해제해 대용량 PDF(400p+)에서도 메모리를 일정하게 유지한다. */
function LazyPdfPage({
  doc,
  pageNum,
  scale = 1.4,
  quality = 0.72,
  thumb = false,
  imgClassName = "",
  onImageMouseUp,
  children,
}: {
  doc: any;
  pageNum: number;
  scale?: number;
  quality?: number;
  thumb?: boolean;
  imgClassName?: string;
  onImageMouseUp?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState("");
  const [near, setNear] = useState(false);
  const [aspect, setAspect] = useState(1.414); // 기본 A4 세로비 (height/width)

  // 뷰포트 근접 감지
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setNear(e.isIntersecting)),
      { root: null, rootMargin: thumb ? "300px 0px" : "800px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [thumb]);

  // 보이는 동안 렌더
  useEffect(() => {
    if (!near || !doc || dataUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          setAspect(viewport.height / viewport.width);
          setDataUrl(canvas.toDataURL("image/jpeg", quality));
        }
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup?.();
      } catch {
        /* 렌더 실패 시 플레이스홀더 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [near, doc, pageNum, scale, quality, dataUrl]);

  // 화면에서 멀어지면 일정 시간 뒤 이미지 해제 (메모리 상한 유지)
  useEffect(() => {
    if (near || !dataUrl) return;
    const id = setTimeout(() => setDataUrl(""), 5000);
    return () => clearTimeout(id);
  }, [near, dataUrl]);

  return (
    <div ref={holderRef} className="relative">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`${pageNum}p`}
          className={imgClassName}
          style={{ display: "block", width: "100%" }}
          draggable={false}
          onMouseUp={onImageMouseUp}
        />
      ) : (
        <div
          className={`w-full ${thumb ? "" : "rounded-xl border border-white/[0.06]"} bg-[#13161e] flex items-center justify-center`}
          style={{ aspectRatio: `1 / ${aspect}`, minHeight: thumb ? 30 : 120 }}
        >
          <span className="text-[13px] text-white/20 animate-pulse">{pageNum}p</span>
        </div>
      )}
      {children}
    </div>
  );
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
  // 모바일(<lg=1024px) 여부 — 선택 팝업을 하단 시트로 표시하기 위함
  const [isMobile, setIsMobile]       = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [isPdf, setIsPdf]             = useState(false);
  // 지연 렌더링용 살아있는 PDF 문서 핸들 (직렬화 대상 아님)
  const [pdfDoc, setPdfDoc]           = useState<any>(null);
  // 원문 ↔ 패널 양방향 연동: 현재 강조 중인 크리틱 카드
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
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
    setPdfDoc(null);
    setActiveCardId(null);
  }, []);

  /* PDF 미리보기·원문·변환텍스트·크리틱 변경 시 프로젝트 임시저장용 draft 동기화 */
  useEffect(() => {
    if (!fileName && pdfPages.length === 0 && !docText && cards.length === 0) return;
    savePageDraft("critique", buildDraft());
  }, [buildDraft, fileName, pdfPages, docText, cards, pdfBase64]);

  /* 저장본에 PDF가 있을 때(썸네일 없음) 문서 핸들을 다시 열어 지연 렌더 가능하게 함 */
  useEffect(() => {
    if (!pendingPdfBase64 || !pdfJsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const buf = base64ToArrayBuffer(pendingPdfBase64);
        const { doc, pages } = await extractPdf(buf, () => {});
        if (!cancelled) {
          setPdfDoc(doc);
          // 저장본에 이미 텍스트가 있으면 유지, 없으면 추출 결과로 채움
          setPdfPages((prev) =>
            prev.length === pages.length && prev.some((p) => p.text) ? prev : pages
          );
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
    setPdfDoc(null);
    setActiveCardId(null);
    setMobilePane("viewer");

    // v11: HWP/HWPX → 서버(LibreOffice)에서 PDF 변환 시도 → 성공 시 원문 그대로 PDF 렌더.
    //      변환기 미설치/실패 시 브라우저 내장 HWP 파서(UODE)로 자동 폴백.
    let workFile = file;
    if (isHwpFile(file)) {
      const hwpTok = aiProgress.begin("한컴 문서 PDF 변환 중");
      const conv = await convertHwpToPdf(file, (m) => aiProgress.setLabel(m));
      aiProgress.end(hwpTok);
      if (conv.pdf) {
        workFile = conv.pdf;
        setUodeMeta("HWP→PDF 변환(LibreOffice)으로 원문을 재현했습니다.");
      } else if (conv.reason === "failed" && conv.message) {
        setUodeMeta(`HWP 변환기 사용 불가 → 내장 파서로 처리. (${conv.message})`);
      }
    }

    const isPdfFile =
      workFile.type === "application/pdf" || workFile.name.endsWith(".pdf");
    setIsPdf(isPdfFile);

    if (
      workFile.type === "text/plain" ||
      workFile.name.endsWith(".md") ||
      workFile.name.endsWith(".txt")
    ) {
      const text = await workFile.text();
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
          const { doc, pages } = await extractPdf(buf, (cur, tot) => {
            setRenderProgress({ current: cur, total: tot });
          });
          setPdfDoc(doc);
          setPdfPages(pages);
        } catch (err) {
          alert(t("critique.pdfRenderError"));
        } finally {
          setRenderProgress(null);
        }
      };
      reader.readAsArrayBuffer(workFile);
    } else if (isSupportedFile(workFile.name)) {
      /* DOCX/XLSX/PPTX/HWP/HWPX 등 → UODE 통합 엔진으로 추출 */
      setRenderProgress({ current: 0, total: 1 });
      try {
        const doc = await processDocument(workFile, {
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
          `[${workFile.name}]\n문서 추출에 실패했습니다: ${
            err?.message || "알 수 없는 오류"
          }\n텍스트를 직접 입력하거나 붙여넣기 하세요.`
        );
        setLoadingText(true);
      } finally {
        setRenderProgress(null);
      }
    } else {
      setDocText(
        `[${workFile.name}]\n지원하지 않는 형식입니다. 텍스트를 직접 입력하거나 붙여넣기 하세요.`
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
      setPdfDoc(null);
      setUodeBlocks([]);
      setUodeMeta("");
      setCards([]);
      setLoadingText(true);
    }
  };

  /* 드래그 선택 핸들러 */
  // ── 텍스트 선택 → 크리틱 생성 (데스크탑 floating / 모바일 bottom-sheet) ──
  // 모바일은 touchend 시점에 selection이 불안정하므로, 전역 selectionchange를 듣고
  // 선택이 확정되면 페인/페이지 정보와 함께 팝업을 띄운다.
  const selectionPageRef = useRef(0);

  const evaluateSelection = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().replace(/\s+/g, " ").trim();
    if (!text || text.length < 2) {
      return;
    }
    // 선택이 뷰어 영역(원문/변환텍스트/재현) 안에 있는지 확인
    let pageNum = selectionPageRef.current || 0;
    let inViewer = false;
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      let el: HTMLElement | null =
        node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
      while (el) {
        if (el.dataset && el.dataset.selectable === "1") {
          inViewer = true;
          if (el.dataset.page) pageNum = parseInt(el.dataset.page, 10) || pageNum;
          break;
        }
        el = el.parentElement;
      }
    }
    if (!inViewer) return;

    // 팝업 좌표(데스크탑 floating용) — 선택 영역 상단 중앙
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (sel && sel.rangeCount > 0) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width || rect.height) {
        x = rect.left + rect.width / 2;
        y = rect.top;
      }
    }
    setSelText(text);
    setSelPopup({ x, y, pageNum });
  }, []);

  // 전역 selectionchange — 디바운스해서 평가
  useEffect(() => {
    let raf = 0;
    const onChange = () => {
      window.clearTimeout(raf);
      raf = window.setTimeout(() => evaluateSelection(), 150) as unknown as number;
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      document.removeEventListener("selectionchange", onChange);
      window.clearTimeout(raf);
    };
  }, [evaluateSelection]);

  // 마우스/터치 — 어떤 페이지에서 선택이 시작됐는지 기록 + 즉시 평가(데스크탑 반응성)
  const handleMouseUp = useCallback(
    (_e: React.MouseEvent, pageNum = 0) => {
      selectionPageRef.current = pageNum;
      evaluateSelection();
    },
    [evaluateSelection]
  );

  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent, pageNum = 0) => {
      selectionPageRef.current = pageNum;
      // 모바일은 손 뗀 직후 selection 확정 지연 → 약간 늦게 평가(selectionchange가 백업)
      setTimeout(() => evaluateSelection(), 80);
    },
    [evaluateSelection]
  );

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
        // 카드 텍스트를 PDF 페이지 텍스트에서 검색해 pageNum을 자동 매핑한다.
        // 공백을 정규화하고 키 길이를 단계적으로 줄여 매칭률을 높이며,
        // 끝내 못 찾으면 1페이지로 폴백해 원문에 번호가 항상 표시되게 한다.
        const norm = (s: string) => s.replace(/\s+/g, " ").trim();
        const findPageForText = (snippet: string): number => {
          if (!snippet || pdfPages.length === 0) return 0;
          const s = norm(snippet);
          for (const len of [40, 24, 14, 8]) {
            const key = s.slice(0, len);
            if (key.length < 6) continue;
            const hit = pdfPages.find((pg) => pg.text && norm(pg.text).includes(key));
            if (hit) return hit.pageNum;
          }
          return pdfPages[0]?.pageNum || 0;
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

  /* ── 크리틱 ↔ 원문/패널 양방향 연동 ── */
  // 특정 텍스트(문단/페이지)와 연결된 크리틱 카드 목록
  const relatedCards = useCallback(
    (text: string, pageNum = 0): CritiqueCard[] => {
      const norm = (s: string) => s.replace(/\s+/g, " ").trim();
      const hay = norm(text);
      const seen = new Set<string>();
      return cards.filter((c) => {
        if (seen.has(c.id)) return false;
        const byPage = !!pageNum && c.pageNum === pageNum;
        let byText = false;
        if (c.text) {
          const key = norm(c.text).slice(0, 18);
          byText = key.length >= 6 && hay.includes(key);
        }
        if (byPage || byText) {
          seen.add(c.id);
          return true;
        }
        return false;
      });
    },
    [cards]
  );

  // 패널 카드 → 원문 위치로 이동 (모바일은 뷰어 페인으로 전환)
  const jumpToCardSource = (card: CritiqueCard) => {
    setActiveCardId(card.id);
    setMobilePane("viewer");
    setTimeout(() => {
      const target =
        (card.pageNum && document.getElementById(`page-${card.pageNum}`)) ||
        document.getElementById(`card-anchor-${card.id}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  // 원문 번호 → 패널 카드로 이동 (모바일은 크리틱 페인으로 전환)
  const focusCardInPanel = (cardId: string) => {
    setActiveCardId(cardId);
    setMobilePane("critique");
    setTimeout(() => {
      document
        .getElementById(`card-${cardId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const filteredCards = filter === "all" ? cards : cards.filter(c => c.status === filter);

  /* ────────────────── 렌더 ────────────────── */
  return (
    <div className="flex flex-col lg:flex-row font-nanum-gothic lg:h-[calc(100dvh-2.5rem)] lg:overflow-hidden" style={{ minHeight: "0" }}>
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
            className={`flex-1 py-1.5 rounded-md text-[14px] font-medium transition-colors flex items-center justify-center gap-1 ${
              mobilePane === p.id
                ? "bg-[#1e2230] text-white"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            <Icon name={p.icon} size={13} /> {p.label}
            {p.id === "critique" && cards.length > 0 && (
              <span className="ml-0.5 text-[12px] bg-[#ff7066] text-white px-1 rounded-full">{cards.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 lg:h-full lg:overflow-hidden" style={{ minHeight: "0" }}>

      {/* ─── LEFT: 논문 구조 패널 ─── */}
      <div className={`${mobilePane === "structure" ? "flex" : "hidden"} lg:flex w-full lg:w-48 border-r border-white/[0.04] bg-[#0d0f14] flex-col flex-shrink-0 lg:h-full lg:overflow-hidden`}>
        <div className="p-3 flex-shrink-0">
          <p className="text-[15px] font-semibold text-white/60 mb-2"><Icon name="📂" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("critique.paperStructure")}</p>
          <div onClick={() => fileRef.current?.click()}
            className="p-4 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:border-[#6c8cff]/40 transition-colors mb-3">
            <p className="text-[23px] mb-1"><Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
            <p className="text-[13px] text-white/30">{t("pages.critique.upload")}</p>
            <p className="text-[12px] text-white/20">{t("critique.uploadFormats")}</p>
          </div>
          <input ref={fileRef} type="file" className="hidden" accept={UODE_ACCEPT} onChange={handleFile} />
          {fileName && <p className="text-[13px] text-[#6c8cff] mb-2 truncate"><Icon name="📎" className="inline-flex align-[-0.125em] mr-1" size={15} />{fileName}</p>}
          {renderProgress && (
            <div className="mb-2">
              <div className="flex justify-between text-[12px] text-white/30 mb-1">
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
              <p className="text-[13px] font-semibold text-white/30 mb-1.5 px-1">
                <Icon name="📑" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("critique.pageCount").replace("{n}", String(pdfPages.length))}
              </p>
              <div className="space-y-1.5">
                {pdfPages.map((pg) => {
                  const pgCards = relatedCards(pg.text || "", pg.pageNum);
                  return (
                    <div key={pg.pageNum}
                      className="relative cursor-pointer rounded-lg overflow-hidden border border-white/[0.05] hover:border-[#6c8cff]/40 transition-colors"
                      onClick={() => {
                        setMobilePane("viewer");
                        setTimeout(
                          () =>
                            document
                              .getElementById(`page-${pg.pageNum}`)
                              ?.scrollIntoView({ behavior: "smooth" }),
                          60
                        );
                      }}>
                      {pdfDoc ? (
                        <LazyPdfPage
                          doc={pdfDoc}
                          pageNum={pg.pageNum}
                          scale={0.4}
                          quality={0.5}
                          thumb
                          imgClassName="w-full"
                        />
                      ) : (
                        <div className="w-full h-10 bg-[#1a1e2a] flex items-center justify-center">
                          <span className="text-[12px] text-white/20">{pg.pageNum}p</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 flex items-center justify-between">
                        <span className="text-[12px] text-white/50">{pg.pageNum}p</span>
                        {pgCards.length > 0 && (
                          <span className="text-[11px] bg-[#ff7066] text-white px-1 rounded-full">{pgCards.length}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-white/30 mb-1 px-1"><Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("critique.paragraphStatus")}</p>
              <div className="space-y-0.5">
                {docText.split(/\n{2,}/).filter(p => p.trim()).slice(0, 20).map((p, i) => {
                  const cnt = cards.filter(c => c.text && p.includes(c.text.slice(0, 20))).length;
                  return (
                    <div key={i} className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-white/[0.02]">
                      <span className="text-[13px] text-white/20 min-w-[14px]">{i + 1}.</span>
                      <span className="text-[13px] text-white/25 truncate flex-1">{p.slice(0, 30)}</span>
                      {cnt > 0 && <span className="text-[11px] bg-[#ff7066]/20 text-[#ff7066] px-1 rounded">{cnt}</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── CENTER: 원문 뷰어 ─── */}
      <div className={`${mobilePane === "viewer" ? "flex" : "hidden"} lg:flex flex-1 flex-col border-r border-white/[0.04] lg:h-full lg:overflow-hidden`} style={{ minWidth: 0 }}>
        {/* 툴바 */}
        <div className="border-b border-white/[0.04] flex flex-wrap items-center gap-1.5 px-3 py-2 lg:h-10 lg:flex-nowrap lg:py-0 flex-shrink-0">
          <p className="text-[15px] font-semibold text-white/60 flex items-center gap-1"><Icon name="litReview" size={14} />{t("pages.critique.viewer")}</p>
          {pdfPages.length > 0 && (
            <span className="text-[13px] text-white/25 border border-white/[0.06] px-2 py-0.5 rounded">
              {t("critique.pageCount").replace("{n}", String(pdfPages.length))}
            </span>
          )}
          <div className="hidden lg:block flex-1" />
          <div className="flex items-center gap-1.5 flex-wrap ml-auto lg:ml-0">
            <button onClick={addTextMode}
              className="px-2.5 py-1.5 rounded-md text-[14px] bg-white/[0.04] border border-white/[0.06] text-white/45 hover:text-white/75 flex items-center gap-1">
              <Icon name="pencil" size={12} />{t("pages.critique.textInput")}
            </button>
            <button onClick={aiAnalyze}
              disabled={loading || (pdfPages.length === 0 && uodeBlocks.length === 0 && !docText.trim())}
              className="px-3 py-1.5 rounded-md text-[14px] bg-[#4a6cf7] text-white disabled:opacity-30 font-medium flex items-center gap-1">
              <Icon name="engine" size={12} />{loading ? t("pages.critique.analyzing") : `${t("pages.critique.aiAnalyze")}`}
            </button>
            <div className="relative">
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1.5 rounded-md text-[14px] bg-[#1a1e2a] border border-white/[0.06] text-white/45 outline-none">
                <option value="all">{t("critique.filterAll")}</option>
                <option value="open">{t("critique.filterOpen")}</option>
                <option value="in-revision">{t("critique.filterRevision")}</option>
                <option value="approved">{t("critique.filterApproved")}</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30"><Icon name="chevronDown" size={11} /></span>
            </div>
            <div className="flex items-center gap-0.5 border border-white/[0.06] rounded-md px-1 py-0.5">
              <button onClick={() => setFontSize(s => Math.max(10, s - 1))} className="text-[15px] text-white/35 hover:text-white/60 px-1.5">A−</button>
              <span className="text-[12px] text-white/25 min-w-[26px] text-center">{fontSize}px</span>
              <button onClick={() => setFontSize(s => Math.min(20, s + 1))} className="text-[15px] text-white/35 hover:text-white/60 px-1.5">A+</button>
            </div>
          </div>
        </div>

        {/* ── 뷰어 본문 ── */}
        <div ref={viewerRef} className="flex-1 overflow-y-auto" style={{ fontSize }}>
          {/* 렌더링 진행 중 */}
          {renderProgress && (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <p className="text-[35px] mb-4 animate-pulse"><Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
              <p className="text-[17px] mb-2">{t("critique.pdfRendering")}</p>
              <p className="text-[15px] mb-4">{renderProgress.current} / {renderProgress.total} {t("critique.pages")}</p>
              <div className="w-64 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#6c8cff] to-[#a78bfa] rounded-full transition-all"
                  style={{ width: `${(renderProgress.current / renderProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {/* ── PDF 전체 페이지 모드 (지연 렌더링 + 양방향 크리틱 연동) ── */}
          {!renderProgress && pdfPages.length > 0 && (
            <div className="px-6 py-4 space-y-6">
              {pdfPages.map((pg) => {
                // 원문 이미지·변환텍스트 모두 "같은 페이지의 모든 카드"를 동일 기준으로 표시한다.
                // (기존엔 이미지는 pageNum 기준, 변환텍스트는 relatedCards 텍스트 매칭 기준이라
                //  페이지 단위 크리틱처럼 c.text가 빈 카드가 변환텍스트에서 누락되는 문제가 있었다.)
                const pgImageCards = cards.filter((c) => c.pageNum === pg.pageNum);
                // 텍스트 매칭으로만 잡히는 카드(페이지 번호가 다르게 매핑된 경우)까지 합집합
                const textMatched = relatedCards(pg.text || "", pg.pageNum);
                const seen = new Set(pgImageCards.map((c) => c.id));
                const pgTextCards = [
                  ...pgImageCards,
                  ...textMatched.filter((c) => !seen.has(c.id)),
                ].sort((a, b) => a.num - b.num);
                return (
                  <div key={pg.pageNum} id={`page-${pg.pageNum}`}>
                    {/* 페이지 번호 헤더 */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[13px] text-white/25 bg-white/[0.04] px-2 py-0.5 rounded">
                        {t("critique.pageN")} {pg.pageNum}
                      </span>
                      {pgTextCards.length > 0 && (
                        <span className="text-[12px] text-[#ff7066] bg-[#ff7066]/10 px-2 py-0.5 rounded">
                          {t("critique.critiqueOnPage").replace("{n}", String(pgTextCards.length))}
                        </span>
                      )}
                      <div className="flex-1 h-px bg-white/[0.04]" />
                    </div>

                    {/* 원문 페이지 이미지 — 지연 렌더링 (400p+ 도 항상 원문 표시) */}
                    <div className="relative group max-w-[640px] mx-auto">
                      {pdfDoc ? (
                        <LazyPdfPage
                          doc={pdfDoc}
                          pageNum={pg.pageNum}
                          scale={1.4}
                          quality={0.72}
                          imgClassName="w-full rounded-xl border border-white/[0.06] shadow-xl select-none"
                          onImageMouseUp={(e) => handleMouseUp(e, pg.pageNum)}
                        >
                          {/* 크리틱 번호 오버레이 — 클릭 시 패널 카드로 이동 */}
                          {pgImageCards.map((c, idx) => {
                            const typeInfo = TYPES.find((tp) => tp.id === c.type);
                            return (
                              <button
                                key={c.id}
                                onClick={() => focusCardInPanel(c.id)}
                                className={`absolute w-5 h-5 rounded-full text-white text-[12px] flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform ${
                                  activeCardId === c.id ? "ring-2 ring-white" : "ring-2 ring-white/20"
                                }`}
                                style={{ backgroundColor: typeInfo?.color, top: 8 + idx * 26, left: 8 }}
                                title={c.note || c.text}
                              >
                                {c.num}
                              </button>
                            );
                          })}
                          {/* 호버 시 크리틱 추가 버튼 */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => addPageCritique(pg.pageNum)}
                              className="px-2.5 py-1 rounded-lg text-[13px] bg-[#4a6cf7] text-white font-medium shadow-lg hover:bg-[#5d7dff] transition-colors"
                            >
                              {t("critique.addCritique")}
                            </button>
                          </div>
                        </LazyPdfPage>
                      ) : (
                        // 문서 핸들이 없을 때(대용량 저장본 복원 등) 텍스트 전용 플레이스홀더
                        <div className="w-full rounded-xl border border-white/[0.06] bg-[#13161e] px-5 py-4 min-h-[60px] flex items-center justify-center">
                          <span className="text-[14px] text-white/25">
                            {t("critique.pageN")} {pg.pageNum} · {t("critique.textOnlyPage")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 페이지 변환 텍스트 — 문장 단위 인라인 크리틱 번호(원문 이미지와 동일 번호로 연동) */}
                    {pg.text && (
                      <div className="max-w-[640px] mx-auto mt-3 mb-1" id={`card-anchor-page-${pg.pageNum}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex-1 h-px bg-white/[0.04]" />
                          <span className="text-[12px] text-white/15">{t("critique.convertedText")}</span>
                          {pgTextCards.length > 0 && (
                            <span className="text-[12px] text-[#ff7066]/70">
                              {t("critique.critiqueOnPage").replace("{n}", String(pgTextCards.length))}
                            </span>
                          )}
                          <div className="flex-1 h-px bg-white/[0.04]" />
                        </div>

                        {/* 문장 매칭이 안 된 카드(페이지 단위 크리틱 등)는 상단에 한 줄로 모아 표시 */}
                        {(() => {
                          const norm = (s: string) => s.replace(/\s+/g, " ").trim();
                          const hay = norm(pg.text || "");
                          const matchedIds = new Set<string>();
                          pgTextCards.forEach((c) => {
                            if (c.text) {
                              const key = norm(c.text).slice(0, 14);
                              if (key.length >= 6 && hay.includes(key)) matchedIds.add(c.id);
                            }
                          });
                          const unmatched = pgTextCards.filter((c) => !matchedIds.has(c.id));
                          // 문장 분할(한국어/영문 종결부호 기준)
                          const sentences = (pg.text || "")
                            .split(/(?<=[.!?。！？…])\s+|\n+/)
                            .filter((s) => s.trim().length > 0);
                          return (
                            <>
                              {unmatched.length > 0 && (
                                <div className="flex items-center flex-wrap gap-1.5 mb-1.5 px-1">
                                  <span className="text-[12px] text-white/25">{t("critique.pageN")} {pg.pageNum}:</span>
                                  {unmatched.map((c) => {
                                    const typeInfo = TYPES.find((tp) => tp.id === c.type);
                                    return (
                                      <button
                                        key={c.id}
                                        onClick={() => focusCardInPanel(c.id)}
                                        className={`w-4 h-4 rounded-full text-white text-[11px] flex items-center justify-center font-bold hover:scale-110 transition-transform ${
                                          activeCardId === c.id ? "ring-2 ring-white" : ""
                                        }`}
                                        style={{ backgroundColor: typeInfo?.color }}
                                        title={c.note || c.text}
                                      >
                                        {c.num}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              <p
                                data-selectable="1"
                                data-page={pg.pageNum}
                                className="text-white/40 leading-[1.9] text-[14px] select-text cursor-text px-1"
                                style={{ WebkitUserSelect: "text", userSelect: "text", WebkitTouchCallout: "default" }}
                                onMouseUp={(e) => handleMouseUp(e, pg.pageNum)}
                                onTouchEnd={(e) => handleTouchEnd(e, pg.pageNum)}
                              >
                                {sentences.map((sent, si) => {
                                  const ns = norm(sent);
                                  const inlineCards = pgTextCards.filter((c) => {
                                    if (!matchedIds.has(c.id) || !c.text) return false;
                                    const key = norm(c.text).slice(0, 14);
                                    return key.length >= 6 && ns.includes(key);
                                  });
                                  const hasActive = inlineCards.some((c) => c.id === activeCardId);
                                  return (
                                    <span
                                      key={si}
                                      className={
                                        inlineCards.length > 0
                                          ? `rounded px-0.5 transition-colors ${hasActive ? "bg-[#6c8cff]/20" : "bg-white/[0.03]"}`
                                          : ""
                                      }
                                    >
                                      {sent}{" "}
                                      {inlineCards.map((c) => {
                                        const typeInfo = TYPES.find((tp) => tp.id === c.type);
                                        return (
                                          <button
                                            key={c.id}
                                            contentEditable={false}
                                            onClick={() => focusCardInPanel(c.id)}
                                            className={`inline-flex align-middle mx-0.5 w-4 h-4 rounded-full text-white text-[11px] items-center justify-center font-bold hover:scale-110 transition-transform select-none ${
                                              activeCardId === c.id ? "ring-2 ring-white" : ""
                                            }`}
                                            style={{ backgroundColor: typeInfo?.color, userSelect: "none", WebkitUserSelect: "none" }}
                                            title={c.note || c.text}
                                          >
                                            {c.num}
                                          </button>
                                        );
                                      })}
                                    </span>
                                  );
                                })}
                              </p>
                            </>
                          );
                        })()}
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
                  <div className="max-w-[680px] mx-auto text-[13px] text-white/35 border border-white/[0.06] rounded px-2 py-1">
                    <Icon name="📑" className="inline-flex align-[-0.125em] mr-1" size={15} />{uodeMeta}
                  </div>
                </div>
              )}
              <DocumentReproduction
                blocks={uodeBlocks}
                fontSize={fontSize}
                onMouseUp={(e, pageNum) => handleMouseUp(e, pageNum)}
                onTouchEnd={(e, pageNum) => handleTouchEnd(e, pageNum)}
                renderPageBadge={(pageNum) => {
                  const n = cards.filter((c) => c.pageNum === pageNum).length;
                  return n > 0 ? (
                    <span className="text-[12px] text-[#ff7066] bg-[#ff7066]/10 px-2 py-0.5 rounded">
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
                data-selectable="1"
                data-page="0"
                style={{ WebkitUserSelect: "text", userSelect: "text" }}
                onMouseUp={(e) => handleMouseUp(e, 0)}
                onTouchEnd={(e) => handleTouchEnd(e, 0)}>
                {textLines.map((line, i) => {
                  if (i >= revealedLines && loadingText) return null;
                  const lineCards = relatedCards(line, 0);
                  const anchorId = lineCards[0] ? `card-anchor-${lineCards[0].id}` : undefined;
                  return (
                    <div key={i} id={anchorId} className="relative" style={{ animation: "fadeIn 0.2s ease-out" }}>
                      <p className="text-white/70 leading-[1.9] whitespace-pre-wrap pr-7">{line}</p>
                      {lineCards.length > 0 && (
                        <span className="absolute -right-1 top-0 flex flex-col gap-0.5">
                          {lineCards.map((c) => {
                            const typeInfo = TYPES.find((tp) => tp.id === c.type);
                            return (
                              <button
                                key={c.id}
                                onClick={() => focusCardInPanel(c.id)}
                                className={`w-4 h-4 rounded-full text-white text-[11px] flex items-center justify-center font-bold hover:scale-110 transition-transform ${
                                  activeCardId === c.id ? "ring-2 ring-white" : ""
                                }`}
                                style={{ backgroundColor: typeInfo?.color || "#ff7066" }}
                                title={c.note || c.text}
                              >
                                {c.num}
                              </button>
                            );
                          })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/15">
                <p className="text-[43px] mb-3"><Icon name="📝" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
                <p className="text-[17px] mb-1">{t("critique.emptyUploadTitle")}</p>
                <p className="text-[15px] text-white/10">{t("critique.emptyUploadDesc")}</p>
              </div>
            )
          )}
        </div>

        {/* 드래그 선택 팝업 */}
        {selPopup && selText && !isMobile && (
          <div className="fixed z-50 bg-[#1e2230] border border-white/10 rounded-xl shadow-2xl p-3 min-w-[210px]"
            style={{
              left: Math.min(Math.max(selPopup.x - 105, 8), (typeof window !== "undefined" ? window.innerWidth : 1280) - 218),
              top: Math.max(selPopup.y - 90, 8),
            }}>
            <p className="text-[13px] text-white/40 mb-2 truncate">
              "{selText.slice(0, 50)}{selText.length > 50 ? "..." : ""}"
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {TYPES.map(tp => (
                <button key={tp.id} onClick={() => setActiveType(tp.id)}
                  className={`px-2 py-0.5 rounded text-[12px] border transition-colors ${activeType === tp.id ? "text-white border-white/20" : "text-white/30 border-white/[0.06]"}`}
                  style={activeType === tp.id ? { backgroundColor: tp.color + "20", borderColor: tp.color + "50" } : {}}>
                  {tp.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createCritiqueFromSelection}
                className="flex-1 py-1.5 bg-[#4a6cf7] text-white rounded-lg text-[14px] font-medium">
                {t("critique.createCritique").replace("{n}", String(cards.length + 1))}
              </button>
              <button onClick={() => { setSelPopup(null); window.getSelection()?.removeAllRanges(); }}
                className="px-3 py-1.5 bg-white/[0.04] text-white/30 rounded-lg text-[14px]">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* 모바일: 화면 하단 고정 액션 시트 — 좌표 어긋남/화면밖 문제 없이 항상 노출
            v40: 하단 내비게이션 바(z-[7500], 모바일 h-14)에 가려 "크리틱 생성" 버튼이
            잘리던 문제 수정 — 시트를 내비 높이만큼 위로 올리고(z를 내비 위로 상향),
            md 이상(내비 없음)에선 화면 하단에 그대로 고정. */}
        {selPopup && selText && isMobile && (
          <div className="lg:hidden fixed inset-x-0 z-[8200] bottom-[calc(3.5rem_+_env(safe-area-inset-bottom,0px))] md:bottom-0 bg-[#1e2230] border-t border-white/10 rounded-t-2xl shadow-2xl px-4 pt-3 pb-4 md:pb-[max(16px,env(safe-area-inset-bottom))] animate-fade-in">
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3" />
            <p className="text-[14px] text-white/45 mb-2.5 line-clamp-2">
              "{selText.slice(0, 80)}{selText.length > 80 ? "..." : ""}"
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {TYPES.map(tp => (
                <button key={tp.id} onClick={() => setActiveType(tp.id)}
                  className={`px-2.5 py-1 rounded-md text-[14px] border transition-colors ${activeType === tp.id ? "text-white border-white/20" : "text-white/35 border-white/[0.06]"}`}
                  style={activeType === tp.id ? { backgroundColor: tp.color + "20", borderColor: tp.color + "50" } : {}}>
                  {tp.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createCritiqueFromSelection}
                className="flex-1 py-3 bg-[#4a6cf7] text-white rounded-xl text-[16px] font-semibold active:scale-[0.98] transition-transform">
                {t("critique.createCritique").replace("{n}", String(cards.length + 1))}
              </button>
              <button onClick={() => { setSelPopup(null); window.getSelection()?.removeAllRanges(); }}
                className="px-5 py-3 bg-white/[0.05] text-white/40 rounded-xl text-[16px]">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── RIGHT: 크리틱 패널 ─── */}
      <ResizableRightPanel storageKey="critique" breakpoint="lg" defaultWidth={280} min={240} className={`${mobilePane === "critique" ? "flex" : "hidden"} lg:flex w-full flex-col border-l border-white/[0.04] lg:h-full lg:overflow-hidden`}>
        <div className="p-3 border-b border-white/[0.04] flex-shrink-0 sticky top-0 z-10 bg-[#13161e]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[15px] font-semibold"><Icon name="💬" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("critique.panel")}</p>
            <span className="text-[13px] text-white/20">{cards.length}{t("critique.countUnit")}</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-1">
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setActiveType(t.id)}
                className={`px-1.5 py-0.5 rounded text-[12px] border transition-colors ${activeType === t.id ? "text-white border-white/20" : "border-white/[0.04] text-white/25"}`}
                style={activeType === t.id ? { backgroundColor: t.color + "20", borderColor: t.color + "40" } : {}}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-white/15">{t("critique.dragHint")}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{WebkitOverflowScrolling:"touch"}}>
          {filteredCards.length === 0 ? (
            <div className="text-center py-8 text-white/15">
              <p className="text-[27px] mb-2"><Icon name="💬" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
              <p className="text-[14px]">{t("critique.noCritiquesTitle")}</p>
              <p className="text-[13px] mt-1 whitespace-pre-line">{t("critique.noCritiquesHint")}</p>
            </div>
          ) : (
            filteredCards.map((c) => {
              const typeInfo = TYPES.find(t => t.id === c.type);
              return (
                <div key={c.id} id={`card-${c.id}`}
                  className={`rounded-xl bg-[#13161e] border overflow-hidden transition-all ${
                    activeCardId === c.id
                      ? "border-[#6c8cff]/60 ring-1 ring-[#6c8cff]/40"
                      : "border-white/[0.04]"
                  }`}
                  style={{ borderLeftColor: typeInfo?.color, borderLeftWidth: "3px" }}>
                  <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                    <button onClick={() => jumpToCardSource(c)}
                      title={t("critique.convertedText")}
                      className="w-5 h-5 rounded-full text-white text-[12px] flex items-center justify-center font-bold flex-shrink-0 hover:scale-110 transition-transform"
                      style={{ backgroundColor: typeInfo?.color }}>
                      {c.num}
                    </button>
                    <span className="text-[12px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: (typeInfo?.color || "#6c8cff") + "20", color: typeInfo?.color }}>
                      {typeInfo?.label.split(" ")[1]}
                    </span>
                    {c.pageNum ? (
                      <span className="text-[11px] text-white/20 bg-white/[0.04] px-1 rounded">{c.pageNum}p</span>
                    ) : null}
                    <span className={`text-[12px] px-1.5 py-0.5 rounded ml-auto ${
                      c.status === "open" ? "bg-[#ff7066]/10 text-[#ff7066]" :
                      c.status === "approved" ? "bg-[#5ebd7c]/10 text-[#5ebd7c]" :
                      c.status === "resubmitted" ? "bg-[#6c8cff]/10 text-[#6c8cff]" :
                      "bg-[#e8b84b]/10 text-[#e8b84b]"
                    }`}>{c.status}</span>
                    <button onClick={() => deleteCard(c.id)} className="text-[12px] text-white/15 hover:text-[#ff7066] ml-1"><Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} /></button>
                  </div>
                  {c.text && (
                    <p className="text-[13px] text-white/30 px-3 pb-1 italic leading-relaxed">
                      "{c.text.slice(0, 70)}{c.text.length > 70 ? "..." : ""}"
                    </p>
                  )}
                  <div className="px-3 pb-2">
                    {editingId === c.id ? (
                      <>
                        <textarea value={c.editNote}
                          onChange={e => setCards(prev => prev.map(x => x.id === c.id ? { ...x, editNote: e.target.value } : x))}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#1a1e2a] border border-white/[0.08] text-[14px] text-white/70 focus:outline-none focus:border-[#6c8cff]/50 resize-none"
                          placeholder={t("critique.editNotePlaceholder")} rows={3} autoFocus />
                        <div className="flex gap-1.5 mt-1.5">
                          <button onClick={() => saveNote(c.id)} className="flex-1 py-1 bg-[#4a6cf7] text-white rounded-md text-[13px] font-medium">{t("common.ok")}</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white/[0.04] text-white/30 rounded-md text-[13px]">{t("common.cancel")}</button>
                        </div>
                      </>
                    ) : (
                      c.note
                        ? <p className="text-[14px] text-white/60 leading-relaxed cursor-pointer hover:text-white/80" onClick={() => setEditingId(c.id)}>{c.note}</p>
                        : <button onClick={() => setEditingId(c.id)} className="text-[13px] text-white/20 hover:text-[#6c8cff]">{t("critique.addEditNote")}</button>
                    )}
                  </div>
                  <div className="flex gap-1 px-3 pb-2.5">
                    <button onClick={() => updateStatus(c.id, "in-revision")} className="flex-1 py-0.5 text-[12px] rounded bg-[#e8b84b]/10 text-[#e8b84b] hover:bg-[#e8b84b]/20">{t("critique.requestRevision")}</button>
                    <button onClick={() => updateStatus(c.id, "resubmitted")} className="flex-1 py-0.5 text-[12px] rounded bg-[#6c8cff]/10 text-[#6c8cff] hover:bg-[#6c8cff]/20">{t("critique.resubmit")}</button>
                    <button onClick={() => updateStatus(c.id, "approved")} className="flex-1 py-0.5 text-[12px] rounded bg-[#5ebd7c]/10 text-[#5ebd7c] hover:bg-[#5ebd7c]/20">{t("critique.approve")}</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-white/[0.04] flex-shrink-0">
          <p className="text-[13px] font-semibold text-white/40 mb-0.5">{t("critique.aiCritiqueTip")}</p>
          <p className="text-[12px] text-white/20">{t("critique.aiCritiqueDesc")}</p>
        </div>
      </ResizableRightPanel>

      </div>{/* /flex flex-1 min-h-0 (mobile pane wrapper) */}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
