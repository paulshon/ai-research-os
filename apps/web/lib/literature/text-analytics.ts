/* ════════════════════════════════════════════════════════════
   LLB 데이터 분석 — 텍스트·통계 계산 (순수 TypeScript, 서버·클라이언트 공용)
   - tokenize / TF-IDF / LSA(잠재 의미 분석) / k-means      → 토픽 모델링·초록 지도
   - raoStirling                                            → 학제성(Rao–Stirling)
   - ols                                                    → 인용 영향 요인 회귀
   - lorenz                                                 → 인용 집중도(로렌츠 곡선·지니)
   - thematicEvolution                                      → 주제 변천(군집 계통)
   - mainPath                                               → 인용 주경로(SPC)
   - METHODS / OBJECTS                                      → 연구 공백 매트릭스 사전
═══════════════════════════════════════════════════════════════ */

// ───────────────────────── 난수(재현 가능) ─────────────────────────
export function rng(seed = 12345) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// ───────────────────────── 토큰화 · TF-IDF ─────────────────────────
const STOP = new Set((("the of and in to a for with on by is are was were be been this that these those from as at an or it its into we our their which than then also can may might using used use based study studies paper papers research results result method methods approach analysis data new however between among across during after before over under more most less such not no but has have had do does did via per et al show shown shows showed propose proposed present presented provide provides provided found find finding findings aim aims purpose objective objectives background conclusion conclusions abstract introduction review high low large small different various several well first two three one using includes include included including related effect effects role case associated specific recent current important potential novel significant significantly overall both each other within without further many much while where when what how why who whom whose there here they them he she his her you your i me my us do") + " 이 그 저 및 등 의 를 을 은 는 이다 있다 한다 대한 위한 통해 따라 에서 으로 에게 하여 하는 되는 대해 연구 분석 결과 방법").split(" ").filter(Boolean));

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of String(text || "").toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (!raw) continue;
    const hangul = /[가-힣]/.test(raw);
    if (!hangul && (raw.length < 3 || /^\d+$/.test(raw))) continue;
    if (hangul && raw.length < 2) continue;
    if (STOP.has(raw)) continue;
    out.push(raw);
  }
  return out;
}

export interface TfIdf { vocab: string[]; rows: { idx: number[]; val: number[] }[]; df: number[] }
/** 문서 토큰 배열들 → 희소 TF-IDF(행 L2 정규화). 문서 빈도가 너무 낮거나 높은 단어는 버린다. */
export function tfidf(docs: string[][], opts: { minDf?: number; maxDfShare?: number; maxVocab?: number } = {}): TfIdf {
  const n = docs.length, minDf = opts.minDf ?? 3, maxDf = Math.floor(n * (opts.maxDfShare ?? 0.5)), maxV = opts.maxVocab ?? 4000;
  const dfm = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) dfm.set(t, (dfm.get(t) ?? 0) + 1);
  const vocab = [...dfm.entries()].filter(([, c]) => c >= minDf && c <= maxDf).sort((a, b) => b[1] - a[1]).slice(0, maxV).map(([t]) => t);
  const index = new Map(vocab.map((t, i) => [t, i]));
  const df = vocab.map((t) => dfm.get(t)!);
  const rows = docs.map((d) => {
    const tf = new Map<number, number>();
    for (const t of d) { const i = index.get(t); if (i != null) tf.set(i, (tf.get(i) ?? 0) + 1); }
    const idx: number[] = [], val: number[] = []; let norm = 0;
    for (const [i, c] of [...tf.entries()].sort((a, b) => a[0] - b[0])) { const w = (1 + Math.log(c)) * Math.log((n + 1) / (df[i] + 0.5)); idx.push(i); val.push(w); norm += w * w; }
    norm = Math.sqrt(norm) || 1;
    return { idx, val: val.map((v) => v / norm) };
  });
  return { vocab, rows, df };
}

// ───────────────────────── LSA · PCA · k-means ─────────────────────────
function orthonormalize(Q: number[][]) {                       // 열(= Q[j]) 들을 Gram–Schmidt 로 직교 정규화
  for (let j = 0; j < Q.length; j++) {
    for (let i = 0; i < j; i++) { let d = 0; for (let t = 0; t < Q[j].length; t++) d += Q[j][t] * Q[i][t]; for (let t = 0; t < Q[j].length; t++) Q[j][t] -= d * Q[i][t]; }
    let nr = 0; for (const v of Q[j]) nr += v * v; nr = Math.sqrt(nr) || 1; for (let t = 0; t < Q[j].length; t++) Q[j][t] /= nr;
  }
}
/** 희소 TF-IDF 행렬의 잠재 의미 공간(상위 k개 방향)에서 문서 좌표를 구한다(무작위 부분공간 반복법). */
export function lsa(m: TfIdf, k = 12, iters = 5, seed = 7): number[][] {
  const V = m.vocab.length, n = m.rows.length;
  if (V === 0 || n === 0) return [];
  k = Math.min(k, V, n);
  const rnd = rng(seed);
  const Q: number[][] = Array.from({ length: k }, () => Array.from({ length: V }, () => rnd() - 0.5));
  orthonormalize(Q);
  const mulXQ = () => m.rows.map((r) => Q.map((q) => { let s = 0; for (let t = 0; t < r.idx.length; t++) s += r.val[t] * q[r.idx[t]]; return s; }));   // n×k
  for (let it = 0; it < iters; it++) {
    const Y = mulXQ();
    for (let j = 0; j < k; j++) Q[j].fill(0);
    m.rows.forEach((r, d) => { for (let j = 0; j < k; j++) { const y = Y[d][j]; for (let t = 0; t < r.idx.length; t++) Q[j][r.idx[t]] += r.val[t] * y; } });   // Q = Xᵀ Y
    orthonormalize(Q);
  }
  return mulXQ();
}
/** 행렬(문서×차원)의 상위 2개 주성분 좌표 */
export function pca2(E: number[][]): { x: number; y: number }[] {
  const n = E.length; if (!n) return [];
  const k = E[0].length, mean = Array.from({ length: k }, (_, j) => E.reduce((s, r) => s + r[j], 0) / n);
  const C = E.map((r) => r.map((v, j) => v - mean[j]));
  const cov = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const r of C) for (let a = 0; a < k; a++) for (let b = a; b < k; b++) cov[a][b] += r[a] * r[b];
  for (let a = 0; a < k; a++) for (let b = a; b < k; b++) { cov[a][b] /= Math.max(1, n - 1); cov[b][a] = cov[a][b]; }
  const vecs: number[][] = [];
  for (let c = 0; c < Math.min(2, k); c++) {
    let v = Array.from({ length: k }, (_, i) => 1 + ((i * 7 + c * 3) % 5) * 0.1);
    for (let it = 0; it < 80; it++) {
      const w = v.map((_, a) => cov[a].reduce((s, x, b) => s + x * v[b], 0));
      for (const u of vecs) { const d = w.reduce((s, x, i) => s + x * u[i], 0); for (let i = 0; i < k; i++) w[i] -= d * u[i]; }
      const nr = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1; v = w.map((x) => x / nr);
    }
    vecs.push(v);
  }
  return C.map((r) => ({ x: r.reduce((s, x, i) => s + x * vecs[0][i], 0), y: vecs[1] ? r.reduce((s, x, i) => s + x * vecs[1][i], 0) : 0 }));
}
/** k-means(코사인: 행을 단위 길이로 맞춘 뒤 유클리드). k-means++ 초기화, 결정적. */
export function kmeans(E: number[][], k: number, seed = 3, iters = 30): number[] {
  const n = E.length; if (!n) return [];
  k = Math.max(1, Math.min(k, n));
  const X = E.map((r) => { const nr = Math.sqrt(r.reduce((s, x) => s + x * x, 0)) || 1; return r.map((x) => x / nr); });
  const rnd = rng(seed), d2 = (a: number[], b: number[]) => a.reduce((s, x, i) => s + (x - b[i]) * (x - b[i]), 0);
  const cent = [X[Math.floor(rnd() * n)].slice()];
  while (cent.length < k) {
    const dist = X.map((x) => Math.min(...cent.map((c) => d2(x, c)))), tot = dist.reduce((s, x) => s + x, 0) || 1;
    let r = rnd() * tot, pick = 0; for (let i = 0; i < n; i++) { r -= dist[i]; if (r <= 0) { pick = i; break; } }
    cent.push(X[pick].slice());
  }
  let asg = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    let changed = false;
    for (let i = 0; i < n; i++) { let best = 0, bd = Infinity; for (let c = 0; c < k; c++) { const d = d2(X[i], cent[c]); if (d < bd) { bd = d; best = c; } } if (asg[i] !== best) { asg[i] = best; changed = true; } }
    for (let c = 0; c < k; c++) { const mem = X.filter((_, i) => asg[i] === c); if (mem.length) cent[c] = cent[c].map((_, j) => mem.reduce((s, x) => s + x[j], 0) / mem.length); }
    if (!changed) break;
  }
  const size = new Array(k).fill(0); asg.forEach((c) => size[c]++);
  const order = [...size.keys()].sort((a, b) => size[b] - size[a]), remap = new Map(order.map((c, i) => [c, i]));
  return asg.map((c) => remap.get(c)!);
}
/** 군집마다 다른 군집보다 두드러지는 단어(평균 TF-IDF 차이)를 라벨로 뽑는다 */
export function clusterTerms(m: TfIdf, asg: number[], k: number, topN = 5): string[][] {
  const V = m.vocab.length, sums = Array.from({ length: k }, () => new Float64Array(V)), cnt = new Array(k).fill(0), all = new Float64Array(V);
  m.rows.forEach((r, d) => { const c = asg[d]; cnt[c]++; for (let t = 0; t < r.idx.length; t++) { sums[c][r.idx[t]] += r.val[t]; all[r.idx[t]] += r.val[t]; } });
  const n = m.rows.length;
  return Array.from({ length: k }, (_, c) => {
    const sc: [number, number][] = [];
    for (let v = 0; v < V; v++) { const inC = sums[c][v] / Math.max(1, cnt[c]), out = (all[v] - sums[c][v]) / Math.max(1, n - cnt[c]); if (inC > 0) sc.push([v, inC - out]); }
    return sc.sort((a, b) => b[1] - a[1]).slice(0, topN).map(([v]) => m.vocab[v]);
  });
}

// ───────────────────────── 학제성(Rao–Stirling) ─────────────────────────
export interface RaoStirling { rs: number[]; concepts: string[]; dist: number[][] }
/** 논문마다 개념 목록 → 개념 간 거리(1 − 동시출현 코사인) → 논문별 RS = Σ_{i≠j} p_i p_j d_ij */
export function raoStirling(conceptLists: string[][], topC = 150): RaoStirling {
  const df = new Map<string, number>();
  const lists = conceptLists.map((l) => [...new Set(l.map((x) => x.trim()).filter(Boolean))]);
  for (const l of lists) for (const c of l) df.set(c, (df.get(c) ?? 0) + 1);
  const concepts = [...df.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, topC).map(([c]) => c);
  const idx = new Map(concepts.map((c, i) => [c, i])), C = concepts.length;
  const co = Array.from({ length: C }, () => new Float64Array(C));
  for (const l of lists) { const ids = l.map((c) => idx.get(c)).filter((x): x is number => x != null).slice(0, 12); for (const a of ids) for (const b of ids) co[a][b] += 1; }
  const dist = Array.from({ length: C }, (_, a) => Array.from({ length: C }, (_, b) => (a === b ? 0 : 1 - co[a][b] / Math.sqrt(Math.max(1, co[a][a]) * Math.max(1, co[b][b])))));
  const rs = lists.map((l) => {
    const ids = l.map((c) => idx.get(c)).filter((x): x is number => x != null).slice(0, 12), m = ids.length;
    if (m < 2) return 0;
    let s = 0; for (const a of ids) for (const b of ids) if (a !== b) s += dist[a][b];
    return s / (m * m);
  });
  return { rs, concepts, dist };
}

// ───────────────────────── 회귀(OLS) ─────────────────────────
export interface OlsResult { names: string[]; coef: number[]; se: number[]; t: number[]; r2: number; n: number }
/** y = Xβ. X 의 첫 열은 절편이어야 한다. 정규방정식(Cholesky) + 작은 능형 항으로 안정화 */
export function ols(X: number[][], y: number[], names: string[]): OlsResult {
  const n = X.length, p = names.length;
  const A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < p; a++) { b[a] += X[i][a] * y[i]; for (let c = a; c < p; c++) A[a][c] += X[i][a] * X[i][c]; }
  for (let a = 0; a < p; a++) { for (let c = a + 1; c < p; c++) A[c][a] = A[a][c]; A[a][a] += 1e-8 * (A[a][a] + 1); }
  const inv = invert(A), coef = inv.map((row) => row.reduce((s, v, c) => s + v * b[c], 0));
  let sse = 0, sst = 0; const my = y.reduce((s, v) => s + v, 0) / n;
  for (let i = 0; i < n; i++) { const pred = X[i].reduce((s, v, c) => s + v * coef[c], 0); sse += (y[i] - pred) ** 2; sst += (y[i] - my) ** 2; }
  const sigma2 = sse / Math.max(1, n - p), se = inv.map((row, a) => Math.sqrt(Math.max(0, row[a] * sigma2)));
  return { names, coef, se, t: coef.map((c, a) => (se[a] ? c / se[a] : 0)), r2: sst ? 1 - sse / sst : 0, n };
}
function invert(M: number[][]): number[][] {
  const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    const d = A[c][c] || 1e-12; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((r) => r.slice(n));
}
export function correlation(cols: number[][]): number[][] {
  const k = cols.length, n = cols[0]?.length ?? 0, mean = cols.map((c) => c.reduce((s, v) => s + v, 0) / n), sd = cols.map((c, i) => Math.sqrt(c.reduce((s, v) => s + (v - mean[i]) ** 2, 0) / Math.max(1, n - 1)) || 1);
  return Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => (a === b ? 1 : cols[a].reduce((s, v, i) => s + ((v - mean[a]) * (cols[b][i] - mean[b])), 0) / (Math.max(1, n - 1) * sd[a] * sd[b]))));
}

// ───────────────────────── 로렌츠 · 지니 ─────────────────────────
/** 값이 작은 칸부터 정렬된 구간(논문 수 n, 인용 합 s) → 로렌츠 곡선 점과 지니계수(구간 근사) */
export function lorenz(bins: { n: number; s: number }[]): { points: [number, number][]; gini: number; topShare: (p: number) => number } {
  const N = bins.reduce((a, b) => a + b.n, 0), S = bins.reduce((a, b) => a + b.s, 0);
  const points: [number, number][] = [[0, 0]]; let cn = 0, cs = 0;
  for (const b of bins) { cn += b.n; cs += b.s; points.push([N ? cn / N : 0, S ? cs / S : 0]); }
  let area = 0; for (let i = 1; i < points.length; i++) area += ((points[i][1] + points[i - 1][1]) / 2) * (points[i][0] - points[i - 1][0]);
  const topShare = (p: number) => { const x = 1 - p; for (let i = 1; i < points.length; i++) if (points[i][0] >= x) { const [x0, y0] = points[i - 1], [x1, y1] = points[i]; const t = x1 > x0 ? (x - x0) / (x1 - x0) : 0; return 1 - (y0 + (y1 - y0) * t); } return 0; };
  return { points, gini: 1 - 2 * area, topShare };
}

// ───────────────────────── 주제 변천(군집 계통) ─────────────────────────
export interface ThemeNode { id: string; period: number; label: string; size: number; members: string[]; status: string }
export interface ThemeLink { source: string; target: string; value: number; jaccard: number }
export function thematicEvolution(periods: { label: string; communities: { members: string[]; weight: number; terms: string[] }[] }[], minJaccard = 0.08): { nodes: ThemeNode[]; links: ThemeLink[]; periods: string[] } {
  const nodes: ThemeNode[] = [], links: ThemeLink[] = [];
  periods.forEach((p, pi) => p.communities.forEach((c, ci) => nodes.push({ id: `${pi}:${ci}`, period: pi, label: c.terms.slice(0, 3).join(" · ") || c.members.slice(0, 3).join(" · "), size: c.weight, members: c.members, status: "" })));
  for (let pi = 0; pi + 1 < periods.length; pi++) {
    periods[pi].communities.forEach((a, ai) => {
      const A = new Set(a.members);
      periods[pi + 1].communities.forEach((b, bi) => {
        const inter = b.members.filter((m) => A.has(m)).length; if (!inter) return;
        const uni = new Set([...a.members, ...b.members]).size, j = inter / uni;
        if (j >= minJaccard || inter / Math.min(a.members.length, b.members.length) >= 0.5) links.push({ source: `${pi}:${ai}`, target: `${pi + 1}:${bi}`, value: inter, jaccard: j });
      });
    });
  }
  const outDeg = new Map<string, number>(), inDeg = new Map<string, number>();
  links.forEach((l) => { outDeg.set(l.source, (outDeg.get(l.source) ?? 0) + 1); inDeg.set(l.target, (inDeg.get(l.target) ?? 0) + 1); });
  const last = periods.length - 1;
  nodes.forEach((n) => {
    const i = inDeg.get(n.id) ?? 0, o = outDeg.get(n.id) ?? 0;
    n.status = n.period === 0 ? (o === 0 && last > 0 ? "소멸" : o > 1 ? "분기" : "시작") : i === 0 ? "신규" : i > 1 ? "합류" : n.period === last ? "지속" : o === 0 ? "소멸" : o > 1 ? "분기" : "지속";
  });
  return { nodes, links, periods: periods.map((p) => p.label) };
}

// ───────────────────────── 인용 주경로(SPC) ─────────────────────────
export interface MainPath { path: string[]; edges: { source: string; target: string; spc: number }[]; ids: Set<string> }
/** 지식은 오래된 논문 → 새 논문으로 흐른다. edges.citing 이 edges.cited 를 인용 → 흐름 cited→citing. 사이클(같은 해 상호인용 등)은 제거. */
export function mainPath(nodes: { id: string; year: number }[], cites: { citing: string; cited: string }[]): MainPath {
  const year = new Map(nodes.map((n) => [n.id, n.year]));
  const out = new Map<string, string[]>(), inn = new Map<string, string[]>();
  nodes.forEach((n) => { out.set(n.id, []); inn.set(n.id, []); });
  const seen = new Set<string>();
  for (const c of cites) {
    const a = c.cited, b = c.citing;
    if (!year.has(a) || !year.has(b) || a === b) continue;
    const ya = year.get(a)!, yb = year.get(b)!;
    if (ya > yb || (ya === yb && a > b)) continue;
    const k = `${a}\u0000${b}`; if (seen.has(k)) continue; seen.add(k);
    out.get(a)!.push(b); inn.get(b)!.push(a);
  }
  const order = [...nodes].sort((x, y) => x.year - y.year || (x.id < y.id ? -1 : 1)).map((n) => n.id);
  const fwd = new Map<string, number>(), bwd = new Map<string, number>();
  for (const v of order) fwd.set(v, inn.get(v)!.length === 0 ? 1 : inn.get(v)!.reduce((s, u) => s + fwd.get(u)!, 0));
  for (const v of [...order].reverse()) bwd.set(v, out.get(v)!.length === 0 ? 1 : out.get(v)!.reduce((s, w) => s + bwd.get(w)!, 0));
  const spc = (a: string, b: string) => fwd.get(a)! * bwd.get(b)!;
  // 출발: 들어오는 간선이 없고 나가는 간선 SPC 합이 가장 큰 노드
  const sources = order.filter((v) => inn.get(v)!.length === 0 && out.get(v)!.length > 0);
  if (!sources.length) return { path: [], edges: [], ids: new Set() };
  let cur = sources.sort((a, b) => out.get(b)!.reduce((s, w) => s + spc(b, w), 0) - out.get(a)!.reduce((s, w) => s + spc(a, w), 0))[0];
  const path = [cur], edges: MainPath["edges"] = [];
  while (out.get(cur)!.length) {
    const next = [...out.get(cur)!].sort((x, y) => spc(cur, y) - spc(cur, x) || (x < y ? -1 : 1))[0];
    edges.push({ source: cur, target: next, spc: spc(cur, next) }); path.push(next); cur = next;
  }
  return { path, edges, ids: new Set(path) };
}

// ───────────────────────── 연구 공백 매트릭스 사전 ─────────────────────────
export interface Lex { id: string; label: string; terms: string[] }
export const METHODS: Lex[] = [
  { id: "survey", label: "설문·조사", terms: ["survey", "questionnaire", "cross-sectional", "likert", "설문", "조사연구"] },
  { id: "qual", label: "질적·인터뷰", terms: ["interview", "qualitative", "focus group", "thematic analysis", "grounded theory", "ethnograph", "면담", "인터뷰", "질적"] },
  { id: "experiment", label: "실험", terms: ["experiment", "randomized", "randomised", "trial", "in vitro", "in vivo", "실험"] },
  { id: "cohort", label: "코호트·관찰", terms: ["cohort", "retrospective", "prospective", "observational", "case-control", "longitudinal", "register", "코호트"] },
  { id: "case", label: "사례연구", terms: ["case study", "case report", "case series", "사례연구", "사례 연구"] },
  { id: "review", label: "리뷰·메타분석", terms: ["systematic review", "meta-analysis", "meta analysis", "scoping review", "literature review", "bibliometric", "문헌고찰", "메타분석", "체계적 문헌"] },
  { id: "ml", label: "기계학습·딥러닝", terms: ["machine learning", "deep learning", "neural network", "convolutional", "transformer", "random forest", "artificial intelligence", "딥러닝", "머신러닝", "기계학습", "인공지능"] },
  { id: "sim", label: "시뮬레이션·모델링", terms: ["simulation", "numerical", "finite element", "monte carlo", "mathematical model", "computational model", "시뮬레이션", "모델링"] },
  { id: "theory", label: "이론·개념", terms: ["theoretical framework", "conceptual", "theory", "framework", "perspective", "이론적", "개념적"] },
];
export const OBJECTS: Lex[] = [
  { id: "child", label: "아동·청소년", terms: ["child", "adolescent", "youth", "pediatric", "student", "아동", "청소년", "학생"] },
  { id: "elder", label: "노인", terms: ["elderly", "older adult", "aging", "ageing", "geriatric", "노인", "고령"] },
  { id: "patient", label: "환자·임상", terms: ["patient", "clinical", "hospital", "disease", "환자", "임상"] },
  { id: "worker", label: "근로자·조직", terms: ["worker", "employee", "organization", "organisation", "firm", "workplace", "근로자", "직장", "조직"] },
  { id: "women", label: "여성", terms: ["women", "female", "gender", "maternal", "pregnan", "여성"] },
  { id: "teacher", label: "교사·교육", terms: ["teacher", "education", "curriculum", "school", "교사", "교육과정", "교육"] },
  { id: "community", label: "지역사회·정책", terms: ["community", "policy", "public health", "government", "지역사회", "정책"] },
];
