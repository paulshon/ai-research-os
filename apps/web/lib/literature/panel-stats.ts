/* ════════════════════════════════════════════════════════════
   종단(시간 흐름)·횡단(한 시점 비교) 분석용 통계 — 순수 TypeScript
   종단: 성장 모형(선형·지수·로지스틱)+예측, 변화점, Mann–Kendall 추세 검정(Sen 기울기), 주제 생애주기
   횡단: Welch t 검정(효과크기 Cohen d), 카이제곱 검정(Cramér V·표준화 잔차), 일원 분산분석(η²)
═══════════════════════════════════════════════════════════════ */

// ───────────────────────── 분포 함수 ─────────────────────────
function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015;
  for (const cj of c) ser += cj / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
export const pTwoSided = (z: number) => 2 * (1 - normalCdf(Math.abs(z)));
/** 정규화 불완전 감마 P(a, x) */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) { let sum = 1 / a, del = sum, ap = a; for (let n = 0; n < 200; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-12) break; } return sum * Math.exp(-x + a * Math.log(x) - lgamma(a)); }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 200; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break; }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}
export const chi2Sf = (x: number, df: number) => Math.max(0, 1 - gammaP(df / 2, x / 2));
/** 정규화 불완전 베타 I_x(a, b) */
function betaI(x: number, a: number, b: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (xx: number, aa: number, bb: number) => { let c = 1, d = 1 - ((aa + bb) * xx) / (aa + 1); if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
    for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aaa = (m * (bb - m) * xx) / ((aa + m2 - 1) * (aa + m2)); d = 1 + aaa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aaa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
      aaa = (-(aa + m) * (aa + bb + m) * xx) / ((aa + m2) * (aa + m2 + 1)); d = 1 + aaa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aaa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break; } return h; };
  return x < (a + 1) / (a + b + 2) ? (bt * cf(x, a, b)) / a : 1 - (bt * cf(1 - x, b, a)) / b;
}
export const fSf = (f: number, d1: number, d2: number) => (f <= 0 ? 1 : betaI(d2 / (d2 + d1 * f), d2 / 2, d1 / 2));
export const tSf2 = (t: number, df: number) => betaI(df / (df + t * t), df / 2, 0.5);   // 양측 p

// ───────────────────────── 횡단: 두 집단 · 교차표 · 분산분석 ─────────────────────────
export interface Grp { n: number; mean: number; sd: number }
export interface WelchResult { diff: number; t: number; df: number; p: number; ci: [number, number]; d: number }
/** Welch t 검정(분산이 달라도 됨)과 Cohen d. 두 집단은 같은 척도(예: log(1+피인용))의 평균·표준편차·표본 수 */
export function welch(a: Grp, b: Grp): WelchResult {
  const va = (a.sd * a.sd) / a.n, vb = (b.sd * b.sd) / b.n, se = Math.sqrt(va + vb) || 1e-12, diff = a.mean - b.mean, t = diff / se;
  const df = (va + vb) ** 2 / ((va * va) / Math.max(1, a.n - 1) + (vb * vb) / Math.max(1, b.n - 1) || 1e-12);
  const p = tSf2(t, df), z = 1.96, sp = Math.sqrt(((a.n - 1) * a.sd ** 2 + (b.n - 1) * b.sd ** 2) / Math.max(1, a.n + b.n - 2)) || 1e-12;
  return { diff, t, df, p, ci: [diff - z * se, diff + z * se], d: diff / sp };
}
export interface Chi2Result { chi2: number; df: number; p: number; v: number; resid: number[][]; expected: number[][]; n: number }
/** r×c 교차표 독립성 검정. v = Cramér V, resid = 표준화 잔차(±2 이상이면 눈에 띄게 많음/적음) */
export function chi2Test(table: number[][]): Chi2Result {
  const R = table.length, C = table[0]?.length ?? 0, rs = table.map((r) => r.reduce((s, v) => s + v, 0)), cs = Array.from({ length: C }, (_, j) => table.reduce((s, r) => s + r[j], 0)), n = rs.reduce((s, v) => s + v, 0) || 1;
  const exp = table.map((_, i) => cs.map((c) => (rs[i] * c) / n)); let chi2 = 0;
  const resid = table.map((r, i) => r.map((o, j) => { const e = exp[i][j]; if (e > 0) chi2 += (o - e) ** 2 / e; return e > 0 ? (o - e) / Math.sqrt(e * (1 - rs[i] / n) * (1 - cs[j] / n) || 1e-12) : 0; }));
  const df = (R - 1) * (C - 1);
  return { chi2, df, p: df > 0 ? chi2Sf(chi2, df) : 1, v: Math.sqrt(chi2 / (n * Math.max(1, Math.min(R, C) - 1))), resid, expected: exp, n };
}
export interface AnovaResult { f: number; df1: number; df2: number; p: number; eta2: number }
/** 일원 분산분석: 집단 간 변동이 전체 변동에서 차지하는 비율 η² */
export function anova(groups: Grp[]): AnovaResult {
  const g = groups.filter((x) => x.n > 1), N = g.reduce((s, x) => s + x.n, 0), grand = g.reduce((s, x) => s + x.n * x.mean, 0) / Math.max(1, N);
  const ssb = g.reduce((s, x) => s + x.n * (x.mean - grand) ** 2, 0), ssw = g.reduce((s, x) => s + (x.n - 1) * x.sd ** 2, 0), df1 = g.length - 1, df2 = N - g.length;
  const f = df1 > 0 && df2 > 0 && ssw > 0 ? ssb / df1 / (ssw / df2) : 0;
  return { f, df1, df2, p: fSf(f, df1, df2), eta2: ssb / Math.max(1e-12, ssb + ssw) };
}

// ───────────────────────── 종단: 추세 · 성장 · 변화점 ─────────────────────────
export interface MK { n: number; tau: number; z: number; p: number; slope: number; dir: "상승" | "하락" | "변화 없음" }
/** Mann–Kendall 추세 검정(동점 보정)과 Sen 기울기(쌍별 기울기의 중앙값, 연당) */
export function mannKendall(xs: number[], ys: number[]): MK {
  const n = ys.length; let S = 0; const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) { S += Math.sign(ys[j] - ys[i]); if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i])); }
  const ties = new Map<number, number>(); ys.forEach((y) => ties.set(y, (ties.get(y) ?? 0) + 1));
  let v = (n * (n - 1) * (2 * n + 5)) / 18; for (const t of ties.values()) if (t > 1) v -= (t * (t - 1) * (2 * t + 5)) / 18;
  const z = S === 0 ? 0 : (S - Math.sign(S)) / Math.sqrt(Math.max(1e-12, v)), p = pTwoSided(z), sl = slopes.sort((a, b) => a - b), slope = sl.length ? (sl.length % 2 ? sl[(sl.length - 1) / 2] : (sl[sl.length / 2 - 1] + sl[sl.length / 2]) / 2) : 0;
  return { n, tau: n > 1 ? S / ((n * (n - 1)) / 2) : 0, z, p, slope, dir: p < 0.05 ? (S > 0 ? "상승" : "하락") : "변화 없음" };
}

export interface GrowthFit { model: "linear" | "exponential" | "logistic"; aic: number; r2: number; params: Record<string, number>; fitted: number[]; forecast: { x: number; y: number; lo: number; hi: number }[]; note: string }
function olsLine(x: number[], y: number[]) { const n = x.length, mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n; let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); } const b = sxx ? sxy / sxx : 0; return { a: my - b * mx, b }; }
/** 연도별 편수에 선형·지수·로지스틱을 맞추고 AIC 가 가장 작은 모형으로 앞으로 h년을 예측한다(예측구간은 잔차 표준편차 ±1.96) */
export function fitGrowth(xs: number[], ys: number[], h = 3): GrowthFit[] {
  const n = xs.length; if (n < 5) return [];
  const sse = (f: number[]) => ys.reduce((s, y, i) => s + (y - f[i]) ** 2, 0), sst = ys.reduce((s, y) => s + (y - ys.reduce((a, b) => a + b, 0) / n) ** 2, 0) || 1;
  const aic = (sseV: number, k: number) => n * Math.log(Math.max(1e-9, sseV) / n) + 2 * k;
  const out: GrowthFit[] = [], last = xs[n - 1], fut = Array.from({ length: h }, (_, i) => last + i + 1);
  const mk = (model: GrowthFit["model"], f: (x: number) => number, k: number, params: Record<string, number>, note: string, band?: (x: number) => number) => {
    const fitted = xs.map(f), s = sse(fitted), sd = Math.sqrt(s / Math.max(1, n - k));
    out.push({ model, aic: aic(s, k), r2: 1 - s / sst, params, fitted, note, forecast: fut.map((x) => { const y = f(x), b = band ? band(x) : 1.96 * sd; return { x, y: Math.max(0, y), lo: Math.max(0, band ? y / Math.exp(b) : y - b), hi: band ? y * Math.exp(b) : y + b }; }) });
  };
  const lin = olsLine(xs, ys); mk("linear", (x) => lin.a + lin.b * x, 2, { slope: lin.b }, `연 ${lin.b >= 0 ? "+" : ""}${lin.b.toFixed(1)}편씩 증가`);
  if (ys.every((y) => y > 0)) {
    const ly = ys.map(Math.log), e = olsLine(xs, ly), res = ly.map((v, i) => v - (e.a + e.b * xs[i])), sdL = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2));
    mk("exponential", (x) => Math.exp(e.a + e.b * x), 2, { rate: e.b, doubling: e.b > 0 ? Math.log(2) / e.b : Infinity }, `연 ${((Math.exp(e.b) - 1) * 100).toFixed(1)}% 성장${e.b > 0 ? `(배가 시간 ${(Math.log(2) / e.b).toFixed(1)}년)` : ""}`, () => 1.96 * sdL);
  }
  const ymax = Math.max(...ys); let best: { K: number; r: number; t0: number; s: number } | null = null;
  for (let m = 1.05; m <= 12; m *= 1.12) {
    const K = ymax * m, z = ys.map((y) => Math.log(Math.max(1e-6, y / K) / Math.max(1e-6, 1 - y / K))), l = olsLine(xs, z), f = xs.map((x) => K / (1 + Math.exp(-(l.a + l.b * x)))), s = sse(f);
    if (l.b > 0 && (!best || s < best.s)) best = { K, r: l.b, t0: -l.a / l.b, s };
  }
  if (best) { const b = best; mk("logistic", (x) => b.K / (1 + Math.exp(-b.r * (x - b.t0))), 3, { K: b.K, rate: b.r, midpoint: b.t0 }, `포화 수준 약 ${Math.round(b.K).toLocaleString()}편/년, 변곡점 ${b.t0.toFixed(1)}년`); }
  return out.sort((a, b) => a.aic - b.aic);
}
export const cagr = (first: number, last: number, years: number) => (first > 0 && last > 0 && years > 0 ? Math.pow(last / first, 1 / years) - 1 : 0);

/** 이진 분할로 평균이 바뀐 해(변화점)를 찾는다. 비용 = 구간 제곱오차, 벌점 = 2σ²·ln(n) */
export function changePoints(ys: number[], maxCp = 3, minSeg = 3): number[] {
  const n = ys.length; if (n < 2 * minSeg) return [];
  const mean = (a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += ys[i]; return s / (b - a); };
  const cost = (a: number, b: number) => { const m = mean(a, b); let s = 0; for (let i = a; i < b; i++) s += (ys[i] - m) ** 2; return s; };
  const diffs = ys.slice(1).map((v, i) => v - ys[i]), mm = diffs.reduce((s, v) => s + v, 0) / diffs.length, sig2 = diffs.reduce((s, v) => s + (v - mm) ** 2, 0) / Math.max(1, diffs.length) / 2 || 1e-9;
  const pen = 2 * sig2 * Math.log(n), cps: number[] = [], segs: [number, number][] = [[0, n]];
  while (cps.length < maxCp) {
    let best = { gain: 0, at: -1, seg: -1 };
    segs.forEach(([a, b], si) => { if (b - a < 2 * minSeg) return; const base = cost(a, b); for (let c = a + minSeg; c <= b - minSeg; c++) { const g = base - cost(a, c) - cost(c, b); if (g > best.gain) best = { gain: g, at: c, seg: si }; } });
    if (best.at < 0 || best.gain < pen) break;
    const [a, b] = segs[best.seg]; segs.splice(best.seg, 1, [a, best.at], [best.at, b]); cps.push(best.at);
  }
  return cps.sort((a, b) => a - b);
}

export type Phase = "신흥" | "성장" | "성숙" | "쇠퇴" | "정체";
/** 주제의 연도별 편수로 생애주기 단계를 판정: 최근 성장률과 정점 대비 현재 수준으로 구분 */
export function lifecycle(years: number[], counts: number[]): { phase: Phase; growth: number; peakYear: number; share: number } {
  const n = counts.length, tail = Math.min(5, Math.floor(n / 2)), recent = counts.slice(n - tail).reduce((s, v) => s + v, 0), prior = counts.slice(n - 2 * tail, n - tail).reduce((s, v) => s + v, 0);
  const growth = prior > 0 ? recent / prior - 1 : recent > 0 ? 9 : 0, peak = Math.max(...counts), pk = counts.indexOf(peak), now = counts[n - 1], tot = counts.reduce((s, v) => s + v, 0);
  const lateShare = recent / Math.max(1, tot);
  const phase: Phase = lateShare > 0.55 && growth > 0.25 ? "신흥" : growth > 0.15 ? "성장" : growth < -0.2 && now < peak * 0.7 ? "쇠퇴" : Math.abs(growth) <= 0.15 && now >= peak * 0.6 ? "성숙" : "정체";
  return { phase, growth, peakYear: years[pk], share: lateShare };
}

// ───────────── 정밀화: 변화점 검정 · 예측 검증 · 자기상관 보정 추세 · 다중비교 · 비모수 검정 · 생존곡선 ─────────────

/** Pettitt 변화점 검정(비모수). idx = 첫 구간의 마지막 위치(변화는 idx+1 부터), p 는 근사식 2·exp(−6K²/(n³+n²)) */
export function pettitt(ys: number[]): { idx: number; k: number; p: number } {
  const n = ys.length; if (n < 6) return { idx: -1, k: 0, p: 1 };
  let best = 0, at = -1;
  for (let t = 0; t < n - 1; t++) {
    let u = 0; for (let i = 0; i <= t; i++) for (let j = t + 1; j < n; j++) u += Math.sign(ys[j] - ys[i]);
    if (Math.abs(u) > best) { best = Math.abs(u); at = t; }
  }
  return { idx: at, k: best, p: Math.min(1, 2 * Math.exp((-6 * best * best) / (n ** 3 + n ** 2))) };
}

/** 1차 자기상관과 Durbin–Watson */
export function autocorr1(r: number[]): { r1: number; dw: number } {
  const n = r.length; if (n < 4) return { r1: 0, dw: 2 };
  const m = r.reduce((s, v) => s + v, 0) / n; let num = 0, den = 0, dn = 0;
  for (let i = 0; i < n; i++) { den += (r[i] - m) ** 2; if (i) { num += (r[i] - m) * (r[i - 1] - m); dn += (r[i] - r[i - 1]) ** 2; } }
  return { r1: den ? num / den : 0, dw: den ? dn / den : 2 };
}

/** 자기상관을 줄인 Mann–Kendall(TFPW, Yue et al. 2002): Sen 기울기 제거 → 1차 자기상관 제거 → 기울기 복원 후 검정 */
export function mannKendallTFPW(xs: number[], ys: number[]): MK & { r1: number; adjusted: boolean } {
  const base = mannKendall(xs, ys), n = ys.length; if (n < 8) return { ...base, r1: 0, adjusted: false };
  const b = base.slope, det = ys.map((y, i) => y - b * (xs[i] - xs[0])), { r1 } = autocorr1(det);
  if (Math.abs(r1) < 1.96 / Math.sqrt(n)) return { ...base, r1, adjusted: false };
  const pw = det.slice(1).map((v, i) => v - r1 * det[i]), back = pw.map((v, i) => v + b * (xs[i + 1] - xs[0])), mk = mannKendall(xs.slice(1), back);
  return { ...mk, slope: b, r1, adjusted: true };
}

/** Holt 선형(감쇠) 지수평활: 격자 탐색으로 1단계 예측 오차 제곱합 최소 모수. 예측구간은 1단계 오차 sd·√k 근사 */
export function holtForecast(ys: number[], h = 3): { fitted: number[]; forecast: { y: number; lo: number; hi: number }[]; alpha: number; beta: number; phi: number; sd: number } | null {
  const n = ys.length; if (n < 6) return null;
  const run = (a: number, b: number, phi: number) => {
    let l = ys[0], t = ys[1] - ys[0], sse = 0; const fit = [ys[0]];
    for (let i = 1; i < n; i++) { const f = l + phi * t; fit.push(f); sse += (ys[i] - f) ** 2; const ln = a * ys[i] + (1 - a) * (l + phi * t); t = b * (ln - l) + (1 - b) * phi * t; l = ln; }
    return { sse, fit, l, t };
  };
  let best: { a: number; b: number; phi: number; sse: number; fit: number[]; l: number; t: number } | null = null;
  for (let a = 0.1; a <= 0.95; a += 0.1) for (let b = 0.05; b <= 0.6; b += 0.1) for (const phi of [1, 0.95, 0.85]) { const r = run(a, b, phi); if (!best || r.sse < best.sse) best = { a, b, phi, ...r }; }
  if (!best) return null;
  const sd = Math.sqrt(best.sse / Math.max(1, n - 3)); let damp = 0, ph = 1;
  const forecast = Array.from({ length: h }, (_, k) => { ph *= best!.phi; damp += ph; const y = Math.max(0, best!.l + damp * best!.t), w = 1.96 * sd * Math.sqrt(k + 1); return { y, lo: Math.max(0, y - w), hi: y + w }; });
  return { fitted: best.fit, forecast, alpha: best.a, beta: best.b, phi: best.phi, sd };
}

/** Holm 단계적 보정 p */
export function holm(ps: number[]): number[] {
  const idx = ps.map((p, i) => [p, i] as const).sort((a, b) => a[0] - b[0]), out = new Array<number>(ps.length); let run = 0;
  idx.forEach(([p, i], k) => { run = Math.max(run, Math.min(1, p * (ps.length - k))); out[i] = run; });
  return out;
}

/** Hedges g 의 95% 신뢰구간(근사) */
export function hedgesCI(d: number, n1: number, n2: number): { g: number; ci: [number, number] } {
  const j = 1 - 3 / (4 * (n1 + n2) - 9), g = d * j, se = Math.sqrt((n1 + n2) / (n1 * n2) + (g * g) / (2 * (n1 + n2)));
  return { g, ci: [g - 1.96 * se, g + 1.96 * se] };
}

/** Kruskal–Wallis(동점 보정). ε² = H/(n−1) */
export function kruskal(groups: number[][]): { h: number; df: number; p: number; eps2: number; n: number } {
  const g = groups.filter((x) => x.length >= 2), n = g.reduce((s, x) => s + x.length, 0); if (g.length < 2) return { h: 0, df: 0, p: 1, eps2: 0, n };
  const all = g.flatMap((x, gi) => x.map((v) => [v, gi] as const)).sort((a, b) => a[0] - b[0]), rankSum = new Array(g.length).fill(0); let tie = 0;
  for (let i = 0; i < all.length;) { let j = i; while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++; const r = (i + j) / 2 + 1, t = j - i + 1; if (t > 1) tie += t ** 3 - t; for (let k = i; k <= j; k++) rankSum[all[k][1]] += r; i = j + 1; }
  let h = (12 / (n * (n + 1))) * g.reduce((s, x, i) => s + rankSum[i] ** 2 / x.length, 0) - 3 * (n + 1);
  const c = 1 - tie / (n ** 3 - n); h = c > 0 ? h / c : h;
  return { h, df: g.length - 1, p: chi2Sf(Math.max(0, h), g.length - 1), eps2: h / Math.max(1, n - 1), n };
}

/** Kaplan–Meier 생존곡선: dur = 관찰 기간, ev = 사건(탈락) 여부(false 면 중도절단). S(t) 를 t=0..maxT 에서 */
export function kaplanMeier(dur: number[], ev: boolean[], maxT = 12): { t: number; s: number; atRisk: number }[] {
  const out: { t: number; s: number; atRisk: number }[] = []; let s = 1;
  for (let t = 0; t <= maxT; t++) {
    const atRisk = dur.filter((d) => d >= (t > 0 ? t - 1 : 0)).length, events = t > 0 ? dur.filter((d, i) => d === t - 1 && ev[i]).length : 0;
    if (t > 0 && atRisk > 0) s *= 1 - events / atRisk;
    out.push({ t, s, atRisk });
  }
  return out;
}
