"use client";
import { Icon } from "@/components/ui/icon";

import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useTranslation } from "@/lib/i18n";
import { useGemini } from "@/hooks/use-gemini";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";

import { QcaProject } from "@/lib/method/qca/project";
import * as importer from "@/lib/method/qca/importer";
import * as cleaner from "@/lib/method/qca/cleaner";
import * as frequency from "@/lib/method/qca/frequency";
import * as codebookEngine from "@/lib/method/qca/codebook";
import * as coding from "@/lib/method/qca/coding";
import * as categoryEngine from "@/lib/method/qca/category";
import * as themeEngine from "@/lib/method/qca/theme";
import * as networkEngine from "@/lib/method/qca/network";
import * as interpret from "@/lib/method/qca/interpret";
import * as exporter from "@/lib/method/qca/exporter";
import type { ParsedWorkbook } from "@/lib/method/qca/codebook";
import type { QcaProjectState, NetworkMetrics } from "@/lib/method/qca/types";
import { QCA_STEPS } from "@/lib/method/registry";
import { SAMPLE_CORPUS, SAMPLE_PROJECT } from "@/lib/method/qca/sample-corpus";
import { saveMethodOutput } from "@/lib/method/bridge";

const ACCENT = "#3ecfb2";

type StepKey = (typeof QCA_STEPS)[number]["key"];

function download(filename: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseWorkbookFile(buf: ArrayBuffer): ParsedWorkbook {
  const wb = XLSX.read(buf, { type: "array" });
  const out: ParsedWorkbook = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
    const columns = (aoa[0] ?? []).map((c) => String(c));
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    out[name] = { columns, rows };
  }
  return out;
}

export default function QcaWorkspace() {
  const { t } = useTranslation();
  const { generate } = useGemini();
  const projectRef = useRef<QcaProject>(new QcaProject(SAMPLE_PROJECT.name, SAMPLE_PROJECT.research_question));
  const [, bump] = useReducer((x) => x + 1, 0);
  const P = projectRef.current;

  const [step, setStep] = useState<StepKey>("project");
  const [status, setStatus] = useState<{ kind: "ok" | "err" | "info"; msg: string } | null>(null);
  const [name, setName] = useState(SAMPLE_PROJECT.name);
  const [rq, setRq] = useState(SAMPLE_PROJECT.research_question);
  const [pasteText, setPasteText] = useState("");

  // cached step outputs
  const [freqOut, setFreqOut] = useState<{
    summary: ReturnType<typeof frequency.summary>;
    words: Array<[string, number]>;
    bigrams: Array<[string, number]>;
    tfidf: Array<[string, number]>;
    cooc: Array<[string, string, number]>;
  } | null>(null);
  const [codingMode, setCodingMode] = useState<coding.CodingMode>("hybrid");
  const [codingOut, setCodingOut] = useState<{ assigned: number; ambiguous: number } | null>(null);
  const [netOut, setNetOut] = useState<{
    keyword: NetworkMetrics;
    counts: { keyword: number; code: number; city: number };
  } | null>(null);
  const [sections, setSections] = useState<Record<interp_SectionKey, string> | null>(null);
  const [aiRefine, setAiRefine] = useState(false);
  const [busy, setBusy] = useState(false);

  const ok = (msg: string) => setStatus({ kind: "ok", msg });
  const err = (msg: string) => setStatus({ kind: "err", msg });
  const info = (msg: string) => setStatus({ kind: "info", msg });

  // ── persistence ──────────────────────────────────────
  const getData = useCallback(
    () => ({ state: P.toState(), step, aiRefine }),
    [P, step, aiRefine]
  );
  const handleLoad = useCallback((data: unknown) => {
    const d = data as { state?: QcaProjectState; step?: StepKey; aiRefine?: boolean };
    if (d?.state) {
      projectRef.current = QcaProject.fromState(d.state);
      const np = projectRef.current;
      setName(np.name);
      setRq(np.research_question);
      if (d.step) setStep(d.step);
      if (typeof d.aiRefine === "boolean") setAiRefine(d.aiRefine);
      // rebuild light caches that survive across reload
      const secs = (Object.keys(interpret.SECTION_TITLES) as interp_SectionKey[]).reduce(
        (acc, k) => {
          const v = np.get_interpretation(k);
          if (v) acc[k] = v;
          return acc;
        },
        {} as Record<interp_SectionKey, string>
      );
      if (Object.keys(secs).length) setSections(secs as Record<interp_SectionKey, string>);
      bump();
    }
  }, []);
  const handleReset = useCallback(() => {
    projectRef.current = new QcaProject(SAMPLE_PROJECT.name, SAMPLE_PROJECT.research_question);
    setName(SAMPLE_PROJECT.name);
    setRq(SAMPLE_PROJECT.research_question);
    setStep("project");
    setFreqOut(null);
    setCodingOut(null);
    setNetOut(null);
    setSections(null);
    setStatus(null);
    bump();
  }, []);
  usePagePersistence("method", handleLoad, handleReset);

  const sentenceCount = P.sentence_count();
  const codeCount = P.codes().length;
  const codingCount = P.coding_results().length;

  // ── actions ──────────────────────────────────────────
  const loadSample = () => {
    handleReset();
    const np = projectRef.current;
    np.name = SAMPLE_PROJECT.name;
    np.research_question = SAMPLE_PROJECT.research_question;
    importer.importRawText(np, "샘플 코퍼스", SAMPLE_CORPUS.join("\n"));
    setName(np.name);
    setRq(np.research_question);
    bump();
    setStep("collect");
    ok(`샘플 코퍼스 ${np.sentence_count()}개 문장을 불러왔습니다.`);
  };

  const onCorpusFile = async (file: File) => {
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".txt")) {
        const text = await file.text();
        const r = importer.importRawText(P, file.name, text);
        ok(`${file.name}: ${r.sentences}개 문장 가져옴`);
      } else {
        const buf = await file.arrayBuffer();
        const wbk = parseWorkbookFile(buf);
        const first = Object.values(wbk)[0];
        const r = importer.importTabularRows(P, first.columns, first.rows, file.name);
        ok(`${file.name}: ${r.sentences}개 문장 가져옴`);
      }
      bump();
    } catch (e) {
      err("파일을 읽지 못했습니다: " + (e as Error).message);
    }
  };

  const onPaste = () => {
    if (!pasteText.trim()) return err("붙여넣을 텍스트가 없습니다.");
    const r = importer.importRawText(P, "붙여넣기", pasteText);
    setPasteText("");
    bump();
    ok(`${r.sentences}개 문장 가져옴`);
  };

  const runClean = () => {
    if (!sentenceCount) return err("먼저 자료를 수집하세요.");
    const n = cleaner.cleanProject(P, { doLemma: true });
    bump();
    ok(`${n}개 문장 정제 완료 (정규화·토큰화·표제어화)`);
  };

  const runFrequency = () => {
    if (!P.sentences().some((s) => (s.tokens?.length ?? 0) > 0))
      return err("먼저 텍스트정제를 실행하세요.");
    setFreqOut({
      summary: frequency.summary(P),
      words: frequency.wordFrequency(P, 20),
      bigrams: frequency.ngramFrequency(P, 2, 15),
      tfidf: frequency.tfidfKeywords(P, 15),
      cooc: frequency.cooccurrence(P, 20, 2),
    });
    ok("빈도분석 완료");
  };

  const installDefault = () => {
    codebookEngine.installDefaultCodebook(P);
    bump();
    ok(`기본 코드북 설치 완료 (${P.codes().length}개 코드 / 3개 상위범주)`);
  };

  const onCodebookFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wbk = parseWorkbookFile(buf);
      const r = codebookEngine.importCodebookWorkbook(P, wbk);
      bump();
      ok(`코드북 가져오기 완료: ${r.count}개 코드${r.multiSheet ? " (다중시트 v3)" : ""}`);
    } catch (e) {
      err("코드북을 읽지 못했습니다: " + (e as Error).message);
    }
  };

  const runCoding = () => {
    if (!codeCount) return err("먼저 코드북을 설치하세요.");
    if (!sentenceCount) return err("분석할 문장이 없습니다.");
    try {
      const res = coding.codeProject(P, { mode: codingMode, multiCode: true, maxCodes: 2 });
      setCodingOut(res);
      bump();
      ok(`자동코딩 완료: ${res.assigned}건 배정 / ${res.ambiguous}건 모호`);
    } catch (e) {
      err((e as Error).message);
    }
  };

  const runThemes = () => {
    if (!codingCount) return err("먼저 자동코딩을 실행하세요.");
    categoryEngine.buildCategories(P);
    themeEngine.generateThemes(P);
    bump();
    ok("범주·상위범주·주제 도출 완료");
  };

  const runNetwork = () => {
    if (!P.sentences().some((s) => (s.tokens?.length ?? 0) > 0))
      return err("먼저 텍스트정제를 실행하세요.");
    const kw = networkEngine.buildKeywordNetwork(P, 40, 2);
    const cn = networkEngine.buildCodeNetwork(P, 1);
    const cy = networkEngine.buildCityNetwork(P, undefined, 1);
    setNetOut({
      keyword: networkEngine.metrics(P, "keyword"),
      counts: { keyword: kw.length, code: cn.length, city: cy.length },
    });
    bump();
    ok("네트워크분석 완료");
  };

  const runInterpret = async () => {
    if (!P.categories().length) return err("먼저 7단계(범주·주제)를 실행하세요.");
    setBusy(true);
    info(aiRefine ? "AI로 문체를 다듬는 중..." : "초안 생성 중...");
    try {
      const refine = aiRefine
        ? async (title: string, draft: string) => {
            const out = await generate({
              systemInstruction:
                "당신은 사회과학 논문 편집자입니다. 제공된 데이터 기반 초안의 사실·수치는 절대 바꾸지 말고, 학술적 문체로 자연스럽게 다듬어 한국어로만 출력하세요.",
              userText: `[섹션: ${title}]\n${draft}`,
              temperature: 0.4,
            });
            return out;
          }
        : undefined;
      const result = await interpret.generateAll(P, refine);
      setSections(result);
      bump();
      ok("연구방법·결과·논의·결론 초안 생성 완료");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "API_KEY_MISSING") {
        // fall back to local draft
        const result = await interpret.generateAll(P);
        setSections(result);
        bump();
        info("API 키가 없어 로컬 초안으로 생성했습니다. (설정에서 키 입력 시 AI 윤문 가능)");
      } else {
        err("생성 실패: " + msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const applySection = (key: string, title: string, body: string) => {
    saveMethodOutput({
      methodId: "qca",
      methodName: "혼합 질적내용분석",
      projectName: P.get_meta("name", ""),
      savedAt: new Date().toISOString(),
      sections: [{ key, title, body }],
    });
    ok(`'${title}' 절을 논문 작성에 전달했습니다. 논문 작성 화면에서 삽입하세요.`);
  };

  const applyAll = () => {
    if (!sections) return;
    saveMethodOutput({
      methodId: "qca",
      methodName: "혼합 질적내용분석",
      projectName: P.get_meta("name", ""),
      savedAt: new Date().toISOString(),
      sections: (Object.keys(interpret.SECTION_TITLES) as interp_SectionKey[]).map((k) => ({
        key: k,
        title: interpret.SECTION_TITLES[k],
        body: sections[k] ?? "",
      })),
    });
    ok("전체 절(연구방법·결과·논의·결론)을 논문 작성에 전달했습니다.");
  };

  // ── exports ──────────────────────────────────────────
  const exportXlsx = () => {
    const specs = exporter.buildResultsWorkbook(P);
    const wb = XLSX.utils.book_new();
    for (const s of specs) {
      const ws = XLSX.utils.aoa_to_sheet([s.header, ...s.rows]);
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    }
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    download(`${P.get_meta("name", "qca")}_results.xlsx`, out, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    ok("results.xlsx 내려받기");
  };
  const exportReport = async () => {
    const rep = await exporter.buildReport(P);
    let md = `# ${rep.title}\n\n`;
    for (const s of rep.sections) md += `## ${s.title}\n\n${s.body}\n\n`;
    md += `## 범주 빈도\n\n| ${rep.categoryTable.header.join(" | ")} |\n| ${rep.categoryTable.header.map(() => "---").join(" | ")} |\n`;
    for (const r of rep.categoryTable.rows) md += `| ${r.join(" | ")} |\n`;
    download(`${P.get_meta("name", "qca")}_report.md`, md, "text/markdown;charset=utf-8");
    ok("보고서(.md) 내려받기");
  };
  const exportCsv = () => {
    download(`${P.get_meta("name", "qca")}_coding.csv`, exporter.exportCodingCsv(P), "text/csv;charset=utf-8");
    ok("coding.csv 내려받기");
  };
  const exportJson = () => {
    download(`${P.get_meta("name", "qca")}_project.json`, exporter.exportFullJson(P), "application/json");
    ok("project.json 내려받기");
  };

  const codingStats = useMemo(() => coding.codingStats(P), [P, codingCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const metaSummary = useMemo(() => categoryEngine.metaCategorySummary(P), [P]); // eslint-disable-line react-hooks/exhaustive-deps
  const categories = P.categories();
  const themes = P.themes();

  return (
    <div className="flex flex-col md:flex-row font-nanum-gothic h-full overflow-hidden">
      <PageSaveRegistration pageId="method" getData={getData} />

      {/* Left step nav */}
      <aside className="md:w-60 flex-shrink-0 border-b md:border-b-0 md:border-r border-white/[0.06] bg-[#0f1218] overflow-x-auto md:overflow-y-auto">
        <div className="p-3">
          <Link href="/method" className="flex items-center gap-1.5 text-[13px] text-white/30 hover:text-white/60 mb-3 transition-colors">
            <Icon name="arrowLeft" size={13} /> {t("pages.method.title")}
          </Link>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: ACCENT + "22", color: ACCENT }}>
              <Icon name="method" size={15} />
            </div>
            <div className="leading-tight">
              <p className="text-[14px] font-semibold text-[#e8eaf0]">혼합 질적내용분석</p>
              <p className="text-[11px] text-white/30">Mixed QCA</p>
            </div>
          </div>
          <nav className="flex md:flex-col gap-1">
            {QCA_STEPS.map((s) => {
              const active = step === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStep(s.key as StepKey)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left whitespace-nowrap transition-colors ${
                    active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                  }`}
                  style={active ? { boxShadow: `inset 0 0 0 1px ${ACCENT}40` } : {}}
                >
                  <span className="flex-shrink-0" style={{ color: active ? ACCENT : "rgba(255,255,255,.35)" }}>
                    <Icon name={s.icon} size={15} />
                  </span>
                  <span className={`text-[13px] ${active ? "text-[#e8eaf0]" : "text-white/45"}`}>{s.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-3xl w-full mx-auto">
          {/* status pills + counters */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-[12px]">
            <Chip>문장 {sentenceCount}</Chip>
            <Chip>코드 {codeCount}</Chip>
            <Chip>코딩 {codingCount}</Chip>
            {themes.length > 0 && <Chip>주제 {themes.length}</Chip>}
          </div>
          {status && (
            <div
              className={`mb-4 px-3 py-2 rounded-lg text-[13px] flex items-start gap-2 ${
                status.kind === "ok"
                  ? "bg-[#3ecfb2]/10 text-[#7fe6d0]"
                  : status.kind === "err"
                  ? "bg-rose-500/10 text-rose-300"
                  : "bg-white/[0.05] text-white/55"
              }`}
            >
              <Icon name={status.kind === "err" ? "warn" : status.kind === "ok" ? "check" : "idea"} size={14} className="mt-0.5 flex-shrink-0" />
              <span>{status.msg}</span>
            </div>
          )}

          {step === "project" && (
            <Panel title="1. 프로젝트" desc="연구명과 연구문제를 설정합니다.">
              <Field label="연구명">
                <input value={name} onChange={(e) => { setName(e.target.value); P.name = e.target.value; }} className={inputCls} placeholder="예: 생성형 AI 사회적 수용 담론분석" />
              </Field>
              <Field label="연구문제">
                <textarea value={rq} onChange={(e) => { setRq(e.target.value); P.research_question = e.target.value; }} className={inputCls + " min-h-[80px] resize-y"} placeholder="예: 담론은 어떻게 구조화되는가?" />
              </Field>
              <div className="flex gap-2 pt-1">
                <BtnPrimary onClick={loadSample} icon="rocket">샘플 데이터로 시작</BtnPrimary>
                <BtnGhost onClick={() => { bump(); setStep("collect"); }} icon="arrowRight">직접 자료 수집</BtnGhost>
              </div>
            </Panel>
          )}

          {step === "collect" && (
            <Panel title="2. 자료수집" desc="Excel·CSV·텍스트 원문을 불러오거나 직접 붙여넣습니다. 한 행/문장이 하나의 분석단위가 됩니다.">
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <FileDrop accept=".xlsx,.xls,.csv,.txt" label="파일 업로드 (.xlsx/.csv/.txt)" onFile={onCorpusFile} icon="upload" />
                <button onClick={loadSample} className="rounded-xl border border-dashed border-white/15 hover:border-[#3ecfb2]/50 p-4 text-center transition-colors">
                  <Icon name="star" size={20} className="text-[#3ecfb2] mx-auto mb-1.5" />
                  <p className="text-[13px] text-white/60">샘플 코퍼스 불러오기</p>
                  <p className="text-[11px] text-white/30">생성형 AI 36문장</p>
                </button>
              </div>
              <Field label="또는 텍스트 붙여넣기">
                <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} className={inputCls + " min-h-[90px] resize-y"} placeholder="문단을 붙여넣으면 문장 단위로 분리됩니다." />
              </Field>
              <BtnGhost onClick={onPaste} icon="plus">텍스트 추가</BtnGhost>

              {sentenceCount > 0 && (
                <PreviewBox title={`수집된 문장 ${sentenceCount}개 (미리보기 8)`}>
                  {P.sentences().slice(0, 8).map((s) => (
                    <li key={s.id} className="text-[13px] text-white/45 py-0.5 truncate">{s.position + 1}. {s.sentence_text}</li>
                  ))}
                </PreviewBox>
              )}
            </Panel>
          )}

          {step === "clean" && (
            <Panel title="3. 텍스트정제" desc="정규화 → 토큰화 → 표제어화(lite) → 불용어 제거를 수행합니다. (100% 로컬)">
              <BtnPrimary onClick={runClean} icon="spell">텍스트정제 실행</BtnPrimary>
              {(() => {
                const cleaned = P.sentences().filter((s) => (s.tokens?.length ?? 0) > 0);
                if (!cleaned.length) return null;
                const s = frequency.summary(P);
                return (
                  <>
                    <StatGrid items={[["문장", s.sentences], ["토큰", s.tokens], ["고유어휘", s.vocabulary], ["문장당 평균", s.avg_tokens_per_sentence]]} />
                    <PreviewBox title="정제 예시 (토큰)">
                      {cleaned.slice(0, 5).map((sx) => (
                        <li key={sx.id} className="text-[13px] py-1">
                          <span className="text-white/35">{sx.sentence_text}</span>
                          <span className="block text-[#7fe6d0]/80 text-[12px]">[{(sx.tokens ?? []).join(", ")}]</span>
                        </li>
                      ))}
                    </PreviewBox>
                  </>
                );
              })()}
            </Panel>
          )}

          {step === "frequency" && (
            <Panel title="4. 빈도분석" desc="단어빈도·N-gram·TF-IDF·공기어(co-occurrence)를 산출합니다.">
              <BtnPrimary onClick={runFrequency} icon="chart">빈도분석 실행</BtnPrimary>
              {freqOut && (
                <div className="space-y-4 mt-1">
                  <BarList title="상위 출현어" items={freqOut.words} color={ACCENT} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <TwoCol title="Bigram (2-gram)" items={freqOut.bigrams} />
                    <TwoCol title="TF-IDF 키워드" items={freqOut.tfidf} />
                  </div>
                  <PreviewBox title="공기어 (상위 20)">
                    {freqOut.cooc.map(([a, b, n], i) => (
                      <li key={i} className="text-[13px] text-white/45 py-0.5">{a} ↔ {b} <span className="text-white/25">({n})</span></li>
                    ))}
                  </PreviewBox>
                </div>
              )}
            </Panel>
          )}

          {step === "codebook" && (
            <Panel title="5. 코드북" desc="조작적 정의·지표 키워드·포함/제외·판정규칙을 갖춘 코딩체계입니다. 기본 코드북을 쓰거나 Excel 코드북(v3 다중시트 지원)을 가져옵니다.">
              <div className="flex flex-wrap gap-2">
                <BtnPrimary onClick={installDefault} icon="checklist">기본 코드북 설치</BtnPrimary>
                <FileDropInline accept=".xlsx,.xls" label="Excel 코드북 가져오기" onFile={onCodebookFile} />
              </div>
              {codeCount > 0 && (
                <div className="mt-3 space-y-2">
                  {P.codes().map((c) => (
                    <div key={c.id} className="rounded-xl bg-[#13161e] border border-white/[0.05] p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#3ecfb2]/15 text-[#7fe6d0] font-mono">{c.code_id}</span>
                        <span className="text-[14px] font-medium text-[#e8eaf0]">{c.name}</span>
                        <span className="text-[11px] text-white/30">· {c.meta_category}</span>
                      </div>
                      <p className="text-[12px] text-white/40 leading-relaxed">{c.definition}</p>
                      {c.indicator && <p className="text-[11px] text-white/30 mt-1 truncate">지표: {c.indicator}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {step === "coding" && (
            <Panel title="6. 자동코딩" desc="규칙기반(지표 매칭)·의미기반(문장-코드 TF-IDF 코사인)·하이브리드 방식으로 코딩하고 신뢰도를 부여합니다. 모호 사례는 분리 집계됩니다.">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[13px] text-white/40">방식</span>
                {(["hybrid", "rule", "semantic"] as coding.CodingMode[]).map((m) => (
                  <button key={m} onClick={() => setCodingMode(m)} className={`text-[13px] px-2.5 py-1 rounded-lg transition-colors ${codingMode === m ? "bg-[#3ecfb2]/20 text-[#7fe6d0]" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.07]"}`}>
                    {m === "hybrid" ? "하이브리드" : m === "rule" ? "규칙기반" : "의미기반"}
                  </button>
                ))}
                <BtnPrimary onClick={runCoding} icon="aiscan">자동코딩 실행</BtnPrimary>
              </div>
              {codingOut && (
                <>
                  <StatGrid items={[["배정", codingOut.assigned], ["모호", codingOut.ambiguous], ["코드 수", codeCount]]} />
                  <BarList title="코드별 빈도" items={codingStats.by_code} color="#6c8cff" />
                  <PreviewBox title="코딩 예시 (상위 8)">
                    {P.coding_results().slice(0, 8).map((r) => (
                      <li key={r.id} className="text-[13px] py-1">
                        <span className="text-[#7fe6d0]">{r.code_name}</span>
                        <span className="text-white/25"> ({r.source} · {r.confidence})</span>
                        <span className="block text-white/40 truncate">{r.sentence_text}</span>
                      </li>
                    ))}
                  </PreviewBox>
                </>
              )}
            </Panel>
          )}

          {step === "theme" && (
            <Panel title="7. 범주·주제" desc="코딩 결과를 범주 빈도/밀도로 집계하고 상위범주(메타)와 상위 주제(담론)를 도출합니다.">
              <BtnPrimary onClick={runThemes} icon="database">범주·주제 도출</BtnPrimary>
              {categories.length > 0 && (
                <div className="space-y-4 mt-1">
                  <div>
                    <SubTitle>범주 (하위) 빈도</SubTitle>
                    <div className="rounded-xl border border-white/[0.05] overflow-hidden">
                      <table className="w-full text-[13px]">
                        <thead><tr className="bg-white/[0.03] text-white/40 text-left"><th className="px-3 py-2">범주</th><th className="px-3 py-2">상위범주</th><th className="px-3 py-2 text-right">빈도</th></tr></thead>
                        <tbody>
                          {categories.map((c) => (
                            <tr key={c.name} className="border-t border-white/[0.04]"><td className="px-3 py-1.5 text-white/65">{c.name}</td><td className="px-3 py-1.5 text-white/35">{c.meta_category}</td><td className="px-3 py-1.5 text-right text-[#7fe6d0]">{c.freq}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <BarList title="상위범주(메타) 빈도" items={metaSummary.map((m) => [m.meta, m.freq])} color="#d946ef" />
                  <div>
                    <SubTitle>상위 주제 (담론)</SubTitle>
                    {themes.map((t2) => (
                      <div key={t2.name} className="rounded-xl bg-[#13161e] border border-white/[0.05] p-3 mb-2">
                        <p className="text-[14px] font-medium text-[#e8eaf0]">{t2.name} <span className="text-[12px] text-white/30">({t2.freq}건)</span></p>
                        <p className="text-[12px] text-white/40 mt-0.5">{t2.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          )}

          {step === "network" && (
            <Panel title="8. 네트워크분석" desc="키워드·코드·도시 네트워크를 구성하고 연결중심성·매개중심성·고유벡터중심성·커뮤니티(모듈성)를 산출합니다.">
              <BtnPrimary onClick={runNetwork} icon="network">네트워크분석 실행</BtnPrimary>
              {netOut && (
                <div className="space-y-4 mt-1">
                  <StatGrid items={[["키워드 링크", netOut.counts.keyword], ["코드 링크", netOut.counts.code], ["도시 링크", netOut.counts.city]]} />
                  <StatGrid items={[["노드", netOut.keyword.nodes], ["엣지", netOut.keyword.edges], ["커뮤니티", netOut.keyword.communities], ["모듈성", netOut.keyword.modularity ?? "—"]]} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <TwoCol title="연결중심성 (degree)" items={netOut.keyword.degree} />
                    <TwoCol title="매개중심성 (betweenness)" items={netOut.keyword.betweenness} />
                  </div>
                </div>
              )}
            </Panel>
          )}

          {step === "interpret" && (
            <Panel title="9. 해석·논문" desc="데이터에 근거한 연구방법·결과·논의·결론 초안을 생성합니다. 각 절을 논문 작성으로 바로 보낼 수 있습니다.">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <BtnPrimary onClick={runInterpret} icon="writing" disabled={busy}>{busy ? "생성 중..." : "초안 생성"}</BtnPrimary>
                <label className="flex items-center gap-2 text-[13px] text-white/45 cursor-pointer select-none">
                  <input type="checkbox" checked={aiRefine} onChange={(e) => setAiRefine(e.target.checked)} className="accent-[#3ecfb2]" />
                  AI로 문체 다듬기 (선택)
                </label>
              </div>
              {sections && (
                <div className="space-y-3 mt-1">
                  {(Object.keys(interpret.SECTION_TITLES) as interp_SectionKey[]).map((k) => (
                    <div key={k} className="rounded-xl bg-[#13161e] border border-white/[0.05] p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[14px] font-semibold text-[#e8eaf0]">{interpret.SECTION_TITLES[k]}</p>
                        <button onClick={() => applySection(k, interpret.SECTION_TITLES[k], sections[k])} className="text-[12px] px-2 py-1 rounded-lg bg-[#3ecfb2]/15 text-[#7fe6d0] hover:bg-[#3ecfb2]/25 transition-colors inline-flex items-center gap-1">
                          <Icon name="share" size={12} /> {t("pages.method.applyToWriting")}
                        </button>
                      </div>
                      <p className="text-[13px] text-white/55 leading-relaxed whitespace-pre-wrap">{sections[k]}</p>
                    </div>
                  ))}
                  <BtnPrimary onClick={applyAll} icon="writing">전체를 논문 작성에 적용</BtnPrimary>
                </div>
              )}
            </Panel>
          )}

          {step === "export" && (
            <Panel title="10. 내보내기" desc="분석 결과를 다양한 형식으로 내려받습니다.">
              <div className="grid sm:grid-cols-2 gap-3">
                <ExportCard onClick={exportXlsx} icon="spreadsheet" title="결과 워크북 (.xlsx)" desc="코드북·코딩·범주·주제·네트워크 시트" />
                <ExportCard onClick={exportReport} icon="writing" title="보고서 (.md)" desc="연구방법·결과·논의·결론 + 범주표" />
                <ExportCard onClick={exportCsv} icon="files" title="코딩 결과 (.csv)" desc="문장-코드-신뢰도 raw 데이터" />
                <ExportCard onClick={exportJson} icon="database" title="전체 프로젝트 (.json)" desc="재현용 전체 분석 상태" />
              </div>
            </Panel>
          )}
        </div>
      </main>
    </div>
  );
}

// ── helper UI bits ──────────────────────────────────────
type interp_SectionKey = interpret.SectionKey;
const inputCls = "w-full bg-[#0f1218] border border-white/10 rounded-xl px-3 py-2 text-[14px] text-[#e8eaf0] outline-none focus:border-[#3ecfb2]/50 transition-colors";

function Panel({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[19px] font-bold font-nanum-myeongjo text-[#e8eaf0] mb-0.5">{title}</h2>
      <p className="text-[14px] text-white/40 mb-4 leading-relaxed">{desc}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="block text-[13px] text-white/45 mb-1">{label}</span>{children}</label>);
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-white/45">{children}</span>;
}
function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-white/40 mb-1.5">{children}</p>;
}
function BtnPrimary({ children, onClick, icon, disabled }: { children: React.ReactNode; onClick: () => void; icon: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3ecfb2] text-[#08120f] text-[14px] font-semibold hover:brightness-110 disabled:opacity-50 transition-all">
      <Icon name={icon} size={15} /> {children}
    </button>
  );
}
function BtnGhost({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] text-white/60 text-[14px] hover:bg-white/[0.09] transition-colors">
      <Icon name={icon} size={15} /> {children}
    </button>
  );
}
function StatGrid({ items }: { items: Array<[string, string | number]> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl bg-[#13161e] border border-white/[0.05] p-3 text-center">
          <p className="text-[20px] font-bold text-[#e8eaf0] font-nanum-myeongjo">{v}</p>
          <p className="text-[12px] text-white/35">{k}</p>
        </div>
      ))}
    </div>
  );
}
function BarList({ title, items, color }: { title: string; items: Array<[string, number]>; color: string }) {
  const max = items.length ? Math.max(...items.map((i) => i[1])) : 1;
  return (
    <div>
      <SubTitle>{title}</SubTitle>
      <div className="space-y-1">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-[12px] text-white/50 w-32 truncate text-right">{k}</span>
            <div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded" style={{ width: `${(v / max) * 100}%`, background: color + "cc" }} />
            </div>
            <span className="text-[12px] text-white/40 w-10">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function TwoCol({ title, items }: { title: string; items: Array<[string, number]> }) {
  return (
    <div>
      <SubTitle>{title}</SubTitle>
      <ul className="rounded-xl bg-[#13161e] border border-white/[0.05] p-2.5 space-y-0.5">
        {items.slice(0, 10).map(([k, v]) => (
          <li key={k} className="flex justify-between text-[13px]"><span className="text-white/50 truncate">{k}</span><span className="text-white/35 ml-2">{v}</span></li>
        ))}
      </ul>
    </div>
  );
}
function PreviewBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <SubTitle>{title}</SubTitle>
      <ul className="rounded-xl bg-[#13161e] border border-white/[0.05] p-3 max-h-72 overflow-y-auto">{children}</ul>
    </div>
  );
}
function ExportCard({ onClick, icon, title, desc }: { onClick: () => void; icon: string; title: string; desc: string }) {
  return (
    <button onClick={onClick} className="rounded-xl bg-[#13161e] border border-white/[0.05] hover:border-[#3ecfb2]/40 p-4 text-left transition-colors flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ACCENT + "1a", color: ACCENT }}><Icon name={icon} size={18} /></div>
      <div><p className="text-[14px] font-medium text-[#e8eaf0]">{title}</p><p className="text-[12px] text-white/35">{desc}</p></div>
    </button>
  );
}
function FileDrop({ accept, label, onFile, icon }: { accept: string; label: string; onFile: (f: File) => void; icon: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button onClick={() => ref.current?.click()} className="rounded-xl border border-dashed border-white/15 hover:border-[#3ecfb2]/50 p-4 text-center transition-colors w-full">
        <Icon name={icon} size={20} className="text-white/40 mx-auto mb-1.5" />
        <p className="text-[13px] text-white/60">{label}</p>
      </button>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </>
  );
}
function FileDropInline({ accept, label, onFile }: { accept: string; label: string; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button onClick={() => ref.current?.click()} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] text-white/60 text-[14px] hover:bg-white/[0.09] transition-colors">
        <Icon name="upload" size={15} /> {label}
      </button>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </>
  );
}
