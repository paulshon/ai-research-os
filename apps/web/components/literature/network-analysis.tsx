"use client";

/* ════════════════════════════════════════════════════════════
   v41: 논문 메타데이터 기반 네트워크 분석 (Metadata-Based Network Analysis)
   - 문헌연구 > 네트워크분석 탭
   - 노드(Node) ↔ 엣지(Edge) 계량서지학(bibliometric) 분석
     · 공동저자 네트워크 (Co-authorship)      : 저자 ↔ 저자 (같은 논문 공동집필)
     · 키워드 동시출현 네트워크 (Co-word)      : 키워드 ↔ 키워드 (같은 논문 동시등장)
     · 저자-키워드 네트워크 (Author–Keyword)   : 저자 ↔ 키워드
     · 저널 동시출현 (Source coupling)         : 저널 ↔ 저널 (보조)
   - 외부 라이브러리 없이 경량 force-directed 레이아웃을 자체 계산하여 SVG 렌더.
   - 검색 결과(선택분 우선, 없으면 전체)의 실제 메타데이터로 그래프를 생성한다.
═══════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";

export interface NetworkPaper {
  id: string;
  title: string;
  authors: string;        // "A, B, C"
  keywords: string[];
  journal: string;
  year: number;
}

type NetworkType = "coauthor" | "coword" | "authorkw" | "source";

interface GNode { id: string; label: string; group: number; weight: number; kind: "author" | "keyword" | "journal"; x: number; y: number; }
interface GEdge { source: string; target: string; weight: number; }

const NETWORK_TYPES: { id: NetworkType; label: string; desc: string; color: string }[] = [
  { id: "coauthor", label: "공동저자",     desc: "저자 ↔ 저자 · 같은 논문을 공동 집필", color: "#6c8cff" },
  { id: "coword",   label: "키워드 동시출현", desc: "키워드 ↔ 키워드 · 같은 논문에 함께 등장", color: "#3ecfb2" },
  { id: "authorkw", label: "저자-키워드",   desc: "저자 ↔ 키워드 · 연구주제 귀속", color: "#a78bfa" },
  { id: "source",   label: "저널 결합",     desc: "저널 ↔ 저널 · 동일 키워드 공유", color: "#e8b84b" },
];

function splitAuthors(s: string): string[] {
  return (s || "")
    .split(/[,;]|\band\b|·|&/)
    .map((x) => x.trim())
    .filter((x) => x.length > 1 && !/^(unknown|n\/a|et al\.?)$/i.test(x))
    .slice(0, 8);
}

/** 무방향 엣지 키 */
const ek = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/** 연결요소(군집) 라벨링 */
function components(nodes: GNode[], edges: GEdge[]): Map<string, number> {
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });
  const group = new Map<string, number>();
  let g = 0;
  for (const n of nodes) {
    if (group.has(n.id)) continue;
    const stack = [n.id];
    group.set(n.id, g);
    while (stack.length) {
      const cur = stack.pop()!;
      for (const nb of adj.get(cur) ?? []) {
        if (!group.has(nb)) { group.set(nb, g); stack.push(nb); }
      }
    }
    g++;
  }
  return group;
}

/** 경량 force-directed 레이아웃 (결정적 시드 + 반복 완화) */
function layout(nodes: GNode[], edges: GEdge[], W: number, H: number) {
  const N = nodes.length;
  if (N === 0) return;
  // 원형 시드 배치
  nodes.forEach((n, i) => {
    const a = (i / N) * Math.PI * 2;
    n.x = W / 2 + Math.cos(a) * (Math.min(W, H) * 0.34);
    n.y = H / 2 + Math.sin(a) * (Math.min(W, H) * 0.34);
  });
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const iters = N > 60 ? 120 : 200;
  const k = Math.sqrt((W * H) / Math.max(1, N)) * 0.62;
  for (let it = 0; it < iters; it++) {
    const dispX = new Array(N).fill(0);
    const dispY = new Array(N).fill(0);
    // 반발력 (O(N^2) — N은 ~80 이하로 제한)
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let d = Math.hypot(dx, dy) || 0.01;
        if (d > k * 4) continue;
        const rep = (k * k) / d;
        dx /= d; dy /= d;
        dispX[i] += dx * rep; dispY[i] += dy * rep;
        dispX[j] -= dx * rep; dispY[j] -= dy * rep;
      }
    }
    // 인력 (엣지)
    for (const e of edges) {
      const a = idx.get(e.source)!, b = idx.get(e.target)!;
      let dx = nodes[a].x - nodes[b].x;
      let dy = nodes[a].y - nodes[b].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const att = ((d * d) / k) * (0.5 + Math.min(2, e.weight) * 0.25);
      dx /= d; dy /= d;
      dispX[a] -= dx * att; dispY[a] -= dy * att;
      dispX[b] += dx * att; dispY[b] += dy * att;
    }
    const cool = 1 - it / iters;
    const maxStep = (Math.min(W, H) / 10) * cool + 1;
    for (let i = 0; i < N; i++) {
      const dl = Math.hypot(dispX[i], dispY[i]) || 0.01;
      const step = Math.min(dl, maxStep);
      nodes[i].x += (dispX[i] / dl) * step;
      nodes[i].y += (dispY[i] / dl) * step;
      nodes[i].x = Math.max(28, Math.min(W - 28, nodes[i].x));
      nodes[i].y = Math.max(28, Math.min(H - 28, nodes[i].y));
    }
  }
}

const GROUP_COLORS = ["#6c8cff", "#3ecfb2", "#a78bfa", "#e8b84b", "#f472b6", "#34d399", "#fb923c", "#60a5fa", "#c084fc", "#f87171"];

export default function NetworkAnalysis({ papers }: { papers: NetworkPaper[] }) {
  const [type, setType] = useState<NetworkType>("coauthor");
  const [minDegree, setMinDegree] = useState(1);

  const W = 760, H = 460;

  const graph = useMemo(() => {
    const nodeWeight = new Map<string, { w: number; kind: GNode["kind"]; label: string }>();
    const edgeWeight = new Map<string, number>();

    const addNode = (id: string, kind: GNode["kind"]) => {
      const cur = nodeWeight.get(id);
      if (cur) cur.w += 1;
      else nodeWeight.set(id, { w: 1, kind, label: id });
    };
    const addEdge = (a: string, b: string) => {
      if (a === b) return;
      edgeWeight.set(ek(a, b), (edgeWeight.get(ek(a, b)) ?? 0) + 1);
    };

    for (const p of papers) {
      const authors = splitAuthors(p.authors);
      const kws = (p.keywords || []).map((k) => k.trim()).filter(Boolean).slice(0, 8);

      if (type === "coauthor") {
        authors.forEach((a) => addNode(a, "author"));
        for (let i = 0; i < authors.length; i++)
          for (let j = i + 1; j < authors.length; j++) addEdge(authors[i], authors[j]);
      } else if (type === "coword") {
        kws.forEach((k) => addNode(k, "keyword"));
        for (let i = 0; i < kws.length; i++)
          for (let j = i + 1; j < kws.length; j++) addEdge(kws[i], kws[j]);
      } else if (type === "authorkw") {
        authors.forEach((a) => addNode(a, "author"));
        kws.forEach((k) => addNode(k, "keyword"));
        for (const a of authors) for (const k of kws) addEdge(a, k);
      } else if (type === "source") {
        const j = (p.journal || "").trim();
        if (j) {
          addNode(j, "journal");
          // 같은 키워드를 공유하는 저널끼리 연결 (간단 결합)
          for (const k of kws) addEdge(j, `kw:${k}`);
        }
      }
    }

    // 노드 degree 계산
    const degree = new Map<string, number>();
    for (const [key, w] of edgeWeight) {
      const [a, b] = key.split("\u0000");
      degree.set(a, (degree.get(a) ?? 0) + w);
      degree.set(b, (degree.get(b) ?? 0) + w);
    }

    // source 모드에서 임시 kw 노드 제거 → 저널만 남김
    let nodeIds = [...nodeWeight.keys()];
    if (type === "source") nodeIds = nodeIds.filter((id) => !id.startsWith("kw:"));

    let nodes: GNode[] = nodeIds.map((id) => {
      const meta = nodeWeight.get(id)!;
      return { id, label: meta.label, kind: meta.kind, weight: meta.w, group: 0, x: 0, y: 0 };
    });

    // 최소 연결 차수 필터 + 상위 80개로 제한(가독성/성능)
    nodes = nodes
      .filter((n) => (degree.get(n.id) ?? 0) >= minDegree || n.weight >= 2)
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 80);

    const keep = new Set(nodes.map((n) => n.id));
    const edges: GEdge[] = [...edgeWeight.entries()]
      .map(([key, w]) => {
        const [a, b] = key.split("\u0000");
        return { source: a, target: b, weight: w };
      })
      .filter((e) => keep.has(e.source) && keep.has(e.target));

    const grp = components(nodes, edges);
    nodes.forEach((n) => (n.group = grp.get(n.id) ?? 0));

    layout(nodes, edges, W, H);

    const maxDeg = Math.max(1, ...nodes.map((n) => degree.get(n.id) ?? 0));
    const clusterCount = new Set(nodes.map((n) => n.group)).size;
    const topNodes = [...nodes]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 8)
      .map((n) => ({ label: n.label, degree: degree.get(n.id) ?? 0, group: n.group }));

    return { nodes, edges, degree, maxDeg, clusterCount, topNodes };
  }, [papers, type, minDegree]);

  const activeMeta = NETWORK_TYPES.find((t) => t.id === type)!;

  if (papers.length === 0) {
    return (
      <div className="text-center py-20 text-white/15">
        <p className="text-[43px] mb-3 flex justify-center"><Icon name="network" size={36} /></p>
        <p className="text-[18px] mb-1">네트워크 분석</p>
        <p className="text-[15px] text-white/10">먼저 논문을 검색하여 메타데이터를 수집하세요</p>
        <p className="text-[14px] text-white/8 mt-2">저자·키워드·저널 메타데이터로 공동저자/키워드 동시출현 네트워크를 생성합니다</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="network" size={18} className="text-[#6c8cff]" />
        <h3 className="text-[18px] font-semibold">메타데이터 네트워크 분석</h3>
        <span className="text-[14px] text-white/25">분석 대상 {papers.length}편</span>
      </div>
      <p className="text-[15px] text-white/30 mb-4">
        서지정보(저자·키워드·저널)를 노드로, 동시출현·공동집필 관계를 엣지로 연결한 계량서지학 네트워크입니다.
      </p>

      {/* 네트워크 유형 선택 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {NETWORK_TYPES.map((nt) => (
          <button
            key={nt.id}
            onClick={() => setType(nt.id)}
            style={type === nt.id ? { backgroundColor: `${nt.color}26`, color: nt.color, borderColor: `${nt.color}59` } : {}}
            className={`px-3 py-1.5 rounded-lg text-[15px] border transition-all ${
              type === nt.id ? "font-medium" : "border-white/[0.06] text-white/40 hover:text-white/70"
            }`}
          >
            {nt.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[14px] text-white/30">
          최소 연결
          <input
            type="range" min={1} max={5} value={minDegree}
            onChange={(e) => setMinDegree(parseInt(e.target.value, 10))}
            className="w-20 accent-[#6c8cff]"
          />
          <span className="w-3 tabular-nums text-white/50">{minDegree}</span>
        </div>
      </div>
      <p className="text-[14px] text-white/25 mb-3">{activeMeta.desc}</p>

      {/* 요약 통계 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "노드 (Node)", value: graph.nodes.length },
          { label: "엣지 (Edge)", value: graph.edges.length },
          { label: "군집 (Cluster)", value: graph.clusterCount },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl bg-[#13161e] border border-white/[0.04] text-center">
            <p className="text-[23px] font-bold" style={{ color: activeMeta.color }}>{s.value}</p>
            <p className="text-[13px] text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 네트워크 그래프 (SVG) */}
      <div className="rounded-2xl bg-[#0d0f14] border border-white/[0.05] overflow-hidden mb-4">
        {graph.nodes.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-white/20 text-[15px]">
            연결 관계가 충분하지 않습니다. 더 많은 논문을 검색하거나 최소 연결 값을 낮춰보세요.
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 480 }}>
            {/* 엣지 */}
            {graph.edges.map((e, i) => {
              const a = graph.nodes.find((n) => n.id === e.source)!;
              const b = graph.nodes.find((n) => n.id === e.target)!;
              if (!a || !b) return null;
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#ffffff"
                  strokeOpacity={Math.min(0.28, 0.07 + e.weight * 0.05)}
                  strokeWidth={Math.min(3, 0.6 + e.weight * 0.5)}
                />
              );
            })}
            {/* 노드 */}
            {graph.nodes.map((n) => {
              const deg = graph.degree.get(n.id) ?? 0;
              const r = 5 + (deg / graph.maxDeg) * 13;
              const color = GROUP_COLORS[n.group % GROUP_COLORS.length];
              return (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r={r} fill={color} fillOpacity={0.85} stroke="#0d0f14" strokeWidth={1.5} />
                  {(deg >= Math.max(2, graph.maxDeg * 0.35) || graph.nodes.length <= 28) && (
                    <text
                      x={n.x} y={n.y - r - 3}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#ffffff"
                      fillOpacity={0.7}
                    >
                      {n.label.length > 16 ? n.label.slice(0, 16) + "…" : n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* 중심성 상위 노드 (degree centrality) */}
      <div className="p-4 rounded-xl bg-[#13161e] border border-white/[0.04]">
        <p className="text-[15px] font-semibold mb-3 flex items-center gap-1.5">
          <Icon name="chart" size={14} /> 중심성 상위 노드 (연결 정도)
        </p>
        {graph.topNodes.length === 0 ? (
          <p className="text-[14px] text-white/25">표시할 노드가 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {graph.topNodes.map((tn, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: GROUP_COLORS[tn.group % GROUP_COLORS.length] }}
                />
                <span className="text-[15px] text-white/70 flex-1 truncate">{tn.label}</span>
                <span className="text-[13px] text-white/30">군집 {tn.group + 1}</span>
                <span className="text-[14px] font-semibold tabular-nums" style={{ color: activeMeta.color }}>{tn.degree}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[13px] text-white/20 mt-3 leading-relaxed">
          연결 정도(degree)가 높은 노드일수록 해당 네트워크의 핵심 허브입니다.
          {type === "coauthor" && " 공동저자 네트워크에서는 연구 협력의 중심 연구자를 의미합니다."}
          {type === "coword" && " 키워드 네트워크에서는 연구주제 군집의 중심 개념을 의미합니다."}
          {type === "authorkw" && " 저자-키워드 네트워크에서는 특정 주제를 주도하는 연구자를 보여줍니다."}
          {type === "source" && " 저널 결합 네트워크에서는 동일 주제를 다루는 핵심 학술지를 보여줍니다."}
        </p>
      </div>
    </div>
  );
}
