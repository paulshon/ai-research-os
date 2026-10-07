/* ════════════════════════════════════════════════════════════
   LLB 네트워크 — 추가 분석 (서버·클라이언트 공용, 순수 TypeScript)
   - shortestPath      두 노드 사이 최단 경로
   - timelineGraphs    연도 구간별 네트워크(시간 흐름)
   - emergingTerms     최근 급증·감소 항목(신흥 주제)
   - paperTable / nodeMembership / communityProfiles   군집별 요약
   - buildCocitation   공인용(co-citation) 네트워크
═══════════════════════════════════════════════════════════════ */

import {
  buildGraph, norm, uniq, MESH_GENERIC,
  type ExtraEdges, type Graph, type GraphMetrics, type NetEdge, type NetKind, type NetNode, type NetRecord, type NodeKind,
} from "@/lib/literature/network-graph";

/** 네트워크 종류별로 한 논문이 가진 노드 후보 목록(시간 흐름·신흥 주제·군집 요약 계산용) */
export function entitiesOf(r: NetRecord, kind: NetKind): string[] {
  const clean = (a: string[]) => uniq(a ?? []);
  switch (kind) {
    case "coauthor": return clean(r.authors).slice(0, 8);
    case "institution": return clean(r.institutions).slice(0, 8);
    case "country": return clean(r.countries).slice(0, 8);
    case "funder": return clean(r.funders).slice(0, 6);
    case "mesh": return clean(r.mesh).filter((m) => !MESH_GENERIC.has(norm(m).toLowerCase())).slice(0, 8);
    case "concept": return clean(r.concepts).slice(0, 8);
    case "journal": return r.journal ? [norm(r.journal)] : [];
    default: return clean(r.keywords).slice(0, 8);     // 키워드·저자-키워드·논문 단위 네트워크는 키워드로 본다
  }
}
export const ENTITY_LABEL: Record<string, string> = {
  coauthor: "저자", institution: "기관", country: "국가", funder: "후원기관", mesh: "MeSH 용어", concept: "개념", journal: "저널", default: "키워드",
};

/** 두 노드 사이 최단 경로(연결 수가 가장 적은 경로, 같으면 연결 강도 합이 큰 쪽). 경로가 없으면 null */
export function shortestPath(nodes: { id: string }[], edges: NetEdge[], from: string, to: string): string[] | null {
  if (from === to) return [from];
  const adj = new Map<string, Map<string, number>>();
  nodes.forEach((n) => adj.set(n.id, new Map()));
  for (const e of edges) { adj.get(e.source)?.set(e.target, e.weight); adj.get(e.target)?.set(e.source, e.weight); }
  if (!adj.has(from) || !adj.has(to)) return null;
  const dist = new Map<string, number>([[from, 0]]), best = new Map<string, number>([[from, 0]]), prev = new Map<string, string>();
  const q = [from];
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (const [v, w] of adj.get(u)!) {
      if (!dist.has(v)) { dist.set(v, dist.get(u)! + 1); best.set(v, best.get(u)! + w); prev.set(v, u); q.push(v); }
      else if (dist.get(v) === dist.get(u)! + 1 && best.get(u)! + w > best.get(v)!) { best.set(v, best.get(u)! + w); prev.set(v, u); }
    }
  }
  if (!dist.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0])!);
  return path;
}

export interface Period { label: string; from: number; to: number; papers: number; graph: Graph; topNodes: { label: string; count: number }[] }
/** 출판연도를 편수가 비슷한 구간(최대 4개)으로 나눠 구간별 네트워크를 만든다 */
export function timelineGraphs(records: NetRecord[], kind: NetKind, extra: ExtraEdges = {}, maxPeriods = 4): Period[] {
  if (kind === "citation" || kind === "coupling" || kind === "cocitation") return [];
  const ys = records.map((r) => r.year).filter((y) => y > 0).sort((a, b) => a - b);
  const distinct = [...new Set(ys)];
  if (distinct.length < 2) return [];
  const k = Math.min(maxPeriods, distinct.length);
  const cuts: number[] = [];
  for (let i = 1; i <= k; i++) cuts.push(ys[Math.min(ys.length - 1, Math.ceil((ys.length * i) / k) - 1)]);
  const ends = [...new Set(cuts)];
  const out: Period[] = [];
  let lo = ys[0];
  for (const hi of ends) {
    const recs = records.filter((r) => r.year >= lo && r.year <= hi);
    if (recs.length >= 5) {
      const g = buildGraph(recs, kind, { maxNodes: 70, maxEdges: 320 }, extra);
      out.push({ label: lo === hi ? `${lo}` : `${lo}–${hi}`, from: lo, to: hi, papers: recs.length, graph: g, topNodes: [...g.nodes].sort((a, b) => b.count - a.count).slice(0, 6).map((n) => ({ label: n.label, count: n.count })) });
    }
    lo = hi + 1;
  }
  return out;
}

export interface Emerging { label: string; total: number; early: number; recent: number; growth: number; series: { year: number; n: number }[] }
export interface EmergingResult { rising: Emerging[]; falling: Emerging[]; recentFrom: number; recentTo: number; earlyPapers: number; recentPapers: number }
/** 최근 3개 연도의 편수 점유율 대 그 이전의 점유율로 급증·감소 항목을 찾는다 */
export function emergingTerms(records: NetRecord[], kind: NetKind, topN = 15): EmergingResult {
  const empty: EmergingResult = { rising: [], falling: [], recentFrom: 0, recentTo: 0, earlyPapers: 0, recentPapers: 0 };
  const years = records.map((r) => r.year).filter((y) => y > 0);
  if (years.length < 20) return empty;
  const maxY = Math.max(...years), recentFrom = maxY - 2;
  const recentRecs = records.filter((r) => r.year >= recentFrom), earlyRecs = records.filter((r) => r.year > 0 && r.year < recentFrom);
  if (recentRecs.length < 8 || earlyRecs.length < 8) return empty;
  const cnt = new Map<string, { early: number; recent: number; by: Map<number, number> }>();
  for (const r of records) {
    if (!(r.year > 0)) continue;
    for (const e of entitiesOf(r, kind)) {
      let c = cnt.get(e); if (!c) { c = { early: 0, recent: 0, by: new Map() }; cnt.set(e, c); }
      if (r.year >= recentFrom) c.recent++; else c.early++;
      c.by.set(r.year, (c.by.get(r.year) ?? 0) + 1);
    }
  }
  const minTotal = Math.max(5, Math.round(records.length * 0.002));
  const rows: Emerging[] = [];
  for (const [label, c] of cnt) {
    const total = c.early + c.recent;
    if (total < minTotal) continue;
    const sr = c.recent / recentRecs.length, se = c.early / earlyRecs.length;
    const growth = (sr + 0.5 / recentRecs.length) / (se + 0.5 / earlyRecs.length);   // 0.5건을 더해 0 나눗셈과 우연한 소수 건수의 과대평가를 줄인다
    const series = [...c.by.entries()].sort((a, b) => a[0] - b[0]).filter(([y]) => y >= maxY - 11).map(([year, n]) => ({ year, n }));
    rows.push({ label, total, early: c.early, recent: c.recent, growth, series });
  }
  const rising = rows.filter((x) => x.recent >= 3 && x.growth > 1.3).sort((a, b) => b.growth * Math.log(1 + b.recent) - a.growth * Math.log(1 + a.recent)).slice(0, topN);
  const falling = rows.filter((x) => x.early >= 5 && x.growth < 0.75).sort((a, b) => a.growth - b.growth || b.early - a.early).slice(0, 8);
  return { rising, falling, recentFrom, recentTo: maxY, earlyPapers: earlyRecs.length, recentPapers: recentRecs.length };
}

/** 화면에 보낼 대표 논문 표(순위 상위 N편) */
export interface PaperLite { i: number; title: string; year: number; cited: number; journal: string; keywords: string[]; countries: string[] }
export function paperTable(records: NetRecord[], n = 300): PaperLite[] {
  return [...records].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)).slice(0, n)
    .map((r, i) => ({ i, title: r.title, year: r.year, cited: r.cited, journal: r.journal, keywords: uniq(r.keywords).slice(0, 5), countries: uniq(r.countries).slice(0, 4) }));
}
/** 노드 → 그 노드를 가진 대표 논문(paperTable 번호). 노드 id 규칙은 buildGraph 와 같다 */
export function nodeMembership(records: NetRecord[], kind: NetKind, nodeIds: string[], n = 300): Record<string, number[]> {
  const top = [...records].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)).slice(0, n);
  const want = new Set(nodeIds), out: Record<string, number[]> = {};
  const add = (id: string, i: number) => { if (want.has(id)) (out[id] ??= []).push(i); };
  top.forEach((r, i) => {
    if (kind === "authorkw") { uniq(r.authors).slice(0, 5).forEach((a) => add(`a:${a}`, i)); uniq(r.keywords).slice(0, 6).forEach((k) => add(`k:${k}`, i)); }
    else if (kind === "citation" || kind === "coupling") { if (r.wid) add(`w${r.wid}`, i); }
    else if (kind !== "cocitation") entitiesOf(r, kind).forEach((e) => add(e, i));
  });
  return out;
}

export interface CommunityProfile {
  id: number; size: number; members: string[]; yearMean: number; yearMin: number; yearMax: number; papers: number;
  keywords: { name: string; n: number }[]; journals: { name: string; n: number }[]; countries: { name: string; n: number }[];
  topPapers: { title: string; year: number; cited: number }[];
}
/** 군집마다 대표 노드·연도·키워드·저널·국가·인용 상위 논문을 정리한다(대표 논문 표 기준) */
export function communityProfiles(nodes: NetNode[], metrics: GraphMetrics, table: PaperLite[], membership: Record<string, number[]>): CommunityProfile[] {
  const byComm = new Map<number, NetNode[]>();
  nodes.forEach((n) => { const c = metrics.perNode.get(n.id)!.community; (byComm.get(c) ?? byComm.set(c, []).get(c)!).push(n); });
  const top = (m: Map<string, number>, k = 5) => [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, k).map(([name, n]) => ({ name, n }));
  return [...byComm.entries()].sort((a, b) => b[1].length - a[1].length).map(([id, ns]) => {
    const idx = new Set<number>(); ns.forEach((n) => (membership[n.id] ?? []).forEach((i) => idx.add(i)));
    const ps = [...idx].map((i) => table[i]).filter(Boolean);
    const kw = new Map<string, number>(), jn = new Map<string, number>(), ct = new Map<string, number>();
    for (const p of ps) { p.keywords.forEach((k) => kw.set(k, (kw.get(k) ?? 0) + 1)); if (p.journal) jn.set(p.journal, (jn.get(p.journal) ?? 0) + 1); p.countries.forEach((c) => ct.set(c, (ct.get(c) ?? 0) + 1)); }
    const ys = ps.map((p) => p.year).filter((y) => y > 0), yn = ns.map((n) => n.yearMean).filter((y) => y > 0);
    const mean = (a: number[]) => a.reduce((s, y) => s + y, 0) / a.length;
    return {
      id, size: ns.length, members: [...ns].sort((a, b) => metrics.perNode.get(b.id)!.strength - metrics.perNode.get(a.id)!.strength).slice(0, 6).map((n) => n.label),
      yearMean: ys.length ? mean(ys) : yn.length ? mean(yn) : 0, yearMin: ys.length ? Math.min(...ys) : 0, yearMax: ys.length ? Math.max(...ys) : 0,
      papers: ps.length, keywords: top(kw), journals: top(jn, 4), countries: top(ct, 4),
      topPapers: [...ps].sort((a, b) => b.cited - a.cited).slice(0, 3).map((p) => ({ title: p.title, year: p.year, cited: p.cited })),
    };
  });
}

/** 공인용(co-citation): 표본 논문들이 함께 인용한 참고문헌 쌍. refs = 표본 논문 wid → 참고문헌 wid 배열 */
export function buildCocitation(
  refs: Map<number, number[]>, labels: Map<number, { label: string; year: number; cited: number }>, opts: { maxNodes?: number; minFreq?: number } = {},
): Graph {
  const maxNodes = opts.maxNodes ?? 120;
  const freq = new Map<number, number>();
  for (const list of refs.values()) for (const w of new Set(list)) freq.set(w, (freq.get(w) ?? 0) + 1);
  let minFreq = opts.minFreq ?? 3;
  let cand = [...freq.entries()].filter(([, f]) => f >= minFreq);
  if (cand.length < 20 && minFreq > 2) { minFreq = 2; cand = [...freq.entries()].filter(([, f]) => f >= 2); }
  cand.sort((a, b) => b[1] - a[1]); cand = cand.slice(0, Math.max(maxNodes * 2, 200));
  const keep = new Set(cand.map(([w]) => w));
  const pair = new Map<string, number>();
  for (const list of refs.values()) {
    const mine = [...new Set(list)].filter((w) => keep.has(w)).sort((a, b) => a - b);
    for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) { const k = `${mine[i]}\u0000${mine[j]}`; pair.set(k, (pair.get(k) ?? 0) + 1); }
  }
  const strength = new Map<number, number>();
  for (const [k, w] of pair) { if (w < 2) continue; const [a, b] = k.split("\u0000").map(Number); strength.set(a, (strength.get(a) ?? 0) + w); strength.set(b, (strength.get(b) ?? 0) + w); }
  const sel = new Set([...strength.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxNodes).map(([w]) => w));
  const edges: NetEdge[] = [];
  for (const [k, w] of pair) { if (w < 2) continue; const [a, b] = k.split("\u0000").map(Number); if (sel.has(a) && sel.has(b)) edges.push({ source: `w${a}`, target: `w${b}`, weight: w }); }
  edges.sort((x, y) => y.weight - x.weight);
  const kept = edges.slice(0, 700);
  const used = new Set<string>(); kept.forEach((e) => { used.add(e.source); used.add(e.target); });
  const nodes: NetNode[] = [...sel].filter((w) => used.has(`w${w}`)).map((w) => {
    const l = labels.get(w);
    return { id: `w${w}`, label: l?.label ?? `W${w}`, kind: "paper" as NodeKind, count: freq.get(w) ?? 0, cited: l?.cited ?? 0, yearMean: l?.year ?? 0 };
  });
  return { nodes, edges: kept, directed: false, truncated: { nodes: Math.max(0, strength.size - nodes.length), edges: Math.max(0, edges.length - kept.length) } };
}
