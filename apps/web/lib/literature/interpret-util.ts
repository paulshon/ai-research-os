/* 분석 해석 생성기 공통 부품 — 결과 숫자에서 문장을 만든다 */

export interface Interp { easy: string; academic: string; paper: string }
export type InterpMap = Record<string, Interp>;
export interface InterpCtx { query: string; refYear: number; yearNow: number; matched: number | null }

export const YEAR_NOW = 2026;
export const n0 = (x: number) => Math.round(x).toLocaleString("ko-KR");
export const n1 = (x: number) => x.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const n2 = (x: number) => x.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pc = (x: number, d = 1) => (x * 100).toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
export const pv = (p: number) => (p < 0.001 ? "p<0.001" : "p=" + p.toFixed(3));
export const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
export const sgn = (x: number, f = n1) => (x >= 0 ? "+" : "−") + f(Math.abs(x));
export const ratioWord = (x: number) => (x >= 1 ? `${n1(x)}배` : `${n1(x * 100)}%`);
export const top = <T,>(a: T[], k: number) => a.slice(0, k);
export const joinKo = (a: string[], sep = ", ") => a.filter(Boolean).join(sep);
export const q = (c: InterpCtx) => `‘${c.query}’`;
export const cagr = (a: number, b: number, yrs: number) => (a > 0 && b > 0 && yrs > 0 ? Math.pow(b / a, 1 / yrs) - 1 : 0);
export const cohenWord = (d: number) => { const a = Math.abs(d); return a < 0.2 ? "효과가 거의 없는 수준" : a < 0.5 ? "작은 효과" : a < 0.8 ? "중간 효과" : "큰 효과"; };
export const etaWord = (e: number) => (e < 0.01 ? "거의 설명하지 못함" : e < 0.06 ? "작은 설명력" : e < 0.14 ? "중간 설명력" : "큰 설명력");
export const vWord = (v: number) => (v < 0.1 ? "약한 연관" : v < 0.3 ? "보통 연관" : "강한 연관");
export const giniWord = (g: number) => (g >= 0.85 ? "극단적으로 쏠린" : g >= 0.7 ? "크게 쏠린" : g >= 0.5 ? "상당히 쏠린" : "비교적 고른");

/** 줄 목록을 한 문자열로: 제목 줄(▸)은 그대로, 나머지는 본문 */
export const block = (...lines: (string | false | null | undefined)[]) => lines.filter((l): l is string => !!l).join("\n");

export const mk = (easy: (string | false | null | undefined)[], academic: (string | false | null | undefined)[], paper: (string | false | null | undefined)[]): Interp => ({ easy: block(...easy), academic: block(...academic), paper: block(...paper) });

/** 보고서 인용 형식의 공통 출처 문장 */
export const SRC = "OpenAlex 2026-09-23 스냅샷을 가공한 LLB(lit_papers) 데이터베이스";
export const sampleNote = (c: InterpCtx) => (c.matched != null ? `검색 일치 ${n0(c.matched)}편` : "검색 일치 집합");
