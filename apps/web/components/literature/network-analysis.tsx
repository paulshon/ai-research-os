"use client";

/* ════════════════════════════════════════════════════════════
   v24: 메타데이터 네트워크 분석 — 가독성 중심 단일 force 레이아웃
   - 논문 수(N)에 따라 노드 수·크기·라벨·엣지 길이 자동 조절
   - 격자 분리 군집 폐기 → 통합 force-directed + 화면 중앙 맞춤
   - Material Symbols: 아이콘 자체가 노드
   - 유형별 하단 상세 분석 텍스트
═══════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { MaterialSymbol } from "@/components/literature/material-symbol";
import GraphIconPicker from "@/components/literature/graph-icon-picker";
import type { GraphVisualStyle } from "@/components/literature/literature-analytics-panel";

export interface NetworkPaper {
  id: string;
  title: string;
  authors: string;
  keywords: string[];
  journal: string;
  year: number;
}

type NetworkType = "coauthor" | "coword" | "authorkw" | "source";

interface GNode {
  id: string;
  label: string;
  group: number;
  weight: number;
  kind: "author" | "keyword" | "journal";
  x: number;
  y: number;
}
interface GEdge {
  source: string;
  target: string;
  weight: number;
}

const NETWORK_TYPES: { id: NetworkType; label: string; desc: string; color: string }[] = [
  { id: "coauthor", label: "공동저자", desc: "저자 ↔ 저자 · 같은 논문을 공동 집필", color: "#6c8cff" },
  { id: "coword", label: "키워드 동시출현", desc: "키워드 ↔ 키워드 · 같은 논문에 함께 등장", color: "#3ecfb2" },
  { id: "authorkw", label: "저자-키워드", desc: "저자 ↔ 키워드 · 연구주제 귀속", color: "#a78bfa" },
  { id: "source", label: "저널 결합", desc: "저널 ↔ 저널 · 동일 키워드 공유", color: "#e8b84b" },
];

const STYLE_META: { id: GraphVisualStyle; label: string; defaultIcon: string }[] = [
  { id: "default", label: "기본", defaultIcon: "circle" },
  { id: "pictogram", label: "Pictogram", defaultIcon: "person" },
  { id: "isotype", label: "Isotype", defaultIcon: "square" },
  { id: "infographic", label: "Infographic", defaultIcon: "insights" },
];

const GROUP_COLORS = [
  "#6c8cff", "#3ecfb2", "#a78bfa", "#e8b84b", "#f472b6",
  "#34d399", "#fb923c", "#60a5fa", "#c084fc", "#f87171",
];

function splitAuthors(s: string): string[] {
  return (s || "")
    .split(/[,;]|\band\b|·|&/)
    .map((x) => x.trim())
    .filter((x) => x.length > 1 && !/^(unknown|n\/a|et al\.?)$/i.test(x))
    .slice(0, 6);
}

const ek = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

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
        if (!group.has(nb)) {
          group.set(nb, g);
          stack.push(nb);
        }
      }
    }
    g++;
  }
  return group;
}

/** 논문 수·노드 수에 맞춘 레이아웃 파라미터 */
function layoutParams(paperCount: number, nodeCount: number) {
  const dense = paperCount >= 80 || nodeCount >= 50;
  const sparse = paperCount <= 15 && nodeCount <= 25;
  return {
    W: dense ? 900 : sparse ? 720 : 820,
    H: dense ? 560 : sparse ? 480 : 520,
    nodeCap: sparse ? 40 : dense ? 48 : 60,
    rMin: sparse ? 10 : dense ? 5 : 7,
    rMax: sparse ? 22 : dense ? 12 : 16,
    labelTop: sparse ? 28 : dense ? 10 : 16,
    labelMaxLen: sparse ? 18 : dense ? 10 : 14,
    edgeOpacity: dense ? 0.28 : 0.4,
    edgeWidth: dense ? 0.9 : 1.4,
    kMul: sparse ? 1.15 : dense ? 0.72 : 0.9,
    iters: dense ? 180 : 220,
  };
}

/** 통합 force-directed → 바운딩박스 중앙 맞춤 */
function layoutUnified(nodes: GNode[], edges: GEdge[], W: number, H: number, kMul: number, iters: number) {
  const N = nodes.length;
  if (N === 0) return;
  if (N === 1) {
    nodes[0].x = W / 2;
    nodes[0].y = H / 2;
    return;
  }

  // 원형 시드 (약간 지터)
  const R0 = Math.min(W, H) * 0.32;
  nodes.forEach((n, i) => {
    const a = (i / N) * Math.PI * 2 + (i % 3) * 0.05;
    n.x = W / 2 + Math.cos(a) * R0 * (0.85 + (i % 5) * 0.03);
    n.y = H / 2 + Math.sin(a) * R0 * (0.85 + (i % 7) * 0.02);
  });

  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const k = Math.sqrt((W * H) / Math.max(1, N)) * kMul;

  for (let it = 0; it < iters; it++) {
    const dispX = new Array(N).fill(0);
    const dispY = new Array(N).fill(0);

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let d = Math.hypot(dx, dy) || 0.01;
        if (d > k * 5.5) continue;
        const rep = (k * k) / d;
        dx /= d;
        dy /= d;
        dispX[i] += dx * rep;
        dispY[i] += dy * rep;
        dispX[j] -= dx * rep;
        dispY[j] -= dy * rep;
      }
    }

    for (const e of edges) {
      const a = idx.get(e.source);
      const b = idx.get(e.target);
      if (a == null || b == null) continue;
      let dx = nodes[a].x - nodes[b].x;
      let dy = nodes[a].y - nodes[b].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const ideal = k * (0.85 + Math.min(1.5, e.weight) * 0.12);
      const force = ((d - ideal) / d) * 0.12 * (0.6 + Math.min(2, e.weight) * 0.2);
      dx *= force;
      dy *= force;
      dispX[a] -= dx;
      dispY[a] -= dy;
      dispX[b] += dx;
      dispY[b] += dy;
    }

    // 약한 중앙 중력 — 프레임 밖으로 흩지는 것 방지
    for (let i = 0; i < N; i++) {
      dispX[i] += (W / 2 - nodes[i].x) * 0.008;
      dispY[i] += (H / 2 - nodes[i].y) * 0.008;
    }

    const cool = 1 - it / iters;
    const maxStep = (Math.min(W, H) / 9) * cool + 0.6;
    for (let i = 0; i < N; i++) {
      const dl = Math.hypot(dispX[i], dispY[i]) || 0.01;
      const step = Math.min(dl, maxStep);
      nodes[i].x += (dispX[i] / dl) * step;
      nodes[i].y += (dispY[i] / dl) * step;
    }
  }

  // 바운딩박스 → 여백 두고 스케일·중앙 정렬
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  });
  const bw = Math.max(40, maxX - minX);
  const bh = Math.max(40, maxY - minY);
  const pad = 48;
  const scale = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  nodes.forEach((n) => {
    n.x = W / 2 + (n.x - cx) * scale;
    n.y = H / 2 + (n.y - cy) * scale;
  });
}

async function exportSvgAs(svg: SVGSVGElement, format: "png" | "jpeg", filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = clone.getAttribute("viewBox") || "0 0 820 520";
  const parts = vb.split(/[\s,]+/).map(Number);
  const vw = parts[2] || 820;
  const vh = parts[3] || 520;
  const scale = 2;
  clone.setAttribute("width", String(vw * scale));
  clone.setAttribute("height", String(vh * scale));
  let xml = new XMLSerializer().serializeToString(clone);
  if (!xml.includes("xmlns=")) xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = vw * scale;
    canvas.height = vh * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0d0f14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.href = canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", 0.92);
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildAnalysisText(
  type: NetworkType,
  papers: number,
  nodes: number,
  edges: number,
  clusters: number,
  top: { label: string; degree: number; group: number }[],
  density: number,
): string {
  const topStr = top.slice(0, 5).map((t) => `${t.label}(연결 ${t.degree})`).join(", ");
  const common = [
    `분석 대상 논문 ${papers}편에서 추출한 네트워크는 노드 ${nodes}개·엣지 ${edges}개·군집 ${clusters}개입니다.`,
    `네트워크 밀도(실제 연결/가능 연결)는 약 ${(density * 100).toFixed(1)}%입니다. ` +
      (density > 0.15
        ? "비교적 조밀해 핵심 허브 주변으로 정보가 빠르게 공유되는 구조입니다."
        : density > 0.05
          ? "중간 밀도이며, 몇 개의 허브가 하위 군집을 잇는 형태일 가능성이 큽니다."
          : "성긴 구조로, 여러 소규모 협력/주제 군집이 분리되어 있을 수 있습니다."),
  ];

  if (type === "coauthor") {
    return [
      "【공동저자 네트워크란】같은 논문을 함께 쓴 저자끼리 연결한 협력 지도입니다. 선이 많을수록 공동연구가 활발합니다.",
      ...common,
      top.length
        ? `【핵심 허브】연결 정도가 높은 연구자: ${topStr}. 이들은 여러 논문·팀에 걸쳐 나타나 해당 분야 협력의 중심에 가깝습니다.`
        : "【핵심 허브】표시할 상위 노드가 부족합니다. 최소 연결을 낮추거나 검색 결과를 늘려 보세요.",
      "【읽는 법】가까운 노드끼리 같은 색(군집)이면 자주 함께 쓰는 연구팀입니다. 군집 사이를 잇는 저자는 ‘다리’ 역할을 합니다.",
      "【연구 활용】공동저자 허브를 추적하면 후속 인터뷰·인용·연구팀 확장 후보를 찾을 수 있습니다. 단독 저자만 많은 군집은 신생·틈새 주제일 수 있습니다.",
    ].join("\n\n");
  }
  if (type === "coword") {
    return [
      "【키워드 동시출현이란】한 논문에 함께 등장한 키워드끼리 연결한 주제 지도입니다. 선이 굵을수록 함께 쓰이는 빈도가 높습니다.",
      ...common,
      top.length
        ? `【중심 개념】연결이 많은 키워드: ${topStr}. 검색 주제의 핵심 어휘·인접 개념으로 해석할 수 있습니다.`
        : "【중심 개념】키워드 메타데이터가 부족하면 그래프가 비어 보일 수 있습니다.",
      "【읽는 법】한 덩어리로 뭉친 키워드는 하위 주제군입니다. 떨어져 있는 덩어리는 서로 다른 연구 흐름을 시사합니다.",
      "【연구 활용】문헌고찰에서 ‘잘 묶인 주제’와 ‘아직 연결이 약한 교차점’을 구분해 연구 공백(gap) 후보로 쓸 수 있습니다.",
    ].join("\n\n");
  }
  if (type === "authorkw") {
    return [
      "【저자–키워드 네트워크란】누가 어떤 주제어를 다루는지를 이분 그래프로 보여 줍니다.",
      ...common,
      top.length
        ? `【두드러진 노드】${topStr}. 저자 노드면 다주제 연구자, 키워드 노드면 여러 연구자가 공유하는 핵심어입니다.`
        : "【두드러진 노드】표시할 상위 노드가 없습니다.",
      "【읽는 법】한 저자에게 많은 키워드가 달리면 주제 범위가 넓고, 한 키워드에 여러 저자가 달리면 그 키워드가 분야의 ‘공통 언어’입니다.",
      "【연구 활용】특정 키워드를 선도하는 연구자를 찾거나, 내 연구 키워드와 겹치는 저자 군집을 탐색할 때 유용합니다.",
    ].join("\n\n");
  }
  return [
    "【저널 결합이란】같은 키워드를 공유하는 학술지끼리 연결한 출판 지형도입니다.",
    ...common,
    top.length
      ? `【핵심 저널】${topStr}. 해당 주제 논문을 자주 싣거나 키워드 스펙트럼이 넓은 출처입니다.`
      : "【핵심 저널】저널 메타데이터가 부족하면 그래프가 성길 수 있습니다.",
    "【읽는 법】가까이 묶인 저널군은 유사 독자층·유사 주제 영역을 공유합니다.",
    "【연구 활용】투고 후보 저널을 고르거나, 내 주제가 어느 출판 군집에 가까운지 확인할 때 참고하세요.",
  ].join("\n\n");
}

export default function NetworkAnalysis({
  papers,
  visualStyle = "default",
  onVisualStyleChange,
  nodeIcon: nodeIconProp,
  onNodeIconChange,
}: {
  papers: NetworkPaper[];
  visualStyle?: GraphVisualStyle;
  onVisualStyleChange?: (s: GraphVisualStyle) => void;
  nodeIcon?: string;
  onNodeIconChange?: (icon: string) => void;
}) {
  const [type, setType] = useState<NetworkType>("coauthor");
  const [minDegree, setMinDegree] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localIcon, setLocalIcon] = useState("person");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodeIcon = nodeIconProp ?? localIcon;
  const setNodeIcon = onNodeIconChange ?? setLocalIcon;

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
      const kws = (p.keywords || []).map((k) => k.trim()).filter(Boolean).slice(0, 6);

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
          for (const k of kws) addEdge(j, `kw:${k}`);
        }
      }
    }

    const degree = new Map<string, number>();
    for (const [key, w] of edgeWeight) {
      const [a, b] = key.split("\u0000");
      degree.set(a, (degree.get(a) ?? 0) + w);
      degree.set(b, (degree.get(b) ?? 0) + w);
    }

    let nodeIds = [...nodeWeight.keys()];
    if (type === "source") nodeIds = nodeIds.filter((id) => !id.startsWith("kw:"));

    const params = layoutParams(papers.length, nodeIds.length);

    let nodes: GNode[] = nodeIds.map((id) => {
      const meta = nodeWeight.get(id)!;
      return { id, label: meta.label, kind: meta.kind, weight: meta.w, group: 0, x: 0, y: 0 };
    });

    nodes = nodes
      .filter((n) => (degree.get(n.id) ?? 0) >= minDegree || n.weight >= 2)
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, params.nodeCap);

    const keep = new Set(nodes.map((n) => n.id));
    const edges: GEdge[] = [...edgeWeight.entries()]
      .map(([key, w]) => {
        const [a, b] = key.split("\u0000");
        return { source: a, target: b, weight: w };
      })
      .filter((e) => keep.has(e.source) && keep.has(e.target));

    const grp = components(nodes, edges);
    nodes.forEach((n) => (n.group = grp.get(n.id) ?? 0));

    layoutUnified(nodes, edges, params.W, params.H, params.kMul, params.iters);

    const maxDeg = Math.max(1, ...nodes.map((n) => degree.get(n.id) ?? 0));
    const clusterCount = new Set(nodes.map((n) => n.group)).size;
    const topNodes = [...nodes]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 8)
      .map((n) => ({ label: n.label, degree: degree.get(n.id) ?? 0, group: n.group }));

    const possible = (nodes.length * (nodes.length - 1)) / 2;
    const density = possible > 0 ? edges.length / possible : 0;
    const labelSet = new Set(topNodes.slice(0, params.labelTop).map((t) => t.label));

    return { nodes, edges, degree, maxDeg, clusterCount, topNodes, density, params, labelSet };
  }, [papers, type, minDegree]);

  const activeMeta = NETWORK_TYPES.find((t) => t.id === type)!;
  const useIcon = visualStyle !== "default";
  const iconName = nodeIcon || STYLE_META.find((s) => s.id === visualStyle)?.defaultIcon || "person";

  const analysis = useMemo(
    () =>
      buildAnalysisText(
        type,
        papers.length,
        graph.nodes.length,
        graph.edges.length,
        graph.clusterCount,
        graph.topNodes,
        graph.density,
      ),
    [type, papers.length, graph],
  );

  if (papers.length === 0) {
    return (
      <div className="text-center py-20 text-white/15">
        <p className="mb-3 flex justify-center"><Icon name="network" size={36} /></p>
        <p className="text-[18px] mb-1">네트워크 분석</p>
        <p className="text-[15px] text-white/10">먼저 논문을 검색하여 메타데이터를 수집하세요</p>
      </div>
    );
  }

  const { W, H, rMin, rMax, labelMaxLen, edgeOpacity, edgeWidth } = graph.params;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Icon name="network" size={18} className="text-[#6c8cff]" />
        <h3 className="text-[18px] font-semibold">메타데이터 네트워크 분석</h3>
        <span className="text-[14px] text-[#6c8cff]/90 font-medium">분석 대상 {papers.length}편</span>
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => svgRef.current && exportSvgAs(svgRef.current, "png", `network-${type}.png`)}
            className="px-2.5 py-1 rounded-lg text-[13px] border border-white/[0.08] text-white/50 hover:text-white/80"
          >
            PNG
          </button>
          <button
            type="button"
            onClick={() => svgRef.current && exportSvgAs(svgRef.current, "jpeg", `network-${type}.jpeg`)}
            className="px-2.5 py-1 rounded-lg text-[13px] border border-white/[0.08] text-white/50 hover:text-white/80"
          >
            JPEG
          </button>
        </div>
      </div>
      <p className="text-[14px] text-white/30 mb-3">
        논문 {papers.length}편 규모에 맞춰 노드 수·크기·라벨·엣지 길이를 자동 조절합니다. 상위 허브만 이름을 표시해 겹침을 줄입니다.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {NETWORK_TYPES.map((nt) => (
          <button
            key={nt.id}
            onClick={() => setType(nt.id)}
            style={
              type === nt.id
                ? { backgroundColor: `${nt.color}26`, color: nt.color, borderColor: `${nt.color}59` }
                : {}
            }
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
            type="range"
            min={1}
            max={5}
            value={minDegree}
            onChange={(e) => setMinDegree(parseInt(e.target.value, 10))}
            className="w-20 accent-[#6c8cff]"
          />
          <span className="w-3 tabular-nums text-white/50">{minDegree}</span>
        </div>
      </div>
      <p className="text-[13px] text-white/25 mb-3">{activeMeta.desc}</p>

      {onVisualStyleChange && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {STYLE_META.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onVisualStyleChange(opt.id);
                if (opt.id !== "default") setNodeIcon(opt.defaultIcon);
              }}
              className={`px-2.5 py-1 rounded-md text-[13px] border flex items-center gap-1 ${
                visualStyle === opt.id
                  ? "border-[#6c8cff]/50 text-[#8ba5ff] bg-[#6c8cff]/10"
                  : "border-white/[0.06] text-white/35"
              }`}
            >
              <MaterialSymbol name={opt.defaultIcon} size={14} />
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="px-2.5 py-1 rounded-md text-[13px] border border-[#3ecfb2]/35 text-[#3ecfb2] bg-[#3ecfb2]/10 flex items-center gap-1"
          >
            <MaterialSymbol name={iconName} size={16} />
            아이콘 선택
          </button>
          <span className="text-[12px] text-white/20">Material Symbols (Apache-2.0)</span>
        </div>
      )}

      <GraphIconPicker open={pickerOpen} value={iconName} onChange={setNodeIcon} onClose={() => setPickerOpen(false)} />

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

      <div className="rounded-2xl bg-[#0d0f14] border border-white/[0.05] overflow-hidden mb-4">
        {graph.nodes.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-white/20 text-[15px]">
            연결 관계가 충분하지 않습니다. 최소 연결을 낮추거나 검색 결과를 늘려 보세요.
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            style={{ maxHeight: 580 }}
            onMouseLeave={() => setHoverId(null)}
          >
            <rect width={W} height={H} fill="#0d0f14" />
            {graph.edges.map((e, i) => {
              const a = graph.nodes.find((n) => n.id === e.source);
              const b = graph.nodes.find((n) => n.id === e.target);
              if (!a || !b) return null;
              const hot = hoverId && (hoverId === e.source || hoverId === e.target);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={hot ? activeMeta.color : "#c8d0e0"}
                  strokeOpacity={hot ? 0.75 : Math.min(0.55, edgeOpacity + e.weight * 0.06)}
                  strokeWidth={Math.min(3.2, edgeWidth + e.weight * 0.35) * (hot ? 1.4 : 1)}
                />
              );
            })}
            {graph.nodes.map((n) => {
              const deg = graph.degree.get(n.id) ?? 0;
              const r = rMin + (deg / graph.maxDeg) * (rMax - rMin);
              const color = GROUP_COLORS[n.group % GROUP_COLORS.length];
              const showLabel = graph.labelSet.has(n.label) || hoverId === n.id;
              const label = n.label.length > labelMaxLen ? n.label.slice(0, labelMaxLen) + "…" : n.label;
              const iconSize = Math.max(14, r * 1.55);
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHoverId(n.id)}
                  style={{ cursor: "pointer" }}
                >
                  {useIcon ? (
                    <>
                      {/* 아이콘이 곧 노드 — 은은한 글로우만 */}
                      <circle cx={n.x} cy={n.y} r={r * 1.15} fill={color} fillOpacity={0.18} />
                      <text
                        x={n.x}
                        y={n.y + 1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={iconSize}
                        fill={color}
                        fontFamily="Material Symbols Outlined"
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        {iconName}
                      </text>
                    </>
                  ) : (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill={color}
                      fillOpacity={0.92}
                      stroke="#e8eaf0"
                      strokeWidth={1.2}
                      strokeOpacity={0.35}
                    />
                  )}
                  {showLabel && (
                    <g>
                      <rect
                        x={n.x - label.length * 3.2}
                        y={n.y - r - 18}
                        width={label.length * 6.4 + 8}
                        height={14}
                        rx={3}
                        fill="#0d0f14"
                        fillOpacity={0.85}
                        stroke={color}
                        strokeOpacity={0.35}
                      />
                      <text
                        x={n.x}
                        y={n.y - r - 8}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#f0f2f8"
                        fillOpacity={0.95}
                      >
                        {label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="p-4 rounded-xl bg-[#13161e] border border-white/[0.04] mb-4">
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
                <span className="text-[14px] font-semibold tabular-nums" style={{ color: activeMeta.color }}>
                  {tn.degree}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 유형별 상세 분석 */}
      <div className="p-4 rounded-xl bg-[#13161e] border border-[#6c8cff]/20">
        <p className="text-[15px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: activeMeta.color }}>
          <Icon name="idea" size={15} /> {activeMeta.label} · 상세 분석
        </p>
        <div className="text-[14px] text-white/65 leading-relaxed whitespace-pre-wrap">{analysis}</div>
      </div>
    </div>
  );
}
