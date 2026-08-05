"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bench, BenchPane } from "@/components/bench/bench";
import { PageRail } from "@/components/bench/marker";
import { assignMarksToChunks, MarkedParagraph, type TextMark } from "@/components/bench/marked-text";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "@/components/ui/gauge";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  Slider,
  Toggle,
  usePageInspector,
  NextStepLinks,
} from "@/components/inspector";
import { ScoreMatrix, type MatrixRow } from "@/components/analyzer/score-matrix";
import { Diagnosis, type DiagnosisItem } from "@/components/analyzer/diagnosis";
import {
  detectSections,
  applySectionOverrides,
  getSectionText,
  type SectionId,
} from "@/lib/analyzer/sections";
import { getAxes, FIELD_PROFILES, fieldProfileById, type MethodKind, type Axis } from "@/lib/analyzer/axes";
import { buildSectionAnalysisPrompt } from "@/lib/analyzer/prompts";
import { sectionScore, overallScore, type AxisScore } from "@/lib/analyzer/score";
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

type SimpleTab = "overall" | "sentence" | "evidence" | "improve";
const TAB_ITEMS = [
  { value: "overall" as const, label: "전체" },
  { value: "micro" as const, label: "미시" },
  { value: "sentence" as const, label: "문장" },
  { value: "evidence" as const, label: "근거검증" },
  { value: "improve" as const, label: "개선안" },
];
type Tab = (typeof TAB_ITEMS)[number]["value"];

interface SectionAnalysis {
  axisScores: AxisScore[];
  diagnoses: DiagnosisItem[];
}

interface HistoryEntry {
  when: string;
  label: string;
  score: number;
}

interface AnalyzerDraft {
  fileName: string;
  docText: string;
  uodeMeta: string;
  isPdf: boolean;
  pdfPages: PdfPage[];
  tab: Tab;
  results: Record<string, string>;
  method: MethodKind;
  fieldProfileId: string;
}

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

function parseJsonArray(raw: string): any[] {
  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isDiagnosisComplete(item: DiagnosisItem, sourceText: string): boolean {
  const quote = item.quote?.trim() ?? "";
  return (
    !!item.severity &&
    !!item.axisLabel &&
    !!item.location &&
    quote.length > 0 &&
    sourceText.includes(quote) &&
    item.actions.length > 0
  );
}

export default function AnalyzerPage() {
  const { generate, loading } = useGemini();

  const [fileName, setFileName] = useState("");
  const [isPdf, setIsPdf] = useState(false);
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([]);
  const [uodeBlocks, setUodeBlocks] = useState<UODEBlock[]>([]);
  const [uodeMeta, setUodeMeta] = useState("");
  const [docText, setDocText] = useState("");
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);

  const [tab, setTab] = useState<Tab>("overall");
  const [results, setResults] = useState<Record<string, string>>({});
  const [fontSize, setFontSize] = useState(14);

  const [method, setMethod] = useState<MethodKind>("quant");
  const [fieldProfileId, setFieldProfileId] = useState("general");
  const [sectionOverrides, setSectionOverrides] = useState<Partial<Record<SectionId, number>>>({});
  const [weightOverrides, setWeightOverrides] = useState<Record<string, number>>({});
  const [editingBoundaries, setEditingBoundaries] = useState(false);

  const [sectionAnalysis, setSectionAnalysis] = useState<Partial<Record<SectionId, SectionAnalysis>>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<SectionId | null>(null);
  const [analyzingMicro, setAnalyzingMicro] = useState(false);
  const [diagSort, setDiagSort] = useState<"severity" | "location">("severity");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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
    (): AnalyzerDraft => ({
      fileName,
      docText,
      uodeMeta,
      isPdf,
      pdfPages,
      tab,
      results,
      method,
      fieldProfileId,
    }),
    [fileName, docText, uodeMeta, isPdf, pdfPages, tab, results, method, fieldProfileId],
  );
  const handleLoad = useCallback((data: unknown) => {
    const d = data as Partial<AnalyzerDraft>;
    if (d.fileName !== undefined) setFileName(d.fileName);
    if (d.docText !== undefined) setDocText(d.docText);
    if (d.uodeMeta !== undefined) setUodeMeta(d.uodeMeta);
    if (d.isPdf !== undefined) setIsPdf(d.isPdf);
    if (d.pdfPages) setPdfPages(d.pdfPages);
    if (d.tab) setTab(d.tab);
    if (d.results) setResults(d.results);
    if (d.method) setMethod(d.method);
    if (d.fieldProfileId) setFieldProfileId(d.fieldProfileId);
  }, []);
  const handleReset = useCallback(() => {
    setFileName("");
    setIsPdf(false);
    setPdfPages([]);
    setUodeBlocks([]);
    setUodeMeta("");
    setDocText("");
    setResults({});
    setTab("overall");
    setSectionAnalysis({});
    setSelectedSectionId(null);
    setHistory([]);
  }, []);
  usePagePersistence("analyzer", handleLoad, handleReset);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPdfPages([]);
    setUodeBlocks([]);
    setUodeMeta("");
    setDocText("");
    setResults({});
    setSectionAnalysis({});
    setSelectedSectionId(null);

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

  const baseSections = useMemo(() => detectSections(docText), [docText]);
  const sections = useMemo(
    () => applySectionOverrides(baseSections, sectionOverrides, docText.length),
    [baseSections, sectionOverrides, docText.length],
  );
  const foundCount = sections.filter((s) => s.found).length;

  const axisWeight = useCallback(
    (sectionId: SectionId, axis: Axis) => weightOverrides[`${sectionId}:${axis.id}`] ?? axis.weight,
    [weightOverrides],
  );

  const matrixRows: MatrixRow[] = useMemo(
    () =>
      sections.map((s) => {
        const axes = getAxes(s.id, method);
        const stored = sectionAnalysis[s.id];
        return {
          id: s.id,
          label: s.label,
          found: s.found,
          axes,
          axisScores:
            stored?.axisScores ?? axes.map((a) => ({ axisId: a.id, score: null, weight: axisWeight(s.id, a) })),
        };
      }),
    [sections, method, sectionAnalysis, axisWeight],
  );

  useEffect(() => {
    if (selectedSectionId && sections.some((s) => s.id === selectedSectionId)) return;
    const withScore = matrixRows
      .filter((r) => r.found)
      .map((r) => ({ id: r.id, score: sectionScore(r.axisScores) }))
      .sort((a, b) => (a.score ?? 999) - (b.score ?? 999));
    setSelectedSectionId(withScore[0]?.id ?? sections[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, matrixRows]);

  const selectedRow = matrixRows.find((r) => r.id === selectedSectionId) ?? null;
  const selectedTotal = selectedRow ? sectionScore(selectedRow.axisScores) : null;

  const runMicroAnalysis = async () => {
    if (!docText.trim()) return;
    setAnalyzingMicro(true);
    const profile = fieldProfileById(fieldProfileId);
    const next: Partial<Record<SectionId, SectionAnalysis>> = { ...sectionAnalysis };
    for (const s of sections) {
      if (!s.found) continue;
      const sectionText = getSectionText(sections, docText, s.id);
      if (!sectionText.trim()) continue;
      const axes = getAxes(s.id, method);
      const { system, user } = buildSectionAnalysisPrompt(s.id, method, sectionText, profile.label);
      try {
        const raw = await generate({ systemInstruction: system, userText: user, temperature: 0.4, maxOutputTokens: 4096 });
        const parsed = parseJsonArray(raw);
        const axisScores: AxisScore[] = axes.map((a) => {
          const entry = parsed.find((p) => p?.axisId === a.id);
          const score = typeof entry?.score === "number" ? Math.max(0, Math.min(100, Math.round(entry.score))) : null;
          return { axisId: a.id, score, weight: axisWeight(s.id, a) };
        });
        const diagnoses: DiagnosisItem[] = [];
        parsed.forEach((entry: any, ai: number) => {
          const axis = axes.find((a) => a.id === entry?.axisId);
          if (!axis || !Array.isArray(entry?.findings)) return;
          entry.findings.forEach((f: any, fi: number) => {
            const item: DiagnosisItem = {
              id: `${s.id}-${axis.id}-${ai}-${fi}`,
              severity: ["danger", "warn", "info", "ok"].includes(f?.severity) ? f.severity : "info",
              axisLabel: axis.label,
              title: String(f?.title ?? ""),
              detail: String(f?.detail ?? ""),
              location: String(f?.location ?? ""),
              quote: String(f?.quote ?? ""),
              actions: Array.isArray(f?.actions) ? f.actions.map((a: string) => ({ label: a })) : [],
            };
            if (isDiagnosisComplete(item, docText)) diagnoses.push(item);
          });
        });
        next[s.id] = { axisScores, diagnoses };
      } catch {
        // 실패한 섹션은 건너뛰고 계속 진행 — 전체 재분석이 한 섹션 오류로 멈추지 않게 한다.
      }
    }
    setSectionAnalysis(next);
    setAnalyzingMicro(false);
    const overall = overallScore(
      sections.filter((s) => s.found).map((s) => sectionScore(next[s.id]?.axisScores ?? [])),
    );
    if (overall !== null) {
      setHistory((prev) => [
        { when: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }), label: "전체", score: overall },
        ...prev,
      ].slice(0, 8));
    }
  };

  const SIMPLE_PROMPTS: Record<SimpleTab, string> = {
    overall: "이 논문의 전체 구조, 논리 흐름, 강점과 약점을 분석하라.",
    sentence: "핵심 문장들을 학술적 적절성 관점에서 분석하라.",
    evidence: "핵심 주장들의 근거가 데이터·인용과 실제로 부합하는지 검증하라.",
    improve: "장별로 구체적인 개선 제안을 제시하라.",
  };

  const runSimpleAnalysis = async (mode: SimpleTab) => {
    const source = docText.trim();
    if (!source) return;
    try {
      const result = await generate({
        systemInstruction: "당신은 논문 심사 전문가입니다. 근거 없는 단정은 피하고, 가능하면 원문을 인용하며 답하라.",
        userText: `${SIMPLE_PROMPTS[mode]}\n\n---\n${source.slice(0, 15000)}\n---`,
        maxOutputTokens: 4096,
        temperature: 0.4,
      });
      setResults((prev) => ({ ...prev, [mode]: result }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [mode]: e instanceof Error && e.message === "API_KEY_MISSING" ? "설정에서 API 키를 입력하세요." : "분석 중 오류가 발생했습니다.",
      }));
    }
  };

  const rerun = () => {
    if (tab === "micro") void runMicroAnalysis();
    else void runSimpleAnalysis(tab as SimpleTab);
  };

  const allDiagnoses = useMemo(() => {
    const list: (DiagnosisItem & { sectionId: SectionId })[] = [];
    for (const s of sections) {
      const entry = sectionAnalysis[s.id];
      entry?.diagnoses.forEach((d) => list.push({ ...d, sectionId: s.id }));
    }
    return list.sort((a, b) => docText.indexOf(a.quote) - docText.indexOf(b.quote));
  }, [sections, sectionAnalysis, docText]);

  const marks: TextMark[] = useMemo(
    () =>
      allDiagnoses.map((d, i) => ({ id: d.id, quote: d.quote, severity: d.severity, label: String(i + 1) })),
    [allDiagnoses],
  );

  const chunks = pdfPages.length > 0 ? pdfPages.map((p) => p.text) : [docText];
  const marksByChunk = useMemo(() => assignMarksToChunks(chunks, marks), [chunks, marks]);

  const severityCounts = useMemo(() => {
    const c = { danger: 0, warn: 0, info: 0, ok: 0 };
    allDiagnoses.forEach((d) => { c[d.severity] += 1; });
    return c;
  }, [allDiagnoses]);

  const selectedDiagnoses = selectedSectionId
    ? (sectionAnalysis[selectedSectionId]?.diagnoses ?? [])
    : [];
  const sortedSelectedDiagnoses = useMemo(() => {
    const arr = [...selectedDiagnoses];
    if (diagSort === "location") arr.sort((a, b) => docText.indexOf(a.quote) - docText.indexOf(b.quote));
    else {
      const rank: Record<string, number> = { danger: 0, warn: 1, info: 2, ok: 3 };
      arr.sort((a, b) => rank[a.severity] - rank[b.severity]);
    }
    return arr;
  }, [selectedDiagnoses, diagSort, docText]);

  usePageInspector(
    <Inspector title="분석 설정" badge={{ label: TAB_ITEMS.find((t) => t.value === tab)?.label ?? "", variant: "info" }}>
      <InspectorSection title="분석 대상">
        <PropertyRow label="문서">
          <span className="fs-cap t2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName || "업로드된 문서 없음"}
          </span>
        </PropertyRow>
        <PropertyRow label="형식">
          <span className="fs-cap t2">{uodeMeta || (isPdf ? `PDF · ${pdfPages.length}쪽` : docText ? "텍스트" : "—")}</span>
        </PropertyRow>
      </InspectorSection>

      <InspectorSection
        title="섹션 자동 인식"
        action={<Badge variant={foundCount === 7 ? "ok" : "mute"}>{foundCount}/7</Badge>}
      >
        <p className="fs-cap t2 mb3" style={{ lineHeight: 1.65 }}>
          목차와 본문 서식으로 섹션 경계를 잡습니다. 틀렸다면 시작 위치를 직접 지정하세요.
        </p>
        {sections.map((s) => (
          <div className="chk" key={s.id}>
            <span className="lb">{s.label}</span>
            {editingBoundaries ? (
              <input
                type="number"
                className="input"
                style={{ width: 84, padding: "4px 6px", fontSize: 11 }}
                value={s.found ? s.startChar : ""}
                placeholder="미발견"
                onChange={(e) => {
                  const v = e.target.value;
                  setSectionOverrides((prev) => ({ ...prev, [s.id]: v === "" ? -1 : Number(v) }));
                }}
              />
            ) : (
              <span className="vl mono">{s.found ? `${s.startChar}자~` : "미발견"}</span>
            )}
          </div>
        ))}
        <Button size="sm" className="mt3" style={{ width: "100%" }} onClick={() => setEditingBoundaries((v) => !v)}>
          {editingBoundaries ? "완료" : "경계 직접 지정"}
        </Button>
      </InspectorSection>

      {selectedRow ? (
        <InspectorSection title="이 섹션의 진단축">
          <p className="fs-cap t2 mb3" style={{ lineHeight: 1.65 }}>
            <b>{selectedRow.label}</b> 섹션에만 적용되는 4개 축입니다. 섹션을 바꾸면 축도 바뀝니다.
          </p>
          {selectedRow.axes.map((axis) => {
            const w = axisWeight(selectedRow.id, axis);
            return (
              <PropertyRow label={axis.label} key={axis.id}>
                <Slider
                  label={`${axis.label} 가중치`}
                  value={w}
                  min={0}
                  max={100}
                  onChange={(v) => setWeightOverrides((prev) => ({ ...prev, [`${selectedRow.id}:${axis.id}`]: v }))}
                />
                <span className="fs-cap t3 mono">{w}%</span>
              </PropertyRow>
            );
          })}
          <p className="fs-cap t3 mt3 mb0">가중치를 바꾸면 종합 점수가 즉시 다시 계산됩니다.</p>
        </InspectorSection>
      ) : null}

      <InspectorSection title="학문 분야 프로파일">
        <PropertyRow label="분야">
          <Select value={fieldProfileId} onChange={(e) => setFieldProfileId(e.target.value)} style={{ flex: 1 }}>
            {FIELD_PROFILES.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </Select>
        </PropertyRow>
        <PropertyRow label="연구 유형">
          <Toggle
            label="연구 유형"
            value={method}
            onChange={setMethod}
            options={
              [
                { value: "quant", label: "양적" },
                { value: "qual", label: "질적" },
                { value: "mixed", label: "혼합" },
              ] as const
            }
          />
        </PropertyRow>
        <p className="fs-cap t3 mt3 mb0" style={{ lineHeight: 1.7 }}>
          질적 연구를 선택하면 연구방법 섹션의 진단축이 참여자 선정 논리·신빙성 확보 절차로 바뀝니다.
        </p>
      </InspectorSection>

      <InspectorSection title="분석 이력">
        {history.length === 0 ? (
          <p className="fs-cap t3">아직 분석 이력이 없습니다.</p>
        ) : (
          history.map((h, i) => (
            <div className="chk" key={i}>
              <span className="lb">{h.when} · {h.label}</span>
              <span className="vl" style={{ color: i === 0 ? "var(--danger)" : undefined }}>{h.score}</span>
            </div>
          ))
        )}
      </InspectorSection>

      <InspectorSection title="다음으로">
        <NextStepLinks
          items={[
            { href: "/critique", label: "논증 비평 받기", icon: "spark" },
            { href: "/writing", label: "보완하러 가기", icon: "pen" },
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
              <Button size="sm" variant="ghost" aria-label="글자 크기 줄이기" onClick={() => setFontSize((s) => Math.max(11, s - 1))}>
                가 작게
              </Button>
              <Button size="sm" variant="ghost" aria-label="글자 크기 키우기" onClick={() => setFontSize((s) => Math.min(20, s + 1))}>
                가 크게
              </Button>
            </>
          }
          foot={
            hasDoc ? (
              <>
                <span className="fs-cap t3">지적 표시</span>
                {severityCounts.danger ? <Badge variant="danger">치명 {severityCounts.danger}</Badge> : null}
                {severityCounts.warn ? <Badge variant="warn">주의 {severityCounts.warn}</Badge> : null}
                {severityCounts.info ? <Badge variant="info">확인 {severityCounts.info}</Badge> : null}
                {severityCounts.ok ? <Badge variant="ok">양호 {severityCounts.ok}</Badge> : null}
                <div className="sp" />
                {pdfPages.length ? <span className="fs-cap t3 mono">{pdfPages.length}쪽</span> : null}
              </>
            ) : null
          }
        >
          <PageSaveRegistration pageId="analyzer" getData={getData} />
          <input ref={fileRef} type="file" className="sr" accept={UODE_ACCEPT} onChange={handleFile} />
          {!hasDoc ? (
            <div className="empty">
              <div className="em-ic"><Icon name="upload" size={22} /></div>
              <h3>분석할 논문을 불러오세요</h3>
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
            <div className="empty">
              <p className="t2">불러오는 중… {renderProgress.current}/{renderProgress.total}</p>
            </div>
          ) : (
            <>
              {pdfPages.length > 0 ? (
                <PageRail
                  pages={pdfPages.length}
                  current={1}
                  marked={new Set(marksByChunk.map((m, i) => (m.length ? pdfPages[i]?.pageNum : -1)).filter((n): n is number => !!n && n > 0))}
                  onSelect={(n) => document.getElementById(`apage-${n}`)?.scrollIntoView({ behavior: "smooth" })}
                />
              ) : null}
              <div style={{ fontSize }}>
                {chunks.map((chunk, i) => (
                  <div className="doc-page" key={i} id={pdfPages.length ? `apage-${pdfPages[i]?.pageNum}` : "apage-1"}>
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
              <Icon name="chart" size={15} />
              <span className="ttl">분석</span>
              <Segmented items={TAB_ITEMS} value={tab} onChange={setTab} label="분석 탭" />
              <div className="sp" />
              <Button size="sm" variant="primary" onClick={rerun} disabled={loading || analyzingMicro || !docText.trim()}>
                <Icon name="refresh" size={13} />
                {loading || analyzingMicro ? "분석 중…" : "재분석"}
              </Button>
            </>
          }
        >
          {!hasDoc ? (
            <div className="empty">
              <p className="t3">먼저 좌측에서 문서를 불러오세요.</p>
            </div>
          ) : tab === "micro" ? (
            <>
              <section className="glass card mb4">
                <div className="card-h">
                  <h3 style={{ fontSize: "var(--fs-md)" }}>미시분석 · 7개 섹션 × 4개 축</h3>
                  <div className="sp" />
                  <span className="fs-cap t3">{fieldProfileById(fieldProfileId).label} 프로파일</span>
                </div>
                <ScoreMatrix rows={matrixRows} selectedId={selectedSectionId} onSelect={setSelectedSectionId} />
                <p className="fs-cap t3 mt3 mb0" style={{ lineHeight: 1.7 }}>
                  행을 누르면 아래에 그 섹션의 진단이 펼쳐집니다.{" "}
                  <b style={{ color: "var(--warn)" }}>45 미만</b>은 심사에서 지적될 가능성이 높은 구간입니다.
                </p>
              </section>

              {selectedRow ? (
                <section className="glass card mb4" style={{ padding: "15px 18px" }}>
                  <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
                    <Gauge value={selectedTotal ?? 0} size={86} label={`${selectedRow.label} 종합`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row mb3" style={{ gap: 8, flexWrap: "wrap" }}>
                        <b style={{ fontSize: "var(--fs-md)" }}>{selectedRow.label}</b>
                        {selectedTotal !== null ? (
                          <Badge variant={selectedTotal >= 60 ? "ok" : selectedTotal >= 45 ? "warn" : "danger"}>
                            {selectedTotal}점
                          </Badge>
                        ) : (
                          <Badge variant="mute">미작성</Badge>
                        )}
                      </div>
                      <p className="fs-sm t2 mb0" style={{ lineHeight: 1.7 }}>
                        {sortedSelectedDiagnoses[0]?.detail ?? "재분석을 실행하면 이 섹션의 진단이 여기 표시됩니다."}
                      </p>
                    </div>
                  </div>
                  <div className="mt4" style={{ paddingTop: 12, borderTop: "1px solid var(--hairline)" }}>
                    {selectedRow.axes.map((a, i) => (
                      <div className="chk" key={a.id}>
                        <span className="lb">{a.label}</span>
                        <span className="vl">{selectedRow.axisScores[i]?.score ?? "–"}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="glass card">
                <div className="card-h">
                  <h3 style={{ fontSize: "var(--fs-md)" }}>진단 {sortedSelectedDiagnoses.length}건</h3>
                  <div className="sp" />
                  <Segmented
                    items={[{ value: "severity", label: "심각도순" }, { value: "location", label: "위치순" }] as const}
                    value={diagSort}
                    onChange={setDiagSort}
                    label="진단 정렬"
                  />
                </div>
                {sortedSelectedDiagnoses.length === 0 ? (
                  <p className="t3 fs-sm">아직 진단이 없습니다. 재분석을 실행하세요.</p>
                ) : (
                  sortedSelectedDiagnoses.map((d) => <Diagnosis key={d.id} item={d} sourceText={docText} />)
                )}
              </section>
            </>
          ) : (
            <div>
              {loading ? (
                <div className="empty"><p className="t3">분석 중…</p></div>
              ) : results[tab] ? (
                <div className="fs-sm" style={{ lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{results[tab]}</div>
              ) : (
                <div className="empty">
                  <p className="t3">재분석을 눌러 {TAB_ITEMS.find((t) => t.value === tab)?.label} 분석을 실행하세요.</p>
                </div>
              )}
            </div>
          )}
        </BenchPane>
      }
    />
  );
}
