"use client";

import { useCallback, useMemo, useState } from "react";
import { useGemini } from "@/hooks/use-gemini";
import NetworkAnalysis from "@/components/literature/network-analysis";
import LiteratureAnalyticsPanel, {
  type GraphVisualStyle,
} from "@/components/literature/literature-analytics-panel";
import LiteratureEngineTools from "@/components/literature/literature-engine-tools";
import { useAppStore } from "@/store/app-store";
import { LLB_STACK } from "@/lib/literature/llb-nav";

export interface LlbPaper {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  abstract: string;
  doi: string;
  url: string;
  citations: number;
  keywords: string[];
  source: string;
  similarity?: number;
  region: "domestic" | "international";
  meta?: LlbMeta;
}

export interface LlbMeta {
  type?: string; lang?: string; area?: string; field?: string; topic?: string; fwci?: number; citePct?: number; isOa?: boolean; pdfUrl?: string;
  indexes?: string[]; jif?: number | null; jifQ?: string; jifEst?: number | null; journalH?: number | null; isKr?: boolean; suspect?: boolean;
}

export interface LlbFilters { indexes: string[]; minJif: string; yearFrom: string; yearTo: string; oaOnly: boolean; sort: string }
const DEFAULT_FILTERS: LlbFilters = { indexes: [], minJif: "", yearFrom: "", yearTo: "", oaOnly: false, sort: "relevance" };
const filterQuery = (f: LlbFilters) =>
  (f.indexes.length ? `&indexes=${f.indexes.join(",")}` : "") + (f.minJif ? `&minJif=${encodeURIComponent(f.minJif)}` : "") +
  (f.yearFrom ? `&yearFrom=${encodeURIComponent(f.yearFrom)}` : "") + (f.yearTo ? `&yearTo=${encodeURIComponent(f.yearTo)}` : "") +
  (f.oaOnly ? "&oaOnly=1" : "") + `&sort=${f.sort}`;

async function searchLlb(query: string, region: string, limit = 40, filters: LlbFilters = DEFAULT_FILTERS): Promise<{ results: LlbPaper[]; sources: string[]; note?: string; fallback?: boolean; matched?: number; lower?: boolean; ms?: number }> {
  const res = await fetch(
    `/api/scholar?q=${encodeURIComponent(query)}&region=${region}&limit=${limit}&corpus=llb${filterQuery(filters)}`,
  );
  const data = await res.json();
  return {
    results: (data.results ?? []).map((r: any) => ({
      id: r.id,
      title: r.title ?? "",
      authors: r.authors ?? "",
      year: r.year ?? 0,
      journal: r.journal ?? "",
      abstract: r.abstract ?? "",
      doi: r.doi ?? "",
      url: r.url ?? "",
      citations: r.citations ?? 0,
      keywords: r.keywords ?? [],
      source: r.source ?? "LLB",
      similarity: r.similarity,
      region: region === "domestic" ? "domestic" : "international",
      meta: r.meta,
    })),
    sources: data.sources ?? [],
    note: data.note,
    fallback: !!data.fallback,
    matched: data.matched,
    lower: !!data.matchedIsLowerBound,
    ms: data.ms,
  };
}

function LlbInsightBars({ data }: { data: any }) {
  const years: { year: number; n: number }[] = (data.years ?? []).filter((y: any) => y.year >= 2000);
  const maxY = Math.max(1, ...years.map((y) => y.n));
  const areaName: Record<string, string> = { health: "보건", life: "생명", physical: "물리", social: "사회", humanities_arts: "인문·예술", other: "기타" };
  const maxA = Math.max(1, ...(data.areas ?? []).map((a: any) => a.n));
  return (
    <div className="grid gap-3 md:grid-cols-2 p-3 rounded-xl bg-[#13161e] border border-white/[0.05]">
      <div>
        <p className="text-[12px] text-white/40 mb-1">연도별 논문 수 (일치 {Number(data.total).toLocaleString()}편 전체)</p>
        <div className="flex items-end gap-[2px] h-20">
          {years.map((y) => <div key={y.year} title={`${y.year}: ${y.n.toLocaleString()}`} className="flex-1 bg-[#e8b84b]/60 rounded-t-sm" style={{ height: `${Math.max(3, (y.n / maxY) * 100)}%` }} />)}
        </div>
        <div className="flex justify-between text-[10px] text-white/25 mt-0.5"><span>{years[0]?.year}</span><span>{years[years.length - 1]?.year}</span></div>
      </div>
      <div className="space-y-1">
        <p className="text-[12px] text-white/40 mb-1">분야 · 색인 · OA</p>
        {(data.areas ?? []).slice(0, 5).map((a: any) => (
          <div key={a.area} className="flex items-center gap-2 text-[11px] text-white/50">
            <span className="w-14 shrink-0">{areaName[a.area] ?? a.area}</span>
            <div className="h-2 rounded bg-[#6c8cff]/60" style={{ width: `${(a.n / maxA) * 60}%` }} /><span>{a.n.toLocaleString()}</span>
          </div>
        ))}
        <p className="text-[11px] text-white/40 pt-1">
          {(data.indexes ?? []).map((i: any) => `${i.key} ${Number(i.n).toLocaleString()}`).join(" · ")} · OA {data.oa ? Math.round((data.oa.open / Math.max(1, data.oa.total)) * 100) : 0}%
        </p>
      </div>
    </div>
  );
}

export function LlbSearchPanel() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<"domestic" | "international">("international");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LlbPaper[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [filters, setFilters] = useState<LlbFilters>(DEFAULT_FILTERS);
  const [fallback, setFallback] = useState(false);
  const [stat, setStat] = useState<{ matched?: number; ms?: number; lower?: boolean }>({});
  const [insights, setInsights] = useState<any>(null);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await searchLlb(q.trim(), region, 50, filters);
      setResults(data.results);
      setFallback(!!data.fallback);
      setStat({ matched: data.matched, ms: data.ms, lower: data.lower });
      setInsights(null);
      if (!data.fallback) {
        fetch(`/api/scholar/insights?q=${encodeURIComponent(q.trim())}&region=${region}${filterQuery(filters)}`)
          .then((r) => r.json()).then((j) => setInsights(j.ok ? j : null)).catch(() => setInsights(null));
      }
      setSources(data.sources);
      setNote(data.note ?? "");
      setSelected([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h2 className="text-[22px] font-bold font-nanum-myeongjo text-white">LLB 검색</h2>
        <p className="text-[14px] text-white/35 mt-1">
          로컬문헌기반(Scholar Stack) 우선 검색 · ClickHouse / OpenAlex 로컬 적재분
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRegion("domestic")}
          className={`px-3 py-1.5 rounded-lg text-[14px] ${
            region === "domestic" ? "bg-[#6c8cff]/15 text-[#6c8cff] border border-[#6c8cff]/30" : "text-white/30 border border-transparent"
          }`}
        >
          국내
        </button>
        <button
          type="button"
          onClick={() => setRegion("international")}
          className={`px-3 py-1.5 rounded-lg text-[14px] ${
            region === "international" ? "bg-[#e8b84b]/15 text-[#e8b84b] border border-[#e8b84b]/30" : "text-white/30 border border-transparent"
          }`}
        >
          해외
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="LLB 로컬 코퍼스에서 검색…"
          className="flex-1 px-4 py-3 rounded-xl bg-[#13161e] border border-white/[0.06] text-white text-[16px] focus:outline-none focus:border-[#e8b84b]"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || !q.trim()}
          className="px-5 py-3 rounded-xl bg-[#e8b84b]/20 border border-[#e8b84b]/35 text-[#e8b84b] font-medium disabled:opacity-40"
        >
          {loading ? "검색 중…" : "검색"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/50">
        {[["scie", "SCIE"], ["ssci", "SSCI"], ["ahci", "A&HCI"], ["esci", "ESCI"], ["scopus", "Scopus"], ["kci", "KCI"]].map(([k, label]) => (
          <button key={k} type="button"
            onClick={() => setFilters((f) => ({ ...f, indexes: f.indexes.includes(k) ? f.indexes.filter((x) => x !== k) : [...f.indexes, k] }))}
            className={`px-2.5 py-1 rounded-md border ${filters.indexes.includes(k) ? "border-[#e8b84b]/50 text-[#e8b84b] bg-[#e8b84b]/10" : "border-white/[0.08]"}`}>{label}</button>
        ))}
        <input value={filters.minJif} onChange={(e) => setFilters((f) => ({ ...f, minJif: e.target.value.replace(/[^0-9.]/g, "") }))} placeholder="JIF ≥" className="w-20 px-2 py-1 rounded-md bg-[#13161e] border border-white/[0.08]" />
        <input value={filters.yearFrom} onChange={(e) => setFilters((f) => ({ ...f, yearFrom: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="시작연도" className="w-20 px-2 py-1 rounded-md bg-[#13161e] border border-white/[0.08]" />
        <input value={filters.yearTo} onChange={(e) => setFilters((f) => ({ ...f, yearTo: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="끝연도" className="w-20 px-2 py-1 rounded-md bg-[#13161e] border border-white/[0.08]" />
        <label className="flex items-center gap-1"><input type="checkbox" checked={filters.oaOnly} onChange={(e) => setFilters((f) => ({ ...f, oaOnly: e.target.checked }))} />OA만</label>
        <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} className="px-2 py-1 rounded-md bg-[#13161e] border border-white/[0.08]">
          <option value="relevance">관련도순</option><option value="cited">인용순</option><option value="year">최신순</option><option value="jif">JIF순</option>
        </select>
      </div>

      {fallback && <p className="text-[13px] text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">⚠ 로컬 LLB에 연결되지 않아 공개 API로 대체한 결과입니다 (저널 등급·JIF 없음).</p>}
      {!fallback && stat.matched != null && <p className="text-[12px] text-white/30">로컬 코퍼스 제목 일치 {stat.matched.toLocaleString()}{stat.lower ? "편 이상" : "편"} 중 상위 {results.length}편 · {stat.ms}ms</p>}
      {insights && <LlbInsightBars data={insights} />}

      {note && <p className="text-[13px] text-[#e8b84b]/70 bg-[#e8b84b]/08 border border-[#e8b84b]/15 rounded-lg px-3 py-2">{note}</p>}
      {sources.length > 0 && (
        <p className="text-[12px] text-white/25">소스: {sources.join(" · ")}</p>
      )}

      <div className="space-y-2">
        {results.map((p) => (
          <label
            key={p.id}
            className={`block p-3 rounded-xl border cursor-pointer transition-all ${
              selected.includes(p.id) ? "border-[#e8b84b]/40 bg-[#e8b84b]/08" : "border-white/[0.04] bg-[#13161e] hover:border-white/[0.08]"
            }`}
          >
            <div className="flex gap-3">
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="mt-1" />
              <div className="min-w-0">
                <p className="text-[15px] text-white/85 font-medium line-clamp-2">{p.title}</p>
                <p className="text-[13px] text-white/35 mt-1">
                  {p.authors} · {p.year || "n.d."} · {p.journal || p.source}
                  {typeof p.citations === "number" ? ` · 인용 ${p.citations}` : ""}
                </p>
                {p.meta && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 text-[11px]">
                    {(p.meta.indexes ?? []).map((k) => (
                      <span key={k} className={`px-1.5 py-0.5 rounded bg-[#6c8cff]/15 text-[#6c8cff] ${p.meta?.suspect ? "opacity-40" : ""}`}>{k.toUpperCase()}</span>
                    ))}
                    {p.meta.jif ? <span className={`px-1.5 py-0.5 rounded bg-[#e8b84b]/15 text-[#e8b84b] ${p.meta.suspect ? "opacity-40" : ""}`}>JIF {p.meta.jif.toFixed(1)}{p.meta.jifQ ? ` · ${p.meta.jifQ}` : ""}</span> : null}
                    {!p.meta.jif && p.meta.jifEst ? <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50">추정 IF {p.meta.jifEst.toFixed(1)}</span> : null}
                    {p.meta.journalH ? <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50">저널 H {p.meta.journalH}</span> : null}
                    {p.meta.fwci ? <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300">fwci {p.meta.fwci.toFixed(2)}</span> : null}
                    {p.meta.citePct ? <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300">상위 {Math.max(1, 100 - p.meta.citePct)}%</span> : null}
                    {p.meta.isOa ? <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60">OA</span> : null}
                    {p.meta.suspect ? <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300" title="DOI가 다른 논문과 겹치거나 저널 분야와 모순됩니다. 원문에서 서지정보를 확인하세요.">출처 확인 필요</span> : null}
                  </div>
                )}
                {p.abstract && <p className="text-[13px] text-white/40 mt-2 line-clamp-3">{p.abstract}</p>}
              </div>
            </div>
          </label>
        ))}
        {!loading && results.length === 0 && (
          <p className="text-white/25 text-[14px] py-8 text-center">검색어를 입력하고 LLB 검색을 실행하세요.</p>
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-[13px] text-[#e8b84b]">선택 {selected.length}편 — 네트워크/갭/군집 분석 페이지에서 활용 가능</p>
      )}
    </div>
  );
}

export function LlbDatabasesPanel() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      <header>
        <h2 className="text-[22px] font-bold font-nanum-myeongjo">LLB DB 목록</h2>
        <p className="text-[14px] text-white/35 mt-1">로컬문헌기반 Scholar Stack 구성</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {LLB_STACK.map((s) => (
          <div key={s.drive} className="p-5 rounded-2xl bg-[#13161e] border border-white/[0.05]">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.accent }} />
              <span className="text-[18px] font-semibold text-white">{s.drive}</span>
            </div>
            <p className="text-[16px] text-white/80 font-medium">{s.name}</p>
            <p className="text-[14px] text-white/50 mt-0.5">{s.nameKo}</p>
            <p className="text-[13px] text-white/35 mt-3 leading-relaxed">{s.role}</p>
            <p className="text-[12px] text-white/20 mt-3 font-mono break-all">{s.path}</p>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-xl bg-[#e8b84b]/08 border border-[#e8b84b]/15 text-[14px] text-white/50">
        ClickHouse(<code className="text-[#e8b84b]/80">openalex.papers</code>) 적재가 끝나면 LLB 검색이 로컬 인덱스를 1순위로 사용합니다.
        적재 전에는 공개 API를 LLB 모드 라벨로 보강 호출합니다.
      </div>
    </div>
  );
}

function useLlbWorkingSet() {
  const [papers, setPapers] = useState<LlbPaper[]>([]);
  const [q, setQ] = useState("artificial intelligence");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchLlb(q || "research", "international", 40);
      setPapers(data.results);
    } finally {
      setLoading(false);
    }
  }, [q]);
  return { papers, q, setQ, loading, load };
}

export function LlbNetworkPanel() {
  const { papers, q, setQ, loading, load } = useLlbWorkingSet();
  const net = useMemo(
    () =>
      papers.map((p) => ({
        id: p.id,
        title: p.title,
        authors: p.authors,
        year: p.year,
        journal: p.journal,
        keywords: p.keywords,
      })),
    [papers],
  );
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-[22px] font-bold font-nanum-myeongjo">LLB 네트워크분석</h2>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.06] text-white text-[14px]" />
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] border border-[#e8b84b]/30 text-[14px]">
          {loading ? "…" : "코퍼스 로드"}
        </button>
      </div>
      <NetworkAnalysis papers={net} />
    </div>
  );
}

export function LlbAnalyticsPanel() {
  const { papers, q, setQ, loading, load } = useLlbWorkingSet();
  const [visualStyle, setVisualStyle] = useState<GraphVisualStyle>("default");
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-[22px] font-bold font-nanum-myeongjo">LLB 데이터분석</h2>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.06] text-white text-[14px]" />
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] border border-[#e8b84b]/30 text-[14px]">
          {loading ? "…" : "코퍼스 로드"}
        </button>
      </div>
      <LiteratureAnalyticsPanel
        papers={papers}
        visualStyle={visualStyle}
        onVisualStyleChange={setVisualStyle}
      />
    </div>
  );
}

export function LlbInsightsPanel() {
  const { papers, q, setQ, loading, load } = useLlbWorkingSet();
  const { projects, currentProjectId } = useAppStore();
  const project = projects.find((p) => p.id === currentProjectId);
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-[22px] font-bold font-nanum-myeongjo">LLB 연구 인사이트</h2>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.06] text-white text-[14px]" />
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] border border-[#e8b84b]/30 text-[14px]">
          {loading ? "…" : "코퍼스 로드"}
        </button>
      </div>
      <LiteratureEngineTools
        papers={papers}
        locale="ko"
        thesisType="all"
        projectTitle={project?.title}
      />
    </div>
  );
}

function LlbGeminiPanel({
  title,
  kind,
}: {
  title: string;
  kind: "gap" | "design" | "cluster";
}) {
  const { papers, q, setQ, loading, load } = useLlbWorkingSet();
  const { generate, loading: aiLoading } = useGemini();
  const [out, setOut] = useState("");
  const run = async () => {
    if (papers.length === 0) await load();
    const list = papers.slice(0, 25);
    const promptMap = {
      gap: "Identify research gaps from these LLB local-corpus papers. Respond in Korean.",
      design: "Propose a research design based on these papers. Respond in Korean.",
      cluster: "Cluster these papers by theme and method. Respond in Korean.",
    } as const;
    const body = list
      .map((p, i) => `[${i + 1}] ${p.title} (${p.year}) ${p.abstract?.slice(0, 280) ?? ""}`)
      .join("\n");
    const text = await generate({
      systemInstruction: promptMap[kind],
      userText: body || "No papers loaded.",
    });
    setOut(text || "");
  };
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-[22px] font-bold font-nanum-myeongjo">{title}</h2>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.06] text-white text-[14px]" />
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg border border-white/10 text-white/50 text-[14px]">
          {loading ? "…" : "로드"}
        </button>
        <button type="button" onClick={run} disabled={aiLoading} className="px-4 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] border border-[#e8b84b]/30 text-[14px]">
          {aiLoading ? "분석 중…" : "LLB 분석 실행"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-[14px] text-white/65 bg-[#13161e] border border-white/[0.04] rounded-xl p-4 min-h-[240px]">
        {out || "코퍼스를 로드한 뒤 분석을 실행하세요."}
      </pre>
    </div>
  );
}

export function LlbGapPanel() {
  return <LlbGeminiPanel title="LLB 연구갭" kind="gap" />;
}
export function LlbDesignPanel() {
  return <LlbGeminiPanel title="LLB 연구설계" kind="design" />;
}
export function LlbClusterPanel() {
  return <LlbGeminiPanel title="LLB 군집분석" kind="cluster" />;
}
