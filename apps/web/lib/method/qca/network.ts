/**
 * network.ts — network analysis engine (100% local).
 * Faithful port of core/network.py for graph construction (keyword/code/city),
 * plus a full TypeScript implementation of the metrics the Python original
 * delegated to networkx: degree, weighted-Brandes betweenness, eigenvector
 * centrality (power iteration), and greedy-modularity communities.
 */
import type { QcaProject } from "./project";
import type { NetworkType, NetworkMetrics } from "./types";
import { Counter } from "./counter";

const DEFAULT_CITIES = [
  "seoul", "tokyo", "london", "berlin", "new york", "paris",
  "beijing", "shanghai", "hong kong", "amsterdam",
];

function pairKey(a: string, b: string): string {
  return a + "\u0000" + b;
}

function combos2<T>(items: T[]): Array<[T, T]> {
  const out: Array<[T, T]> = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) out.push([items[i], items[j]]);
  return out;
}

export function buildKeywordNetwork(
  project: QcaProject,
  topTerms = 40,
  minEdge = 2
): Array<[string, string, number]> {
  const docs = project.sentences().map((r) => r.tokens ?? []);
  const freq = new Counter<string>();
  for (const t of docs) freq.update(t);
  const vocab = new Set(freq.mostCommon(topTerms).map(([w]) => w));
  const edges = new Counter<string>();
  for (const t of docs) {
    const present = Array.from(new Set(t)).filter((w) => vocab.has(w)).sort();
    for (const [a, b] of combos2(present)) edges.add(pairKey(a, b));
  }
  return saveEdges(project, "keyword", edges, minEdge);
}

export function buildCodeNetwork(project: QcaProject, minEdge = 1): Array<[string, string, number]> {
  const rows = project.coding_results().filter((r) => r.status !== "rejected");
  const bySent: Record<number, Set<string>> = {};
  for (const r of rows) (bySent[r.sentence_id] ??= new Set()).add(r.code_name);
  const edges = new Counter<string>();
  for (const codes of Object.values(bySent)) {
    const sorted = Array.from(codes).sort();
    for (const [a, b] of combos2(sorted)) edges.add(pairKey(a, b));
  }
  return saveEdges(project, "code", edges, minEdge);
}

export function buildCityNetwork(
  project: QcaProject,
  cities: string[] = DEFAULT_CITIES,
  minEdge = 1
): Array<[string, string, number]> {
  const cs = cities.map((c) => c.toLowerCase());
  const edges = new Counter<string>();
  for (const r of project.sentences()) {
    const text = (r.sentence_text || "").toLowerCase();
    const present = cs.filter((c) => text.includes(c)).sort();
    for (const [a, b] of combos2(present)) edges.add(pairKey(a, b));
  }
  return saveEdges(project, "city", edges, minEdge);
}

function saveEdges(
  project: QcaProject,
  net: NetworkType,
  edges: Counter<string>,
  minEdge: number
): Array<[string, string, number]> {
  project.clear_networks(net);
  const saved: Array<[string, string, number]> = [];
  for (const [key, w] of edges.entries()) {
    if (w >= minEdge) {
      const [a, b] = key.split("\u0000");
      project.add_edge(net, a, b, w);
      saved.push([a, b, w]);
    }
  }
  project.commit();
  return saved;
}

// ── graph metrics ───────────────────────────────────────
interface Graph {
  nodes: string[];
  adj: Map<string, Map<string, number>>;
}

function buildGraph(edges: Array<[string, string, number]>): Graph {
  const adj = new Map<string, Map<string, number>>();
  const ensure = (n: string) => {
    if (!adj.has(n)) adj.set(n, new Map());
    return adj.get(n)!;
  };
  for (const [a, b, w] of edges) {
    ensure(a).set(b, w);
    ensure(b).set(a, w);
  }
  return { nodes: Array.from(adj.keys()), adj };
}

/** Weighted Brandes betweenness (weight = distance), normalized like networkx (undirected). */
function betweenness(g: Graph): Map<string, number> {
  const bc = new Map<string, number>();
  for (const n of g.nodes) bc.set(n, 0);

  for (const s of g.nodes) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();
    for (const n of g.nodes) {
      pred.set(n, []);
      sigma.set(n, 0);
      dist.set(n, Infinity);
    }
    sigma.set(s, 1);
    dist.set(s, 0);

    // Dijkstra with a simple array-based priority selection
    const visited = new Set<string>();
    const pq: Array<[number, string]> = [[0, s]];
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]);
      const [d, v] = pq.shift()!;
      if (visited.has(v)) continue;
      visited.add(v);
      stack.push(v);
      for (const [w, weight] of g.adj.get(v) ?? []) {
        const nd = d + weight;
        if (nd < (dist.get(w) ?? Infinity)) {
          dist.set(w, nd);
          pq.push([nd, w]);
          sigma.set(w, sigma.get(v)!);
          pred.set(w, [v]);
        } else if (nd === dist.get(w)) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    for (const n of g.nodes) delta.set(n, 0);
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        const c = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + c);
      }
      if (w !== s) bc.set(w, bc.get(w)! + delta.get(w)!);
    }
  }

  // undirected: each path counted twice → halve; then normalize
  const n = g.nodes.length;
  for (const k of bc.keys()) bc.set(k, bc.get(k)! / 2);
  if (n > 2) {
    const scale = 1 / ((n - 1) * (n - 2) / 2);
    for (const k of bc.keys()) bc.set(k, bc.get(k)! * scale);
  }
  return bc;
}

/** Weighted eigenvector centrality via power iteration (networkx-style). */
function eigenvector(g: Graph, maxIter = 500, tol = 1e-6): Map<string, number> {
  const n = g.nodes.length;
  let x = new Map<string, number>();
  for (const node of g.nodes) x.set(node, 1 / n);
  for (let it = 0; it < maxIter; it++) {
    const xlast = x;
    x = new Map(xlast);
    for (const node of g.nodes) {
      let sum = xlast.get(node)!;
      for (const [nb, w] of g.adj.get(node) ?? []) sum += xlast.get(nb)! * w;
      x.set(node, sum);
    }
    let norm = 0;
    for (const v of x.values()) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    for (const k of x.keys()) x.set(k, x.get(k)! / norm);
    let err = 0;
    for (const node of g.nodes) err += Math.abs(x.get(node)! - xlast.get(node)!);
    if (err < n * tol) break;
  }
  return x;
}

/** Greedy modularity communities (Clauset–Newman–Moore) + modularity score. */
function greedyCommunities(g: Graph): { communities: number; modularity: number | null } {
  const nodes = g.nodes;
  if (!nodes.length) return { communities: 0, modularity: null };
  let m2 = 0; // 2m (sum of weights, each edge counted twice across adj)
  const k = new Map<string, number>();
  for (const node of nodes) {
    let deg = 0;
    for (const [, w] of g.adj.get(node) ?? []) deg += w;
    k.set(node, deg);
    m2 += deg;
  }
  const m = m2 / 2;
  if (m === 0) return { communities: nodes.length, modularity: null };

  // start: each node its own community
  let comm = new Map<string, number>();
  nodes.forEach((node, i) => comm.set(node, i));

  const modularity = (assign: Map<string, number>): number => {
    let q = 0;
    for (const a of nodes) {
      for (const b of nodes) {
        if (assign.get(a) !== assign.get(b)) continue;
        const w = g.adj.get(a)?.get(b) ?? 0;
        q += w - (k.get(a)! * k.get(b)!) / m2;
      }
    }
    return q / m2;
  };

  let improved = true;
  while (improved) {
    improved = false;
    let bestGain = 1e-12;
    let bestPair: [number, number] | null = null;
    const commIds = Array.from(new Set(comm.values()));
    const baseQ = modularity(comm);
    for (let i = 0; i < commIds.length; i++) {
      for (let j = i + 1; j < commIds.length; j++) {
        const ci = commIds[i];
        const cj = commIds[j];
        // try merging cj into ci
        const trial = new Map(comm);
        for (const [node, c] of trial) if (c === cj) trial.set(node, ci);
        const gain = modularity(trial) - baseQ;
        if (gain > bestGain) {
          bestGain = gain;
          bestPair = [ci, cj];
        }
      }
    }
    if (bestPair) {
      const [ci, cj] = bestPair;
      for (const [node, c] of comm) if (c === cj) comm.set(node, ci);
      improved = true;
    }
  }

  const finalIds = new Set(comm.values());
  return { communities: finalIds.size, modularity: round(modularity(comm), 4) };
}

export function metrics(project: QcaProject, netType: NetworkType = "keyword"): NetworkMetrics {
  const edges = project.edges(netType).map((e) => [e.source_node, e.target_node, e.weight] as [string, string, number]);
  if (!edges.length) {
    return { nodes: 0, edges: 0, degree: [], betweenness: [], eigenvector: [], communities: 0, modularity: null };
  }
  const g = buildGraph(edges);

  const degree = g.nodes
    .map((n) => [n, g.adj.get(n)!.size] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const bc = betweenness(g);
  const bet = Array.from(bc.entries())
    .map(([n, v]) => [n, round(v, 4)] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const ec = eigenvector(g);
  const eig = Array.from(ec.entries())
    .map(([n, v]) => [n, round(v, 4)] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const { communities, modularity } = greedyCommunities(g);

  return {
    nodes: g.nodes.length,
    edges: edges.length,
    degree: degree.slice(0, 15),
    betweenness: bet.slice(0, 15),
    eigenvector: eig.slice(0, 15),
    communities,
    modularity,
  };
}

function round(x: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}
