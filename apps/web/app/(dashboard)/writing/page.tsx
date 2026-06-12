"use client";
import { Icon } from "@/components/ui/icon";
import { ResizableRightPanel } from "@/components/ui/resizable-right-panel";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useGemini } from "@/hooks/use-gemini";
import { getChapters, THESIS_CATEGORIES, type Chapter } from "@/lib/research-data";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import { useTranslation } from "@/lib/i18n";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/editor/rich-text-editor";
import CitationInsertPanel from "@/components/citation/citation-insert-panel";
import MethodInsertPanel from "@/components/method/method-insert-panel";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePermissions } from "@/hooks/use-permissions";

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
  // v63: free 등급은 논문작성에서 양적(quant)·질적(qual) 연구만 접근 가능.
  //      그 외 연구유형은 engine.writing.others 권한이 있어야 선택 가능(없으면 비활성).
  const { can: canPerm } = usePermissions();
  const canOtherTypes = canPerm("engine.writing.others");
  const isTypeAllowed = (id: string) => canOtherTypes || id === "quant" || id === "qual";
  const [thesisType, setThesisType] = useState("quant");
  const [activeChapter, setActiveChapter] = useState("CH.01");
  const [activeSection, setActiveSection] = useState("");
  const [contents, setContents] = useState<Record<string, string>>({
    "CH.01-0": "본 연구는 AI 기반 학술 연구 운영체제의 효과를 분석하기 위해...",
  });
  const [copilotTab, setCopilotTab] = useState(0);
  const [copilotCollapsed, setCopilotCollapsed] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const editorRef = useRef<RichTextEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showMobileCopilot, setShowMobileCopilot] = useState(false);
  const [showCitePanel, setShowCitePanel] = useState(false);
  const [showMethodPanel, setShowMethodPanel] = useState(false);
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

  // ── v43: 그림/표 파일 가져오기 (이미지·CSV·XLSX) ──
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else {
        if (c === '"') q = true;
        else if (c === ",") { row.push(cur); cur = ""; }
        else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
        else if (c === "\r") { /* skip */ }
        else cur += c;
      }
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  };

  const rowsToTableHTML = (rows: string[][]): string => {
    if (rows.length === 0) return "";
    const [head, ...body] = rows;
    const thead = `<thead><tr>${head.map((h) => `<th style="border:1px solid #d0d0d0;padding:6px 10px;background:#f3f4f8;text-align:left;">${escapeHtml(h)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #d0d0d0;padding:6px 10px;">${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    return `<table style="border-collapse:collapse;width:100%;margin:0.6em 0;font-size:0.9em;">${thead}${tbody}</table><p></p>`;
  };

  // ── v47: 스프레드시트 데이터로 차트(콤보: 막대+선) 이미지를 생성하여 삽입 ──
  // (SheetJS는 엑셀 내장 차트를 읽지 못하므로, 표 데이터로 동일한 그래프를 재현한다)
  const num = (v: string) => {
    const n = parseFloat(String(v).replace(/[, ]/g, "").replace(/%$/, ""));
    return Number.isFinite(n) ? n : null;
  };
  const buildChartFromRows = (rows: string[][]): string | null => {
    if (rows.length < 2) return null;
    const labels = rows[0].map((c) => String(c ?? "").trim());
    // 숫자 시리즈 추출 (각 행이 숫자들로 구성되면 시리즈로 간주)
    type Series = { values: number[]; isPercent: boolean };
    const series: Series[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      const vals = cells.map(num);
      const numericCount = vals.filter((v) => v !== null).length;
      if (numericCount >= 2 && numericCount >= Math.ceil(cells.length / 2)) {
        series.push({
          values: vals.map((v) => v ?? 0),
          isPercent: cells.some((c) => /%/.test(String(c))),
        });
      }
    }
    if (series.length === 0) return null;

    const n = Math.max(...series.map((s) => s.values.length), labels.length);
    const W = 760, H = 430, padL = 56, padR = 56, padT = 48, padB = 56;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#222"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("차트 (Excel 데이터 기반)", W / 2, 26);

    const barSeries = series[0];
    const lineSeries = series.find((s, i) => i > 0) || null;
    const barMax = Math.max(1, ...barSeries.values);
    const lineMax = lineSeries ? Math.max(1, ...lineSeries.values) : 1;

    // 축
    ctx.strokeStyle = "#d8d8d8"; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.font = "11px sans-serif"; ctx.fillStyle = "#888";
    for (let g = 0; g <= 5; g++) {
      const y = padT + (plotH * g) / 5;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText(String(Math.round(barMax * (1 - g / 5))), padL - 8, y + 4);
      if (lineSeries) {
        ctx.textAlign = "left";
        ctx.fillText((lineSeries.isPercent ? (lineMax * (1 - g / 5)).toFixed(0) + "%" : String(Math.round(lineMax * (1 - g / 5)))), W - padR + 8, y + 4);
        ctx.textAlign = "right";
      }
    }

    const slot = plotW / n;
    const barW = Math.min(46, slot * 0.5);
    // 막대 (series1)
    ctx.fillStyle = "#4a7ebb";
    for (let i = 0; i < barSeries.values.length; i++) {
      const v = barSeries.values[i];
      const h = (v / barMax) * plotH;
      const x = padL + slot * i + slot / 2 - barW / 2;
      ctx.fillRect(x, padT + plotH - h, barW, h);
    }
    // 선 (series2)
    if (lineSeries) {
      ctx.strokeStyle = "#e08a3c"; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i < lineSeries.values.length; i++) {
        const v = lineSeries.values[i];
        const x = padL + slot * i + slot / 2;
        const y = padT + plotH - (v / lineMax) * plotH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#e08a3c";
      for (let i = 0; i < lineSeries.values.length; i++) {
        const x = padL + slot * i + slot / 2;
        const y = padT + plotH - (lineSeries.values[i] / lineMax) * plotH;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    // x 라벨
    ctx.fillStyle = "#555"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      ctx.fillText(labels[i] ?? String(i + 1), padL + slot * i + slot / 2, H - padB + 18);
    }
    // 범례
    ctx.textAlign = "left"; ctx.font = "12px sans-serif";
    ctx.fillStyle = "#4a7ebb"; ctx.fillRect(W / 2 - 80, H - 22, 14, 10);
    ctx.fillStyle = "#555"; ctx.fillText("계열1 (막대)", W / 2 - 62, H - 13);
    if (lineSeries) {
      ctx.strokeStyle = "#e08a3c"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(W / 2 + 30, H - 17); ctx.lineTo(W / 2 + 46, H - 17); ctx.stroke();
      ctx.fillStyle = "#555"; ctx.fillText("계열2 (선)", W / 2 + 52, H - 13);
    }
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const insertRowsWithChart = (rows: string[][], label: string) => {
    editorRef.current?.insertHTML(rowsToTableHTML(rows));
    const chart = buildChartFromRows(rows);
    if (chart) {
      editorRef.current?.insertHTML(
        `<p><img src="${chart}" alt="chart from ${escapeHtml(label)}" style="width:80%;height:auto;border-radius:8px;display:block;margin:0.6em auto;" /></p>`
      );
      return true;
    }
    return false;
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    setImportMsg("불러오는 중...");
    try {
      if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) {
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result));
          r.onerror = () => rej(new Error("read"));
          r.readAsDataURL(file);
        });
        editorRef.current?.insertHTML(
          `<p><img src="${dataUrl}" alt="${escapeHtml(file.name)}" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0.6em auto;" /></p>`
        );
        setImportMsg(`이미지 삽입됨: ${file.name} · 그림을 클릭하면 크기·정렬을 조절할 수 있어요.`);
      } else if (ext === "csv") {
        const rows = parseCSV(await file.text());
        const charted = insertRowsWithChart(rows, file.name);
        setImportMsg(`표${charted ? " + 차트" : ""} 삽입됨: ${file.name} · 클릭하면 크기·정렬 조절 가능`);
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as unknown[][];
        const rows = aoa.map((r) => (r as unknown[]).map((c) => String(c ?? "")));
        const charted = insertRowsWithChart(rows, `${file.name} · ${wb.SheetNames[0]}`);
        setImportMsg(`스프레드시트${charted ? " + 차트" : ""} 삽입됨: ${file.name} · 클릭하면 크기·정렬 조절 가능`);
      } else {
        const text = await file.text();
        editorRef.current?.insertText(text);
        setImportMsg(`텍스트 삽입됨: ${file.name}`);
      }
    } catch {
      setImportMsg("불러오기에 실패했습니다. 파일 형식을 확인하세요.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setImportMsg(null), 4500);
    }
  };

  // ── v43: PDF로 저장 (인쇄 대화상자 → 'PDF로 저장'에서 디렉토리·파일명 선택) ──
  const exportPdf = () => {
    const title = (sectionTitle || currentTypeName || "thesis").toString();
    const bodyHtml = content || "<p>(내용 없음)</p>";
    const w = window.open("", "_blank");
    if (!w) {
      setImportMsg("팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도하세요.");
      setTimeout(() => setImportMsg(null), 4000);
      return;
    }
    w.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page { margin: 20mm; }
        body { font-family: 'Noto Serif KR', 'NanumMyeongjo', serif; color: #111; line-height: 1.8; font-size: 12pt; }
        h1.doc-title { font-size: 18pt; margin: 0 0 6pt; }
        .doc-meta { color: #666; font-size: 10pt; margin: 0 0 18pt; border-bottom: 1px solid #ddd; padding-bottom: 8pt; }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #999; padding: 5px 8px; }
        blockquote { border-left: 3px solid #888; padding-left: 12px; color: #444; }
      </style></head>
      <body>
        <h1 class="doc-title">${escapeHtml(title)}</h1>
        <div class="doc-meta">${escapeHtml(currentTypeName)} · ${escapeHtml(displayProjectName())}</div>
        <div class="doc-body">${bodyHtml}</div>
        <script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
      </body></html>`);
    w.document.close();
  };
  const displayProjectName = () =>
    (typeof window !== "undefined" && localStorage.getItem("aros-project-name")) || "AI Research OS";

  return (
    <div className="flex flex-col font-nanum-gothic h-full">
      <PageSaveRegistration pageId="writing" getData={getData} />
      {/* Top Bar */}
      <div className="h-11 bg-[#13161e] border-b border-white/[0.04] flex items-center px-3 md:px-4 gap-2 flex-shrink-0">
        {/* 현재 섹션 표시 (데스크탑) */}
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <Icon name="writing" size={14} className="text-[#a78bfa] flex-shrink-0" />
          <span className="text-[15px] text-white/55 truncate">{sectionTitle || "섹션을 선택하세요"}</span>
        </div>
        {/* 모바일 타이틀 */}
        <span className="md:hidden text-[15px] font-medium text-white/70 truncate flex-1">{sectionTitle || "논문 작성"}</span>

        <div className="hidden md:block flex-1" />

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* v43: 그림/표 파일 가져오기 (이미지·CSV·XLSX) */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.csv,.xls,.xlsx,.txt"
            className="hidden"
            onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-2 md:px-2.5 flex items-center gap-1 rounded-lg bg-[#3ecfb2]/10 text-[#3ecfb2] border border-[#3ecfb2]/20 hover:bg-[#3ecfb2]/20 transition-colors"
            aria-label="그림/표 가져오기"
            title="그림(JPEG·PNG…)·표(CSV·XLSX) 가져오기"
          >
            <Icon name="folderOpen" size={14} />
            <span className="hidden sm:inline text-[14px]">가져오기</span>
          </button>
          {/* v31: 참고문헌 인용 삽입 버튼 */}
          <button
            onClick={() => setShowCitePanel(true)}
            className="h-8 px-2 md:px-2.5 flex items-center gap-1 rounded-lg bg-[#6c8cff]/10 text-[#6c8cff] border border-[#6c8cff]/20 hover:bg-[#6c8cff]/20 transition-colors"
            aria-label="참고문헌 인용"
            title="참고문헌 인용 삽입"
          >
            <Icon name="citation" size={14} />
            <span className="hidden sm:inline text-[14px]">인용</span>
          </button>
          {/* v52: 연구방법 절 삽입 버튼 */}
          <button
            onClick={() => setShowMethodPanel(true)}
            className="h-8 px-2 md:px-2.5 flex items-center gap-1 rounded-lg bg-[#3ecfb2]/10 text-[#3ecfb2] border border-[#3ecfb2]/20 hover:bg-[#3ecfb2]/20 transition-colors"
            aria-label="연구방법 절 삽입"
            title="연구방법 엔진 결과 삽입"
          >
            <Icon name="method" size={14} />
            <span className="hidden sm:inline text-[14px]">연구방법</span>
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
            <span className="hidden md:inline text-[14px]">복사</span>
          </button>
          <button
            onClick={exportPdf}
            className="px-3 h-8 flex items-center gap-1 rounded-lg bg-[#e8b84b] text-[14px] text-black font-medium hover:brightness-105 transition-all"
            title="PDF로 저장 (디렉토리·파일명 선택)"
          >
            <Icon name="save" size={13} />
            <span className="hidden sm:inline">PDF 저장</span>
          </button>
        </div>
      </div>
      {importMsg && (
        <div className="px-3 md:px-4 py-1.5 bg-[#0d0f14] border-b border-white/[0.04] text-[13px] text-[#3ecfb2] flex-shrink-0">
          {importMsg}
        </div>
      )}

      {/* 모바일 챕터/섹션 선택 (md 미만) */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] bg-[#0d0f14] flex-shrink-0">
        <div className="relative flex-1">
          <select
            value={activeChapter}
            onChange={(e) => { setActiveChapter(e.target.value); setActiveSection(""); }}
            className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15.5px] text-white/80 outline-none focus:border-[#6c8cff]"
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
              className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15.5px] text-white/80 outline-none focus:border-[#6c8cff]"
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
        <div className="w-60 border-r border-white/[0.04] bg-[#0d0f14] overflow-y-auto flex-shrink-0 hidden md:block">
          <div className="p-3">
            {chapters.map((ch) => (
              <div key={ch.num} className="mb-2">
                <button
                  onClick={() => { setActiveChapter(ch.num); setActiveSection(""); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[15px] transition-all ${
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
                    className={`w-full text-left pl-8 pr-3 py-1.5 text-[14px] transition-all ${
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative" style={{WebkitOverflowScrolling:"touch"}}>
          {/* 데스크탑: AI 패널 펼치기 버튼 (접힌 상태에서만) */}
          {copilotCollapsed && (
            <button
              onClick={() => setCopilotCollapsed(false)}
              className="hidden lg:flex items-center gap-1.5 absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-[#a78bfa]/15 border border-[#a78bfa]/25 text-[#a78bfa] text-[13px] font-medium hover:bg-[#a78bfa]/25 transition-all"
            >
              <Icon name="logo" size={14} /> AI Copilot 펼치기
            </button>
          )}
          <div className="max-w-[1040px] mx-auto">
            <h2 className="font-nanum-myeongjo text-[25px] font-bold text-[#e8eaf0] mb-2">{sectionTitle}</h2>
            {currentChapter && (
              <p className="text-[15px] text-white/25 mb-6">{currentChapter.desc}</p>
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
        <ResizableRightPanel storageKey="writing" breakpoint="lg" defaultWidth={288} min={240} className={`border-l border-white/[0.04] bg-[#0f1117] overflow-y-auto flex-col flex-shrink-0 ${showMobileCopilot ? "flex w-full absolute inset-0 z-20 lg:relative" : copilotCollapsed ? "hidden" : "hidden lg:flex"}`}>
          <div className="p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[16px] font-semibold text-white/70">AI Copilot</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCopilotCollapsed(true)} className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors" title="패널 접기" aria-label="패널 접기"><Icon name="chevronRight" size={16} /></button>
                <button onClick={() => setShowMobileCopilot(false)} className="lg:hidden text-white/30 hover:text-white/70 text-[21px] px-2"><Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} /></button>
              </div>
            </div>
            <p className="text-[13px] text-white/25 mb-3">현재 작업에 대해 노움을 받으세요.</p>

            {/* Copilot tabs */}
            <div className="flex gap-1 mb-3">
              {COPILOT_TABS.map((tab, i) => (
                <button
                  key={tab.key}
                  onClick={() => setCopilotTab(i)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] border transition-all ${
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white/50 hover:border-white/[0.12] transition-all"
              >
                <span>현재 선택</span>
                <span className="text-white/30"><Icon name="chevronDown" size={12} /></span>
              </button>
              <p className="text-[13px] text-white/20 mt-1">좌측에서 섹션을 선택하세요</p>

              {showTypeMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1e2a] border border-white/[0.08] rounded-xl shadow-2xl z-50 max-h-[400px] overflow-y-auto">
                  {THESIS_CATEGORIES.map((cat, ci) => (
                    <div key={ci}>
                      <p className="px-3 pt-2 pb-1 text-[13px] text-white/20 font-medium">{cat.cat}</p>
                      {cat.types.map((ty) => {
                        const allowed = isTypeAllowed(ty.id);
                        return (
                        <button
                          key={ty.id}
                          onClick={() => { if (allowed) handleThesisTypeChange(ty.id); }}
                          disabled={!allowed}
                          title={allowed ? undefined : "상위 등급에서 이용 가능합니다"}
                          className={`w-full text-left px-3 py-2 text-[14px] transition-colors flex items-center justify-between ${
                            !allowed
                              ? "text-white/20 cursor-not-allowed"
                              : thesisType === ty.id ? "text-[#6c8cff] bg-[#6c8cff]/5 hover:bg-white/[0.04]" : "text-white/50 hover:bg-white/[0.04]"
                          }`}
                        >
                          <span>{ty.name}</span>
                          {!allowed && <Icon name="lock" size={12} className="text-white/20" />}
                        </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 text-[15px] text-white/35">
              {copilotTab === 0 && <p>현재 문서 컨텍스트를 기반으로 AI가 도움을 드립니다.</p>}
              {copilotTab === 1 && <p>논리 흐름, 인용 일관성, 어조 검증</p>}
              {copilotTab === 2 && <p>논문 크리틱 및 개선 제안</p>}
            </div>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askCopilot()}
              className="w-full mt-4 px-3 py-2.5 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]"
              placeholder="AI에게 질문하세요..."
            />
            <button onClick={askCopilot} disabled={loading} className="w-full mt-2 py-2 rounded-lg bg-[#a78bfa]/20 text-[#a78bfa] text-[15px] disabled:opacity-40">
              {loading ? "..." : "Copilot 실행"}
            </button>
            {response && (
              <div className="mt-3">
                <div className="text-[15px] text-white/60 whitespace-pre-wrap mb-2">{response}</div>
                <button
                  onClick={() => editorRef.current?.insertText(response)}
                  className="w-full py-1.5 rounded-lg bg-[#6c8cff]/15 text-[#6c8cff] text-[14px] font-medium hover:bg-[#6c8cff]/25 transition-all flex items-center justify-center gap-1"
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
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white/50 hover:text-white/80 hover:border-white/[0.12] transition-all"
            >
              ← 기본모드로 페이지 이동
            </Link>
          </div>
        </ResizableRightPanel>
      </div>

      {/* v31: 참고문헌 인용 삽입 패널 — 집필 중 바로 인용 삽입 */}
      <CitationInsertPanel
        open={showCitePanel}
        onClose={() => setShowCitePanel(false)}
        onInsertInText={(citation) => {
          editorRef.current?.insertText(citation);
        }}
      />

      {/* v52: 연구방법 엔진 결과 → 본문 삽입 */}
      <MethodInsertPanel
        open={showMethodPanel}
        onClose={() => setShowMethodPanel(false)}
        onInsert={(text) => {
          editorRef.current?.insertText(text);
          setShowMethodPanel(false);
        }}
      />
    </div>
  );
}
