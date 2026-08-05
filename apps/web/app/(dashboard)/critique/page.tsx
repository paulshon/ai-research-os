"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bench, BenchPane } from "@/components/bench/bench";
import { PageRail, type MarkerSeverity } from "@/components/bench/marker";
import { assignMarksToChunks, MarkedParagraph, hangulLabel, type TextMark } from "@/components/bench/marked-text";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { ProgressRow } from "@/components/ui/progress";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  Slider,
  Toggle,
  usePageInspector,
  NextStepLinks,
} from "@/components/inspector";
import { CritiqueCard, CRITIQUE_TYPES, critiqueTypeInfo, type CritiqueType } from "@/components/critique/critique-card";
import { CategorySummary } from "@/components/proofread/category-summary";
import { CorrectionCard } from "@/components/proofread/correction";
import { PROOF_CATEGORY_LABEL, PROOF_CATEGORY_ORDER, type ProofCategory } from "@/lib/proofread/categories";
import { proofreadDocument, computeStyleMetrics, type Correction } from "@/lib/proofread/engine";
import { critiqueAnalyzeSystemPrompt, critiqueAnalyzeUserPrompt } from "@/lib/i18n/ai-prompts";
import { type CritiqueCardDraft } from "@/lib/critique-draft";
import { useGemini } from "@/hooks/use-gemini";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import PageSaveRegistration from "@/components/save/page-save-bar";
import {
  processDocument,
  toFormattedText,
  isSupportedFile,
  UODE_ACCEPT,
  formatLabel,
  type UODEBlock,
} from "@/lib/uode";
import { convertHwpToPdf, isHwpFile } from "@/lib/hwp-convert";

interface PdfPage {
  pageNum: number;
  text: string;
}

type PageTab = "critique" | "proofread";
type ViewFilter = "both" | "critique" | "proofread";
type CritiqueFilter = "all" | CritiqueCardDraft["status"];

const TYPE_SEVERITY: Record<CritiqueType, MarkerSeverity> = {
  logic: "danger",
  evidence: "warn",
  concept: "info",
  style: "info",
  structure: "ok",
};

async function extractPdfText(
  arrayBuffer: ArrayBuffer,
  onProgress: (current: number, total: number) => void,
): Promise<PdfPage[]> {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) return [];
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
  return pages;
}

function applyCorrectionsToText(text: string, toApply: Correction[]): string {
  const sorted = [...toApply].sort((a, b) => b.index - a.index);
  let out = text;
  for (const c of sorted) {
    if (out.slice(c.index, c.index + c.original.length) !== c.original) continue;
    out = out.slice(0, c.index) + c.suggested + out.slice(c.index + c.original.length);
  }
  return out;
}

interface CritiqueUiDraft {
  fileName: string;
  docText: string;
  uodeMeta: string;
  isPdf: boolean;
  pdfPages: PdfPage[];
  cards: CritiqueCardDraft[];
  tab: PageTab;
  categoryEnabled: Record<ProofCategory, boolean>;
  exceptionTerms: string[];
}

export default function CritiquePage() {
  const { generate, loading } = useGemini();

  const [fileName, setFileName] = useState("");
  const [isPdf, setIsPdf] = useState(false);
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([]);
  const [uodeBlocks, setUodeBlocks] = useState<UODEBlock[]>([]);
  const [uodeMeta, setUodeMeta] = useState("");
  const [docText, setDocText] = useState("");
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [fontSize, setFontSize] = useState(13);

  const [tab, setTab] = useState<PageTab>("critique");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("both");

  const [cards, setCards] = useState<CritiqueCardDraft[]>([]);
  const [activeType, setActiveType] = useState<CritiqueType>("logic");
  const [critiqueFilter, setCritiqueFilter] = useState<CritiqueFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selText, setSelText] = useState("");

  const [categoryEnabled, setCategoryEnabled] = useState<Record<ProofCategory, boolean>>(() =>
    Object.fromEntries(PROOF_CATEGORY_ORDER.map((c) => [c, true])) as Record<ProofCategory, boolean>,
  );
  const [activeCategory, setActiveCategory] = useState<ProofCategory | "all">("all");
  const [exceptionTerms, setExceptionTerms] = useState<string[]>(["조직몰입", "이직의도"]);
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<{ when: string; label: string; count: number }[]>([]);

  const docRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const getData = useCallback(
    (): CritiqueUiDraft => ({
      fileName,
      docText,
      uodeMeta,
      isPdf,
      pdfPages,
      cards,
      tab,
      categoryEnabled,
      exceptionTerms,
    }),
    [fileName, docText, uodeMeta, isPdf, pdfPages, cards, tab, categoryEnabled, exceptionTerms],
  );
  const handleLoad = useCallback((data: unknown) => {
    const d = data as Partial<CritiqueUiDraft>;
    if (d.fileName !== undefined) setFileName(d.fileName);
    if (d.docText !== undefined) setDocText(d.docText);
    if (d.uodeMeta !== undefined) setUodeMeta(d.uodeMeta);
    if (d.isPdf !== undefined) setIsPdf(d.isPdf);
    if (d.pdfPages) setPdfPages(d.pdfPages);
    if (d.cards) setCards(d.cards);
    if (d.tab) setTab(d.tab);
    if (d.categoryEnabled) setCategoryEnabled(d.categoryEnabled);
    if (d.exceptionTerms) setExceptionTerms(d.exceptionTerms);
  }, []);
  const handleReset = useCallback(() => {
    setFileName("");
    setIsPdf(false);
    setPdfPages([]);
    setUodeBlocks([]);
    setUodeMeta("");
    setDocText("");
    setCards([]);
    setTab("critique");
    setHistory([]);
  }, []);
  usePagePersistence("critique", handleLoad, handleReset);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPdfPages([]);
    setUodeBlocks([]);
    setUodeMeta("");
    setDocText("");
    setCards([]);

    let workFile = file;
    if (isHwpFile(file)) {
      const conv = await convertHwpToPdf(file);
      if (conv.pdf) {
        workFile = conv.pdf;
        setUodeMeta("HWP → PDF 변환됨");
      } else if (conv.reason === "failed" && conv.message) {
        setUodeMeta(`HWP 변환기를 사용할 수 없습니다 (${conv.message})`);
      }
    }

    const isPdfFile = workFile.type === "application/pdf" || workFile.name.endsWith(".pdf");
    setIsPdf(isPdfFile);

    if (workFile.type === "text/plain" || workFile.name.endsWith(".md") || workFile.name.endsWith(".txt")) {
      setDocText((await workFile.text()).trim());
    } else if (isPdfFile) {
      if (!pdfJsLoaded) {
        alert("PDF 엔진을 불러오는 중입니다. 잠시 후 다시 시도하세요.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const buf = ev.target?.result as ArrayBuffer;
        setRenderProgress({ current: 0, total: 1 });
        try {
          const pages = await extractPdfText(buf, (cur, tot) => setRenderProgress({ current: cur, total: tot }));
          setPdfPages(pages);
          setDocText(pages.map((p) => p.text).join("\n\n").trim());
        } catch {
          alert("PDF를 읽지 못했습니다.");
        } finally {
          setRenderProgress(null);
        }
      };
      reader.readAsArrayBuffer(workFile);
    } else if (isSupportedFile(workFile.name)) {
      setRenderProgress({ current: 0, total: 1 });
      try {
        const doc = await processDocument(workFile, {
          onProgress: (p) => setRenderProgress({ current: Math.max(0, p.percent), total: 100 }),
        });
        setUodeBlocks(doc.blocks as UODEBlock[]);
        const note = doc.notes.length ? ` · ${doc.notes.join(" / ")}` : "";
        setUodeMeta(
          `${formatLabel(doc.format)} · ${doc.charCount.toLocaleString()}자 · ${doc.pageCount}p · 신뢰도 ${doc.confidence}%${note}`,
        );
        setDocText(toFormattedText(doc));
      } catch (err: any) {
        setDocText(`[${workFile.name}]\n문서 추출 실패: ${err?.message || "알 수 없는 오류"}`);
      } finally {
        setRenderProgress(null);
      }
    } else {
      setDocText(`[${workFile.name}]\n지원하지 않는 형식입니다.`);
    }
    e.target.value = "";
  };

  const pasteText = () => {
    const text = prompt("분석할 텍스트를 붙여넣으세요");
    if (text) {
      setFileName("붙여넣은 텍스트");
      setIsPdf(false);
      setPdfPages([]);
      setUodeBlocks([]);
      setUodeMeta("");
      setDocText(text);
    }
  };

  const hasDoc = pdfPages.length > 0 || uodeBlocks.length > 0 || !!docText.trim();

  /* ── 원문 선택 → 크리틱 카드 생성 ── */
  const handleSelectionUp = useCallback(() => {
    const sel = window.getSelection()?.toString().trim() ?? "";
    setSelText(sel);
  }, []);

  const createCritiqueFromSelection = () => {
    if (!selText) return;
    const num = cards.length + 1;
    const newCard: CritiqueCardDraft = {
      id: `${Date.now()}`,
      num,
      type: activeType,
      text: selText,
      note: "",
      editNote: "",
      status: "open",
    };
    setCards((prev) => [...prev, newCard]);
    setEditingId(newCard.id);
    setEditValue("");
    setSelText("");
    window.getSelection()?.removeAllRanges();
  };

  const aiAnalyzeCritique = async () => {
    const source = docText.trim().slice(0, 8000);
    if (!source) return;
    try {
      const raw = await generate({
        systemInstruction: critiqueAnalyzeSystemPrompt("ko"),
        userText: critiqueAnalyzeUserPrompt("ko", source),
        temperature: 0.4,
      });
      const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(clean);
      const newCards: CritiqueCardDraft[] = parsed.map((p: any, i: number) => ({
        id: `${Date.now()}-${i}`,
        num: cards.length + i + 1,
        type: ["logic", "evidence", "concept", "style", "structure"].includes(p?.type) ? p.type : "logic",
        text: String(p?.text ?? ""),
        note: String(p?.note ?? ""),
        editNote: String(p?.note ?? ""),
        status: "open",
        pageNum: typeof p?.page === "number" ? p.page : undefined,
      }));
      setCards((prev) => [...prev, ...newCards]);
    } catch (e) {
      alert(e instanceof Error && e.message === "API_KEY_MISSING" ? "설정에서 API 키를 입력하세요." : "분석 중 오류가 발생했습니다.");
    }
  };

  const updateStatus = (id: string, status: CritiqueCardDraft["status"]) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  const saveNote = (id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, note: editValue, editNote: editValue } : c)));
    setEditingId(null);
  };
  const deleteCard = (id: string) =>
    setCards((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, num: i + 1 })));

  const filteredCards = critiqueFilter === "all" ? cards : cards.filter((c) => c.status === critiqueFilter);
  const statusCounts = useMemo(() => {
    const c: Record<CritiqueCardDraft["status"], number> = { open: 0, "in-revision": 0, resubmitted: 0, approved: 0 };
    cards.forEach((card) => { c[card.status] += 1; });
    return c;
  }, [cards]);

  /* ── 교정·교열 ── */
  const allCorrections = useMemo(() => {
    if (!docText.trim()) return [];
    return proofreadDocument(docText).filter(
      (c) => categoryEnabled[c.category] && !exceptionTerms.includes(c.original),
    );
  }, [docText, categoryEnabled, exceptionTerms]);
  const visibleCorrections = allCorrections.filter((c) => !ignoredIds.has(c.id));
  const shownCorrections = activeCategory === "all" ? visibleCorrections : visibleCorrections.filter((c) => c.category === activeCategory);
  const autoApplicableCount = visibleCorrections.filter((c) => c.autoApplicable).length;
  const styleMetrics = useMemo(() => computeStyleMetrics(docText), [docText]);

  const applyOne = (correction: Correction) => {
    setDocText((prev) => applyCorrectionsToText(prev, [correction]));
    setHistory((prev) => [{ when: "방금", label: "교정 적용", count: 1 }, ...prev].slice(0, 8));
  };
  const applyAllSameRule = (ruleId: string) => {
    const group = visibleCorrections.filter((c) => c.ruleId === ruleId && c.autoApplicable);
    if (!group.length) return;
    setDocText((prev) => applyCorrectionsToText(prev, group));
    setHistory((prev) => [{ when: "방금", label: "교정 일괄 적용", count: group.length }, ...prev].slice(0, 8));
  };
  const applyAllAuto = () => {
    const group = visibleCorrections.filter((c) => c.autoApplicable);
    if (!group.length) return;
    setDocText((prev) => applyCorrectionsToText(prev, group));
    setHistory((prev) => [{ when: "방금", label: "확실한 오류 일괄 적용", count: group.length }, ...prev].slice(0, 8));
  };
  const ignoreOne = (id: string) => setIgnoredIds((prev) => new Set(prev).add(id));
  const addExceptionTerm = () => {
    const term = prompt("교정 대상에서 제외할 전공 용어·고유명사를 입력하세요");
    if (term && term.trim()) setExceptionTerms((prev) => [...prev, term.trim()]);
  };

  /* ── 원문 마커(크리틱 + 교정) ── */
  const critiqueMarks: TextMark[] = useMemo(
    () =>
      cards
        .filter((c) => c.text && !c.text.startsWith("["))
        .map((c) => ({ id: `crq-${c.id}`, quote: c.text, severity: TYPE_SEVERITY[c.type as CritiqueType] ?? "info", label: String(c.num) })),
    [cards],
  );
  const proofMarks: TextMark[] = useMemo(
    () =>
      shownCorrections.map((c, i) => ({
        id: `pf-${c.id}`,
        quote: c.original,
        severity: c.autoApplicable ? "danger" : "warn",
        label: hangulLabel(i),
      })),
    [shownCorrections],
  );
  const activeMarks =
    viewFilter === "critique" ? critiqueMarks : viewFilter === "proofread" ? proofMarks : [...critiqueMarks, ...proofMarks];

  const chunks = pdfPages.length > 0 ? pdfPages.map((p) => p.text) : [docText];
  const marksByChunk = useMemo(() => assignMarksToChunks(chunks, activeMarks), [chunks, activeMarks]);

  usePageInspector(
    <Inspector title="검사 설정" badge={{ label: `${allCorrections.length}건`, variant: "warn" }}>
      <InspectorSection title="이 화면의 역할">
        <p className="fs-cap t2" style={{ lineHeight: 1.8 }}>
          <b>교정·교열</b>은 문장의 <b>표현</b>을 봅니다.
          <br />
          <b>크리틱</b>은 주장의 <b>내용</b>을 봅니다.
        </p>
      </InspectorSection>

      <InspectorSection title="검사 범주 켜기">
        {PROOF_CATEGORY_ORDER.map((cat) => (
          <PropertyRow label={PROOF_CATEGORY_LABEL[cat]} key={cat}>
            <Toggle
              label={`${PROOF_CATEGORY_LABEL[cat]} 검사`}
              value={categoryEnabled[cat] ? "on" : "off"}
              onChange={(v) => setCategoryEnabled((prev) => ({ ...prev, [cat]: v === "on" }))}
              options={[{ value: "on", label: "켬" }, { value: "off", label: "끔" }] as const}
            />
          </PropertyRow>
        ))}
      </InspectorSection>

      <InspectorSection title="내 예외 사전" action={<Badge variant="mute">{exceptionTerms.length}</Badge>}>
        <p className="fs-cap t2 mb3" style={{ lineHeight: 1.65 }}>전공 용어·고유명사는 교정 대상에서 뺍니다.</p>
        <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
          {exceptionTerms.map((t) => (
            <Badge variant="mute" key={t}>{t}</Badge>
          ))}
        </div>
        <Button size="sm" className="mt3" style={{ width: "100%" }} onClick={addExceptionTerm}>
          <Icon name="plus" size={13} /> 용어 추가
        </Button>
      </InspectorSection>

      <InspectorSection title="크리틱 심사 관점">
        <PropertyRow label="역할">
          <Select style={{ flex: 1 }} defaultValue="strict">
            <option value="strict">엄격한 심사위원</option>
            <option value="friendly">우호적 지도교수</option>
            <option value="peer">동료 연구자</option>
          </Select>
        </PropertyRow>
      </InspectorSection>

      <InspectorSection title="적용 이력">
        {history.length === 0 ? (
          <p className="fs-cap t3">아직 적용 이력이 없습니다.</p>
        ) : (
          history.map((h, i) => (
            <div className="chk" key={i}>
              <span className="lb">{h.when} · {h.label}</span>
              <span className="vl">{h.count}건</span>
            </div>
          ))
        )}
      </InspectorSection>

      <InspectorSection title="다음으로">
        <NextStepLinks
          items={[
            { href: "/writing", label: "원고에 반영하러 가기", icon: "pen" },
            { href: "/analyzer", label: "논문 분석으로", icon: "chart" },
          ]}
        />
      </InspectorSection>
    </Inspector>,
  );

  return (
    <Bench
      left={
        <BenchPane
          head={
            <>
              <Icon name="doc" size={15} />
              <span className="ttl">원문</span>
              {fileName ? <Badge variant="mute" className="nowrap">{fileName}</Badge> : null}
              <div className="sp" />
              <Segmented
                items={[
                  { value: "both", label: "둘 다" },
                  { value: "critique", label: "크리틱만" },
                  { value: "proofread", label: "교정만" },
                ] as const}
                value={viewFilter}
                onChange={setViewFilter}
                label="표시 필터"
              />
            </>
          }
          foot={
            hasDoc ? (
              <>
                <span className="fs-cap t3">표시</span>
                {critiqueMarks.length ? <Badge variant="danger">크리틱 {critiqueMarks.length}</Badge> : null}
                {proofMarks.length ? <Badge variant="warn">교정 {proofMarks.length}</Badge> : null}
                <div className="sp" />
                {pdfPages.length ? <span className="fs-cap t3 mono">{pdfPages.length}쪽</span> : null}
              </>
            ) : null
          }
        >
          <PageSaveRegistration pageId="critique" getData={getData} />
          <input ref={fileRef} type="file" className="sr" accept={UODE_ACCEPT} onChange={handleFile} />
          {!hasDoc ? (
            <div className="empty">
              <div className="em-ic"><Icon name="upload" size={22} /></div>
              <h3>비평할 논문을 불러오세요</h3>
              <p>PDF · DOCX · HWP/HWPX · TXT · MD 지원</p>
              <div className="acts">
                <Button variant="primary" onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" size={14} /> 파일 선택
                </Button>
                <Button variant="ghost" onClick={pasteText}>
                  <Icon name="pen" size={14} /> 텍스트 붙여넣기
                </Button>
              </div>
            </div>
          ) : renderProgress ? (
            <div className="empty"><p className="t2">불러오는 중… {renderProgress.current}/{renderProgress.total}</p></div>
          ) : (
            <>
              {pdfPages.length > 0 ? (
                <PageRail
                  pages={pdfPages.length}
                  current={1}
                  onSelect={(n) => document.getElementById(`cpage-${n}`)?.scrollIntoView({ behavior: "smooth" })}
                />
              ) : null}
              {selText ? (
                <div className="row mb3" style={{ gap: 8, flexWrap: "wrap", padding: 10, borderRadius: 8, background: "var(--glass-2)", border: "1px solid var(--stroke)" }}>
                  <span className="fs-cap t2">선택됨: &ldquo;{selText.slice(0, 40)}{selText.length > 40 ? "…" : ""}&rdquo;</span>
                  <Select value={activeType} onChange={(e) => setActiveType(e.target.value as CritiqueType)} style={{ width: 120 }}>
                    {CRITIQUE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </Select>
                  <Button size="sm" variant="primary" onClick={createCritiqueFromSelection}>
                    <Icon name="plus" size={13} /> 크리틱 만들기
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelText("")}>취소</Button>
                </div>
              ) : null}
              <div ref={docRef} onMouseUp={handleSelectionUp} style={{ fontSize }}>
                {chunks.map((chunk, i) => (
                  <div className="doc-page" key={i} id={pdfPages.length ? `cpage-${pdfPages[i]?.pageNum}` : "cpage-1"}>
                    {pdfPages.length ? <span className="pg-no">{pdfPages[i]?.pageNum} / {pdfPages.length}</span> : null}
                    <p style={{ whiteSpace: "pre-wrap" }}>
                      <MarkedParagraph text={chunk} marks={marksByChunk[i] ?? []} />
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </BenchPane>
      }
      right={
        <BenchPane
          head={
            <>
              <Icon name="spark" size={15} />
              <span className="ttl">패널</span>
              <Segmented
                items={[
                  { value: "critique", label: `크리틱 ${cards.length}` },
                  { value: "proofread", label: `교정·교열 ${allCorrections.length}` },
                ] as const}
                value={tab}
                onChange={setTab}
                label="패널 탭"
              />
              <div className="sp" />
              {tab === "critique" ? (
                <Button size="sm" variant="primary" onClick={aiAnalyzeCritique} disabled={loading || !docText.trim()}>
                  <Icon name="spark" size={13} /> {loading ? "분석 중…" : "전체 검사"}
                </Button>
              ) : null}
            </>
          }
        >
          {!hasDoc ? (
            <div className="empty"><p className="t3">먼저 좌측에서 문서를 불러오세요.</p></div>
          ) : tab === "proofread" ? (
            <>
              <section className="glass card mb4">
                <div className="card-h">
                  <h3 style={{ fontSize: "var(--fs-md)" }}>한글 교정·교열</h3>
                  <div className="sp" />
                  <Badge variant="warn">{allCorrections.length}건</Badge>
                  <span className="fs-cap t3">
                    {docText.length ? `1,000자당 ${Math.round((allCorrections.length / Math.max(1, docText.length / 1000)) * 10) / 10}건` : ""}
                  </span>
                </div>
                <CategorySummary corrections={visibleCorrections} activeCategory={activeCategory} onSelect={setActiveCategory} />
                <div className="row mt4" style={{ paddingTop: 12, borderTop: "1px solid var(--hairline)", flexWrap: "wrap", gap: 8 }}>
                  <span className="fs-cap t2">확실한 오류 <b>{autoApplicableCount}건</b>은 한 번에 고칠 수 있습니다.</span>
                  <div className="sp" />
                  <Button size="sm" variant="primary" onClick={applyAllAuto} disabled={!autoApplicableCount}>
                    {autoApplicableCount}건 일괄 적용
                  </Button>
                </div>
                <p className="fs-cap t3 mt3 mb0" style={{ lineHeight: 1.7 }}>
                  나머지는 <b>문맥 판단이 필요해</b> 자동 적용하지 않습니다. 학술 문체 항목은 저자의 의도를 확인하세요.
                </p>
              </section>

              <section className="glass card mb4">
                <div className="card-h"><h3 style={{ fontSize: "var(--fs-md)" }}>문체 지표</h3></div>
                <ProgressRow label="평균 문장 길이" value={Math.min(100, (styleMetrics.avgSentenceLength / 90) * 100)} tone={styleMetrics.avgSentenceLength > 55 ? "danger" : "ok"} suffix="자" />
                <ProgressRow label="피동 표현 비율" value={styleMetrics.passiveRatio} tone={styleMetrics.passiveRatio > 15 ? "danger" : "ok"} suffix="%" />
                <ProgressRow label="번역투 밀도(‰)" value={Math.min(100, styleMetrics.translationeseDensity * 20)} tone={styleMetrics.translationeseDensity > 2 ? "warn" : "ok"} suffix="" />
                <ProgressRow label="한 문단 문장 수" value={Math.min(100, styleMetrics.sentencesPerParagraph * 20)} tone="ok" suffix="개" />
                <div className="mt4" style={{ padding: "11px 13px", borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--warn) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 22%, transparent)" }}>
                  <p className="fs-cap t2 mb0" style={{ lineHeight: 1.75 }}>
                    권장치는 평균 <b>45–55자</b>, 피동 <b>10% 이하</b>입니다.
                  </p>
                </div>
                {styleMetrics.perChapterCounts.length > 1 ? (
                  <div className="row mt3" style={{ alignItems: "flex-end", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div className="fs-cap t3 mb3">장별 교정 건수</div>
                      <div className="spark">
                        {styleMetrics.perChapterCounts.map((n, i) => {
                          const max = Math.max(...styleMetrics.perChapterCounts, 1);
                          const pct = Math.round((n / max) * 100);
                          const tone = pct > 70 ? "hot" : pct > 35 ? "warm" : "cool";
                          return <i key={i} className={tone} style={{ height: `${Math.max(6, pct)}%` }} />;
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="glass card">
                <div className="card-h">
                  <h3 style={{ fontSize: "var(--fs-md)" }}>교정 항목</h3>
                  <div className="sp" />
                </div>
                {shownCorrections.length === 0 ? (
                  <p className="t3 fs-sm">이상 없음 — 검사 조건에 맞는 항목이 없습니다.</p>
                ) : (
                  shownCorrections.map((c, i) => (
                    <CorrectionCard
                      key={c.id}
                      correction={c}
                      markerLabel={hangulLabel(i)}
                      location={fileName || "본문"}
                      sameTypeCount={visibleCorrections.filter((x) => x.ruleId === c.ruleId && x.autoApplicable).length}
                      onApply={() => applyOne(c)}
                      onApplyAllSameType={() => applyAllSameRule(c.ruleId)}
                      onIgnore={() => ignoreOne(c.id)}
                    />
                  ))
                )}
              </section>
            </>
          ) : (
            <>
              <section className="glass card mb4">
                <div className="card-h" style={{ marginBottom: 6 }}>
                  <h3 style={{ fontSize: "var(--fs-md)" }}>크리틱</h3>
                  <div className="sp" />
                  {statusCounts.open ? <Badge variant="danger">OPEN {statusCounts.open}</Badge> : null}
                  {statusCounts["in-revision"] ? <Badge variant="warn">수정중 {statusCounts["in-revision"]}</Badge> : null}
                  {statusCounts.approved ? <Badge variant="ok">승인 {statusCounts.approved}</Badge> : null}
                </div>
                <p className="card-sub">원문에서 문장을 드래그하면 카드가 만들어집니다. 교정·교열과 달리 <b>내용</b>을 다룹니다.</p>
                <Segmented
                  items={[
                    { value: "all", label: "전체" },
                    { value: "open", label: "OPEN" },
                    { value: "in-revision", label: "수정중" },
                    { value: "resubmitted", label: "재제출" },
                    { value: "approved", label: "승인" },
                  ] as const}
                  value={critiqueFilter}
                  onChange={setCritiqueFilter}
                  label="크리틱 필터"
                />
              </section>

              {filteredCards.length === 0 ? (
                <p className="t3 fs-sm">아직 크리틱이 없습니다. 원문을 드래그하거나 전체 검사를 실행하세요.</p>
              ) : (
                filteredCards.map((c) => (
                  <CritiqueCard
                    key={c.id}
                    card={c}
                    isEditing={editingId === c.id}
                    editValue={editingId === c.id ? editValue : c.editNote}
                    onEditValueChange={setEditValue}
                    onStartEdit={() => {
                      setEditingId(c.id);
                      setEditValue(c.note);
                    }}
                    onSaveNote={() => saveNote(c.id)}
                    onStatusChange={(status) => updateStatus(c.id, status)}
                    onDelete={() => deleteCard(c.id)}
                    onJumpToSource={() =>
                      c.pageNum && document.getElementById(`cpage-${c.pageNum}`)?.scrollIntoView({ behavior: "smooth" })
                    }
                  />
                ))
              )}
            </>
          )}
        </BenchPane>
      }
    />
  );
}
