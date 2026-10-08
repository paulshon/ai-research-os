"use client";

/* ════════════════════════════════════════════════════════════
   LLB 네트워크 탐색기 (v3)
   - 상위 N편(40~10,000) × 12종 네트워크(공인용 포함) × 중심성·군집·구조 공백·k-core
   - 보기: 네트워크 · 군집 요약 · 구조 공백 · k-core · 경로 · 시간 흐름 · 신흥 주제 · 비교
   - 그림 스타일: 어두운 청록 바탕, 단색 둥근 노드, 흰색 직선 엣지
   - 서버(/api/scholar/network)가 표본을 모아 노드·엣지·구간별 그래프·급증 항목을 만들고, 이 화면이 지표·군집·배치를 계산한다
═══════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BGS, DEFAULT_STYLE, PALETTES, bgOf, paletteColors, type EdgeColorMode, type VizStyle } from "@/lib/literature/viz-style";
import { exportSvgElement } from "@/lib/literature/export-image";
import { NetGuide } from "@/components/literature/guide-box";
import DonutLoader from "@/components/literature/donut-loader";

const StyleCtx = createContext<VizStyle>(DEFAULT_STYLE);
import {
  NET_KINDS, analyzeGraph, layoutComponents,
  type Graph, type GraphMetrics, type NetEdge, type NetKind, type NetNode, type NodeKind, type Placed, type Summary,
} from "@/lib/literature/network-graph";
import {
  communityProfiles, shortestPath,
  type EmergingResult, type PaperLite, type Period,
} from "@/lib/literature/network-analysis-extra";

interface NetworkResponse {
  kind: NetKind; scope: number; matched: number | null; matchedIsLowerBound: boolean; sampleSize: number; ms: number;
  graph: Graph; summary: Summary; note?: string; error?: string;
  timeline: Period[]; emerging: EmergingResult; entityLabel: string; paperTable: PaperLite[]; nodePapers: Record<string, number[]>;
}

type SizeBy = "degree" | "strength" | "betweenness" | "closeness" | "pagerank" | "count" | "cited" | "effectiveSize" | "core";
type ColorBy = "community" | "kind" | "year" | "core" | "constraint";
type ViewTab = "network" | "community" | "gap" | "kcore" | "path" | "time" | "emerging" | "compare";

const SCOPES = [40, 100, 200, 500, 1000, 5000, 10000];
const W = 900, H = 580;
// 그림 스타일의 차분한 색(연두·자주·주황·청록 …)
const PALETTE = ["#b5c23c", "#8e5c70", "#e8782e", "#4fa89f", "#9dbb5a", "#7b93c9", "#d3a53f", "#a07eb5", "#d9706a", "#5aa0b8"];
const BG = "#263e49", PILL = "#1b2e36";
const KIND_COLOR: Record<NodeKind, string> = {
  author: "#b5c23c", keyword: "#4fa89f", journal: "#e8782e", institution: "#8e5c70", country: "#9dbb5a", funder: "#d3a53f", mesh: "#7b93c9", concept: "#a07eb5", paper: "#d9706a",
};
const KIND_LABEL: Record<NodeKind, string> = { author: "저자", keyword: "키워드", journal: "저널", institution: "기관", country: "국가", funder: "후원기관", mesh: "MeSH", concept: "개념", paper: "논문" };
const SIZE_OPTIONS: { id: SizeBy; label: string }[] = [
  { id: "degree", label: "연결 수" }, { id: "strength", label: "가중 연결" }, { id: "betweenness", label: "매개 중심성" }, { id: "closeness", label: "근접 중심성" },
  { id: "pagerank", label: "PageRank" }, { id: "effectiveSize", label: "유효 크기(구조 공백)" }, { id: "core", label: "k-core" }, { id: "count", label: "논문 수" }, { id: "cited", label: "인용 합" },
];
const TABS: { id: ViewTab; label: string }[] = [
  { id: "network", label: "네트워크" }, { id: "community", label: "군집 요약" }, { id: "gap", label: "구조 공백·브로커" }, { id: "kcore", label: "k-core" },
  { id: "path", label: "최단 경로" }, { id: "time", label: "시간 흐름" }, { id: "emerging", label: "신흥 주제" }, { id: "compare", label: "네트워크 비교" },
];
const nf = new Intl.NumberFormat("ko-KR");

/** 모양별 SVG 경로(r 은 외접 반지름). 기본은 원 */
function shapePath(kind: NodeKind, x: number, y: number, r: number, mode: "circle" | "kind"): string {
  const circle = `M${x - r} ${y}A${r} ${r} 0 1 0 ${x + r} ${y}A${r} ${r} 0 1 0 ${x - r} ${y}Z`;
  if (mode === "circle") return circle;
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
    default: return circle;
  }
}

const lerp = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
const yearColor = (y: number, lo: number, hi: number) => (!y ? "#8a98a0" : lerp([79, 168, 159], [232, 120, 46], hi > lo ? Math.min(1, Math.max(0, (y - lo) / (hi - lo))) : 0.5));   // 청록(오래됨) → 주황(최근)

interface Prepared { nodes: NetNode[]; edges: NetEdge[]; metrics: GraphMetrics; pos: Map<string, Placed>; yLo: number; yHi: number; val: (n: NetNode, by: SizeBy) => number; directed: boolean }

function prepare(graph: Graph, minEdge: number, sizeBy: SizeBy, w = W, h = H): Prepared {
  const edges = graph.edges.filter((e) => e.weight >= minEdge);
  const used = new Set<string>(); edges.forEach((e) => { used.add(e.source); used.add(e.target); });
  const nodes = graph.nodes.filter((n) => used.has(n.id));
  const metrics = analyzeGraph(nodes, edges);
  const val = (n: NetNode, by: SizeBy) => {
    const pm = metrics.perNode.get(n.id)!;
    return by === "count" ? n.count : by === "cited" ? n.cited : (pm as any)[by] as number;
  };
  const vmax = Math.max(1e-9, ...nodes.map((n) => val(n, sizeBy)));
  const scale = nodes.length > 80 ? 11 : 15;
  const placed = layoutComponents(nodes.map((n) => ({ id: n.id, r: 6 + Math.sqrt(Math.max(0, val(n, sizeBy)) / vmax) * scale, community: metrics.perNode.get(n.id)!.community })), edges, w, h);
  const years = nodes.map((n) => n.yearMean).filter((y) => y > 0);
  return { nodes, edges, metrics, pos: new Map(placed.map((p) => [p.id, p])), yLo: years.length ? Math.min(...years) : 0, yHi: years.length ? Math.max(...years) : 0, val, directed: !!graph.directed };
}

function labelOf(n: { label: string; kind: NodeKind }, rn: Intl.DisplayNames | null): string {
  if (n.kind === "country" && rn && /^[A-Z]{2}$/.test(n.label)) { try { return rn.of(n.label) ?? n.label; } catch { return n.label; } }
  return n.label;
}

/** 그래프 그리기: 청록 바탕·단색 노드·흰 직선 엣지. 확대/이동·호버/선택 강조·경로 강조를 지원한다. */
function GraphCanvas({
  prep, colorOf, shapeMode, labelN, focus, selected, onHover, onSelect, path, edgeColor = "#ffffff", w = W, h = H, svgRef, regionNames, maxHeight = 640,
}: {
  prep: Prepared; colorOf: (n: NetNode) => string; shapeMode: "circle" | "kind"; labelN: number; focus: string | null; selected: string | null;
  onHover: (id: string | null) => void; onSelect: (id: string | null) => void; path?: string[] | null; edgeColor?: string; w?: number; h?: number;
  svgRef?: React.RefObject<SVGSVGElement | null>; regionNames: Intl.DisplayNames | null; maxHeight?: number;
}) {
  const vs = useContext(StyleCtx), B = bgOf(vs.bg), BG = B.bg, PILL = B.pill;
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  useEffect(() => { setView({ k: 1, x: 0, y: 0 }); }, [prep]);
  const nb = useMemo(() => {
    const m = new Map<string, Set<string>>();
    prep.edges.forEach((e) => { (m.get(e.source) ?? m.set(e.source, new Set()).get(e.source)!).add(e.target); (m.get(e.target) ?? m.set(e.target, new Set()).get(e.target)!).add(e.source); });
    return m;
  }, [prep]);
  const pathNodes = useMemo(() => new Set(path ?? []), [path]);
  const pathEdges = useMemo(() => { const s = new Set<string>(); (path ?? []).forEach((id, i) => { if (i > 0) { const a = path![i - 1]; s.add(a < id ? `${a}\u0000${id}` : `${id}\u0000${a}`); } }); return s; }, [path]);
  const labelSet = useMemo(() => {
    const boxes: { x0: number; y0: number; x1: number; y1: number }[] = []; const out = new Set<string>();
    for (const n of [...prep.nodes].sort((a, b) => prep.val(b, "strength") - prep.val(a, "strength"))) {
      if (out.size >= labelN) break;
      const p = prep.pos.get(n.id)!, t = labelOf(n, regionNames), wd = Math.min(22, t.length) * 6.6 + 8;
      const box = { x0: p.x - wd / 2, y0: p.y + p.r + 3, x1: p.x + wd / 2, y1: p.y + p.r + 18 };
      if (boxes.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) continue;
      boxes.push(box); out.add(n.id);
    }
    return out;
  }, [prep, labelN, regionNames]);
  const vbW = w / view.k, vbH = h / view.k;
  const vb = `${(w - vbW) / 2 - view.x} ${(h - vbH) / 2 - view.y} ${vbW} ${vbH}`;
  if (prep.nodes.length === 0) return <div className="h-[260px] flex items-center justify-center text-white/40 text-[15px] rounded-2xl" style={{ background: BG }}>연결 관계가 충분하지 않습니다. 범위를 넓히거나 최소 연결을 낮춰 보세요.</div>;
  return (
    <svg ref={svgRef as React.RefObject<SVGSVGElement>} viewBox={vb} data-base-viewbox={`0 0 ${w} ${h}`} className="w-full h-auto select-none rounded-2xl" style={{ maxHeight, cursor: "grab", background: BG }}
      onWheel={(e) => { const k = Math.min(6, Math.max(0.5, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); setView((v) => ({ ...v, k })); }}
      onMouseDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; }}
      onMouseMove={(e) => {
        const d = drag.current; if (!d) return;
        // 값은 지금 계산해 둔다: setView 의 갱신 함수는 나중에 실행되는데 그때 drag.current 는 이미 null(마우스를 뗌)일 수 있다
        const sc = (w / view.k) / (e.currentTarget.getBoundingClientRect().width || w);
        const nx = d.vx + (e.clientX - d.x) * sc, ny = d.vy + (e.clientY - d.y) * sc;
        setView((v) => ({ ...v, x: nx, y: ny }));
      }}
      onMouseUp={() => { drag.current = null; }} onMouseLeave={() => { drag.current = null; onHover(null); }}
      onClick={(e) => { if (e.target === e.currentTarget || (e.target as Element).tagName === "rect") onSelect(null); }}>
      <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffffff" fillOpacity="0.9" /></marker></defs>
      <rect x={-2500} y={-2500} width={6000} height={6000} fill={BG} />
      {prep.edges.map((e, i) => {
        const a = prep.pos.get(e.source), b = prep.pos.get(e.target); if (!a || !b) return null;
        const key = e.source < e.target ? `${e.source}\u0000${e.target}` : `${e.target}\u0000${e.source}`;
        const onPath = pathEdges.has(key), hot = !!focus && (focus === e.source || focus === e.target);
        const dim = (!!focus && !hot) || (pathNodes.size > 0 && !onPath);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={onPath ? "#ffd24a" : vs.edgeColor === "theme" ? B.edge : vs.edgeColor === "gold" ? "#e8b84b" : vs.edgeColor === "gray" ? "#8b95a3" : colorOf(prep.nodes.find((n) => n.id === e.source)!)} strokeLinecap="round"
          strokeOpacity={dim ? 0.1 : onPath || hot ? 1 : Math.min(0.95, (0.55 + e.weight * 0.08) * vs.edgeOpacity)} strokeWidth={(onPath ? 3.6 : hot ? 2.4 : Math.min(2.8, 1.1 + Math.log2(1 + e.weight) * 0.45)) * vs.edgeWidth}
          markerEnd={prep.directed ? "url(#arrowhead)" : undefined} />;
      })}
      {[...prep.nodes].sort((a, b) => prep.val(a, "strength") - prep.val(b, "strength")).map((n) => {
        const p = prep.pos.get(n.id)!, c = colorOf(n);
        const isF = focus === n.id || selected === n.id, isNb = !!focus && (nb.get(focus)?.has(n.id) ?? false), inPath = pathNodes.has(n.id);
        const dim = (!!focus && !isF && !isNb) || (pathNodes.size > 0 && !inPath);
        const label = labelOf(n, regionNames), txt = label.length > 22 ? label.slice(0, 21) + "…" : label;
        const show = labelSet.has(n.id) || isF || inPath || (isNb && focus === selected);
        return (
          <g key={n.id} opacity={dim ? 0.2 : 1} style={{ cursor: "pointer" }} onMouseEnter={() => onHover(n.id)} onMouseLeave={() => onHover(null)} onClick={(e) => { e.stopPropagation(); onSelect(selected === n.id ? null : n.id); }}>
            <path d={shapePath(n.kind, p.x, p.y, p.r * vs.nodeScale, shapeMode)} fill={c} stroke={isF || inPath ? "#ffffff" : "none"} strokeWidth={isF || inPath ? 2.5 : 0} />
            {show && (
              <g pointerEvents="none">
                <rect x={p.x - (txt.length * 6.6 * vs.labelSize / 10.5 + 8) / 2} y={p.y + p.r * vs.nodeScale + 3} width={txt.length * 6.6 * vs.labelSize / 10.5 + 8} height={vs.labelSize + 5} rx={(vs.labelSize + 5) / 2} fill={PILL} fillOpacity={0.9} />
                <text x={p.x} y={p.y + p.r * vs.nodeScale + 3 + vs.labelSize + 0.5} textAnchor="middle" fontSize={vs.labelSize} fill={B.text}>{txt}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Spark({ series, color = "#e8782e" }: { series: { year: number; n: number }[]; color?: string }) {
  if (series.length < 2) return <span className="text-white/20 text-[11px]">-</span>;
  const mx = Math.max(1, ...series.map((s) => s.n)), y0 = series[0].year, y1 = series[series.length - 1].year;
  const pts = series.map((s) => `${((s.year - y0) / Math.max(1, y1 - y0)) * 80},${22 - (s.n / mx) * 20}`).join(" ");
  return <svg width="84" height="24" viewBox="-2 -1 86 26"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></svg>;
}

function narrative(res: NetworkResponse, m: GraphMetrics, top: { label: string }[]): string {
  const meta = NET_KINDS.find((k) => k.id === res.kind)!;
  const pct = res.matched && res.matched > 0 ? ((res.sampleSize / res.matched) * 100).toFixed(1) : null;
  const lines = [
    `【범위】검색 결과 ${res.matched != null ? nf.format(res.matched) + (res.matchedIsLowerBound ? "편 이상" : "편") : "(건수 미확인)"} 중 순위 상위 ${nf.format(res.sampleSize)}편을 분석했습니다${pct ? ` (전체의 ${pct}%)` : ""}. 상위 100편은 표본 인용의 ${(res.summary.citedShareTop100 * 100).toFixed(0)}%를 차지합니다.`,
    `【구조】이 ${meta.label} 그래프는 노드 ${m.nodeCount}개·엣지 ${m.edgeCount}개, 연결 요소 ${m.components}개이며 가장 큰 덩어리가 전체 노드의 ${(m.giantShare * 100).toFixed(0)}%입니다. 밀도 ${(m.density * 100).toFixed(1)}%, 평균 연결 ${m.avgDegree.toFixed(1)}, 평균 군집계수 ${m.avgClustering.toFixed(2)}${m.avgPath ? `, 평균 경로 ${m.avgPath.toFixed(2)}·지름 ${m.diameter}` : ""}입니다.`,
    `【군집】Louvain 군집 ${m.communities}개, 모듈성 Q=${m.modularity.toFixed(2)} — ` + (m.modularity > 0.5 ? "군집이 뚜렷하게 분리된 구조입니다." : m.modularity > 0.3 ? "군집이 어느 정도 구분되며 군집 사이를 잇는 다리 노드가 있습니다." : "군집 경계가 약하고 한 덩어리에 가깝습니다."),
    `【핵심 집단】k-core 최대 ${m.maxCore}: 서로 ${m.maxCore}개 이상과 연결된 촘촘한 중심부(노드 ${m.coreShells.find((s) => s.k === m.maxCore)?.size ?? 0}개)입니다.`,
  ];
  if (top.length) lines.push(`【핵심 노드】${top.slice(0, 5).map((t) => t.label).join(", ")} — 선택한 지표 기준 상위입니다.`);
  const hint: Partial<Record<NetKind, string>> = {
    coauthor: "공동저자 허브와 다리 저자를 따라가면 후속 연구팀·인용 후보를 찾을 수 있습니다.", coword: "촘촘히 묶인 키워드는 하위 주제군이고, 군집 사이의 약한 연결이 연구 공백(gap) 후보입니다.",
    authorkw: "누가 어떤 주제를 선도하는지, 여러 저자가 공유하는 공통 어휘가 무엇인지 드러납니다.", journal: "저널 군집은 같은 독자층·주제를 공유하는 출판 지형입니다. 투고 후보를 고를 때 참고하세요.",
    institution: "기관 협력 허브는 연구 인프라의 중심이며, 군집 간 다리 기관은 학제·국제 협력의 통로입니다.", country: "국제 공동연구의 중심 국가와 협력이 적은 지역을 보여 줍니다.",
    funder: "어떤 기관이 같은 연구를 함께 지원하는지(공동 재원)를 보여 줍니다.", mesh: "의학·생명과학 주제의 표준 어휘 구조입니다(Humans 같은 일반 표지어는 제외).",
    concept: "연구가 걸쳐 있는 학문 영역의 지도를 줍니다.", citation: "표본 안에서의 인용 관계입니다. 최신 논문 위주의 표본에서는 서로 인용하는 쌍이 적으니 순위 기준을 ‘인용순’으로 바꿔 보세요.",
    coupling: "참고문헌을 2건 이상 공유하는 논문끼리 연결합니다. 같은 지식 기반을 쓰는 연구 흐름을 찾는 데 적합합니다.",
    cocitation: "표본 논문들이 함께 인용한 참고문헌의 지도입니다. 큰 노드는 분야의 고전·기반 문헌이고, 군집은 서로 다른 지적 전통입니다.",
  };
  if (hint[res.kind]) lines.push(`【활용】${hint[res.kind]}`);
  if (res.graph.truncated.nodes > 0 || res.graph.truncated.edges > 0) lines.push(`【표시 제한】가독성을 위해 연결 강도 상위 노드만 그렸습니다(생략: 노드 ${nf.format(res.graph.truncated.nodes)}개, 엣지 ${nf.format(res.graph.truncated.edges)}개).`);
  if (res.note) lines.push(`【참고】${res.note}`);
  return lines.join("\n\n");
}

export default function NetworkExplorer(props: { initialQuery?: string; endpoint?: string; extraParams?: string }) {
  const [style, setStyle] = useState<VizStyle>(DEFAULT_STYLE);
  return <StyleCtx.Provider value={style}><NetworkExplorerInner {...props} style={style} setStyle={setStyle} /></StyleCtx.Provider>;
}

function NetworkExplorerInner({ initialQuery = "artificial intelligence", endpoint = "/api/scholar/network", extraParams = "", style, setStyle }: { initialQuery?: string; endpoint?: string; extraParams?: string; style: VizStyle; setStyle: (s: VizStyle) => void }) {
  const [q, setQ] = useState(initialQuery);
  const [committed, setCommitted] = useState<string | null>(null);
  const [scope, setScope] = useState(100);
  const [kind, setKind] = useState<NetKind>("coauthor");
  const [sort, setSort] = useState<"relevance" | "cited" | "year" | "fwci">("relevance");
  const [maxNodes, setMaxNodes] = useState(120);
  const [minEdge, setMinEdge] = useState(1);
  const [sizeBy, setSizeBy] = useState<SizeBy>("strength");
  const [colorBy, setColorBy] = useState<ColorBy>("community");
  const [shapeMode, setShapeMode] = useState<"circle" | "kind">("circle");
  const [tab, setTab] = useState<ViewTab>("network");
  const [rankBy, setRankBy] = useState<SizeBy>("betweenness");
  const [labelN, setLabelN] = useState(14);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [res, setRes] = useState<NetworkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [pathA, setPathA] = useState(""), [pathB, setPathB] = useState("");
  const [periodIdx, setPeriodIdx] = useState(0);
  const [q2, setQ2] = useState(""), [res2, setRes2] = useState<NetworkResponse | null>(null), [loading2, setLoading2] = useState(false), [err2, setErr2] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cache = useRef(new Map<string, NetworkResponse>());
  const regionNames = useMemo(() => { try { return new Intl.DisplayNames(["ko"], { type: "region" }); } catch { return null; } }, []);

  const fetchNet = useCallback(async (query: string, sc: number, kd: NetKind, mn: number, so: string): Promise<NetworkResponse> => {
    const key = [query, sc, kd, mn, so, extraParams].join("|");
    const hit = cache.current.get(key); if (hit) return hit;
    const r = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&kind=${kd}&scope=${sc}&maxNodes=${mn}&sort=${so}${extraParams}`);
    const data = (await r.json()) as NetworkResponse;
    if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
    cache.current.set(key, data);
    if (cache.current.size > 40) cache.current.delete([...cache.current.keys()][0]);
    return data;
  }, [endpoint, extraParams]);

  useEffect(() => {
    if (!committed) return;
    let alive = true;
    setLoading(true); setErr("");
    fetchNet(committed, scope, kind, maxNodes, sort).then((d) => { if (alive) setRes(d); }).catch((e) => { if (alive) setErr(String(e?.message ?? e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [committed, scope, kind, maxNodes, sort, fetchNet]);
  useEffect(() => { setSelected(null); setPeriodIdx(0); setPathA(""); setPathB(""); }, [res]);
  // 보기에 맞게 크기·색 기본값을 맞춘다
  useEffect(() => {
    if (tab === "gap") { setSizeBy("effectiveSize"); setColorBy("constraint"); }
    else if (tab === "kcore") { setSizeBy("degree"); setColorBy("core"); }
    else if (tab === "network" || tab === "community") { setColorBy("community"); }
  }, [tab]);

  const prep = useMemo(() => (res ? prepare(res.graph, minEdge, sizeBy) : null), [res, minEdge, sizeBy]);
  const period = res && res.timeline.length ? res.timeline[Math.min(periodIdx, res.timeline.length - 1)] : null;
  const prepPeriod = useMemo(() => (period ? prepare(period.graph, 1, "strength") : null), [period]);
  const prep2 = useMemo(() => (res2 ? prepare(res2.graph, minEdge, sizeBy, 520, 400) : null), [res2, minEdge, sizeBy]);
  const prepCmp1 = useMemo(() => (res ? prepare(res.graph, minEdge, sizeBy, 520, 400) : null), [res, minEdge, sizeBy]);

  const maxCore = prep?.metrics.maxCore ?? 0;
  const PAL = paletteColors(style.palette), KINDS = Object.keys(KIND_COLOR) as NodeKind[];
  const kindCol = useCallback((k: NodeKind) => (style.palette === "pastel" ? KIND_COLOR[k] : PAL[KINDS.indexOf(k) % PAL.length]), [style.palette]);   // eslint-disable-line react-hooks/exhaustive-deps
  const colorFor = useCallback((p: Prepared) => (n: NetNode): string => {
    if (colorBy === "kind") return kindCol(n.kind);
    if (colorBy === "year") return yearColor(n.yearMean, p.yLo, p.yHi);
    const pm = p.metrics.perNode.get(n.id)!;
    if (colorBy === "core") return lerp([79, 168, 159], [232, 120, 46], p.metrics.maxCore > 0 ? pm.core / p.metrics.maxCore : 0);
    if (colorBy === "constraint") return lerp([232, 120, 46], [90, 160, 184], Math.min(1, pm.constraint));   // 제약이 낮을수록(구조 공백을 잇는 중개자) 주황
    return PAL[pm.community % PAL.length];
  }, [colorBy, style.palette, kindCol]);   // eslint-disable-line react-hooks/exhaustive-deps

  const topBy = useMemo(() => {
    if (!prep) return [] as { label: string; v: number; id: string }[];
    return [...prep.nodes].map((n) => ({ id: n.id, label: labelOf(n, regionNames), v: prep.val(n, rankBy) })).sort((a, b) => b.v - a.v).slice(0, 10);
  }, [prep, rankBy, regionNames]);
  const brokers = useMemo(() => {
    if (!prep) return [];
    return [...prep.nodes].filter((n) => prep.metrics.perNode.get(n.id)!.degree >= 2).map((n) => { const m = prep.metrics.perNode.get(n.id)!; return { id: n.id, label: labelOf(n, regionNames), constraint: m.constraint, eff: m.effectiveSize, bet: m.betweenness, deg: m.degree, comm: m.community }; })
      .sort((a, b) => a.constraint - b.constraint || b.bet - a.bet).slice(0, 12);
  }, [prep, regionNames]);
  const profiles = useMemo(() => (prep && res ? communityProfiles(prep.nodes, prep.metrics, res.paperTable, res.nodePapers) : []), [prep, res]);
  const nodeOptions = useMemo(() => (prep ? [...prep.nodes].sort((a, b) => prep.val(b, "strength") - prep.val(a, "strength")).map((n) => ({ id: n.id, label: labelOf(n, regionNames) })) : []), [prep, regionNames]);
  const path = useMemo(() => (prep && pathA && pathB ? shortestPath(prep.nodes, prep.edges, pathA, pathB) : null), [prep, pathA, pathB]);
  const overlap = useMemo(() => {
    if (!res || !res2) return null;
    const a = new Map(res.graph.nodes.map((n) => [n.label, n])), b = new Map(res2.graph.nodes.map((n) => [n.label, n]));
    const both = [...a.keys()].filter((k) => b.has(k));
    return { both: both.sort((x, y) => (b.get(y)!.count + a.get(y)!.count) - (b.get(x)!.count + a.get(x)!.count)), onlyA: [...a.keys()].filter((k) => !b.has(k)), onlyB: [...b.keys()].filter((k) => !a.has(k)), jaccard: both.length / Math.max(1, new Set([...a.keys(), ...b.keys()]).size) };
  }, [res, res2]);

  const shownKind = res?.kind ?? kind;
  const meta = NET_KINDS.find((k) => k.id === shownKind)!;
  const sel = selected && prep ? prep.nodes.find((n) => n.id === selected) : null;
  const text = useMemo(() => (res && prep ? narrative(res, prep.metrics, topBy) : ""), [res, prep, topBy]);
  const focus = hover ?? selected;
  const entityName = res?.entityLabel ?? "키워드";

  const runCompare = async () => {
    if (!q2.trim()) return;
    setLoading2(true); setErr2("");
    try { setRes2(await fetchNet(q2.trim(), scope, kind, maxNodes, sort)); } catch (e: any) { setErr2(String(e?.message ?? e)); } finally { setLoading2(false); }
  };
  const box = "p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]";
  const selCls = "bg-[#0d0f14] border border-white/[0.08] rounded px-1.5 py-0.5 text-white/80";

  return (
    <div className="max-w-6xl space-y-4">
      {/* 검색 + 범위 */}
      <div className={`${box} space-y-3`}>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) setCommitted(q.trim()); }}
            placeholder={'검색어 (예: machine learning cancer, "deep learning", 우울 청소년)'} className="flex-1 px-3 py-2 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-white text-[14px]" />
          <button type="button" onClick={() => q.trim() && setCommitted(q.trim())} className="px-4 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] border border-[#e8b84b]/30 text-[14px]">{loading ? "분석 중…" : "분석 실행"}</button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] text-white/40 mr-1">분석 범위(상위 편수)</span>
          {SCOPES.map((s) => (
            <button key={s} type="button" onClick={() => setScope(s)} className={`px-2.5 py-1 rounded-lg text-[13px] border ${scope === s ? "border-[#e8b84b]/60 bg-[#e8b84b]/15 text-[#e8b84b] font-medium" : "border-white/[0.06] text-white/45 hover:text-white/75"}`}>{s >= 1000 ? nf.format(s) : s}편</button>
          ))}
          <label className="flex items-center gap-1.5 ml-3 text-[13px] text-white/40">순위 기준
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={selCls}><option value="relevance">관련도</option><option value="cited">인용순</option><option value="fwci">FWCI순</option><option value="year">최신순</option></select>
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
      {loading && !res && <DonutLoader title="네트워크 분석 중" expectedSec={scope >= 1000 ? 60 : 20} hint="범위가 크면 1분 안팎 걸립니다(최대 10,000편)." steps={[{ label: `상위 ${nf.format(scope)}편 선정`, state: "done" }, { label: "저자·키워드·참고문헌 조회", state: "active" }, { label: "네트워크 구축·군집·중심성 계산", state: "pending" }]} />}

      {res && prep && (
        <>
          {/* 편수 측정 */}
          <div className={box}>
            <p className="text-[15px] font-semibold mb-3">논문 편수 측정 — 표본 전체 vs 상위 100편</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-white/35 text-left"><th className="py-1 pr-3 font-normal">구분</th><th className="font-normal text-right">논문</th><th className="font-normal text-right">저자</th><th className="font-normal text-right">키워드</th><th className="font-normal text-right">저널</th><th className="font-normal text-right">기관</th><th className="font-normal text-right">국가</th><th className="font-normal text-right">인용 합</th><th className="font-normal text-right">평균 인용</th><th className="font-normal text-right">연도(중앙)</th></tr></thead>
                <tbody>
                  {([["분석 표본", res.summary.all], ["상위 100편", res.summary.top100]] as const).map(([name, s]) => (
                    <tr key={name} className="border-t border-white/[0.04] text-white/70 tabular-nums">
                      <td className="py-1.5 pr-3 text-white/85">{name}</td><td className="text-right">{nf.format(s.papers)}</td><td className="text-right">{nf.format(s.authors)}</td><td className="text-right">{nf.format(s.keywords)}</td><td className="text-right">{nf.format(s.journals)}</td><td className="text-right">{nf.format(s.institutions)}</td><td className="text-right">{nf.format(s.countries)}</td>
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
                    <div className="space-y-1">{rows.slice(0, 7).map((r) => (
                      <div key={r.name} className="relative h-[20px] rounded bg-white/[0.03] overflow-hidden" title={`${r.name}: ${r.n}편`}>
                        <div className="absolute inset-y-0 left-0" style={{ width: `${(r.n / mx) * 100}%`, background: "#4fa89f55" }} />
                        <span className="relative px-1.5 text-[12px] leading-[20px] text-white/70 flex justify-between gap-1"><span className="truncate">{r.name}</span><span className="tabular-nums text-white/45">{r.n}</span></span>
                      </div>
                    ))}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 네트워크 종류 + 보기 */}
          <div className={`${box} space-y-3`}>
            <div className="flex flex-wrap gap-1.5">
              {NET_KINDS.map((k) => (
                <button key={k.id} type="button" onClick={() => setKind(k.id)} style={kind === k.id ? { backgroundColor: `${k.color}26`, color: k.color, borderColor: `${k.color}66` } : {}}
                  className={`px-3 py-1.5 rounded-lg text-[14px] border transition-all ${kind === k.id ? "font-medium" : "border-white/[0.06] text-white/40 hover:text-white/70"}`}>{k.label}</button>
              ))}
            </div>
            <p className="text-[13px] text-white/30">{meta.desc}</p>
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.05]">
              {TABS.map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-[14px] border ${tab === t.id ? "border-[#4fa89f]/60 bg-[#4fa89f]/15 text-[#7fd0c6] font-medium" : "border-white/[0.06] text-white/45 hover:text-white/75"}`}>{t.label}</button>
              ))}
            </div>
            <NetGuide tab={tab} />
            {(tab === "network" || tab === "community" || tab === "gap" || tab === "kcore" || tab === "path" || tab === "compare") && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/45">
                <label className="flex items-center gap-1.5">크기 <select value={sizeBy} onChange={(e) => setSizeBy(e.target.value as SizeBy)} className={selCls}>{SIZE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
                <label className="flex items-center gap-1.5">색 <select value={colorBy} onChange={(e) => setColorBy(e.target.value as ColorBy)} className={selCls}><option value="community">군집</option><option value="kind">종류</option><option value="year">평균 연도</option><option value="core">k-core</option><option value="constraint">구조 공백(제약)</option></select></label>
                <label className="flex items-center gap-1.5">모양 <select value={shapeMode} onChange={(e) => setShapeMode(e.target.value as "circle" | "kind")} className={selCls}><option value="circle">원(그림 스타일)</option><option value="kind">종류별 모양</option></select></label>
                <label className="flex items-center gap-1.5">노드 상한 <select value={maxNodes} onChange={(e) => setMaxNodes(Number(e.target.value))} className={selCls}>{[60, 90, 120, 160, 200].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
                <label className="flex items-center gap-1.5">최소 연결 <input type="range" min={1} max={6} value={minEdge} onChange={(e) => setMinEdge(Number(e.target.value))} className="w-20 accent-[#4fa89f]" /><span className="w-3 tabular-nums text-white/70">{minEdge}</span></label>
                <label className="flex items-center gap-1.5">라벨 <input type="range" min={0} max={40} value={labelN} onChange={(e) => setLabelN(Number(e.target.value))} className="w-20 accent-[#4fa89f]" /><span className="w-5 tabular-nums text-white/70">{labelN}</span></label>
                <label className="flex items-center gap-1.5">색상 모드 <select value={style.palette} onChange={(e) => setStyle({ ...style, palette: e.target.value as VizStyle["palette"] })} className={selCls}>{PALETTES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select><span className="flex">{paletteColors(style.palette).slice(0, 6).map((c) => <i key={c} className="inline-block w-2.5 h-2.5" style={{ background: c }} />)}</span></label>
                <label className="flex items-center gap-1.5">배경 <select value={style.bg} onChange={(e) => setStyle({ ...style, bg: e.target.value as VizStyle["bg"] })} className={selCls}>{BGS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
                <label className="flex items-center gap-1.5">노드 크기 <input type="range" min={0.5} max={2.5} step={0.1} value={style.nodeScale} onChange={(e) => setStyle({ ...style, nodeScale: Number(e.target.value) })} className="w-20 accent-[#4fa89f]" /><span className="w-8 tabular-nums text-white/70">×{style.nodeScale.toFixed(1)}</span></label>
                <label className="flex items-center gap-1.5">선 굵기 <input type="range" min={0.3} max={4} step={0.1} value={style.edgeWidth} onChange={(e) => setStyle({ ...style, edgeWidth: Number(e.target.value) })} className="w-20 accent-[#4fa89f]" /><span className="w-8 tabular-nums text-white/70">×{style.edgeWidth.toFixed(1)}</span></label>
                <label className="flex items-center gap-1.5">선 투명도 <input type="range" min={0.2} max={1} step={0.05} value={style.edgeOpacity} onChange={(e) => setStyle({ ...style, edgeOpacity: Number(e.target.value) })} className="w-20 accent-[#4fa89f]" /></label>
                <label className="flex items-center gap-1.5">선 색 <select value={style.edgeColor} onChange={(e) => setStyle({ ...style, edgeColor: e.target.value as EdgeColorMode })} className={selCls}><option value="theme">배경에 맞춤</option><option value="source">연결된 노드 색</option><option value="gold">금색</option><option value="gray">회색</option></select></label>
                <label className="flex items-center gap-1.5">글자 <input type="range" min={8} max={18} step={0.5} value={style.labelSize} onChange={(e) => setStyle({ ...style, labelSize: Number(e.target.value) })} className="w-16 accent-[#4fa89f]" /></label>
                <button type="button" onClick={() => setStyle(DEFAULT_STYLE)} className="px-2 py-0.5 rounded-lg text-[12px] border border-white/[0.08] text-white/45 hover:text-white/80">스타일 초기화</button>
                <span className="ml-auto flex gap-1.5">
                  {(["png", "jpeg", "svg"] as const).map((f) => (<button key={f} type="button" onClick={() => svgRef.current && exportSvgElement(svgRef.current, f, `network-${shownKind}.${f === "jpeg" ? "jpg" : f}`, { bg: bgOf(style.bg).bg, fg: bgOf(style.bg).text })} className="px-2.5 py-0.5 rounded-lg text-[12px] border border-white/[0.08] text-white/50 hover:text-white/80">{f.toUpperCase()}</button>))}
                </span>
              </div>
            )}
          </div>

          {/* 보기별 본문 */}
          {(tab === "network" || tab === "community" || tab === "gap" || tab === "kcore" || tab === "path") && (
            <div className="grid lg:grid-cols-[1fr_290px] gap-4">
              <div>
                {tab === "path" && (
                  <div className={`${box} mb-3 space-y-2`}>
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/55">
                      <span>출발</span><select value={pathA} onChange={(e) => setPathA(e.target.value)} className={`${selCls} max-w-[210px]`}><option value="">노드 선택</option>{nodeOptions.map((o) => <option key={o.id} value={o.id}>{o.label.slice(0, 30)}</option>)}</select>
                      <span>도착</span><select value={pathB} onChange={(e) => setPathB(e.target.value)} className={`${selCls} max-w-[210px]`}><option value="">노드 선택</option>{nodeOptions.map((o) => <option key={o.id} value={o.id}>{o.label.slice(0, 30)}</option>)}</select>
                      <button type="button" onClick={() => { if (selected) { if (!pathA) setPathA(selected); else setPathB(selected); } }} className="px-2.5 py-0.5 rounded-lg text-[12px] border border-white/[0.08] text-white/60">선택한 노드를 채우기</button>
                    </div>
                    <p className="text-[13px] text-white/60">{!pathA || !pathB ? "두 노드를 고르거나, 그래프에서 노드를 눌러 ‘선택한 노드를 채우기’를 누르세요." : path ? <>최단 경로 <b className="text-[#ffd24a]">{path.length - 1}단계</b>: {path.map((id) => prep.nodes.find((n) => n.id === id)).filter(Boolean).map((n) => labelOf(n!, regionNames)).join(" → ")}</> : "두 노드는 서로 이어져 있지 않습니다(다른 연결 요소)."}</p>
                  </div>
                )}
                <div className="rounded-2xl overflow-hidden border border-white/[0.05] relative" style={{ background: BG }}>
                  {loading && <div className="absolute top-2 right-3 z-10"><DonutLoader compact size={44} title="다시 계산 중" steps={[{ label: "네트워크 갱신", state: "active" }]} /></div>}
                  <GraphCanvas prep={prep} colorOf={colorFor(prep)} shapeMode={shapeMode} labelN={labelN} focus={focus} selected={selected} onHover={setHover} onSelect={setSelected} path={tab === "path" ? path : null} svgRef={svgRef} regionNames={regionNames} />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-[12px] text-white/55" style={{ background: PILL }}>
                    {colorBy === "kind" && [...new Set(prep.nodes.map((n) => n.kind))].map((k) => (<span key={k} className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: kindCol(k) }} />{KIND_LABEL[k]}</span>))}
                    {colorBy === "community" && <span>색 = 군집(Louvain) · 크기 = {SIZE_OPTIONS.find((o) => o.id === sizeBy)?.label}</span>}
                    {colorBy === "year" && <span>색: 청록(오래됨) → 주황(최근) 평균 출판연도 {prep.yLo ? `${Math.round(prep.yLo)}~${Math.round(prep.yHi)}` : ""}</span>}
                    {colorBy === "core" && <span>색: 청록(바깥) → 주황(핵심부) · 최대 k-core = {maxCore}</span>}
                    {colorBy === "constraint" && <span>색: 주황 = 구조 공백을 잇는 중개자(제약 낮음) → 청색 = 촘촘한 집단 안 · 크기 = 유효 크기</span>}
                    <span className="ml-auto">휠: 확대/축소 · 드래그: 이동 · 노드 클릭: 이웃 강조</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05]">
                  {sel ? (() => {
                    const pm = prep.metrics.perNode.get(sel.id)!;
                    const nbs = prep.edges.filter((e) => e.source === sel.id || e.target === sel.id).map((e) => ({ n: prep.nodes.find((x) => x.id === (e.source === sel.id ? e.target : e.source))!, w: e.weight })).filter((x) => x.n).sort((a, b) => b.w - a.w).slice(0, 8);
                    return (
                      <div>
                        <p className="text-[12px] text-white/35 mb-0.5">{KIND_LABEL[sel.kind]} · 군집 {pm.community + 1} · k-core {pm.core}</p>
                        <p className="text-[15px] font-semibold text-white break-words mb-2">{labelOf(sel, regionNames)}</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px] text-white/55 tabular-nums">
                          <span>논문 {sel.count}편</span><span>인용 합 {nf.format(sel.cited)}</span><span>연결 {pm.degree}</span><span>가중 {pm.strength}</span>
                          <span>매개 {pm.betweenness.toFixed(3)}</span><span>근접 {pm.closeness.toFixed(2)}</span><span>PageRank {(pm.pagerank * 100).toFixed(1)}%</span><span>군집계수 {pm.clustering.toFixed(2)}</span>
                          <span>제약 {pm.constraint.toFixed(2)}</span><span>유효 크기 {pm.effectiveSize.toFixed(1)}</span>
                        </div>
                        <p className="text-[12px] text-white/35 mt-2 mb-1">연결된 노드 (연결 강도)</p>
                        <div className="space-y-0.5">{nbs.map((x) => <button key={x.n.id} type="button" onClick={() => setSelected(x.n.id)} className="flex w-full justify-between text-left text-[12.5px] text-white/65 hover:text-white"><span className="truncate">{labelOf(x.n, regionNames)}</span><span className="tabular-nums text-white/35">{x.w}</span></button>)}</div>
                      </div>
                    );
                  })() : <p className="text-[13px] text-white/30 leading-relaxed">노드를 클릭하면 중심성·구조 공백 지표와 연결된 노드를 보여 줍니다.</p>}
                </div>
                <div className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05]">
                  <p className="text-[13px] font-semibold mb-2">네트워크 지표</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([["노드", prep.metrics.nodeCount], ["엣지", prep.metrics.edgeCount], ["밀도", (prep.metrics.density * 100).toFixed(1) + "%"], ["평균 연결", prep.metrics.avgDegree.toFixed(1)],
                      ["연결 요소", prep.metrics.components], ["최대 덩어리", (prep.metrics.giantShare * 100).toFixed(0) + "%"], ["군집", prep.metrics.communities], ["모듈성 Q", prep.metrics.modularity.toFixed(2)],
                      ["평균 군집계수", prep.metrics.avgClustering.toFixed(2)], ["전이성", prep.metrics.transitivity.toFixed(2)], ["평균 경로", prep.metrics.avgPath ? prep.metrics.avgPath.toFixed(2) : "-"], ["최대 k-core", prep.metrics.maxCore]] as [string, string | number][]).map(([k, v]) => (
                      <div key={k} className="px-2 py-1.5 rounded-lg bg-[#0d0f14] border border-white/[0.03]"><p className="text-[11px] text-white/35">{k}</p><p className="text-[16px] font-semibold tabular-nums" style={{ color: "#7fd0c6" }}>{v}</p></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "network" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className={box}>
                <div className="flex flex-wrap gap-1 mb-3">{SIZE_OPTIONS.map((o) => (<button key={o.id} type="button" onClick={() => setRankBy(o.id)} className={`px-2 py-0.5 rounded text-[12px] border ${rankBy === o.id ? "border-[#4fa89f]/50 bg-[#4fa89f]/10 text-[#7fd0c6]" : "border-white/[0.06] text-white/40"}`}>{o.label}</button>))}</div>
                <div className="space-y-1">{(() => { const mx = Math.max(1e-9, ...topBy.map((t) => t.v)); return topBy.map((t, i) => (
                  <button key={t.id} type="button" onClick={() => setSelected(t.id)} className="relative block w-full h-[24px] rounded bg-white/[0.03] overflow-hidden text-left">
                    <span className="absolute inset-y-0 left-0" style={{ width: `${(t.v / mx) * 100}%`, background: "#4fa89f44" }} />
                    <span className="relative px-2 text-[13px] leading-[24px] text-white/75 flex justify-between gap-2"><span className="truncate"><span className="text-white/30 mr-1.5">{i + 1}</span>{t.label}</span><span className="tabular-nums text-white/45">{rankBy === "pagerank" ? (t.v * 100).toFixed(1) + "%" : Number.isInteger(t.v) ? nf.format(t.v) : t.v.toFixed(3)}</span></span>
                  </button>)); })()}</div>
              </div>
              <div className={box}>
                <p className="text-[14px] font-semibold mb-2">군집 {prep.metrics.communities}개 <span className="text-white/30 font-normal text-[12px]">(크기순 · Louvain)</span></p>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">{prep.metrics.communityList.slice(0, 12).map((c) => (
                  <div key={c.id} className="flex gap-2 items-start text-[13px]"><span className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PAL[c.id % PAL.length] }} /><div className="min-w-0"><p className="text-white/75 truncate">{c.members.slice(0, 4).join(" · ")}</p><p className="text-[12px] text-white/30">{c.size}개 노드{c.yearMean ? ` · 평균 ${c.yearMean.toFixed(0)}년` : ""}</p></div></div>
                ))}</div>
              </div>
            </div>
          )}

          {tab === "community" && (
            <div className={box}>
              <p className="text-[15px] font-semibold mb-1">군집별 요약</p>
              <p className="text-[12px] text-white/30 mb-3">각 군집에 속한 노드를 가진 대표 논문(순위 상위 {Math.min(300, res.paperTable.length)}편 안)에서 키워드·저널·국가·연도·인용 상위 논문을 집계했습니다.</p>
              <div className="grid md:grid-cols-2 gap-3">
                {profiles.slice(0, 8).map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[#0d0f14] border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full" style={{ background: PAL[c.id % PAL.length] }} /><b className="text-[14px] text-white">군집 {c.id + 1}</b><span className="text-[12px] text-white/35">노드 {c.size}개 · 논문 {c.papers}편{c.yearMean ? ` · 평균 ${c.yearMean.toFixed(0)}년(${c.yearMin}–${c.yearMax})` : ""}</span></div>
                    <p className="text-[13px] text-white/75 mb-1.5">{c.members.join(" · ")}</p>
                    {c.keywords.length > 0 && <p className="text-[12px] text-white/50"><span className="text-white/30">대표 키워드 </span>{c.keywords.map((k) => `${k.name}(${k.n})`).join(", ")}</p>}
                    {c.journals.length > 0 && <p className="text-[12px] text-white/50"><span className="text-white/30">주요 저널 </span>{c.journals.map((k) => `${k.name}(${k.n})`).join(", ")}</p>}
                    {c.countries.length > 0 && <p className="text-[12px] text-white/50"><span className="text-white/30">국가 </span>{c.countries.map((k) => { let nm = k.name; try { nm = regionNames?.of(k.name) ?? k.name; } catch { /* 코드 그대로 */ } return `${nm}(${k.n})`; }).join(", ")}</p>}
                    {c.topPapers.length > 0 && <div className="mt-1.5 space-y-0.5">{c.topPapers.map((p, i) => <p key={i} className="text-[12px] text-white/60 truncate">▸ {p.title} <span className="text-white/30">({p.year}, 인용 {nf.format(p.cited)})</span></p>)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "gap" && (
            <div className={box}>
              <p className="text-[15px] font-semibold mb-1">구조 공백·브로커 (Burt)</p>
              <p className="text-[12px] text-white/30 mb-3">제약(constraint)이 낮고 유효 크기가 큰 노드일수록 서로 닿지 않는 집단을 잇는 중개자입니다. 그래프에서 주황색·큰 노드가 해당합니다.</p>
              <table className="w-full text-[13px]"><thead><tr className="text-white/35 text-left"><th className="py-1 font-normal">노드</th><th className="font-normal text-right">제약</th><th className="font-normal text-right">유효 크기</th><th className="font-normal text-right">매개 중심성</th><th className="font-normal text-right">연결</th><th className="font-normal text-right">군집</th></tr></thead>
                <tbody>{brokers.map((b) => (<tr key={b.id} onClick={() => setSelected(b.id)} className="border-t border-white/[0.04] text-white/70 tabular-nums cursor-pointer hover:bg-white/[0.03]"><td className="py-1.5 pr-2 truncate max-w-[300px]">{b.label}</td><td className="text-right">{b.constraint.toFixed(2)}</td><td className="text-right">{b.eff.toFixed(1)}</td><td className="text-right">{b.bet.toFixed(3)}</td><td className="text-right">{b.deg}</td><td className="text-right"><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: PALETTE[b.comm % PALETTE.length] }} />{b.comm + 1}</td></tr>))}</tbody></table>
            </div>
          )}

          {tab === "kcore" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className={box}>
                <p className="text-[15px] font-semibold mb-2">k-core 단계</p>
                <p className="text-[12px] text-white/30 mb-2">k-core = 안에서 서로 k개 이상과 연결된 노드만 남긴 핵심 집단. k가 클수록 중심부입니다.</p>
                <div className="space-y-1">{prep.metrics.coreShells.map((s) => (<div key={s.k} className="relative h-[22px] rounded bg-white/[0.03] overflow-hidden"><div className="absolute inset-y-0 left-0" style={{ width: `${(s.size / Math.max(1, prep.nodes.length)) * 100}%`, background: lerp([79, 168, 159], [232, 120, 46], prep.metrics.maxCore > 1 ? s.k / prep.metrics.maxCore : 1) + "88" }} /><span className="relative px-2 text-[12.5px] leading-[22px] text-white/75 flex justify-between"><span>{s.k}-core 이상</span><span className="tabular-nums text-white/50">{s.size}개</span></span></div>))}</div>
              </div>
              <div className={box}>
                <p className="text-[15px] font-semibold mb-2">최대 {maxCore}-core 구성원</p>
                <div className="flex flex-wrap gap-1.5">{prep.nodes.filter((n) => prep.metrics.perNode.get(n.id)!.core === maxCore).sort((a, b) => prep.val(b, "strength") - prep.val(a, "strength")).slice(0, 40).map((n) => (<button key={n.id} type="button" onClick={() => setSelected(n.id)} className="px-2 py-0.5 rounded-lg text-[12.5px] border border-white/[0.08] text-white/70 hover:text-white">{labelOf(n, regionNames)}</button>))}</div>
              </div>
            </div>
          )}

          {tab === "time" && (
            <div className={box}>
              <p className="text-[15px] font-semibold mb-1">시간 흐름 — 연도 구간별 네트워크</p>
              {!res.timeline.length ? <p className="text-[13px] text-white/35">이 네트워크 종류는 구간별로 나눌 수 없습니다(인용·서지결합·공인용) 또는 표본의 연도가 한 해뿐입니다.</p> : (
                <>
                  <p className="text-[12px] text-white/30 mb-3">표본을 편수가 비슷한 {res.timeline.length}개 구간으로 나눠 구간마다 따로 네트워크를 만들었습니다.</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">{res.timeline.map((p, i) => (<button key={p.label} type="button" onClick={() => setPeriodIdx(i)} className={`px-3 py-1 rounded-lg text-[13px] border ${periodIdx === i ? "border-[#e8782e]/60 bg-[#e8782e]/15 text-[#f0a070] font-medium" : "border-white/[0.06] text-white/45"}`}>{p.label} <span className="text-white/30">· {p.papers}편</span></button>))}</div>
                  <div className="grid lg:grid-cols-[1fr_300px] gap-4">
                    <div className="rounded-2xl overflow-hidden border border-white/[0.05]">{prepPeriod && <GraphCanvas prep={prepPeriod} colorOf={colorFor(prepPeriod)} shapeMode={shapeMode} labelN={labelN} focus={hover} selected={null} onHover={setHover} onSelect={() => undefined} regionNames={regionNames} />}</div>
                    <div>
                      <table className="w-full text-[12.5px]"><thead><tr className="text-white/35 text-left"><th className="py-1 font-normal">구간</th><th className="font-normal text-right">논문</th><th className="font-normal text-right">노드</th><th className="font-normal text-right">엣지</th><th className="font-normal text-right">밀도</th></tr></thead>
                        <tbody>{res.timeline.map((p, i) => { const nn = p.graph.nodes.length, ee = p.graph.edges.length, dens = nn > 1 ? ee / ((nn * (nn - 1)) / 2) : 0; return (<tr key={p.label} onClick={() => setPeriodIdx(i)} className={`border-t border-white/[0.04] tabular-nums cursor-pointer ${periodIdx === i ? "text-white" : "text-white/60"}`}><td className="py-1.5">{p.label}</td><td className="text-right">{p.papers}</td><td className="text-right">{nn}</td><td className="text-right">{ee}</td><td className="text-right">{(dens * 100).toFixed(1)}%</td></tr>); })}</tbody></table>
                      <p className="text-[12px] text-white/35 mt-3 mb-1">{period?.label} 상위 {entityName}</p>
                      <div className="space-y-0.5">{period?.topNodes.map((t) => <p key={t.label} className="text-[12.5px] text-white/65 flex justify-between gap-2"><span className="truncate">{t.label}</span><span className="tabular-nums text-white/35">{t.count}</span></p>)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "emerging" && (
            <div className={box}>
              <p className="text-[15px] font-semibold mb-1">신흥 주제 — 최근 급증한 {entityName}</p>
              {!res.emerging.rising.length && !res.emerging.falling.length ? <p className="text-[13px] text-white/35">표본이 작거나 연도 분포가 좁아 증감을 계산할 수 없습니다(최소 20편·최근 3년과 그 이전 각 8편 이상).</p> : (
                <>
                  <p className="text-[12px] text-white/30 mb-3">최근 3년({res.emerging.recentFrom}–{res.emerging.recentTo}, {nf.format(res.emerging.recentPapers)}편) 대 그 이전({nf.format(res.emerging.earlyPapers)}편)의 편수 점유율 비율입니다. 1보다 크면 늘고 작으면 줄었다는 뜻입니다.</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><p className="text-[13px] text-[#f0a070] mb-1.5">▲ 급증</p>
                      <table className="w-full text-[12.5px]"><tbody>{res.emerging.rising.map((x) => (<tr key={x.label} className="border-t border-white/[0.04] text-white/70 tabular-nums"><td className="py-1 pr-2 truncate max-w-[210px]">{x.label}</td><td className="text-right text-[#f0a070]">×{x.growth.toFixed(1)}</td><td className="text-right text-white/35">{x.early}→{x.recent}</td><td className="pl-2"><Spark series={x.series} /></td></tr>))}</tbody></table></div>
                    <div><p className="text-[13px] text-[#7fd0c6] mb-1.5">▼ 감소</p>
                      <table className="w-full text-[12.5px]"><tbody>{res.emerging.falling.map((x) => (<tr key={x.label} className="border-t border-white/[0.04] text-white/70 tabular-nums"><td className="py-1 pr-2 truncate max-w-[210px]">{x.label}</td><td className="text-right text-[#7fd0c6]">×{x.growth.toFixed(2)}</td><td className="text-right text-white/35">{x.early}→{x.recent}</td><td className="pl-2"><Spark series={x.series} color="#4fa89f" /></td></tr>))}</tbody></table></div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "compare" && (
            <div className={`${box} space-y-3`}>
              <p className="text-[15px] font-semibold">네트워크 비교 — 두 검색어(같은 범위·같은 종류)</p>
              <div className="flex gap-2"><input value={q2} onChange={(e) => setQ2(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void runCompare(); }} placeholder="비교할 검색어" className="flex-1 px-3 py-2 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-white text-[14px]" />
                <button type="button" onClick={() => void runCompare()} className="px-4 py-2 rounded-lg bg-[#4fa89f]/20 text-[#7fd0c6] border border-[#4fa89f]/30 text-[14px]">{loading2 ? "분석 중…" : "비교 실행"}</button></div>
                {loading2 && <DonutLoader compact title="비교 네트워크 분석 중" steps={[{ label: "두 번째 검색어 조회", state: "done" }, { label: "네트워크 구축·비교", state: "active" }]} />}
              {err2 && <p className="text-[13px] text-[#f87171]">오류: {err2}</p>}
              {res2 && prep2 && prepCmp1 && overlap && (
                <>
                  <div className="grid md:grid-cols-2 gap-3">
                    {([[committed, res, prepCmp1], [q2, res2, prep2]] as const).map(([name, r, p], i) => (
                      <div key={i}><p className="text-[13px] text-white/60 mb-1.5"><b className="text-white">{name}</b> · 일치 {r.matched != null ? nf.format(r.matched) : "?"}편 · 표본 {nf.format(r.sampleSize)}편 · 노드 {p.metrics.nodeCount} · 엣지 {p.metrics.edgeCount} · 밀도 {(p.metrics.density * 100).toFixed(1)}% · 모듈성 {p.metrics.modularity.toFixed(2)}</p>
                        <GraphCanvas prep={p} colorOf={colorFor(p)} shapeMode={shapeMode} labelN={Math.min(labelN, 8)} focus={null} selected={null} onHover={() => undefined} onSelect={() => undefined} w={520} h={400} regionNames={regionNames} maxHeight={400} /></div>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 text-[13px]">
                    <div className="p-3 rounded-xl bg-[#0d0f14] border border-white/[0.04]"><p className="text-white/40 text-[12px] mb-1">공통 노드 ({overlap.both.length}개 · 유사도 {(overlap.jaccard * 100).toFixed(0)}%)</p><p className="text-white/70 leading-relaxed">{overlap.both.slice(0, 18).join(", ") || "-"}</p></div>
                    <div className="p-3 rounded-xl bg-[#0d0f14] border border-white/[0.04]"><p className="text-white/40 text-[12px] mb-1">“{committed}” 에만 ({overlap.onlyA.length}개)</p><p className="text-white/70 leading-relaxed">{overlap.onlyA.slice(0, 18).join(", ") || "-"}</p></div>
                    <div className="p-3 rounded-xl bg-[#0d0f14] border border-white/[0.04]"><p className="text-white/40 text-[12px] mb-1">“{q2}” 에만 ({overlap.onlyB.length}개)</p><p className="text-white/70 leading-relaxed">{overlap.onlyB.slice(0, 18).join(", ") || "-"}</p></div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#13161e] border border-[#4fa89f]/25">
            <p className="text-[15px] font-semibold mb-2" style={{ color: "#7fd0c6" }}>{meta.label} · 상세 분석</p>
            <div className="text-[14px] text-white/65 leading-relaxed whitespace-pre-wrap">{text}</div>
          </div>
        </>
      )}
    </div>
  );
}
