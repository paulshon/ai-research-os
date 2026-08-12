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
import { localizeMethodType } from "@/lib/i18n/method-labels";
import { getMethodType } from "@/lib/method/registry";
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
  const m = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = t(`methodEngine.${key}`);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      }
      return s;
    },
    [t]
  );
  const { generate } = useGemini();
  // v16: localized copy of QCA_STEPS — sidebar and header adapt to current locale.
  const localizedSteps = useMemo(() => {
    const qcaType = getMethodType("qca");
    if (!qcaType) return QCA_STEPS;
    return localizeMethodType(qcaType, t).steps;
  }, [t]);
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
    ok(m("msgSampleLoaded", { n: np.sentence_count() }));
  };

  const onCorpusFile = async (file: File) => {
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".txt")) {
        const text = await file.text();
        const r = importer.importRawText(P, file.name, text);
        ok(m("msgFileImported", { file: file.name, n: r.sentences }));
      } else {
        const buf = await file.arrayBuffer();
        const wbk = parseWorkbookFile(buf);
        const first = Object.values(wbk)[0];
        const r = importer.importTabularRows(P, first.columns, first.rows, file.name);
        ok(m("msgFileImported", { file: file.name, n: r.sentences }));
      }
      bump();
    } catch (e) {
      err(m("msgFileReadError", { error: (e as Error).message }));
    }
  };

  const onPaste = () => {
    if (!pasteText.trim()) return err(m("msgNoPaste"));
    const r = importer.importRawText(P, "paste", pasteText);
    setPasteText("");
    bump();
    ok(m("msgSentencesImported", { n: r.sentences }));
  };

  const runClean = () => {
    if (!sentenceCount) return err(m("msgCollectFirst"));
    const n = cleaner.cleanProject(P, { doLemma: true });
    bump();
    ok(m("msgCleanDone", { n }));
  };

  const runFrequency = () => {
    if (!P.sentences().some((s) => (s.tokens?.length ?? 0) > 0))
      return err(m("msgCleanFirst"));
    setFreqOut({
      summary: frequency.summary(P),
      words: frequency.wordFrequency(P, 20),
      bigrams: frequency.ngramFrequency(P, 2, 15),
      tfidf: frequency.tfidfKeywords(P, 15),
      cooc: frequency.cooccurrence(P, 20, 2),
    });
    ok(m("msgFreqDone"));
  };

  const installDefault = () => {
    codebookEngine.installDefaultCodebook(P);
    bump();
    ok(m("msgCodebookInstalled", { n: P.codes().length }));
  };

  const onCodebookFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wbk = parseWorkbookFile(buf);
      const r = codebookEngine.importCodebookWorkbook(P, wbk);
      bump();
      ok(m("msgCodebookImported", { n: r.count, extra: r.multiSheet ? m("msgMultiSheet") : "" }));
    } catch (e) {
      err(m("msgCodebookError", { error: (e as Error).message }));
    }
  };

  const runCoding = () => {
    if (!codeCount) return err(m("msgCodebookFirst"));
    if (!sentenceCount) return err(m("msgNoSentences"));
    try {
      const res = coding.codeProject(P, { mode: codingMode, multiCode: true, maxCodes: 2 });
      setCodingOut(res);
      bump();
      ok(m("msgCodingDone", { assigned: res.assigned, ambiguous: res.ambiguous }));
    } catch (e) {
      err((e as Error).message);
    }
  };

  const runThemes = () => {
    if (!codingCount) return err(m("msgCodingFirst"));
    categoryEngine.buildCategories(P);
    themeEngine.generateThemes(P);
    bump();
    ok(m("msgThemeDone"));
  };

  const runNetwork = () => {
    if (!P.sentences().some((s) => (s.tokens?.length ?? 0) > 0))
      return err(m("msgCleanFirst"));
    const kw = networkEngine.buildKeywordNetwork(P, 40, 2);
    const cn = networkEngine.buildCodeNetwork(P, 1);
    const cy = networkEngine.buildCityNetwork(P, undefined, 1);
    setNetOut({
      keyword: networkEngine.metrics(P, "keyword"),
      counts: { keyword: kw.length, code: cn.length, city: cy.length },
    });
    bump();
    ok(m("msgNetworkDone"));
  };

  const runInterpret = async () => {
    if (!P.categories().length) return err(m("msgThemeFirst"));
    setBusy(true);
    info(aiRefine ? m("msgInterpretAi") : m("msgInterpretLocal"));
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
      ok(m("msgInterpretDone"));
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "API_KEY_MISSING") {
        const result = await interpret.generateAll(P);
        setSections(result);
        bump();
        info(m("msgInterpretNoKey"));
      } else {
        err(m("msgInterpretFail", { error: msg }));
      }
    } finally {
      setBusy(false);
    }
  };

  const applySection = (key: string, title: string, body: string) => {
    saveMethodOutput({
      methodId: "qca",
      methodName: t("methodEngine.qcaName"),
      projectName: P.get_meta("name", ""),
      savedAt: new Date().toISOString(),
      sections: [{ key, title, body }],
    });
    ok(m("msgSectionApplied", { title }));
  };

  const applyAll = () => {
    if (!sections) return;
    saveMethodOutput({
      methodId: "qca",
      methodName: t("methodEngine.qcaName"),
      projectName: P.get_meta("name", ""),
      savedAt: new Date().toISOString(),
      sections: (Object.keys(interpret.SECTION_TITLES) as interp_SectionKey[]).map((k) => ({
        key: k,
        title: interpret.SECTION_TITLES[k],
        body: sections[k] ?? "",
      })),
    });
    ok(m("msgAllApplied"));
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
    ok(m("msgXlsxDownload"));
  };
  const exportReport = async () => {
    const rep = await exporter.buildReport(P);
    let md = `# ${rep.title}\n\n`;
    for (const s of rep.sections) md += `## ${s.title}\n\n${s.body}\n\n`;
    md += `## ${t("methodEngine.qcaThemeCategoryFreq")}\n\n| ${rep.categoryTable.header.join(" | ")} |\n| ${rep.categoryTable.header.map(() => "---").join(" | ")} |\n`;
    for (const r of rep.categoryTable.rows) md += `| ${r.join(" | ")} |\n`;
    download(`${P.get_meta("name", "qca")}_report.md`, md, "text/markdown;charset=utf-8");
    ok(m("msgMdDownload"));
  };
  const exportCsv = () => {
    download(`${P.get_meta("name", "qca")}_coding.csv`, exporter.exportCodingCsv(P), "text/csv;charset=utf-8");
    ok(m("msgCsvDownload"));
  };
  const exportJson = () => {
    download(`${P.get_meta("name", "qca")}_project.json`, exporter.exportFullJson(P), "application/json");
    ok(m("msgJsonDownload"));
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
              <p className="text-[14px] font-semibold text-[#e8eaf0]">{t("methodEngine.qcaName")}</p>
              <p className="text-[11px] text-white/30">Mixed QCA</p>
            </div>
          </div>
          <nav className="flex md:flex-col gap-1">
            {localizedSteps.map((s) => {
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
            <Chip>{t("methodEngine.countSentence")} {sentenceCount}</Chip>
            <Chip>{t("methodEngine.countCode")} {codeCount}</Chip>
            <Chip>{t("methodEngine.countCoding")} {codingCount}</Chip>
            {themes.length > 0 && <Chip>{t("common.editing")} {themes.length}</Chip>}
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
            <Panel title={t("methodEngine.projectTitle")} desc={t("methodEngine.projectDesc")}>
              <Field label={t("methodEngine.studyName")}>
                <input value={name} onChange={(e) => { setName(e.target.value); P.name = e.target.value; }} className={inputCls} placeholder={`e.g. ${t("methodEngine.studyNameSample")}`} />
              </Field>
              <Field label={t("methodEngine.studyQuestion")}>
                <textarea value={rq} onChange={(e) => { setRq(e.target.value); P.research_question = e.target.value; }} className={inputCls + " min-h-[80px] resize-y"} placeholder={`e.g. ${t("methodEngine.studyQuestionSample")}`} />
              </Field>
              <div className="flex gap-2 pt-1">
                <BtnPrimary onClick={loadSample} icon="rocket">{t("methodEngine.startWithSample")}</BtnPrimary>
                <BtnGhost onClick={() => { bump(); setStep("collect"); }} icon="arrowRight">{t("methodEngine.collectDirect")}</BtnGhost>
              </div>
            </Panel>
          )}

          {step === "collect" && (
            <Panel title={t("methodEngine.qcaCollect")} desc={t("methodEngine.qcaCollectDesc")}>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <FileDrop accept=".xlsx,.xls,.csv,.txt" label={t("methodEngine.qcaCollectUpload")} onFile={onCorpusFile} icon="upload" />
                <button onClick={loadSample} className="rounded-xl border border-dashed border-white/15 hover:border-[#3ecfb2]/50 p-4 text-center transition-colors">
                  <Icon name="star" size={20} className="text-[#3ecfb2] mx-auto mb-1.5" />
                  <p className="text-[13px] text-white/60">{t("methodEngine.qcaCollectSample")}</p>
                  <p className="text-[11px] text-white/30">{t("methodEngine.qcaCollectSampleSub")}</p>
                </button>
              </div>
              <Field label={t("methodEngine.qcaCollectPaste")}>
                <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} className={inputCls + " min-h-[90px] resize-y"} placeholder={t("methodEngine.qcaCollectPastePh")} />
              </Field>
              <BtnGhost onClick={onPaste} icon="plus">{t("methodEngine.qcaCollectAdd")}</BtnGhost>

              {sentenceCount > 0 && (
                <PreviewBox title={m("qcaCollectPreview", { n: sentenceCount })}>
                  {P.sentences().slice(0, 8).map((s) => (
                    <li key={s.id} className="text-[13px] text-white/45 py-0.5 truncate">{s.position + 1}. {s.sentence_text}</li>
                  ))}
                </PreviewBox>
              )}
            </Panel>
          )}

          {step === "clean" && (
            <Panel title={t("methodEngine.qcaClean")} desc={t("methodEngine.qcaCleanDesc")}>
              <BtnPrimary onClick={runClean} icon="spell">{t("methodEngine.qcaCleanRun")}</BtnPrimary>
              {(() => {
                const cleaned = P.sentences().filter((s) => (s.tokens?.length ?? 0) > 0);
                if (!cleaned.length) return null;
                const s = frequency.summary(P);
                return (
                  <>
                    <StatGrid items={[[t("methodEngine.statSentences"), s.sentences], [t("methodEngine.statTokens"), s.tokens], [t("methodEngine.statVocab"), s.vocabulary], [t("methodEngine.statAvgTokens"), s.avg_tokens_per_sentence]]} />
                    <PreviewBox title={t("methodEngine.qcaCleanPreview")}>
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
            <Panel title={t("methodEngine.qcaFrequency")} desc={t("methodEngine.qcaFreqDesc")}>
              <BtnPrimary onClick={runFrequency} icon="chart">{t("methodEngine.qcaFreqRun")}</BtnPrimary>
              {freqOut && (
                <div className="space-y-4 mt-1">
                  <BarList title={t("methodEngine.qcaFreqTopWords")} items={freqOut.words} color={ACCENT} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <TwoCol title={t("methodEngine.qcaFreqBigram")} items={freqOut.bigrams} />
                    <TwoCol title={t("methodEngine.qcaFreqTfidf")} items={freqOut.tfidf} />
                  </div>
                  <PreviewBox title={t("methodEngine.qcaFreqCooc")}>
                    {freqOut.cooc.map(([a, b, n], i) => (
                      <li key={i} className="text-[13px] text-white/45 py-0.5">{a} ↔ {b} <span className="text-white/25">({n})</span></li>
                    ))}
                  </PreviewBox>
                </div>
              )}
            </Panel>
          )}

          {step === "codebook" && (
            <Panel title={t("methodEngine.qcaCodebook")} desc={t("methodEngine.qcaCodebookDesc")}>
              <div className="flex flex-wrap gap-2">
                <BtnPrimary onClick={installDefault} icon="checklist">{t("methodEngine.qcaCodebookInstall")}</BtnPrimary>
                <FileDropInline accept=".xlsx,.xls" label={t("methodEngine.qcaCodebookImport")} onFile={onCodebookFile} />
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
                      {c.indicator && <p className="text-[11px] text-white/30 mt-1 truncate">{t("methodEngine.qcaCodebookIndicator")}: {c.indicator}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {step === "coding" && (
            <Panel title={t("methodEngine.qcaCoding")} desc={t("methodEngine.qcaCodingDesc")}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[13px] text-white/40">{t("methodEngine.qcaCodingMode")}</span>
                {(["hybrid", "rule", "semantic"] as coding.CodingMode[]).map((mode) => (
                  <button key={mode} onClick={() => setCodingMode(mode)} className={`text-[13px] px-2.5 py-1 rounded-lg transition-colors ${codingMode === mode ? "bg-[#3ecfb2]/20 text-[#7fe6d0]" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.07]"}`}>
                    {mode === "hybrid" ? t("methodEngine.qcaCodingHybrid") : mode === "rule" ? t("methodEngine.qcaCodingRule") : t("methodEngine.qcaCodingSemantic")}
                  </button>
                ))}
                <BtnPrimary onClick={runCoding} icon="aiscan">{t("methodEngine.qcaCodingRun")}</BtnPrimary>
              </div>
              {codingOut && (
                <>
                  <StatGrid items={[[t("methodEngine.statAssigned"), codingOut.assigned], [t("methodEngine.statAmbiguous"), codingOut.ambiguous], [t("methodEngine.statCodeCount"), codeCount]]} />
                  <BarList title={t("methodEngine.qcaCodingFreq")} items={codingStats.by_code} color="#6c8cff" />
                  <PreviewBox title={t("methodEngine.qcaCodingPreview")}>
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
            <Panel title={t("methodEngine.qcaTheme")} desc={t("methodEngine.qcaThemeDesc")}>
              <BtnPrimary onClick={runThemes} icon="database">{t("methodEngine.qcaThemeRun")}</BtnPrimary>
              {categories.length > 0 && (
                <div className="space-y-4 mt-1">
                  <div>
                    <SubTitle>{t("methodEngine.qcaThemeCategoryFreq")}</SubTitle>
                    <div className="rounded-xl border border-white/[0.05] overflow-hidden">
                      <table className="w-full text-[13px]">
                        <thead><tr className="bg-white/[0.03] text-white/40 text-left"><th className="px-3 py-2">{t("methodEngine.thCategory")}</th><th className="px-3 py-2">{t("methodEngine.thMetaCategory")}</th><th className="px-3 py-2 text-right">{t("methodEngine.thFreq")}</th></tr></thead>
                        <tbody>
                          {categories.map((c) => (
                            <tr key={c.name} className="border-t border-white/[0.04]"><td className="px-3 py-1.5 text-white/65">{c.name}</td><td className="px-3 py-1.5 text-white/35">{c.meta_category}</td><td className="px-3 py-1.5 text-right text-[#7fe6d0]">{c.freq}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <BarList title={t("methodEngine.qcaThemeMetaFreq")} items={metaSummary.map((mx) => [mx.meta, mx.freq])} color="#d946ef" />
                  <div>
                    <SubTitle>{t("methodEngine.qcaThemeDiscourse")}</SubTitle>
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
            <Panel title={t("methodEngine.qcaNetwork")} desc={t("methodEngine.qcaNetworkDesc")}>
              <BtnPrimary onClick={runNetwork} icon="network">{t("methodEngine.qcaNetworkRun")}</BtnPrimary>
              {netOut && (
                <div className="space-y-4 mt-1">
                  <StatGrid items={[[t("methodEngine.statKwLink"), netOut.counts.keyword], [t("methodEngine.statCodeLink"), netOut.counts.code], [t("methodEngine.statCityLink"), netOut.counts.city]]} />
                  <StatGrid items={[[t("methodEngine.statNodes"), netOut.keyword.nodes], [t("methodEngine.statEdges"), netOut.keyword.edges], [t("methodEngine.statCommunities"), netOut.keyword.communities], [t("methodEngine.statModularity"), netOut.keyword.modularity ?? "—"]]} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <TwoCol title={t("methodEngine.statDegree")} items={netOut.keyword.degree} />
                    <TwoCol title={t("methodEngine.statBetweenness")} items={netOut.keyword.betweenness} />
                  </div>
                </div>
              )}
            </Panel>
          )}

          {step === "interpret" && (
            <Panel title={t("methodEngine.qcaInterpret")} desc={t("methodEngine.qcaInterpretDesc")}>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <BtnPrimary onClick={runInterpret} icon="writing" disabled={busy}>{busy ? t("methodEngine.qcaInterpretRunning") : t("methodEngine.qcaInterpretRun")}</BtnPrimary>
                <label className="flex items-center gap-2 text-[13px] text-white/45 cursor-pointer select-none">
                  <input type="checkbox" checked={aiRefine} onChange={(e) => setAiRefine(e.target.checked)} className="accent-[#3ecfb2]" />
                  {t("methodEngine.qcaInterpretAiRefine")}
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
                  <BtnPrimary onClick={applyAll} icon="writing">{t("methodEngine.qcaInterpretApplyAll")}</BtnPrimary>
                </div>
              )}
            </Panel>
          )}

          {step === "export" && (
            <Panel title={t("methodEngine.qcaExport")} desc={t("methodEngine.qcaExportDesc")}>
              <div className="grid sm:grid-cols-2 gap-3">
                <ExportCard onClick={exportXlsx} icon="spreadsheet" title={t("methodEngine.qcaExportXlsx")} desc={t("methodEngine.qcaExportXlsxDesc")} />
                <ExportCard onClick={exportReport} icon="writing" title={t("methodEngine.qcaExportMd")} desc={t("methodEngine.qcaExportMdDesc")} />
                <ExportCard onClick={exportCsv} icon="files" title={t("methodEngine.qcaExportCsv")} desc={t("methodEngine.qcaExportCsvDesc")} />
                <ExportCard onClick={exportJson} icon="database" title={t("methodEngine.qcaExportJson")} desc={t("methodEngine.qcaExportJsonDesc")} />
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
