"use client";

/* ════════════════════════════════════════════════════════════
   LLB 네트워크 탐색기 — 상위 N편(40~10,000) × 11종 네트워크 × 중심성·군집 지표
   - 서버(/api/scholar/network)가 검색 순위대로 상위 N편을 모아 노드·엣지를 만들고, 이 화면이 지표·군집·배치를 계산해 그린다.
   - 노드 모양은 종류별(저자=원, 키워드=둥근 사각형, 저널=육각형, 기관=마름모, 후원기관=오각형, MeSH=팔각형, 개념=삼각형)
   - 크기 = 선택한 중심성, 색 = 군집(Louvain)/종류/평균 연도
═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NET_KINDS, analyzeGraph, layoutComponents,
  type Graph, type NetKind, type NodeKind, type Summary, type GraphMetrics, type NodeMetrics,
} from "@/lib/literature/network-graph";

interface NetworkResponse {
  kind: NetKind; scope: number; matched: number | null; matchedIsLowerBound: boolean; sampleSize: number; ms: number;
  graph: Graph; summary: Summary; note?: string; error?: string;
}

type SizeBy = "degree" | "strength" | "betweenness" | "closeness" | "pagerank" | "count" | "cited";
type ColorBy = "community" | "kind" | "year";

const SCOPES = [40, 100, 200, 500, 1000, 5000, 10000];
const PALETTE = ["#6c8cff", "#3ecfb2", "#e8b84b", "#f472b6", "#a78bfa", "#fb923c", "#34d399", "#60a5fa", "#f87171", "#c084fc", "#facc15", "#2dd4bf"];
const KIND_COLOR: Record<NodeKind, string> = {
  author: "#6c8cff", keyword: "#3ecfb2", journal: "#e8b84b", institution: "#f472b6", country: "#34d399", funder: "#fb923c", mesh: "#60a5fa", concept: "#c084fc", paper: "#f87171",
};
const KIND_LABEL: Record<NodeKind, string> = {
  author: "저자", keyword: "키워드", journal: "저널", institution: "기관", country: "국가", funder: "후원기관", mesh: "MeSH", concept: "개념", paper: "논문",
};
const SIZE_OPTIONS: { id: SizeBy; label: string }[] = [
  { id: "degree", label: "연결 수" }, { id: "strength", label: "가중 연결" }, { id: "betweenness", label: "매개 중심성" },
  { id: "closeness", label: "근접 중심성" }, { id: "pagerank", label: "PageRank" }, { id: "count", label: "논문 수" }, { id: "cited", label: "인용 합" },
];
const nf = new Intl.NumberFormat("ko-KR");

/** 모양별 SVG 경로. r 은 외접 반지름 */
function shapePath(kind: NodeKind, x: number, y: number, r: number): string {
  const poly = (n: number, rot: number, k = 1) => {
    const pts = Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2; return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]; });
    return "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
  };
  switch (kind) {
    case "keyword": { const s = r * 0.9, c = r * 0.38; return `M${x - s + c} ${y - s}H${x + s - c}Q${x + s} ${y - s} ${x + s} ${y - s + c}V${y + s - c}Q${x + s} ${y + s} ${x + s - c} ${y + s}H${x - s + c}Q${x - s} ${y + s} ${x - s} ${y + s - c}V${y - s + c}Q${x - s} ${y - s} ${x - s + c} ${y - s}Z`; }
    case "journal": return poly(6, 0);
    case "institution": return poly(4, 0, 1.12);
    case "funder": return poly(5, -Math.PI / 2);
    case "mesh": return poly(8, Math.PI / 8);
    case "concept": return poly(3, -Math.PI / 2, 1.15);
    case "paper": { const s = r * 0.85; return `M${x - s} ${y - s * 0.8}H${x + s}V${y + s * 0.8}H${x - s}Z`; }
    default: return `M${x - r} ${y}A${r} ${r} 0 1 0 ${x + r} ${y}A${r} ${r} 0 1 0 ${x - r} ${y}Z`;
  }
}

function yearColor(y: number, lo: number, hi: number): string {
  if (!y) return "#7b8294";
  const t = hi > lo ? Math.min(1, Math.max(0, (y - lo) / (hi - lo))) : 0.5;
  const a = [96, 165, 250], b = [251, 191, 36];            // 파랑(오래됨) → 호박색(최근)
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}

function labelOf(n: { label: string; kind: NodeKind }, regionNames: Intl.DisplayNames | null): string {
  if (n.kind === "country" && regionNames && /^[A-Z]{2}$/.test(n.label)) { try { return regionNames.of(n.label) ?? n.label; } catch { return n.label; } }
  return n.label;
}

async function exportSvgAs(svg: SVGSVGElement, format: "png" | "jpeg" | "svg", filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = (svg.dataset.baseViewbox || svg.getAttribute("viewBox") || "0 0 900 580").split(/[\s,]+/).map(Number);
  clone.setAttribute("viewBox", vb.join(" "));
  clone.setAttribute("width", String(vb[2] * 2)); clone.setAttribute("height", String(vb[3] * 2));
  let xml = new XMLSerializer().serializeToString(clone);
  if (!xml.includes("xmlns=")) xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const download = (href: string) => { const a = document.createElement("a"); a.href = href; a.download = filename; a.click(); };
  if (format === "svg") { const u = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" })); download(u); setTimeout(() => URL.revokeObjectURL(u), 2000); return; }
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement("canvas"); c.width = vb[2] * 2; c.height = vb[3] * 2;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#0d0f14"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
    download(c.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", 0.93));
  } finally { URL.revokeObjectURL(url); }
}

function narrative(kindId: NetKind, res: NetworkResponse, m: GraphMetrics, top: { label: string; v: number }[]): string {
  const meta = NET_KINDS.find((k) => k.id === kindId)!;
  const pct = res.matched && res.matched > 0 ? ((res.sampleSize / res.matched) * 100).toFixed(1) : null;
  const lines = [
    `【범위】검색 결과 ${res.matched != null ? nf.format(res.matched) + (res.matchedIsLowerBound ? "편 이상" : "편") : "(건수 미확인)"} 중 순위 상위 ${nf.format(res.sampleSize)}편을 분석했습니다${pct ? ` (전체의 ${pct}%)` : ""}. 상위 100편은 표본 인용의 ${(res.summary.citedShareTop100 * 100).toFixed(0)}%를 차지합니다.`,
    `【구조】이 ${meta.label} 그래프는 노드 ${m.nodeCount}개·엣지 ${m.edgeCount}개, 연결 요소 ${m.components}개이며 가장 큰 덩어리가 전체 노드의 ${(m.giantShare * 100).toFixed(0)}%입니다. 밀도 ${(m.density * 100).toFixed(1)}%, 평균 연결 ${m.avgDegree.toFixed(1)}, 평균 군집계수 ${m.avgClustering.toFixed(2)}${m.avgPath ? `, 평균 경로 ${m.avgPath.toFixed(2)}·지름 ${m.diameter}` : ""}입니다.`,
    `【군집】Louvain 군집 ${m.communities}개, 모듈성 Q=${m.modularity.toFixed(2)} — ` +
      (m.modularity > 0.5 ? "군집이 뚜렷하게 분리된 구조(하위 연구 흐름/팀이 구분됨)입니다." : m.modularity > 0.3 ? "군집이 어느 정도 구분되며 군집 사이를 잇는 다리 노드가 있습니다." : "군집 경계가 약하고 한 덩어리에 가깝습니다."),
  ];
  if (top.length) lines.push(`【핵심 노드】${top.slice(0, 5).map((t) => t.label).join(", ")} — 선택한 중심성 기준 상위입니다. 매개 중심성이 높은 노드는 서로 다른 군집을 잇는 ‘다리’입니다.`);
  const hint: Partial<Record<NetKind, string>> = {
    coauthor: "공동저자 허브와 다리 저자를 따라가면 후속 연구팀·인용 후보를 찾을 수 있습니다.",
    coword: "촘촘히 묶인 키워드는 하위 주제군이고, 군집 사이의 약한 연결이 연구 공백(gap) 후보입니다.",
    authorkw: "저자와 키워드를 함께 보면 누가 어떤 주제를 선도하는지, 여러 저자가 공유하는 공통 어휘가 무엇인지 드러납니다.",
    journal: "저널 군집은 같은 독자층·주제를 공유하는 출판 지형입니다. 투고 후보를 고를 때 참고하세요.",
    institution: "기관 협력 허브는 연구 인프라의 중심이며, 군집 간 다리 기관은 학제·국제 협력의 통로입니다.",
    country: "국가 협력망은 국제 공동연구의 중심 국가와 협력이 적은 지역을 보여 줍니다.",
    funder: "후원기관 네트워크는 어떤 기관이 같은 연구를 함께 지원하는지(공동 재원)를 보여 줍니다.",
    mesh: "MeSH 용어 네트워크는 의학·생명과학 주제의 표준 어휘 구조입니다(Humans 같은 일반 표지어는 제외).",
    concept: "OpenAlex 개념 네트워크는 연구가 걸쳐 있는 학문 영역의 지도를 줍니다.",
    citation: "표본 안에서의 인용 관계입니다. 최신 논문 위주의 표본에서는 서로 인용하는 쌍이 적을 수 있어, 순위 기준을 ‘인용순’으로 바꾸거나 범위를 넓히면 구조가 뚜렷해집니다.",
    coupling: "참고문헌을 2건 이상 공유하는 논문끼리 연결합니다. 같은 지식 기반을 쓰는 연구 흐름을 찾는 데 적합합니다.",
  };
  if (hint[kindId]) lines.push(`【활용】${hint[kindId]}`);
  if (res.graph.truncated.nodes > 0 || res.graph.truncated.edges > 0) lines.push(`【표시 제한】가독성을 위해 연결 강도 상위 노드만 그렸습니다(생략: 노드 ${nf.format(res.graph.truncated.nodes)}개, 엣지 ${nf.format(res.graph.truncated.edges)}개). 최소 연결을 올리거나 노드 상한을 바꿔 보세요.`);
  if (res.note) lines.push(`【참고】${res.note}`);
  return lines.join("\n\n");
}

export default function NetworkExplorer({
  initialQuery = "artificial intelligence",
  endpoint = "/api/scholar/network",
  extraParams = "",
}: { initialQuery?: string; endpoint?: string; extraParams?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [committed, setCommitted] = useState<string | null>(null);
  const [scope, setScope] = useState(100);
  const [kind, setKind] = useState<NetKind>("coauthor");
  const [sort, setSort] = useState<"relevance" | "cited" | "year" | "fwci">("relevance");
  const [maxNodes, setMaxNodes] = useState(120);
  const [minEdge, setMinEdge] = useState(1);
  const [sizeBy, setSizeBy] = useState<SizeBy>("strength");
  const [colorBy, setColorBy] = useState<ColorBy>("community");
  const [tab, setTab] = useState<SizeBy>("betweenness");
  const [labelN, setLabelN] = useState(14);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [res, setRes] = useState<NetworkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const cache = useRef(new Map<string, NetworkResponse>());
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const regionNames = useMemo(() => { try { return new Intl.DisplayNames(["ko"], { type: "region" }); } catch { return null; } }, []);
  const W = 900, H = 580;

  const run = useCallback(async (query: string, sc: number, kd: NetKind, mn: number, so: string) => {
    const key = [query, sc, kd, mn, so, extraParams].join("|");
    const hit = cache.current.get(key);
    if (hit) { setRes(hit); setErr(""); return; }
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&kind=${kd}&scope=${sc}&maxNodes=${mn}&sort=${so}${extraParams}`);
      const data = (await r.json()) as NetworkResponse;
      if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
      cache.current.set(key, data);
      if (cache.current.size > 40) cache.current.delete([...cache.current.keys()][0]);
      setRes(data);
    } catch (e: any) { setErr(String(e?.message ?? e)); } finally { setLoading(false); }
  }, [endpoint, extraParams]);

  useEffect(() => { if (committed) void run(committed, scope, kind, maxNodes, sort); }, [committed, scope, kind, maxNodes, sort, run]);
  useEffect(() => { setSelected(null); setView({ k: 1, x: 0, y: 0 }); }, [res]);

  const analysis = useMemo(() => {
    if (!res) return null;
    const edges = res.graph.edges.filter((e) => e.weight >= minEdge);
    const used = new Set<string>(); edges.forEach((e) => { used.add(e.source); used.add(e.target); });
    const nodes = res.graph.nodes.filter((n) => used.has(n.id));
    const metrics = analyzeGraph(nodes, edges);
    const val = (n: (typeof nodes)[number], by: SizeBy) => {
      const pm = metrics.perNode.get(n.id)!;
      return by === "count" ? n.count : by === "cited" ? n.cited : (pm as any)[by] as number;
    };
    const vmax = Math.max(1e-9, ...nodes.map((n) => val(n, sizeBy)));
    const rOf = (n: (typeof nodes)[number]) => 5 + Math.sqrt(Math.max(0, val(n, sizeBy)) / vmax) * (nodes.length > 80 ? 12 : 17);
    const placed = layoutComponents(nodes.map((n) => ({ id: n.id, r: rOf(n), community: metrics.perNode.get(n.id)!.community })), edges, W, H);
    const pos = new Map(placed.map((p) => [p.id, p]));
    const years = nodes.map((n) => n.yearMean).filter((y) => y > 0);
    return { nodes, edges, metrics, pos, yLo: Math.min(...years, 3000), yHi: Math.max(...years, 0), val };
  }, [res, minEdge, sizeBy]);

  const colorOf = useCallback((n: { id: string; kind: NodeKind; yearMean: number }): string => {
    if (!analysis) return "#6c8cff";
    if (colorBy === "kind") return KIND_COLOR[n.kind];
    if (colorBy === "year") return yearColor(n.yearMean, analysis.yLo, analysis.yHi);
    return PALETTE[analysis.metrics.perNode.get(n.id)!.community % PALETTE.length];
  }, [analysis, colorBy]);

  const topBy = useMemo(() => {
    if (!analysis) return [] as { label: string; v: number; id: string }[];
    return [...analysis.nodes].map((n) => ({ id: n.id, label: labelOf(n, regionNames), v: analysis.val(n, tab) })).sort((a, b) => b.v - a.v).slice(0, 10);
  }, [analysis, tab, regionNames]);

  const labelSet = useMemo(() => {
    // 중요도 순으로 라벨을 놓되, 이미 놓인 라벨·노드와 겹치면 건너뛴다
    if (!analysis) return new Set<string>();
    const placedBoxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
    const out = new Set<string>();
    for (const n of [...analysis.nodes].sort((a, b) => analysis.val(b, sizeBy) - analysis.val(a, sizeBy))) {
      if (out.size >= labelN) break;
      const p = analysis.pos.get(n.id)!; const t = labelOf(n, regionNames); const w = Math.min(22, t.length) * 6.6 + 8;
      const box = { x0: p.x - w / 2, y0: p.y + p.r + 3, x1: p.x + w / 2, y1: p.y + p.r + 18 };
      if (placedBoxes.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) continue;
      placedBoxes.push(box); out.add(n.id);
    }
    return out;
  }, [analysis, sizeBy, labelN, regionNames]);

  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    analysis?.edges.forEach((e) => { (m.get(e.source) ?? m.set(e.source, new Set()).get(e.source)!).add(e.target); (m.get(e.target) ?? m.set(e.target, new Set()).get(e.target)!).add(e.source); });
    return m;
  }, [analysis]);

  const focus = hover ?? selected;
  const shownKind = res?.kind ?? kind;                     // 응답이 도착하기 전에는 이전 결과를 그 결과의 종류로 설명한다
  const meta = NET_KINDS.find((k) => k.id === shownKind)!;
  const sel = selected && analysis ? analysis.nodes.find((n) => n.id === selected) : null;
  const text = useMemo(() => (res && analysis ? narrative(res.kind, res, analysis.metrics, topBy.map((t) => ({ label: t.label, v: t.v }))) : ""), [res, analysis, topBy]);

  const onWheel = (e: React.WheelEvent) => { const k = Math.min(6, Math.max(0.5, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); setView((v) => ({ ...v, k })); };
  const vbW = W / view.k, vbH = H / view.k;
  const vb = `${(W - vbW) / 2 - view.x} ${(H - vbH) / 2 - view.y} ${vbW} ${vbH}`;

  return (
    <div className="max-w-6xl space-y-4">
      {/* 검색 + 범위 */}
      <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05] space-y-3">
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) setCommitted(q.trim()); }}
            placeholder={'검색어 (예: machine learning cancer, "deep learning", 우울 청소년)'}
            className="flex-1 px-3 py-2 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-white text-[14px]" />
          <button type="button" onClick={() => q.trim() && setCommitted(q.trim())} className="px-4 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] border border-[#e8b84b]/30 text-[14px]">
            {loading ? "분석 중…" : "분석 실행"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] text-white/40 mr-1">분석 범위(상위 편수)</span>
          {SCOPES.map((s) => (
            <button key={s} type="button" onClick={() => setScope(s)}
              className={`px-2.5 py-1 rounded-lg text-[13px] border ${scope === s ? "border-[#e8b84b]/60 bg-[#e8b84b]/15 text-[#e8b84b] font-medium" : "border-white/[0.06] text-white/45 hover:text-white/75"}`}>
              {s >= 1000 ? nf.format(s) : s}편
            </button>
          ))}
          <label className="flex items-center gap-1.5 ml-3 text-[13px] text-white/40">순위 기준
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-[#0d0f14] border border-white/[0.08] rounded px-1.5 py-0.5 text-white/80">
              <option value="relevance">관련도</option><option value="cited">인용순</option><option value="fwci">FWCI순</option><option value="year">최신순</option>
            </select>
          </label>
          <span className="text-[12px] text-white/25 ml-2">큰 범위일수록 첫 계산이 오래 걸립니다(5천 편 이상은 1분 안팎).</span>
        </div>
        {res && (
          <div className="flex flex-wrap gap-2 text-[14px]">
            <span className="px-3 py-1.5 rounded-lg bg-[#0d0f14] border border-white/[0.05]"><span className="text-white/40">전체 일치 </span><b className="text-white">{res.matched != null ? nf.format(res.matched) + (res.matchedIsLowerBound ? "+" : "") : "?"}편</b></span>
            <span className="px-3 py-1.5 rounded-lg bg-[#0d0f14] border border-white/[0.05]"><span className="text-white/40">분석 표본 </span><b className="text-[#e8b84b]">{nf.format(res.sampleSize)}편</b>{res.matched ? <span className="text-white/30"> ({((res.sampleSize / res.matched) * 100).toFixed(1)}%)</span> : null}</span>
            <span className="px-3 py-1.5 rounded-lg bg-[#0d0f14] border border-white/[0.05]"><span className="text-white/40">상위 100편 </span><b className="text-white">인용 {(res.summary.citedShareTop100 * 100).toFixed(0)}%</b><span className="text-white/30"> 집중</span></span>
            <span className="px-3 py-1.5 rounded-lg bg-[#0d0f14] border border-white/[0.05] text-white/30">{(res.ms / 1000).toFixed(1)}초</span>
          </div>
        )}
        {err && <p className="text-[13px] text-[#f87171]">오류: {err}</p>}
      </div>

      {!res && !loading && !err && <p className="text-center py-16 text-white/20 text-[15px]">검색어를 넣고 ‘분석 실행’을 누르면 상위 {scope}편으로 네트워크를 만듭니다.</p>}
      {loading && !res && <p className="text-center py-16 text-white/40 text-[15px]">상위 {nf.format(scope)}편을 모으는 중…</p>}

      {res && analysis && (
        <>
          {/* 편수 측정 */}
          <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]">
            <p className="text-[15px] font-semibold mb-3">논문 편수 측정 — 표본 전체 vs 상위 100편</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-white/35 text-left"><th className="py-1 pr-3 font-normal">구분</th><th className="font-normal text-right">논문</th><th className="font-normal text-right">저자</th><th className="font-normal text-right">키워드</th><th className="font-normal text-right">저널</th><th className="font-normal text-right">기관</th><th className="font-normal text-right">국가</th><th className="font-normal text-right">인용 합</th><th className="font-normal text-right">평균 인용</th><th className="font-normal text-right">연도(중앙)</th></tr></thead>
                <tbody>
                  {([["분석 표본", res.summary.all], ["상위 100편", res.summary.top100]] as const).map(([name, s]) => (
                    <tr key={name} className="border-t border-white/[0.04] text-white/70 tabular-nums">
                      <td className="py-1.5 pr-3 text-white/85">{name}</td><td className="text-right">{nf.format(s.papers)}</td><td className="text-right">{nf.format(s.authors)}</td><td className="text-right">{nf.format(s.keywords)}</td>
                      <td className="text-right">{nf.format(s.journals)}</td><td className="text-right">{nf.format(s.institutions)}</td><td className="text-right">{nf.format(s.countries)}</td>
                      <td className="text-right">{nf.format(s.citedSum)}</td><td className="text-right">{s.citedMean.toFixed(1)}</td><td className="text-right">{s.yearMedian || "-"} <span className="text-white/25">({s.yearMin || "-"}–{s.yearMax || "-"})</span></td>
                    </tr>
                  ))}
                  <tr className="border-t border-white/[0.04] text-white/50 tabular-nums"><td className="py-1.5 pr-3">전체 일치</td><td className="text-right">{res.matched != null ? nf.format(res.matched) + (res.matchedIsLowerBound ? "+" : "") : "?"}</td><td colSpan={8} className="text-right text-white/25">전체 일치 편수는 검색 화면과 같은 기준(제목 일치 우선 단계)의 건수입니다</td></tr>
                </tbody>
              </table>
            </div>
            <div className="grid md:grid-cols-5 gap-3 mt-4">
              {([["연도별 편수", res.summary.years.slice(-12).map((y) => ({ name: String(y.year), n: y.n }))], ["저널", res.summary.topJournals], ["저자", res.summary.topAuthors], ["기관", res.summary.topInstitutions], ["국가", res.summary.topCountries.map((c) => ({ name: (() => { try { return regionNames?.of(c.name) ?? c.name; } catch { return c.name; } })(), n: c.n }))]] as [string, { name: string; n: number }[]][]).map(([title, rows]) => {
                const mx = Math.max(1, ...rows.map((r) => r.n));
                return (
                  <div key={title}>
                    <p className="text-[12px] text-white/40 mb-1.5">{title} 편수</p>
                    <div className="space-y-1">
                      {rows.slice(0, 7).map((r) => (
                        <div key={r.name} className="relative h-[20px] rounded bg-white/[0.03] overflow-hidden" title={`${r.name}: ${r.n}편`}>
                          <div className="absolute inset-y-0 left-0 bg-[#6c8cff]/25" style={{ width: `${(r.n / mx) * 100}%` }} />
                          <span className="relative px-1.5 text-[12px] leading-[20px] text-white/70 flex justify-between gap-1"><span className="truncate">{r.name}</span><span className="tabular-nums text-white/45">{r.n}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 네트워크 종류 + 보기 설정 */}
          <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05] space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {NET_KINDS.map((k) => (
                <button key={k.id} type="button" onClick={() => setKind(k.id)}
                  style={kind === k.id ? { backgroundColor: `${k.color}26`, color: k.color, borderColor: `${k.color}66` } : {}}
                  className={`px-3 py-1.5 rounded-lg text-[14px] border transition-all ${kind === k.id ? "font-medium" : "border-white/[0.06] text-white/40 hover:text-white/70"}`}>{k.label}</button>
              ))}
            </div>
            <p className="text-[13px] text-white/30">{meta.desc}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/45">
              <label className="flex items-center gap-1.5">크기 <select value={sizeBy} onChange={(e) => setSizeBy(e.target.value as SizeBy)} className="bg-[#0d0f14] border border-white/[0.08] rounded px-1.5 py-0.5 text-white/80">{SIZE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
              <label className="flex items-center gap-1.5">색 <select value={colorBy} onChange={(e) => setColorBy(e.target.value as ColorBy)} className="bg-[#0d0f14] border border-white/[0.08] rounded px-1.5 py-0.5 text-white/80"><option value="community">군집</option><option value="kind">종류</option><option value="year">평균 연도</option></select></label>
              <label className="flex items-center gap-1.5">노드 상한 <select value={maxNodes} onChange={(e) => setMaxNodes(Number(e.target.value))} className="bg-[#0d0f14] border border-white/[0.08] rounded px-1.5 py-0.5 text-white/80">{[60, 90, 120, 160, 200].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label className="flex items-center gap-1.5">최소 연결 <input type="range" min={1} max={6} value={minEdge} onChange={(e) => setMinEdge(Number(e.target.value))} className="w-20 accent-[#6c8cff]" /><span className="w-3 tabular-nums text-white/70">{minEdge}</span></label>
              <label className="flex items-center gap-1.5">라벨 <input type="range" min={0} max={40} value={labelN} onChange={(e) => setLabelN(Number(e.target.value))} className="w-20 accent-[#6c8cff]" /><span className="w-5 tabular-nums text-white/70">{labelN}</span></label>
              <span className="ml-auto flex gap-1.5">
                {(["png", "jpeg", "svg"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => svgRef.current && exportSvgAs(svgRef.current, f, `network-${kind}.${f === "jpeg" ? "jpg" : f}`)} className="px-2.5 py-0.5 rounded-lg text-[12px] border border-white/[0.08] text-white/50 hover:text-white/80">{f.toUpperCase()}</button>
                ))}
                <button type="button" onClick={() => setView({ k: 1, x: 0, y: 0 })} className="px-2.5 py-0.5 rounded-lg text-[12px] border border-white/[0.08] text-white/50 hover:text-white/80">보기 초기화</button>
              </span>
            </div>
          </div>

          {/* 그래프 */}
          <div className="grid lg:grid-cols-[1fr_280px] gap-4">
            <div className="rounded-2xl bg-[#0d0f14] border border-white/[0.05] overflow-hidden relative">
              {loading && <div className="absolute top-2 right-3 text-[12px] text-white/40 z-10">불러오는 중…</div>}
              {analysis.nodes.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-white/25 text-[15px]">연결 관계가 충분하지 않습니다. 범위를 넓히거나 최소 연결을 낮춰 보세요.</div>
              ) : (
                <svg ref={svgRef} viewBox={vb} data-base-viewbox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" style={{ maxHeight: 640, cursor: drag.current ? "grabbing" : "grab" }}
                  onWheel={onWheel}
                  onMouseDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; }}
                  onMouseMove={(e) => {
                    const d = drag.current;
                    if (!d) return;
                    // 값은 지금 계산해 둔다: setView 의 갱신 함수는 나중에 실행되는데 그때 drag.current 는 이미 null(마우스를 뗌)일 수 있다
                    const sc = (W / view.k) / (e.currentTarget.getBoundingClientRect().width || W);
                    const nx = d.vx + (e.clientX - d.x) * sc, ny = d.vy + (e.clientY - d.y) * sc;
                    setView((v) => ({ ...v, x: nx, y: ny }));
                  }}
                  onMouseUp={() => { drag.current = null; }} onMouseLeave={() => { drag.current = null; setHover(null); }}
                  onClick={(e) => { if (e.target === e.currentTarget || (e.target as Element).tagName === "rect") setSelected(null); }}>
                  <defs>
                    {PALETTE.concat(Object.values(KIND_COLOR)).map((c) => (
                      <radialGradient key={c} id={`g${c.slice(1)}`} cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="35%" stopColor={c} stopOpacity="1" /><stop offset="100%" stopColor={c} stopOpacity="0.72" /></radialGradient>
                    ))}
                    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#f87171" fillOpacity="0.8" /></marker>
                  </defs>
                  <rect x={-2000} y={-2000} width={5000} height={5000} fill="#0d0f14" />
                  {analysis.edges.map((e, i) => {
                    const a = analysis.pos.get(e.source), b = analysis.pos.get(e.target); if (!a || !b) return null;
                    const hot = focus && (focus === e.source || focus === e.target);
                    const dim = focus && !hot;
                    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, bend = 0.1;
                    const same = analysis.metrics.perNode.get(e.source)!.community === analysis.metrics.perNode.get(e.target)!.community;
                    return (
                      <path key={i} d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${(mx - dy * bend).toFixed(1)} ${(my + dx * bend).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`}
                        fill="none" stroke={hot ? meta.color : same ? "#aab4cc" : "#7d879f"} strokeOpacity={dim ? 0.05 : hot ? 0.85 : Math.min(0.5, 0.14 + e.weight * 0.05)}
                        strokeWidth={Math.min(3.4, 0.7 + Math.log2(1 + e.weight) * 0.8) * (hot ? 1.5 : 1)} markerEnd={res.graph.directed ? "url(#arrow)" : undefined} />
                    );
                  })}
                  {[...analysis.nodes].sort((a, b) => analysis.val(a, sizeBy) - analysis.val(b, sizeBy)).map((n) => {
                    const p = analysis.pos.get(n.id)!, c = colorOf(n);
                    const isFocus = focus === n.id, isNb = !!focus && (neighbors.get(focus)?.has(n.id) ?? false);
                    const dim = !!focus && !isFocus && !isNb;
                    const gid = PALETTE.includes(c) || Object.values(KIND_COLOR).includes(c) ? `url(#g${c.slice(1)})` : c;
                    const label = labelOf(n, regionNames), show = labelSet.has(n.id) || isFocus || isNb && (focus === selected);
                    const txt = label.length > 22 ? label.slice(0, 21) + "…" : label;
                    return (
                      <g key={n.id} opacity={dim ? 0.18 : 1} style={{ cursor: "pointer" }} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                        onClick={(e) => { e.stopPropagation(); setSelected((s) => (s === n.id ? null : n.id)); }}>
                        {n.kind === "country" && <circle cx={p.x} cy={p.y} r={p.r + 3} fill="none" stroke={c} strokeOpacity={0.5} strokeWidth={1.2} />}
                        <path d={shapePath(n.kind, p.x, p.y, p.r)} fill={gid} stroke={isFocus ? "#fff" : "#e8eaf0"} strokeOpacity={isFocus ? 0.95 : 0.35} strokeWidth={isFocus ? 2 : 1} filter={isFocus ? "url(#glow)" : undefined} />
                        {show && (
                          <g pointerEvents="none">
                            <rect x={p.x - txt.length * 3.3 - 4} y={p.y + p.r + 3} width={txt.length * 6.6 + 8} height={15} rx={7.5} fill="#0d0f14" fillOpacity={0.88} stroke={c} strokeOpacity={0.4} />
                            <text x={p.x} y={p.y + p.r + 14} textAnchor="middle" fontSize={10.5} fill="#f0f2f8">{txt}</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 border-t border-white/[0.04] text-[12px] text-white/40">
                {[...new Set(analysis.nodes.map((n) => n.kind))].map((k) => (
                  <span key={k} className="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 14 14"><path d={shapePath(k, 7, 7, 5.5)} fill={KIND_COLOR[k]} fillOpacity={0.85} /></svg>{KIND_LABEL[k]}</span>
                ))}
                <span className="ml-auto">휠: 확대/축소 · 드래그: 이동 · 노드 클릭: 이웃 강조</span>
              </div>
            </div>

            {/* 선택 노드 / 지표 */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05]">
                {sel ? (() => {
                  const pm = analysis.metrics.perNode.get(sel.id) as NodeMetrics;
                  const nb = [...(neighbors.get(sel.id) ?? [])].map((id) => analysis.nodes.find((n) => n.id === id)!).filter(Boolean).sort((a, b) => analysis.val(b, "strength") - analysis.val(a, "strength")).slice(0, 8);
                  return (
                    <div>
                      <p className="text-[12px] text-white/35 mb-0.5">{KIND_LABEL[sel.kind]} · 군집 {pm.community + 1}</p>
                      <p className="text-[15px] font-semibold text-white break-words mb-2">{labelOf(sel, regionNames)}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px] text-white/55 tabular-nums">
                        <span>논문 {sel.count}편</span><span>인용 합 {nf.format(sel.cited)}</span><span>연결 {pm.degree}</span><span>가중 {pm.strength}</span>
                        <span>매개 {pm.betweenness.toFixed(3)}</span><span>근접 {pm.closeness.toFixed(2)}</span><span>PageRank {(pm.pagerank * 100).toFixed(1)}%</span><span>군집계수 {pm.clustering.toFixed(2)}</span>
                      </div>
                      <p className="text-[12px] text-white/35 mt-2 mb-1">연결된 노드</p>
                      <div className="space-y-0.5">{nb.map((n) => <button key={n.id} type="button" onClick={() => setSelected(n.id)} className="block w-full text-left text-[12.5px] text-white/65 truncate hover:text-white">{labelOf(n, regionNames)}</button>)}</div>
                    </div>
                  );
                })() : <p className="text-[13px] text-white/30 leading-relaxed">노드를 클릭하면 중심성 지표와 연결된 노드를 보여 줍니다.</p>}
              </div>
              <div className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05]">
                <p className="text-[13px] font-semibold mb-2">네트워크 지표</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    ["노드", analysis.metrics.nodeCount], ["엣지", analysis.metrics.edgeCount], ["밀도", (analysis.metrics.density * 100).toFixed(1) + "%"], ["평균 연결", analysis.metrics.avgDegree.toFixed(1)],
                    ["연결 요소", analysis.metrics.components], ["최대 덩어리", (analysis.metrics.giantShare * 100).toFixed(0) + "%"], ["군집(Louvain)", analysis.metrics.communities], ["모듈성 Q", analysis.metrics.modularity.toFixed(2)],
                    ["평균 군집계수", analysis.metrics.avgClustering.toFixed(2)], ["전이성", analysis.metrics.transitivity.toFixed(2)], ["평균 경로", analysis.metrics.avgPath ? analysis.metrics.avgPath.toFixed(2) : "-"], ["지름", analysis.metrics.diameter || "-"],
                  ] as [string, string | number][]).map(([k, v]) => (
                    <div key={k} className="px-2 py-1.5 rounded-lg bg-[#0d0f14] border border-white/[0.03]"><p className="text-[11px] text-white/35">{k}</p><p className="text-[16px] font-semibold tabular-nums" style={{ color: meta.color }}>{v}</p></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 중심성 순위 + 군집 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]">
              <div className="flex flex-wrap gap-1 mb-3">
                {SIZE_OPTIONS.map((o) => (
                  <button key={o.id} type="button" onClick={() => setTab(o.id)} className={`px-2 py-0.5 rounded text-[12px] border ${tab === o.id ? "border-[#6c8cff]/50 bg-[#6c8cff]/10 text-[#8ba5ff]" : "border-white/[0.06] text-white/40"}`}>{o.label}</button>
                ))}
              </div>
              <div className="space-y-1">
                {(() => { const mx = Math.max(1e-9, ...topBy.map((t) => t.v)); return topBy.map((t, i) => (
                  <button key={t.id} type="button" onClick={() => setSelected(t.id)} className="relative block w-full h-[24px] rounded bg-white/[0.03] overflow-hidden text-left">
                    <span className="absolute inset-y-0 left-0 bg-[#6c8cff]/22" style={{ width: `${(t.v / mx) * 100}%` }} />
                    <span className="relative px-2 text-[13px] leading-[24px] text-white/75 flex justify-between gap-2"><span className="truncate"><span className="text-white/30 mr-1.5">{i + 1}</span>{t.label}</span><span className="tabular-nums text-white/45">{tab === "pagerank" ? (t.v * 100).toFixed(1) + "%" : Number.isInteger(t.v) ? nf.format(t.v) : t.v.toFixed(3)}</span></span>
                  </button>
                )); })()}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]">
              <p className="text-[14px] font-semibold mb-2">군집 {analysis.metrics.communities}개 <span className="text-white/30 font-normal text-[12px]">(크기순 · Louvain)</span></p>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {analysis.metrics.communityList.slice(0, 12).map((c) => (
                  <div key={c.id} className="flex gap-2 items-start text-[13px]">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[c.id % PALETTE.length] }} />
                    <div className="min-w-0"><p className="text-white/75 truncate">{c.members.map((m) => m).slice(0, 4).join(" · ")}</p><p className="text-[12px] text-white/30">{c.size}개 노드{c.yearMean ? ` · 평균 ${c.yearMean.toFixed(0)}년` : ""}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#13161e] border border-[#6c8cff]/20">
            <p className="text-[15px] font-semibold mb-2" style={{ color: meta.color }}>{meta.label} · 상세 분석</p>
            <div className="text-[14px] text-white/65 leading-relaxed whitespace-pre-wrap">{text}</div>
          </div>
        </>
      )}
    </div>
  );
}
