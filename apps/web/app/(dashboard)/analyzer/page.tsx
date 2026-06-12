"use client";
import { Icon } from "@/components/ui/icon";
import { ResizableRightPanel } from "@/components/ui/resizable-right-panel";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { convertHwpToPdf, isHwpFile } from "@/lib/hwp-convert";
import { aiProgress } from "@/lib/ai-progress";

/* ════════════════════════════════════════════════════════════════
   논문 분석 (Analyzer) — v11 재설계
   ----------------------------------------------------------------
   불러오기 UX를 논문 크리틱과 동일하게 통일:
     · LEFT   : 업로드 + 페이지 썸네일 미리보기
     · CENTER : 원문(PDF 이미지/UODE 재현) + 변환된 텍스트 동시 표시
     · RIGHT  : 변환된 텍스트 대상 AI 분석(전체/미시/문장별/BERT/개선)
   HWP/HWPX 는 서버(LibreOffice) PDF 변환 우선, 실패 시 브라우저 파서 폴백.
   모든 AI 분석은 전역 진행바(상단 메뉴)와 자동 연동.
═══════════════════════════════════════════════════════════════════ */

interface PdfPage {
  pageNum: number;
  text: string;
}

interface AnalyzerDraft {
  fileName: string;
  docText: string;
  tab: string;
  results: Record<string, string>;
  uodeBlocks?: UODEBlock[];
  uodeMeta?: string;
  isPdf?: boolean;
}

/* ── PDF 텍스트 추출(전 페이지) + 문서 핸들 보존 ── */
async function extractPdf(
  arrayBuffer: ArrayBuffer,
  onProgress: (current: number, total: number) => void
): Promise<{ doc: any; pages: PdfPage[] }> {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) return { doc: null, pages: [] };
  const typedArray = new Uint8Array(arrayBuffer.slice(0));
  const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
  const total = doc.numPages;
  const pages: PdfPage[] = [];
  for (let i = 1; i <= total; i++) {
    onProgress(i, total);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => it.str).join(" ").trim();
    pages.push({ pageNum: i, text });
    page.cleanup?.();
  }
  return { doc, pages };
}

/* ── 지연 렌더링 PDF 페이지 이미지 ── */
function LazyPdfPage({
  doc,
  pageNum,
  scale = 1.4,
  thumb = false,
  imgClassName = "",
}: {
  doc: any;
  pageNum: number;
  scale?: number;
  thumb?: boolean;
  imgClassName?: string;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState("");
  const [near, setNear] = useState(false);
  const [aspect, setAspect] = useState(1.414);

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
          setDataUrl(canvas.toDataURL("image/jpeg", thumb ? 0.5 : 0.72));
        }
        page.cleanup?.();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [near, doc, pageNum, scale, thumb, dataUrl]);

  return (
    <div ref={holderRef} style={{ aspectRatio: `1 / ${aspect}` }} className="w-full">
      {dataUrl ? (
        <img src={dataUrl} alt={`page ${pageNum}`} className={imgClassName} />
      ) : (
        <div className="w-full h-full bg-[#1a1e2a] flex items-center justify-center rounded">
          <span className="text-[12px] text-white/20">{pageNum}p</span>
        </div>
      )}
    </div>
  );
}

export default function AnalyzerPage() {
  const { t } = useTranslation();
  const { generate, loading } = useGemini();

  const [fileName, setFileName] = useState("");
  const [isPdf, setIsPdf] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([]);
  const [uodeBlocks, setUodeBlocks] = useState<UODEBlock[]>([]);
  const [uodeMeta, setUodeMeta] = useState("");
  const [docText, setDocText] = useState(""); // 변환된 텍스트
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);

  const [tab, setTab] = useState("overall");
  const [results, setResults] = useState<Record<string, string>>({});
  const [fontSize, setFontSize] = useState(14);
  const [mobilePane, setMobilePane] = useState<"viewer" | "analysis">("viewer");

  const fileRef = useRef<HTMLInputElement>(null);

  const ANALYSIS_TABS = [
    { id: "overall", label: t("analyzer.tabOverall"), color: "#6c8cff" },
    { id: "micro", label: t("analyzer.tabMicro"), color: "#3ecfb2" },
    { id: "sentence", label: t("analyzer.tabSentence"), color: "#e8b84b" },
    { id: "bert", label: t("analyzer.tabBert"), color: "#60a5fa" },
    { id: "suggestions", label: t("analyzer.tabSuggestions"), color: "#f472b6" },
  ];

  /* pdf.js 로드 */
  useEffect(() => {
    if ((window as any).pdfjsLib) {
      setPdfJsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  /* 저장/복원 */
  const getData = useCallback(
    (): AnalyzerDraft => ({
      fileName,
      docText,
      tab,
      results,
      uodeBlocks: uodeBlocks.length ? uodeBlocks : undefined,
      uodeMeta: uodeMeta || undefined,
      isPdf,
    }),
    [fileName, docText, tab, results, uodeBlocks, uodeMeta, isPdf]
  );
  const handleLoad = useCallback((data: unknown) => {
    const d = data as AnalyzerDraft;
    if (d.fileName !== undefined) setFileName(d.fileName);
    if (d.docText !== undefined) setDocText(d.docText);
    if (d.tab) setTab(d.tab);
    if (d.results) setResults(d.results);
    if (d.uodeBlocks) setUodeBlocks(d.uodeBlocks);
    if (d.uodeMeta) setUodeMeta(d.uodeMeta);
    if (d.isPdf !== undefined) setIsPdf(d.isPdf);
  }, []);
  const handleReset = useCallback(() => {
    setFileName("");
    setIsPdf(false);
    setPdfDoc(null);
    setPdfPages([]);
    setUodeBlocks([]);
    setUodeMeta("");
    setDocText("");
    setResults({});
    setTab("overall");
  }, []);
  usePagePersistence("analyzer", handleLoad, handleReset);

  /* 파일 불러오기 (논문 크리틱과 동일 방식) */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPdfPages([]);
    setPdfDoc(null);
    setUodeBlocks([]);
    setUodeMeta("");
    setDocText("");
    setResults({});
    setMobilePane("viewer");

    // HWP/HWPX → 서버 PDF 변환 우선, 실패 시 브라우저 파서 폴백
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
      setDocText((await workFile.text()).trim());
    } else if (isPdfFile) {
      if (!pdfJsLoaded) {
        alert("PDF 엔진을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const buf = ev.target?.result as ArrayBuffer;
        setRenderProgress({ current: 0, total: 1 });
        try {
          const { doc, pages } = await extractPdf(buf, (cur, tot) =>
            setRenderProgress({ current: cur, total: tot })
          );
          setPdfDoc(doc);
          setPdfPages(pages);
          setDocText(pages.map((p) => p.text).join("\n\n").trim());
        } catch {
          alert("PDF 렌더링에 실패했습니다.");
        } finally {
          setRenderProgress(null);
        }
      };
      reader.readAsArrayBuffer(workFile);
    } else if (isSupportedFile(workFile.name)) {
      setRenderProgress({ current: 0, total: 1 });
      try {
        const doc = await processDocument(workFile, {
          onProgress: (p) =>
            setRenderProgress({ current: Math.max(0, p.percent), total: 100 }),
        });
        setUodeBlocks(doc.blocks as UODEBlock[]);
        const note = doc.notes.length ? ` · ${doc.notes.join(" / ")}` : "";
        setUodeMeta(
          `${formatLabel(doc.format)} · ${doc.charCount.toLocaleString()}자 · ` +
            `${doc.pageCount}p · 신뢰도 ${doc.confidence}%${note}`
        );
        setDocText(toFormattedText(doc));
      } catch (err: any) {
        setDocText(
          `[${workFile.name}]\n문서 추출에 실패했습니다: ${
            err?.message || "알 수 없는 오류"
          }`
        );
      } finally {
        setRenderProgress(null);
      }
    } else {
      setDocText(`[${workFile.name}]\n지원하지 않는 형식입니다.`);
    }
    e.target.value = "";
  };

  const pasteText = () => {
    const text = prompt(t("analyzer.placeholder"));
    if (text) {
      setFileName("(붙여넣은 텍스트)");
      setIsPdf(false);
      setPdfPages([]);
      setPdfDoc(null);
      setUodeBlocks([]);
      setUodeMeta("");
      setDocText(text);
    }
  };

  /* AI 분석 — 변환된 텍스트 대상 */
  const runAnalysis = async (mode: string) => {
    const source = docText.trim();
    if (!source) return;
    setTab(mode);
    const prompts: Record<string, string> = {
      overall: "Analyze overall structure, logic flow, strengths and weaknesses.",
      micro: "Analyze paragraph-level micro-structure and connections.",
      sentence: "Analyze key sentences for academic appropriateness.",
      bert: "Validate core claims from a logical evidence perspective.",
      suggestions: "Provide section-by-section improvement suggestions.",
    };
    try {
      const result = await generate({
        systemInstruction:
          "You are an academic paper analysis expert. Respond in the user's language.",
        userText: `${prompts[mode]}\n\n---\n${source.slice(0, 15000)}\n---`,
        maxOutputTokens: 16384,
        temperature: 0.4,
      });
      setResults((prev) => ({ ...prev, [mode]: result }));
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message === "API_KEY_MISSING"
          ? "API 키가 설정되지 않았습니다. 설정에서 키를 입력하세요."
          : "분석 중 오류가 발생했습니다.";
      setResults((prev) => ({ ...prev, [mode]: msg }));
    }
  };

  const hasDoc = pdfPages.length > 0 || uodeBlocks.length > 0 || !!docText.trim();

  return (
    <div
      className="flex flex-col lg:flex-row font-nanum-gothic lg:h-[calc(100dvh-2.5rem)] lg:overflow-hidden"
      style={{ minHeight: 0 }}
    >
      <PageSaveRegistration pageId="analyzer" getData={getData} />

      {/* 모바일 2-pane 전환 */}
      <div className="lg:hidden flex items-center gap-1 px-2 py-1.5 border-b border-white/[0.04] bg-[#13161e] flex-shrink-0">
        {([
          { id: "viewer", icon: "litReview", label: "원문 · 변환" },
          { id: "analysis", icon: "analyzer", label: "AI 분석" },
        ] as const).map((p) => (
          <button
            key={p.id}
            onClick={() => setMobilePane(p.id)}
            className={`flex-1 py-1.5 rounded-md text-[14px] font-medium transition-colors flex items-center justify-center gap-1 ${
              mobilePane === p.id ? "bg-[#1e2230] text-white" : "text-white/35"
            }`}
          >
            <Icon name={p.icon} size={13} /> {p.label}
          </button>
        ))}
      </div>

      {/* ─── LEFT: 불러오기 + 썸네일 ─── */}
      <div
        className={`${
          mobilePane === "viewer" ? "flex" : "hidden"
        } lg:flex w-full lg:w-60 border-r border-white/[0.04] bg-[#0d0f14] flex-col flex-shrink-0 lg:h-full lg:overflow-hidden`}
      >
        <div className="p-3 flex-shrink-0">
          <p className="text-[15px] font-semibold text-white/60 mb-2">
            <Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} />
            {t("analyzer.title")}
          </p>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) {
                const dt = new DataTransfer();
                dt.items.add(e.dataTransfer.files[0]);
                if (fileRef.current) {
                  fileRef.current.files = dt.files;
                  handleFile({ target: fileRef.current } as any);
                }
              }
            }}
            className="p-4 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:border-[#6c8cff]/40 transition-colors mb-3"
          >
            <p className="text-[23px] mb-1">
              <Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} />
            </p>
            <p className="text-[13px] text-white/30">{t("analyzer.pdfUpload")}</p>
            <p className="text-[12px] text-white/20 mt-0.5">
              PDF · DOCX · XLSX · PPTX · HWP/HWPX · TXT · MD
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={UODE_ACCEPT}
            onChange={handleFile}
          />
          <button
            onClick={pasteText}
            className="w-full py-1.5 rounded-md text-[13px] bg-white/[0.04] border border-white/[0.06] text-white/45 hover:text-white/75 flex items-center justify-center gap-1 mb-2"
          >
            <Icon name="pencil" size={12} />
            {t("analyzer.orText")}
          </button>
          {fileName && (
            <p className="text-[13px] text-[#6c8cff] mb-2 truncate">
              <Icon name="📎" className="inline-flex align-[-0.125em] mr-1" size={15} />
              {fileName}
            </p>
          )}
          {renderProgress && (
            <div className="mb-2">
              <div className="flex justify-between text-[12px] text-white/30 mb-1">
                <span>불러오는 중</span>
                <span>
                  {renderProgress.current}/{renderProgress.total}
                </span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6c8cff] rounded-full transition-all"
                  style={{
                    width: `${(renderProgress.current / renderProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 페이지 썸네일 */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {pdfPages.length > 0 ? (
            <>
              <p className="text-[13px] font-semibold text-white/30 mb-1.5 px-1">
                <Icon name="📑" className="inline-flex align-[-0.125em] mr-1" size={15} />
                {pdfPages.length}페이지
              </p>
              <div className="space-y-1.5">
                {pdfPages.map((pg) => (
                  <div
                    key={pg.pageNum}
                    className="relative cursor-pointer rounded-lg overflow-hidden border border-white/[0.05] hover:border-[#6c8cff]/40 transition-colors"
                    onClick={() => {
                      setMobilePane("viewer");
                      setTimeout(
                        () =>
                          document
                            .getElementById(`apage-${pg.pageNum}`)
                            ?.scrollIntoView({ behavior: "smooth" }),
                        60
                      );
                    }}
                  >
                    {pdfDoc ? (
                      <LazyPdfPage doc={pdfDoc} pageNum={pg.pageNum} scale={0.4} thumb imgClassName="w-full" />
                    ) : (
                      <div className="w-full h-10 bg-[#1a1e2a] flex items-center justify-center">
                        <span className="text-[12px] text-white/20">{pg.pageNum}p</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                      <span className="text-[12px] text-white/50">{pg.pageNum}p</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : docText ? (
            <p className="text-[12px] text-white/20 px-1 leading-relaxed">
              {uodeMeta || "텍스트가 불러와졌습니다. 중앙에서 원문과 변환 텍스트를 확인하세요."}
            </p>
          ) : (
            <p className="text-[12px] text-white/15 px-1">
              문서를 불러오면 페이지 미리보기가 여기에 표시됩니다.
            </p>
          )}
        </div>
      </div>

      {/* ─── CENTER: 원문 + 변환 텍스트 ─── */}
      <div
        className={`${
          mobilePane === "viewer" ? "flex" : "hidden"
        } lg:flex flex-1 flex-col border-r border-white/[0.04] lg:h-full lg:overflow-hidden`}
        style={{ minWidth: 0 }}
      >
        {/* 툴바 */}
        <div className="border-b border-white/[0.04] flex flex-wrap items-center gap-1.5 px-3 py-2 lg:h-10 lg:flex-nowrap lg:py-0 flex-shrink-0">
          <p className="text-[15px] font-semibold text-white/60 flex items-center gap-1">
            <Icon name="litReview" size={14} />논문 원문 뷰어
          </p>
          {pdfPages.length > 0 && (
            <span className="text-[13px] text-white/25 border border-white/[0.06] px-2 py-0.5 rounded">
              {pdfPages.length}p
            </span>
          )}
          <div className="hidden lg:block flex-1" />
          <div className="flex items-center gap-1.5 flex-wrap ml-auto lg:ml-0">
            <button
              onClick={() => runAnalysis("overall")}
              disabled={loading || !docText.trim()}
              className="px-3 py-1.5 rounded-md text-[14px] bg-[#4a6cf7] text-white disabled:opacity-30 font-medium flex items-center gap-1"
            >
              <Icon name="engine" size={12} />
              {loading ? t("analyzer.analyzing") : "AI 자동 분석"}
            </button>
            <div className="flex items-center gap-0.5 border border-white/[0.06] rounded-md px-1 py-0.5">
              <button onClick={() => setFontSize((s) => Math.max(10, s - 1))} className="text-[15px] text-white/35 hover:text-white/60 px-1.5">A−</button>
              <span className="text-[12px] text-white/25 min-w-[26px] text-center">{fontSize}px</span>
              <button onClick={() => setFontSize((s) => Math.min(20, s + 1))} className="text-[15px] text-white/35 hover:text-white/60 px-1.5">A+</button>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto" style={{ fontSize }}>
          {renderProgress && (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <p className="text-[35px] mb-4 animate-pulse">
                <Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} />
              </p>
              <p className="text-[17px] mb-2">불러오는 중…</p>
              <div className="w-64 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6c8cff] to-[#a78bfa] rounded-full transition-all"
                  style={{
                    width: `${(renderProgress.current / renderProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* 원문: PDF 페이지 이미지 */}
          {!renderProgress && pdfPages.length > 0 && (
            <div className="px-6 py-4 space-y-6">
              {pdfPages.map((pg) => (
                <div key={pg.pageNum} id={`apage-${pg.pageNum}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[13px] text-white/25 bg-white/[0.04] px-2 py-0.5 rounded">
                      페이지 {pg.pageNum}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  <div className="max-w-[640px] mx-auto">
                    {pdfDoc && (
                      <LazyPdfPage
                        doc={pdfDoc}
                        pageNum={pg.pageNum}
                        scale={1.4}
                        imgClassName="w-full rounded-xl border border-white/[0.06] shadow-xl"
                      />
                    )}
                  </div>
                  {pg.text && (
                    <div className="max-w-[640px] mx-auto mt-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 h-px bg-white/[0.04]" />
                        <span className="text-[12px] text-white/15">변환된 텍스트</span>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                      <p className="text-white/45 leading-[1.9] whitespace-pre-wrap px-1">
                        {pg.text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 원문: UODE 재현 (DOCX/XLSX/PPTX/HWP 등) */}
          {!renderProgress && pdfPages.length === 0 && uodeBlocks.length > 0 && (
            <div>
              {uodeMeta && (
                <div className="px-6 pt-3">
                  <div className="max-w-[680px] mx-auto text-[13px] text-white/35 border border-white/[0.06] rounded px-2 py-1">
                    <Icon name="📑" className="inline-flex align-[-0.125em] mr-1" size={15} />
                    {uodeMeta}
                  </div>
                </div>
              )}
              <DocumentReproduction blocks={uodeBlocks} fontSize={fontSize} />
              <div className="px-6 pb-6">
                <div className="max-w-[680px] mx-auto">
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-[12px] text-white/15">변환된 텍스트</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  <p className="text-white/45 leading-[1.9] whitespace-pre-wrap">
                    {docText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 텍스트 모드 (txt/md/붙여넣기) */}
          {!renderProgress && pdfPages.length === 0 && uodeBlocks.length === 0 && (
            docText ? (
              <div className="px-6 py-4">
                <div className="max-w-[680px] mx-auto text-white/70 leading-[1.9] whitespace-pre-wrap">
                  {docText}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/15 py-20">
                <p className="text-[43px] mb-3">
                  <Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} />
                </p>
                <p className="text-[17px] mb-1">{t("analyzer.sourceEmpty")}</p>
                <p className="text-[15px] text-white/10">{t("analyzer.empty")}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ─── RIGHT: AI 분석 패널 ─── */}
      <ResizableRightPanel
        storageKey="analyzer"
        breakpoint="lg"
        defaultWidth={380}
        className={`${
          mobilePane === "analysis" ? "flex" : "hidden"
        } lg:flex w-full flex-col bg-[#0d0f14] lg:h-full lg:overflow-hidden`}
      >
        <div className="p-3 border-b border-white/[0.04] flex-shrink-0">
          <p className="text-[15px] font-semibold text-white/60 mb-2 flex items-center gap-1">
            <Icon name="analyzer" size={14} />AI 분석
          </p>
          <div className="flex flex-wrap gap-1">
            {ANALYSIS_TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                style={
                  tab === tb.id
                    ? ({ background: tb.color + "22", color: tb.color } as React.CSSProperties)
                    : undefined
                }
                className={`px-2.5 py-1 rounded-md text-[13px] transition-colors ${
                  tab === tb.id ? "font-semibold" : "text-white/35 hover:text-white/60 bg-white/[0.03]"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => runAnalysis(tab)}
            disabled={loading || !docText.trim()}
            className="mt-2 w-full py-1.5 rounded-md text-[13px] bg-[#4a6cf7] text-white disabled:opacity-30 font-medium flex items-center justify-center gap-1"
          >
            <Icon name="engine" size={12} />
            {loading
              ? t("analyzer.analyzing")
              : `${ANALYSIS_TABS.find((x) => x.id === tab)?.label} 실행`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-10 text-white/25">{t("analyzer.analyzing")}</div>
          )}
          {!loading && results[tab] ? (
            <div className="text-[14px] text-white/70 leading-[1.8] whitespace-pre-wrap">
              {results[tab]}
            </div>
          ) : (
            !loading && (
              <div className="text-center py-16 text-white/15">
                <p className="text-[35px] mb-3">
                  <Icon name="🔬" className="inline-flex align-[-0.125em] mr-1" size={15} />
                </p>
                <p className="text-[15px]">
                  {hasDoc ? "위에서 분석 유형을 선택해 실행하세요." : t("analyzer.empty")}
                </p>
              </div>
            )
          )}
        </div>
      </ResizableRightPanel>
    </div>
  );
}
