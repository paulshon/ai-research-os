/**
 * 다중회귀 검정력 분석 (Cohen 1988, f² 기반).
 * pwr 패키지의 pwr.f2.test 와 동일한 원리 — 비중심 F분포를 Patnaik(1949) 근사로 계산한다.
 * 외부 통계 라이브러리 없이 클라이언트에서 즉시 계산하기 위해 직접 구현했다.
 */

function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const xx = x - 1;
  let a = c[0];
  const t = xx + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (xx + i);
  return 0.5 * Math.log(2 * Math.PI) + (xx + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-9;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** 정칙화 불완전베타함수 I_x(a,b). */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(x, a, b)) / a;
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}

function fCdf(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  const xx = (d1 * x) / (d1 * x + d2);
  return regularizedIncompleteBeta(xx, d1 / 2, d2 / 2);
}

function fCritical(alpha: number, d1: number, d2: number): number {
  let lo = 0;
  let hi = 2000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const p = 1 - fCdf(mid, d1, d2);
    if (p > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** 비중심 F(u, v, λ) 에서 F > 임계값일 확률 — Patnaik(1949) 2모멘트 근사. */
function powerF2(f2: number, alpha: number, u: number, v: number): number {
  const lambda = f2 * (u + v + 1);
  const crit = fCritical(alpha, u, v);
  const h = Math.pow(u + lambda, 2) / (u + 2 * lambda);
  const scale = (u + lambda) / u;
  return 1 - fCdf(crit / scale, h, v);
}

/**
 * 효과크기 f², 유의수준 α, 목표 검정력 1–β, 예측변인 수(u)로부터
 * 목표 검정력을 달성하는 최소 표본 크기(n = u + v + 1)를 계산한다.
 * 정확해가 없으면(비현실적 조합) null 을 반환한다.
 */
export function minSampleSizeF2({
  f2,
  alpha,
  power,
  predictors,
}: {
  f2: number;
  alpha: number;
  power: number;
  predictors: number;
}): number | null {
  if (!(f2 > 0) || !(alpha > 0 && alpha < 1) || !(power > 0 && power < 1) || predictors < 1) {
    return null;
  }
  const u = Math.round(predictors);
  for (let n = u + 2; n <= 20000; n++) {
    const v = n - u - 1;
    if (v < 1) continue;
    if (powerF2(f2, alpha, u, v) >= power) return n;
  }
  return null;
}

/** 주어진 표본 n에서 실제로 달성되는 검정력(%, 0–100). */
export function achievedPower({
  f2,
  alpha,
  n,
  predictors,
}: {
  f2: number;
  alpha: number;
  n: number;
  predictors: number;
}): number | null {
  const u = Math.round(predictors);
  const v = n - u - 1;
  if (!(f2 > 0) || !(alpha > 0 && alpha < 1) || v < 1) return null;
  return Math.round(powerF2(f2, alpha, u, v) * 1000) / 10;
}
