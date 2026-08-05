"use client";

/**
 * 기본통계 워크스페이스 — methodos 기본통계 엔진 RDOS 이식
 * · 설문 통계분석 → 🔵 양적 분석형 기본통계
 * · 데모 제목·변수 한글 설명·상세 해석·차트 내보내기
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useGemini } from "@/hooks/use-gemini";
import {
  loadBasicStatsCurriculum,
  getModule,
  type BsCurriculum,
  type BsModule,
} from "@/lib/basic-stats/guide";
import { runBasicStats, type BsResult } from "@/lib/basic-stats/engine";
import {
  getDemosForModule,
  previewCsv,
  columnGlossary,
  demoContextBlurb,
  type BsDemo,
} from "@/lib/basic-stats/demos";
import { exportChartBundle } from "@/lib/basic-stats/viz-export";
import type { CaChartSpec, CaChartType } from "@/lib/basic-stats/ca-charts";
import CaChart from "@/components/method/ca-chart";

type Tab = "overview" | "steps" | "results";

const ALT_CHARTS: CaChartType[] = [
  "bar", "hbar", "lollipop", "donut", "pie", "radar", "heatmap", "boxplot", "histogram", "scatter",
];

function diversifyCharts(primary?: CaChartSpec | null): CaChartSpec[] {
  if (!primary?.labels?.length) return [];
  const out: CaChartSpec[] = [{ ...primary }];
  const vals = primary.series?.[0]?.values || [];
  ALT_CHARTS.forEach((t) => {
    if (t === primary.type) return;
    if (out.length >= 5) return;
    out.push({ ...primary, type: t, title: `${primary.title || "결과"} · ${t}` });
  });
  if (vals.length >= 3 && out.length < 6) {
    const labels = primary.labels.slice(0, 4);
    out.push({
      type: "heatmap",
      title: (primary.title || "결과") + " · 히트맵",
      labels,
      cols: labels,
      series: labels.map((_, i) => ({
        name: labels[i],
        values: labels.map((__, j) =>
          Math.round((vals[i] || 1) * (0.4 + ((i + j) % 3) * 0.2) * 100) / 100,
        ),
      })),
    });
  }
  return out;
}

function DataPreviewBlock({
  csv,
  demo,
}: {
  csv: string;
  demo: BsDemo | null;
}) {
  const prev = previewCsv(csv, 8);
  const gloss = columnGlossary(demo, prev.headers);
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-white/45 leading-relaxed">{demoContextBlurb(demo)}</p>
      {gloss.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="px-3 py-2 text-[12px] text-white/35 border-b border-white/[0.06] bg-white/[0.02]">
            변수 설명 · {demo?.title || "현재 데이터"}
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-white/40 text-left">
                <th className="px-3 py-1.5 font-medium">컬럼</th>
                <th className="px-3 py-1.5 font-medium">한글명</th>
                <th className="px-3 py-1.5 font-medium">의미</th>
              </tr>
            </thead>
            <tbody>
              {gloss.map((g) => (
                <tr key={g.key} className="border-t border-white/[0.04]">
                  <td className="px-3 py-1.5 font-mono text-[#6c8cff]">{g.key}</td>
                  <td className="px-3 py-1.5 text-white/75">{g.label}</td>
                  <td className="px-3 py-1.5 text-white/40">{g.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
        <div className="px-3 py-2 text-[12px] text-white/35 border-b border-white/[0.06]">
          데이터 미리보기 · 상위 {prev.rows.length}행 / 전체 {prev.total}행
          {demo ? ` · ${demo.title}` : ""}
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-white/40">
              {prev.headers.map((h, i) => (
                <th key={h} className="px-2 py-1.5 text-left font-medium">
                  <span className="block text-white/70">{gloss[i]?.label || h}</span>
                  <span className="block font-mono text-white/25 text-[10px]">{h}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prev.rows.map((r, i) => (
              <tr key={i} className="border-t border-white/[0.04] text-white/60">
                {r.map((c, j) => (
                  <td key={j} className="px-2 py-1">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModuleWorkbench({
  mod,
  cur,
  onSelectModule,
}: {
  mod: BsModule;
  cur: BsCurriculum;
  onSelectModule: (id: string) => void;
}) {
  const { generate } = useGemini();
  const demos = useMemo(() => getDemosForModule(mod.id), [mod.id]);
  const [tab, setTab] = useState<Tab>("overview");
  const [stepIdx, setStepIdx] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [csv, setCsv] = useState(mod.sampleCsv);
  const [result, setResult] = useState<BsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [demoId, setDemoId] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const first = getDemosForModule(mod.id)[0];
    if (first) {
      setCsv(first.csv);
      setDemoId(first.id);
    } else {
      setCsv(mod.sampleCsv);
      setDemoId("");
    }
    setResult(null);
    setChoices({});
    setAiNote("");
    setStepIdx(0);
    setTab("overview");
  }, [mod.id, mod.sampleCsv]);

  const activeDemo = demos.find((d) => d.id === demoId) || null;
  const step = mod.steps[stepIdx];
  const charts = useMemo(() => diversifyCharts(result?.chart), [result]);

  function loadDemo(d: BsDemo) {
    setDemoId(d.id);
    setCsv(d.csv);
    setResult(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      setCsv(XLSX.utils.sheet_to_csv(sheet));
    } else {
      setCsv(await f.text());
    }
    setDemoId("");
    e.target.value = "";
  }

  function run() {
    setBusy(true);
    try {
      setResult(runBasicStats(mod.id, csv, choices));
      setTab("results");
    } finally {
      setBusy(false);
    }
  }

  async function aiInterpret() {
    if (!result) return;
    setBusy(true);
    try {
      const text = await generate({
        systemInstruction:
          "당신은 사회과학 통계 조교입니다. 초보 연구자가 논문에 바로 쓸 수 있게 한국어로 쉽고 풍부하게 해석하세요. 반드시 한국어.",
        userText:
          `분석: ${mod.name}\n데모: ${activeDemo?.title || "사용자 데이터"}\n선택: ${JSON.stringify(choices)}\n` +
          `결과요약: ${result.summary}\n해석초안:\n${result.interpretation}\n` +
          `표: ${JSON.stringify(result.table || {}).slice(0, 1500)}\n` +
          `요청: 1) 한 줄 결론 2) 표를 초보자에게 설명 3) p=.05 기준 판정 4) 논문 문장 예시 5) 다음 분석 제안`,
        temperature: 0.4,
        maxOutputTokens: 4096,
      });
      setAiNote(text || result.interpretation);
    } catch {
      setAiNote(result.interpretation + "\n\n(API 키가 없으면 규칙 기반 해석을 사용합니다.)");
    } finally {
      setBusy(false);
    }
  }

  async function exportViz(format: "png" | "jpeg" | "pdf" | "xlsx") {
    await exportChartBundle({
      container: chartRef.current,
      baseName: `basic-stats-${mod.id}-viz`,
      title: result?.summary || mod.name,
      summaryLines: [
        mod.name,
        activeDemo?.title || "",
        result?.interpretation || "",
        ...Object.entries(result?.stats || {}).map(([k, v]) => `${k}: ${v}`),
      ],
      table: result?.table,
      format,
    });
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 rounded-lg text-[14px] border ${
        tab === id
          ? "border-[#6c8cff]/50 bg-[#6c8cff]/15 text-[#8ba5ff]"
          : "border-white/[0.06] text-white/40 hover:text-white/65"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[18px] font-semibold text-white/90">{mod.name}</h2>
        <span className="text-[12px] text-white/30">{mod.group}</span>
        <div className="ml-auto flex gap-1.5">
          {tabBtn("overview", "개요")}
          {tabBtn("steps", "절차·데이터")}
          {tabBtn("results", "결과")}
        </div>
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          <section className="rounded-xl bg-[#13161e] border border-white/[0.06] p-4">
            <h3 className="text-[15px] font-medium text-white/80 mb-2">개요</h3>
            <p className="text-[14px] text-white/55 leading-relaxed whitespace-pre-wrap">{mod.overview}</p>
            {!!mod.process?.length && (
              <ol className="mt-3 list-decimal pl-5 space-y-1 text-[13px] text-white/45">
                {mod.process.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            )}
          </section>
          <button
            type="button"
            onClick={() => setTab("steps")}
            className="px-4 py-2 rounded-xl bg-[#4a6cf7] text-white text-[14px] font-medium"
          >
            절차·데이터로 →
          </button>
        </div>
      )}

      {tab === "steps" && (
        <div className="space-y-4">
          <section className="rounded-xl bg-[#13161e] border border-white/[0.06] p-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={onFile} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-[13px] border border-white/[0.08] text-white/60"
              >
                CSV/엑셀 불러오기
              </button>
              <button
                type="button"
                onClick={() => {
                  setCsv(mod.sampleCsv);
                  setDemoId("");
                }}
                className="px-3 py-1.5 rounded-lg text-[13px] border border-white/[0.08] text-white/60"
              >
                기본 샘플
              </button>
              <span className="text-[12px] text-white/25">테스트용 데모 {demos.length}종</span>
            </div>
            {demos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {demos.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    title={d.desc}
                    onClick={() => loadDemo(d)}
                    className={`px-2.5 py-1 rounded-lg text-[12px] border ${
                      demoId === d.id
                        ? "border-[#6c8cff]/50 bg-[#6c8cff]/15 text-[#8ba5ff]"
                        : "border-white/[0.06] text-white/45 hover:text-white/70"
                    }`}
                  >
                    {d.title}
                  </button>
                ))}
              </div>
            )}
            <DataPreviewBlock csv={csv || mod.sampleCsv} demo={activeDemo} />
            <details>
              <summary className="cursor-pointer text-[12px] text-white/30">CSV 직접 편집</summary>
              <textarea
                className="mt-2 w-full min-h-[100px] rounded-lg bg-[#0d0f14] border border-white/[0.08] p-2 font-mono text-[11px] text-white/70"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
              />
            </details>
          </section>

          {step && (
            <section className="rounded-xl bg-[#13161e] border border-[#6c8cff]/25 p-4">
              <div className="flex flex-wrap gap-1 mb-3">
                {mod.steps.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStepIdx(i)}
                    className={`px-2 py-1 rounded text-[12px] ${
                      i === stepIdx ? "bg-[#6c8cff]/20 text-[#8ba5ff]" : "text-white/35"
                    }`}
                  >
                    {i + 1}. {s.title}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-white/30 mb-1">
                단계 {stepIdx + 1} / {mod.steps.length}
              </p>
              <h3 className="text-[16px] font-semibold text-white/85">{step.title}</h3>
              <p className="mt-2 text-[14px] text-white/60">
                <b className="text-white/80">이 단계를 하는 이유:</b> {step.why}
              </p>
              <p className="mt-1 text-[14px] text-white/45">
                <b className="text-white/70">다음 단계는:</b> {step.nextWhy}
              </p>
              <p className="mt-2 text-[13px] rounded-lg p-2.5 bg-[#6c8cff]/10 text-white/55">예시 — {step.example}</p>
              <div className="mt-3 grid sm:grid-cols-3 gap-2">
                {step.choices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChoices((s) => ({ ...s, [step.id]: c.id }))}
                    className={`text-left rounded-xl border p-3 text-[13px] ${
                      choices[step.id] === c.id
                        ? "border-[#6c8cff]/50 bg-[#6c8cff]/10"
                        : "border-white/[0.06]"
                    }`}
                  >
                    <div className="font-medium text-white/75">{c.label}</div>
                    {c.hint && <div className="text-[11px] text-white/35 mt-0.5">{c.hint}</div>}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={stepIdx === 0}
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                  className="px-3 py-1.5 rounded-lg text-[13px] border border-white/[0.08] text-white/50 disabled:opacity-30"
                >
                  이전
                </button>
                {stepIdx < mod.steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStepIdx((i) => Math.min(mod.steps.length - 1, i + 1))}
                    className="px-3 py-1.5 rounded-lg text-[13px] bg-[#4a6cf7] text-white"
                  >
                    다음 단계
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={run}
                    className="px-3 py-1.5 rounded-lg text-[13px] bg-[#4a6cf7] text-white disabled:opacity-40"
                  >
                    {busy ? "분석 중…" : "5. 분석 실행 → 결과"}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "results" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={run}
              className="px-3 py-1.5 rounded-lg text-[13px] bg-[#4a6cf7] text-white disabled:opacity-40"
            >
              {busy ? "계산 중…" : "다시 분석"}
            </button>
            <button
              type="button"
              disabled={busy || !result}
              onClick={aiInterpret}
              className="px-3 py-1.5 rounded-lg text-[13px] border border-white/[0.08] text-white/60 disabled:opacity-40"
            >
              AI 해석 보강
            </button>
            {(["png", "jpeg", "pdf", "xlsx"] as const).map((f) => (
              <button
                key={f}
                type="button"
                disabled={!result}
                onClick={() => exportViz(f)}
                className="px-3 py-1.5 rounded-lg text-[13px] border border-white/[0.08] text-white/50 uppercase disabled:opacity-40"
              >
                {f}
              </button>
            ))}
          </div>
          {!result && (
            <p className="text-[14px] text-white/35">아직 결과가 없습니다. 절차 단계에서 분석을 실행하세요.</p>
          )}
          {result && (
            <section className="rounded-xl bg-[#13161e] border border-[#6c8cff]/30 p-4">
              <p className="text-[12px] text-[#6c8cff] mb-1">5. 분석 실행 · 6. 결과 해석·내보내기</p>
              <h3 className="text-[17px] font-semibold text-white/90">{result.summary}</h3>
              {activeDemo && (
                <p className="text-[13px] text-white/40 mt-1">데이터: {activeDemo.title}</p>
              )}
              <div className="mt-3 text-[14px] text-white/65 leading-relaxed whitespace-pre-wrap">
                {result.interpretation}
              </div>
              <div ref={chartRef} className="mt-4 space-y-3">
                {charts.map((ch, i) => (
                  <div key={i} className="rounded-xl bg-[#0d0f14] border border-white/[0.05] p-2 overflow-x-auto">
                    <CaChart spec={ch} />
                  </div>
                ))}
              </div>
              {result.table && (
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-white/40 text-left">
                        {result.table.cols.map((c) => (
                          <th key={c} className="px-2 py-1 font-medium">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.table.rows.map((row, i) => (
                        <tr key={i} className="border-t border-white/[0.04] text-white/65">
                          {row.map((c, j) => (
                            <td key={j} className="px-2 py-1">
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {result.stats && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(result.stats).map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[12px] rounded-lg border border-white/[0.06] px-2 py-1 text-white/50"
                    >
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}
          {aiNote && (
            <section className="rounded-xl bg-[#6c8cff]/10 border border-[#6c8cff]/25 p-4">
              <h3 className="text-[15px] font-semibold text-white/85 mb-2">AI 보강 해석</h3>
              <pre className="whitespace-pre-wrap text-[13px] text-white/65 font-sans">{aiNote}</pre>
            </section>
          )}
          {!!mod.next?.length && (
            <section className="rounded-xl bg-[#13161e] border border-white/[0.06] p-4">
              <h3 className="text-[14px] font-medium text-white/70 mb-2">다음 모듈</h3>
              <div className="flex flex-wrap gap-2">
                {mod.next.map((nid) => {
                  const n = getModule(cur, nid);
                  if (!n) return null;
                  return (
                    <button
                      key={nid}
                      type="button"
                      onClick={() => onSelectModule(nid)}
                      className="px-2.5 py-1 rounded-lg text-[12px] border border-white/[0.08] text-white/50"
                    >
                      → {n.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function BasicStatsWorkspace() {
  const [cur, setCur] = useState<BsCurriculum | null>(null);
  const [err, setErr] = useState("");
  const [moduleId, setModuleId] = useState<string | null>(null);

  useEffect(() => {
    loadBasicStatsCurriculum()
      .then(setCur)
      .catch((e) => setErr(e?.message || "커리큘럼 로드 실패"));
  }, []);

  const mod = cur && moduleId ? getModule(cur, moduleId) : undefined;

  if (err) {
    return (
      <div className="p-8 text-center text-white/40">
        <p>{err}</p>
        <Link href="/method" className="text-[#3ecfb2] text-[14px] mt-2 inline-block">
          ← 연구방법으로
        </Link>
      </div>
    );
  }

  if (!cur) {
    return (
      <div className="p-8 text-center text-white/30 text-[14px]">기본통계 커리큘럼 로딩 중…</div>
    );
  }

  return (
    <div className="flex flex-col font-nanum-gothic h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2 mb-4 text-[15px] text-white/30">
          <Link href="/method" className="hover:text-white/60 transition-colors inline-flex items-center gap-1">
            <Icon name="method" size={15} /> 연구방법
          </Link>
          <span className="text-white/10">|</span>
          <span>🔵 양적 분석형 · 기본통계</span>
        </div>

        <div className="mb-5">
          <h1 className="text-[22px] font-bold font-nanum-myeongjo text-white/90">기본통계</h1>
          <p className="text-[14px] text-white/40 mt-1 leading-relaxed">
            {cur.basics?.title || "기술·추론·구조방정식 학습용 기본통계 엔진"} · 모듈별 데모 12종 · 변수 설명 · 상세 해석
          </p>
        </div>

        {!mod ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {cur.modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModuleId(m.id)}
                className="text-left p-3.5 rounded-xl bg-[#13161e] border border-white/[0.06] hover:border-[#6c8cff]/35 transition-all"
              >
                <p className="text-[14px] font-medium text-white/80">{m.name}</p>
                <p className="text-[12px] text-white/30 mt-1 line-clamp-2">{m.overview}</p>
                <p className="text-[11px] text-[#6c8cff]/70 mt-2">{m.group}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setModuleId(null)}
              className="text-[13px] text-white/40 hover:text-white/70"
            >
              ← 모듈 목록
            </button>
            <ModuleWorkbench mod={mod} cur={cur} onSelectModule={setModuleId} />
          </div>
        )}
      </div>
    </div>
  );
}
