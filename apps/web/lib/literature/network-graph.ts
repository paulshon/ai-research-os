/* ════════════════════════════════════════════════════════════
   LLB 네트워크 분석 — 그래프 구성 · 지표 · 군집 · 레이아웃 (서버/클라이언트 공용, 순수 TypeScript)
   - buildGraph   : 논문 기록(NetRecord) → 노드·엣지 (11종 네트워크)
   - analyzeGraph : 연결 정도·가중 연결·매개·근접·PageRank·군집계수·군집(Louvain)·밀도·경로 지표
   - layoutForce  : 군집 인식 force-directed 배치 + 충돌 방지
   - summarize    : 표본 요약(연도·저널·저자·기관·국가 편수, 상위 N편 인용 집중도)
═══════════════════════════════════════════════════════════════ */

export type NetKind =
  | "coauthor" | "coword" | "authorkw" | "journal" | "institution" | "country"
  | "funder" | "mesh" | "concept" | "citation" | "coupling";

export type NodeKind = "author" | "keyword" | "journal" | "institution" | "country" | "funder" | "mesh" | "concept" | "paper";

export interface NetRecord {
  id: string;            // OpenAlex 작업 URL 또는 wid
  wid?: number;
  title: string;
  year: number;
  cited: number;
  journal: string;
  authors: string[];
  keywords: string[];
  institutions: string[];
  countries: string[];
  funders: string[];
  mesh: string[];
  concepts: string[];
  fwci?: number;
  jif?: number;
  rank?: number;         // 검색 순위(1부터)
}

export interface NetNode {
  id: string;
  label: string;
  kind: NodeKind;
  count: number;         // 이 노드가 등장한 논문 수
  cited: number;         // 등장한 논문의 인용 합
  yearMean: number;      // 등장한 논문의 평균 연도(0이면 없음)
}
export interface NetEdge { source: string; target: string; weight: number }
export interface Graph { nodes: NetNode[]; edges: NetEdge[]; directed?: boolean; truncated: { nodes: number; edges: number } }

export const NET_KINDS: { id: NetKind; label: string; node: NodeKind; desc: string; color: string }[] = [
  { id: "coauthor", label: "공동저자", node: "author", desc: "저자 ↔ 저자 · 같은 논문을 공동 집필", color: "#6c8cff" },
  { id: "coword", label: "키워드 동시출현", node: "keyword", desc: "키워드 ↔ 키워드 · 같은 논문에 함께 등장", color: "#3ecfb2" },
  { id: "authorkw", label: "저자-키워드", node: "author", desc: "저자 ↔ 키워드 · 연구주제 귀속(이분 그래프)", color: "#a78bfa" },
  { id: "journal", label: "저널 결합", node: "journal", desc: "저널 ↔ 저널 · 같은 키워드를 공유", color: "#e8b84b" },
  { id: "institution", label: "기관 협력", node: "institution", desc: "기관 ↔ 기관 · 같은 논문에 소속 저자가 공동 참여", color: "#f472b6" },
  { id: "country", label: "국가 협력", node: "country", desc: "국가 ↔ 국가 · 국제 공동연구", color: "#34d399" },
  { id: "funder", label: "연구비 지원기관", node: "funder", desc: "후원기관 ↔ 후원기관 · 같은 논문을 함께 지원", color: "#fb923c" },
  { id: "mesh", label: "MeSH 용어", node: "mesh", desc: "MeSH ↔ MeSH · 의학 주제어 동시출현", color: "#60a5fa" },
  { id: "concept", label: "개념(Concept)", node: "concept", desc: "OpenAlex 개념 ↔ 개념 · 동시출현", color: "#c084fc" },
  { id: "citation", label: "인용 네트워크", node: "paper", desc: "논문 → 논문 · 표본 안에서의 인용 관계", color: "#f87171" },
  { id: "coupling", label: "서지 결합", node: "paper", desc: "논문 ↔ 논문 · 참고문헌을 2건 이상 공유", color: "#fbbf24" },
];

export interface ExtraEdges {
  citations?: { citing: number; cited: number }[];
  coupling?: { a: number; b: number; shared: number }[];
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const uniq = (a: string[]) => [...new Set(a.map(norm).filter((x) => x.length > 1))];
const edgeKey = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/** 기록에서 노드 항목을 뽑는 방식(종류별 상한은 한 논문이 만드는 쌍의 폭발을 막기 위한 것) */
/** MeSH 의 일반 표지어(Check Tags)는 거의 모든 논문에 붙어 네트워크를 뭉개므로 제외한다 */
const MESH_GENERIC = new Set(["humans", "human", "female", "male", "animals", "adult", "aged", "aged, 80 and over", "middle aged", "adolescent", "child", "child, preschool", "infant", "infant, newborn", "young adult", "mice", "rats", "retrospective studies", "prospective studies", "cohort studies", "risk factors", "reproducibility of results", "sensitivity and specificity"]);

const FIELD: Record<string, { get: (r: NetRecord) => string[]; cap: number; node: NodeKind }> = {
  author: { get: (r) => r.authors, cap: 8, node: "author" },
  keyword: { get: (r) => r.keywords, cap: 8, node: "keyword" },
  institution: { get: (r) => r.institutions, cap: 8, node: "institution" },
  country: { get: (r) => r.countries, cap: 8, node: "country" },
  funder: { get: (r) => r.funders, cap: 6, node: "funder" },
  mesh: { get: (r) => (r.mesh ?? []).filter((m) => !MESH_GENERIC.has(norm(m).toLowerCase())), cap: 8, node: "mesh" },
  concept: { get: (r) => r.concepts, cap: 8, node: "concept" },
};

interface Acc { count: number; cited: number; yearSum: number; yearN: number; kind: NodeKind; label: string }

export function buildGraph(
  records: NetRecord[],
  kind: NetKind,
  opts: { maxNodes?: number; maxEdges?: number; minEdge?: number } = {},
  extra: ExtraEdges = {},
): Graph {
  const maxNodes = opts.maxNodes ?? 120;
  const maxEdges = opts.maxEdges ?? 700;
  const minEdge = opts.minEdge ?? 1;
  const acc = new Map<string, Acc>();
  const edges = new Map<string, number>();
  const touch = (id: string, nk: NodeKind, r: NetRecord, label?: string) => {
    let a = acc.get(id);
    if (!a) { a = { count: 0, cited: 0, yearSum: 0, yearN: 0, kind: nk, label: label ?? id }; acc.set(id, a); }
    a.count += 1; a.cited += r.cited || 0;
    if (r.year > 0) { a.yearSum += r.year; a.yearN += 1; }
  };
  const addEdge = (a: string, b: string, w = 1) => { if (a !== b) edges.set(edgeKey(a, b), (edges.get(edgeKey(a, b)) ?? 0) + w); };
  const pairs = (ids: string[]) => { for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) addEdge(ids[i], ids[j]); };
  let directed = false;

  const single = (field: keyof typeof FIELD) => {
    const f = FIELD[field];
    for (const r of records) {
      const ids = uniq(f.get(r) ?? []).slice(0, f.cap);
      ids.forEach((id) => touch(id, f.node, r));
      pairs(ids);
    }
  };

  if (kind === "coauthor") single("author");
  else if (kind === "coword") single("keyword");
  else if (kind === "institution") single("institution");
  else if (kind === "country") single("country");
  else if (kind === "funder") single("funder");
  else if (kind === "mesh") single("mesh");
  else if (kind === "concept") single("concept");
  else if (kind === "authorkw") {
    for (const r of records) {
      const au = uniq(r.authors).slice(0, 5);
      const kw = uniq(r.keywords).slice(0, 6);
      au.forEach((a) => touch(`a:${a}`, "author", r, a));
      kw.forEach((k) => touch(`k:${k}`, "keyword", r, k));
      for (const a of au) for (const k of kw) addEdge(`a:${a}`, `k:${k}`);
    }
  } else if (kind === "journal") {
    const byKw = new Map<string, Set<string>>();
    for (const r of records) {
      const j = norm(r.journal || "");
      if (!j) continue;
      touch(j, "journal", r);
      for (const k of uniq(r.keywords).slice(0, 8)) {
        if (!byKw.has(k)) byKw.set(k, new Set());
        byKw.get(k)!.add(j);
      }
    }
    for (const set of byKw.values()) {
      const js = [...set].slice(0, 30);
      pairs(js);
    }
  } else if (kind === "citation" || kind === "coupling") {
    const byWid = new Map<number, NetRecord>();
    for (const r of records) if (r.wid) byWid.set(r.wid, r);
    const label = (r: NetRecord) => `${(r.authors[0] ?? "").split(/[ ,]/).filter(Boolean).slice(-1)[0] ?? ""} ${r.year || ""}`.trim() || r.title.slice(0, 18);
    const idOf = (w: number) => `w${w}`;
    const useEdge = (a: number, b: number, w: number) => {
      const ra = byWid.get(a), rb = byWid.get(b);
      if (!ra || !rb || a === b) return;
      acc.set(idOf(a), acc.get(idOf(a)) ?? { count: 1, cited: ra.cited, yearSum: ra.year, yearN: ra.year ? 1 : 0, kind: "paper", label: label(ra) });
      acc.set(idOf(b), acc.get(idOf(b)) ?? { count: 1, cited: rb.cited, yearSum: rb.year, yearN: rb.year ? 1 : 0, kind: "paper", label: label(rb) });
      addEdge(idOf(a), idOf(b), w);
    };
    if (kind === "citation") { directed = true; for (const c of extra.citations ?? []) useEdge(c.citing, c.cited, 1); }
    else for (const c of extra.coupling ?? []) if (c.shared >= 2) useEdge(c.a, c.b, c.shared);
  }

  // 연결 강도(가중 연결)로 상위 노드 선택 — 연결 없는 노드는 제외(이분 그래프도 동일)
  const strength = new Map<string, number>();
  for (const [key, w] of edges) {
    if (w < minEdge) continue;
    const [a, b] = key.split("\u0000");
    strength.set(a, (strength.get(a) ?? 0) + w);
    strength.set(b, (strength.get(b) ?? 0) + w);
  }
  const ranked = [...strength.keys()].sort((x, y) => (strength.get(y)! - strength.get(x)!) || (acc.get(y)?.count ?? 0) - (acc.get(x)?.count ?? 0) || (x < y ? -1 : 1));
  const keep = new Set(ranked.slice(0, maxNodes));
  let outEdges: NetEdge[] = [];
  let edgeTotal = 0;
  for (const [key, w] of edges) {
    if (w < minEdge) continue;
    const [a, b] = key.split("\u0000");
    if (keep.has(a) && keep.has(b)) { outEdges.push({ source: a, target: b, weight: w }); }
    edgeTotal += 1;
  }
  outEdges.sort((p, q) => q.weight - p.weight);
  const droppedEdges = Math.max(0, outEdges.length - maxEdges);
  outEdges = outEdges.slice(0, maxEdges);
  const used = new Set<string>();
  outEdges.forEach((e) => { used.add(e.source); used.add(e.target); });
  const nodes: NetNode[] = [...keep].filter((id) => used.has(id)).map((id) => {
    const a = acc.get(id)!;
    return { id, label: a.label, kind: a.kind, count: a.count, cited: a.cited, yearMean: a.yearN ? a.yearSum / a.yearN : 0 };
  });
  return { nodes, edges: outEdges, directed, truncated: { nodes: Math.max(0, strength.size - nodes.length), edges: droppedEdges + Math.max(0, edgeTotal - edges.size) } };
}

// ───────────────────────── 지표 ─────────────────────────

export interface NodeMetrics {
  degree: number; strength: number; betweenness: number; closeness: number; pagerank: number; clustering: number; community: number;
}
export interface GraphMetrics {
  nodeCount: number; edgeCount: number; density: number; avgDegree: number; components: number; giantShare: number;
  avgClustering: number; transitivity: number; modularity: number; communities: number; avgPath: number; diameter: number;
  perNode: Map<string, NodeMetrics>;
  communityList: { id: number; size: number; members: string[]; yearMean: number }[];
}

export function analyzeGraph(nodes: NetNode[], edges: NetEdge[]): GraphMetrics {
  const N = nodes.length;
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const adj: Map<number, number>[] = Array.from({ length: N }, () => new Map());
  for (const e of edges) {
    const a = idx.get(e.source), b = idx.get(e.target);
    if (a == null || b == null || a === b) continue;
    adj[a].set(b, (adj[a].get(b) ?? 0) + e.weight);
    adj[b].set(a, (adj[b].get(a) ?? 0) + e.weight);
  }
  const deg = adj.map((m) => m.size);
  const str = adj.map((m) => [...m.values()].reduce((s, x) => s + x, 0));
  const m2 = str.reduce((s, x) => s + x, 0); // 2m

  // 연결 요소
  const comp = new Array(N).fill(-1);
  const compSize: number[] = [];
  for (let s = 0; s < N; s++) {
    if (comp[s] >= 0) continue;
    const id = compSize.length; let size = 0; const st = [s]; comp[s] = id;
    while (st.length) { const u = st.pop()!; size++; for (const v of adj[u].keys()) if (comp[v] < 0) { comp[v] = id; st.push(v); } }
    compSize.push(size);
  }
  const giant = compSize.length ? Math.max(...compSize) : 0;

  // 최단경로 기반(매개·근접·평균경로·지름): 가중치 없는 BFS, Brandes
  const bet = new Array(N).fill(0);
  const clo = new Array(N).fill(0);
  let pathSum = 0, pathCnt = 0, diameter = 0;
  for (let s = 0; s < N; s++) {
    const dist = new Array(N).fill(-1), sigma = new Array(N).fill(0), delta = new Array(N).fill(0);
    const pred: number[][] = Array.from({ length: N }, () => []);
    const order: number[] = []; const q = [s]; dist[s] = 0; sigma[s] = 1;
    for (let h = 0; h < q.length; h++) {
      const u = q[h]; order.push(u);
      for (const v of adj[u].keys()) {
        if (dist[v] < 0) { dist[v] = dist[u] + 1; q.push(v); }
        if (dist[v] === dist[u] + 1) { sigma[v] += sigma[u]; pred[v].push(u); }
      }
    }
    for (let i = order.length - 1; i >= 0; i--) {
      const w = order[i];
      for (const v of pred[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      if (w !== s) bet[w] += delta[w];
    }
    let sum = 0, reach = 0;
    for (let v = 0; v < N; v++) if (v !== s && dist[v] > 0) { sum += dist[v]; reach++; diameter = Math.max(diameter, dist[v]); pathSum += dist[v]; pathCnt++; }
    // Wasserman–Faust 근접중심성(분리된 그래프에서도 비교 가능)
    clo[s] = sum > 0 && N > 1 ? (reach / sum) * (reach / (N - 1)) : 0;
  }
  const betNorm = N > 2 ? 1 / (((N - 1) * (N - 2)) / 2) : 1;   // 무방향: 쌍이 두 번 세어지므로 /2 후 정규화
  for (let i = 0; i < N; i++) bet[i] = (bet[i] / 2) * betNorm;

  // PageRank (가중, d=0.85)
  let pr = new Array(N).fill(N ? 1 / N : 0);
  for (let it = 0; it < 60; it++) {
    const nx = new Array(N).fill(0.15 / Math.max(1, N)); let dangling = 0;
    for (let u = 0; u < N; u++) {
      if (str[u] === 0) { dangling += pr[u]; continue; }
      for (const [v, w] of adj[u]) nx[v] += 0.85 * pr[u] * (w / str[u]);
    }
    for (let u = 0; u < N; u++) nx[u] += (0.85 * dangling) / Math.max(1, N);
    pr = nx;
  }

  // 군집계수 · 전이성
  const clus = new Array(N).fill(0); let tri = 0, trip = 0;
  for (let u = 0; u < N; u++) {
    const nb = [...adj[u].keys()]; const k = nb.length; let t = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) if (adj[nb[i]].has(nb[j])) t++;
    clus[u] = k > 1 ? (2 * t) / (k * (k - 1)) : 0; tri += t; trip += (k * (k - 1)) / 2;
  }
  const transitivity = trip > 0 ? tri / trip : 0;

  // 군집: Louvain (지역 이동 + 군집 압축 반복)
  const community = louvain(adj, m2);
  let Q = 0;
  if (m2 > 0) {
    const inW = new Map<number, number>(), tot = new Map<number, number>();
    for (let u = 0; u < N; u++) {
      tot.set(community[u], (tot.get(community[u]) ?? 0) + str[u]);
      for (const [v, w] of adj[u]) if (community[v] === community[u]) inW.set(community[u], (inW.get(community[u]) ?? 0) + w);
    }
    for (const c of tot.keys()) Q += (inW.get(c) ?? 0) / m2 - Math.pow((tot.get(c) ?? 0) / m2, 2);
  }
  // 군집 번호를 크기 순으로 다시 매김
  const sizes = new Map<number, number>(); community.forEach((c: number) => sizes.set(c, (sizes.get(c) ?? 0) + 1));
  const orderC = [...sizes.keys()].sort((a, b) => sizes.get(b)! - sizes.get(a)! || a - b);
  const remap = new Map(orderC.map((c, i) => [c, i]));
  const finalC = community.map((c: number) => remap.get(c)!);

  const perNode = new Map<string, NodeMetrics>();
  nodes.forEach((n, i) => perNode.set(n.id, { degree: deg[i], strength: str[i], betweenness: bet[i], closeness: clo[i], pagerank: pr[i], clustering: clus[i], community: finalC[i] }));
  const communityList = orderC.map((_, ci) => {
    const members = nodes.map((n, i) => ({ n, i })).filter((x) => finalC[x.i] === ci).sort((a, b) => str[b.i] - str[a.i]);
    const ys = members.map((m) => m.n.yearMean).filter((y) => y > 0);
    return { id: ci, size: members.length, members: members.slice(0, 5).map((m) => m.n.label), yearMean: ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : 0 };
  });
  const possible = (N * (N - 1)) / 2;
  const edgeCount = adj.reduce((s, m) => s + m.size, 0) / 2;
  return {
    nodeCount: N, edgeCount, density: possible ? edgeCount / possible : 0, avgDegree: N ? (2 * edgeCount) / N : 0,
    components: compSize.length, giantShare: N ? giant / N : 0,
    avgClustering: N ? clus.reduce((s, x) => s + x, 0) / N : 0, transitivity, modularity: Q, communities: orderC.length,
    avgPath: pathCnt ? pathSum / pathCnt : 0, diameter, perNode, communityList,
  };
}

/** Louvain 방법(Blondel 2008). 입력은 가중 무방향 인접표. 결정적(노드 순서 고정). */
function louvain(adj0: Map<number, number>[], m2: number): number[] {
  const N0 = adj0.length;
  if (N0 === 0) return [];
  if (m2 === 0) return adj0.map((_, i) => i);
  let adj = adj0.map((m) => new Map(m));
  let member = adj0.map((_, i) => i);            // 원래 노드 → 현재 수준 노드
  for (let level = 0; level < 8; level++) {
    const N = adj.length;
    const str = adj.map((m) => [...m.values()].reduce((s, x) => s + x, 0));
    const self = adj.map((m, i) => m.get(i) ?? 0);
    const comm = Array.from({ length: N }, (_, i) => i);
    const tot = str.slice();
    let moved = true, pass = 0;
    while (moved && pass < 20) {
      moved = false; pass++;
      for (let u = 0; u < N; u++) {
        const cu = comm[u];
        const link = new Map<number, number>();
        for (const [v, w] of adj[u]) if (v !== u) link.set(comm[v], (link.get(comm[v]) ?? 0) + w);
        tot[cu] -= str[u];
        let best = cu, bestGain = (link.get(cu) ?? 0) - (tot[cu] * str[u]) / m2;
        for (const [c, w] of link) {
          const gain = w - (tot[c] * str[u]) / m2;
          if (gain > bestGain + 1e-12 || (Math.abs(gain - bestGain) <= 1e-12 && c < best && c !== cu && false)) { best = c; bestGain = gain; }
        }
        tot[best] += str[u];
        if (best !== cu) { comm[u] = best; moved = true; }
      }
    }
    const labels = [...new Set(comm)].sort((a, b) => a - b);
    const map = new Map(labels.map((c, i) => [c, i]));
    if (labels.length === N) break;               // 더 합쳐지지 않음
    member = member.map((x) => map.get(comm[x])!);
    const next: Map<number, number>[] = Array.from({ length: labels.length }, () => new Map());
    for (let u = 0; u < N; u++) {
      const cu = map.get(comm[u])!;
      for (const [v, w] of adj[u]) {
        const cv = map.get(comm[v])!;
        next[cu].set(cv, (next[cu].get(cv) ?? 0) + (u === v ? w : w));
      }
      void self;
    }
    adj = next;
  }
  return member;
}

// ───────────────────────── 배치 ─────────────────────────

export interface Placed { id: string; x: number; y: number; r: number }

/** 군집 인식 force-directed. nodes 의 r(반지름)은 충돌 방지에 쓰인다. 좌표는 W×H 안에 맞춘다. */
export function layoutForce(
  nodes: { id: string; r: number; community: number }[],
  edges: NetEdge[],
  W: number,
  H: number,
  iters = 320,
  pad = 40,
): Placed[] {
  const N = nodes.length;
  if (N === 0) return [];
  if (N === 1) return [{ id: nodes[0].id, x: W / 2, y: H / 2, r: nodes[0].r }];
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const px = new Array(N).fill(0), py = new Array(N).fill(0);
  const comms = [...new Set(nodes.map((n) => n.community))].sort((a, b) => a - b);
  const ringR = Math.min(W, H) * 0.3;
  const center = new Map<number, [number, number]>();
  comms.forEach((c, i) => {
    const a = (i / comms.length) * Math.PI * 2 - Math.PI / 2;
    center.set(c, comms.length === 1 ? [W / 2, H / 2] : [W / 2 + Math.cos(a) * ringR, H / 2 + Math.sin(a) * ringR]);
  });
  const countIn = new Map<number, number>();
  nodes.forEach((n, i) => {
    const [cx, cy] = center.get(n.community)!;
    const k = countIn.get(n.community) ?? 0; countIn.set(n.community, k + 1);
    const a = k * 2.399963, rr = 14 + 11 * Math.sqrt(k);
    px[i] = cx + Math.cos(a) * rr; py[i] = cy + Math.sin(a) * rr;
  });
  const k0 = Math.sqrt((W * H) / N) * 0.62;
  const wmax = Math.max(1, ...edges.map((e) => e.weight));
  for (let it = 0; it < iters; it++) {
    const fx = new Array(N).fill(0), fy = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = px[i] - px[j], dy = py[i] - py[j];
        let d = Math.hypot(dx, dy);
        if (d < 0.01) { dx = (i % 2 ? 1 : -1) * 0.1; dy = (j % 2 ? 1 : -1) * 0.1; d = Math.hypot(dx, dy); }
        const minD = nodes[i].r + nodes[j].r + 6;
        let rep = d < k0 * 4 ? (k0 * k0) / d : 0;
        if (d < minD) rep += (minD - d) * 2.2;          // 충돌 방지
        const ux = dx / d, uy = dy / d;
        fx[i] += ux * rep; fy[i] += uy * rep; fx[j] -= ux * rep; fy[j] -= uy * rep;
      }
    }
    for (const e of edges) {
      const a = idx.get(e.source), b = idx.get(e.target);
      if (a == null || b == null) continue;
      const dx = px[b] - px[a], dy = py[b] - py[a]; const d = Math.hypot(dx, dy) || 0.01;
      const same = nodes[a].community === nodes[b].community;
      const ideal = k0 * (same ? 0.7 : 1.15);
      const f = ((d - ideal) / d) * (0.06 + 0.1 * Math.log1p(e.weight) / Math.log1p(wmax)) * (same ? 1 : 0.55);
      fx[a] += dx * f; fy[a] += dy * f; fx[b] -= dx * f; fy[b] -= dy * f;
    }
    for (let i = 0; i < N; i++) {                         // 군집 중심 쪽 약한 인력 + 화면 중앙 중력
      const [cx, cy] = center.get(nodes[i].community)!;
      fx[i] += (cx - px[i]) * 0.012 + (W / 2 - px[i]) * 0.004;
      fy[i] += (cy - py[i]) * 0.012 + (H / 2 - py[i]) * 0.004;
    }
    const cool = 1 - it / iters, maxStep = (Math.min(W, H) / 12) * cool + 0.5;
    for (let i = 0; i < N; i++) {
      const l = Math.hypot(fx[i], fy[i]) || 0.01, s = Math.min(l, maxStep);
      px[i] += (fx[i] / l) * s; py[i] += (fy[i] / l) * s;
    }
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  nodes.forEach((n, i) => { x0 = Math.min(x0, px[i] - n.r); x1 = Math.max(x1, px[i] + n.r); y0 = Math.min(y0, py[i] - n.r); y1 = Math.max(y1, py[i] + n.r); });
  const sc = Math.min((W - pad * 2) / Math.max(40, x1 - x0), (H - pad * 2) / Math.max(40, y1 - y0));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return nodes.map((n, i) => ({ id: n.id, r: n.r, x: W / 2 + (px[i] - cx) * sc, y: H / 2 + (py[i] - cy) * sc }));
}


/** 연결 요소별로 따로 배치한 뒤 선반(shelf) 방식으로 화면에 채워 넣는다 — 떨어진 작은 덩어리가 큰 덩어리와 겹치지 않고 가지런히 놓인다. */
export function layoutComponents(
  nodes: { id: string; r: number; community: number }[],
  edges: NetEdge[],
  W: number,
  H: number,
): Placed[] {
  const N = nodes.length;
  if (N === 0) return [];
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const par = nodes.map((_, i) => i);
  const find = (x: number): number => (par[x] === x ? x : (par[x] = find(par[x])));
  for (const e of edges) { const a = idx.get(e.source), b = idx.get(e.target); if (a != null && b != null) par[find(a)] = find(b); }
  const groups = new Map<number, number[]>();
  nodes.forEach((_, i) => { const r = find(i); (groups.get(r) ?? groups.set(r, []).get(r)!).push(i); });
  const comps = [...groups.values()].sort((a, b) => b.length - a.length);
  if (comps.length === 1) return layoutForce(nodes, edges, W, H);

  const gap = 14;
  // 노드 반지름 합(면적)에서 상자 크기를 정한다 — 작은 덩어리에서도 노드가 겹치지 않게. 안 들어가면 반지름을 줄여 다시 시도.
  const attempt = (rs: number) => {
    const boxes = comps.map((c) => {
      const area = c.reduce((sum, i) => sum + Math.PI * Math.pow(nodes[i].r * rs + 5, 2), 0);
      const side = Math.max(54, Math.sqrt(area / (c.length > 2 ? 0.34 : 0.6)));
      return { c, w: side * (c.length > 3 ? 1.18 : 1), h: side };
    });
    let x = 0, y = 0, rowH = 0, usedW = 0; const at: { x: number; y: number }[] = [];
    for (const b of boxes) {
      if (x > 0 && x + b.w > W - gap) { y += rowH + gap; x = 0; rowH = 0; }
      at.push({ x, y }); x += b.w + gap; rowH = Math.max(rowH, b.h); usedW = Math.max(usedW, x - gap);
    }
    return { boxes, at, height: y + rowH, usedW, rs };
  };
  let best = attempt(1);
  for (let rs = 1; best.height > H - gap && rs > 0.3; rs -= 0.05) best = attempt(rs);
  const out: Placed[] = [];
  const offY = Math.max(0, (H - best.height) / 2);
  best.boxes.forEach((b, k) => {
    const sub = b.c.map((i) => ({ ...nodes[i], r: nodes[i].r * best.rs }));
    const ids = new Set(sub.map((n) => n.id));
    const se = edges.filter((e) => ids.has(e.source));
    const rMax = Math.max(...sub.map((n) => n.r));
    const placed = layoutForce(sub, se, b.w, b.h, sub.length > 40 ? 300 : 220, rMax + 3);
    placed.forEach((p) => out.push({ id: p.id, r: p.r, x: best.at[k].x + p.x + (W - best.usedW) / 2, y: best.at[k].y + p.y + offY }));
  });
  return out;
}

// ───────────────────────── 표본 요약(편수 측정) ─────────────────────────

export interface ScopeStats { papers: number; authors: number; keywords: number; journals: number; institutions: number; countries: number; citedSum: number; citedMean: number; yearMedian: number; yearMin: number; yearMax: number }
export interface Summary {
  all: ScopeStats;           // 분석에 쓴 표본 전체
  top100: ScopeStats;        // 표본 중 상위 100편
  citedShareTop100: number;  // 표본 인용 합 중 상위 100편의 비율
  years: { year: number; n: number }[];
  topJournals: { name: string; n: number }[];
  topAuthors: { name: string; n: number }[];
  topInstitutions: { name: string; n: number }[];
  topCountries: { name: string; n: number }[];
  topKeywords: { name: string; n: number }[];
}

function scopeStats(rs: NetRecord[]): ScopeStats {
  const distinct = (f: (r: NetRecord) => string[]) => new Set(rs.flatMap((r) => uniq(f(r)))).size;
  const ys = rs.map((r) => r.year).filter((y) => y > 0).sort((a, b) => a - b);
  const cs = rs.reduce((s, r) => s + (r.cited || 0), 0);
  return {
    papers: rs.length, authors: distinct((r) => r.authors), keywords: distinct((r) => r.keywords), journals: distinct((r) => [r.journal || ""]),
    institutions: distinct((r) => r.institutions), countries: distinct((r) => r.countries), citedSum: cs, citedMean: rs.length ? cs / rs.length : 0,
    yearMedian: ys.length ? ys[Math.floor(ys.length / 2)] : 0, yearMin: ys[0] ?? 0, yearMax: ys[ys.length - 1] ?? 0,
  };
}
function topCounts(rs: NetRecord[], f: (r: NetRecord) => string[], n = 10) {
  const m = new Map<string, number>();
  for (const r of rs) for (const x of uniq(f(r))) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([name, k]) => ({ name, n: k }));
}
export function summarize(records: NetRecord[]): Summary {
  const sorted = [...records].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
  const top = sorted.slice(0, 100);
  const all = scopeStats(sorted), t100 = scopeStats(top);
  const ym = new Map<number, number>();
  for (const r of sorted) if (r.year > 0) ym.set(r.year, (ym.get(r.year) ?? 0) + 1);
  return {
    all, top100: t100, citedShareTop100: all.citedSum > 0 ? t100.citedSum / all.citedSum : 0,
    years: [...ym.entries()].sort((a, b) => a[0] - b[0]).map(([year, n]) => ({ year, n })),
    topJournals: topCounts(sorted, (r) => [r.journal || ""]), topAuthors: topCounts(sorted, (r) => r.authors), topInstitutions: topCounts(sorted, (r) => r.institutions),
    topCountries: topCounts(sorted, (r) => r.countries), topKeywords: topCounts(sorted, (r) => r.keywords),
  };
}
