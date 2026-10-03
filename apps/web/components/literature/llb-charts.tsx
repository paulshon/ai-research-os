"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";

/**
 * LLB 검색 결과 시각화 대시보드.
 *  - 일치 집합 전체(서버 집계 /api/scholar/insights): 요약 타일, 연도별 논문 수, 연도별 평균 인용, OA 비율 추이, 분야 구성, 색인 포함 비율, 언어
 *  - 지금 보이는 결과 페이지(상위 N편): 상위 저널, JIF 사분위, 인용 수 분포, 상위 키워드
 * 라이브러리 없이 SVG/HTML. 마크는 얇게(막대 ≤24px, 선 2px), 눈금은 옅게, 값은 텍스트 색(시리즈 색은 마크에만).
 */

// 다크 화면용 범주 팔레트(고정 순서). 같은 의미는 항상 같은 색.
const S1 = "#3987e5"; // blue
const S2 = "#d95926"; // orange
const S3 = "#199e70"; // aqua
const S5 = "#d55181"; // magenta
const S7 = "#9085e9"; // violet
const GRAY = "rgba(255,255,255,0.28)";
const INK = "rgba(255,255,255,0.85)";
const INK2 = "rgba(255,255,255,0.55)";
const INK3 = "rgba(255,255,255,0.35)";
const GRID = "rgba(255,255,255,0.08)";
const SURFACE = "#13161e";

const AREA_NAME: Record<string, string> = { health: "보건", life: "생명", physical: "물리", social: "사회", humanities_arts: "인문·예술", other: "기타" };
const AREA_COLOR: Record<string, string> = { physical: S1, life: S3, social: S2, health: S5, humanities_arts: S7, other: GRAY };
const LANG_NAME: Record<string, string> = { en: "영어", ko: "한국어", zh: "중국어", ja: "일본어", es: "스페인어", fr: "프랑스어", de: "독일어", pt: "포르투갈어", ru: "러시아어", it: "이탈리아어", other: "기타" };

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(Math.round(n)));
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** 위쪽 모서리만 4px 둥글고 기준선(아래)은 직각인 막대 */
function colPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

interface TableData { head: string[]; rows: (string | number)[][] }

function Card({ title, sub, table, children }: { title: string; sub?: string; table?: TableData; children: ReactNode }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05] min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] text-white/80 font-medium">{title}</h3>
          {sub && <p className="text-[11px] text-white/35 mt-0.5">{sub}</p>}
        </div>
        {table && (
          <button type="button" onClick={() => setShowTable((v) => !v)} className="shrink-0 text-[11px] text-white/35 hover:text-white/60 px-1.5 py-0.5 rounded border border-white/[0.08]">
            {showTable ? "그래프" : "표"}
          </button>
        )}
      </div>
      <div className="mt-2">
        {showTable && table ? (
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-[11px] text-white/60 tabular-nums">
              <thead><tr>{table.head.map((h) => <th key={h} className="text-left font-normal text-white/35 pb-1 pr-2">{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="py-0.5 pr-2">{typeof c === "number" ? fmt(c) : c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : children}
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05] min-w-0">
      <p className="text-[11px] text-white/35">{label}</p>
      <p className="text-[22px] font-semibold text-white/90 tabular-nums leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-white/35 mt-0.5">{sub}</p>}
    </div>
  );
}

interface Pt { label: string; value: number; tip: string }

const W = 320, H = 150, ML = 34, MR = 8, MT = 10, MB = 18;

function xTicks(n: number): number[] {
  if (n <= 1) return [0];
  const step = n > 24 ? 10 : n > 12 ? 5 : n > 6 ? 2 : 1;
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(i);
  if (out[out.length - 1] !== n - 1 && n - 1 - out[out.length - 1] >= Math.ceil(step / 2)) out.push(n - 1);
  return out;
}

/** 세로 막대(시간 축). 꼭대기 값은 최댓값에만 표시, 나머지는 눈금·툴팁 */
function Columns({ pts, color = S1, yMax, yFmt = compact, aria }: { pts: Pt[]; color?: string; yMax?: number; yFmt?: (n: number) => string; aria: string }) {
  const [hi, setHi] = useState<number | null>(null);
  const n = pts.length;
  if (!n) return <p className="text-[12px] text-white/30 py-6 text-center">표시할 데이터가 없습니다.</p>;
  const pw = W - ML - MR, ph = H - MT - MB;
  const top = yMax ?? niceMax(Math.max(...pts.map((p) => p.value)));
  const slot = pw / n, bw = Math.max(2, Math.min(24, slot - 2));
  const maxI = pts.reduce((b, p, i) => (p.value > pts[b].value ? i : b), 0);
  const yy = (v: number) => MT + ph - (v / top) * ph;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={aria}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={ML} x2={W - MR} y1={yy(top * f)} y2={yy(top * f)} stroke={GRID} strokeWidth={1} />
            <text x={ML - 4} y={yy(top * f) + 3} textAnchor="end" fontSize={9} fill={INK3}>{yFmt(top * f)}</text>
          </g>
        ))}
        {pts.map((p, i) => {
          const h = Math.max(p.value > 0 ? 1.5 : 0, (p.value / top) * ph);
          const x = ML + slot * i + (slot - bw) / 2;
          return (
            <g key={i}>
              <path d={colPath(x, MT + ph - h, bw, h)} fill={color} opacity={hi === null || hi === i ? 1 : 0.45} />
              <rect x={ML + slot * i} y={MT} width={slot} height={ph} fill="transparent" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(i)} onBlur={() => setHi(null)} tabIndex={-1} />
            </g>
          );
        })}
        {xTicks(n).map((i) => (
          <text key={i} x={ML + slot * i + slot / 2} y={H - 4} textAnchor="middle" fontSize={9} fill={INK3}>{pts[i].label}</text>
        ))}
        {hi === null && pts[maxI].value > 0 && (
          <text x={ML + slot * maxI + slot / 2} y={yy(pts[maxI].value) - 3} textAnchor="middle" fontSize={9} fill={INK2}>{yFmt(pts[maxI].value)}</text>
        )}
      </svg>
      {hi !== null && (
        <div className="pointer-events-none absolute -top-1 z-10 px-2 py-1 rounded-md bg-black/80 border border-white/10 text-[11px] text-white/80 whitespace-nowrap"
          style={{ left: `${Math.min(78, Math.max(0, ((ML + slot * hi) / W) * 100))}%` }}>{pts[hi].tip}</div>
      )}
    </div>
  );
}

/** 선(시간 축). 2px 선, 10% 면, 끝점 마커(표면색 링), 호버 시 십자선 */
function Line({ pts, color = S1, yMax, yFmt = compact, aria }: { pts: Pt[]; color?: string; yMax?: number; yFmt?: (n: number) => string; aria: string }) {
  const [hi, setHi] = useState<number | null>(null);
  const n = pts.length;
  if (n < 2) return <p className="text-[12px] text-white/30 py-6 text-center">추세를 그리려면 2개 연도 이상이 필요합니다.</p>;
  const pw = W - ML - MR, ph = H - MT - MB;
  const top = yMax ?? niceMax(Math.max(...pts.map((p) => p.value)));
  const xx = (i: number) => ML + (pw * i) / (n - 1);
  const yy = (v: number) => MT + ph - (Math.min(v, top) / top) * ph;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${xx(i).toFixed(1)},${yy(p.value).toFixed(1)}`).join(" ");
  const area = `${d} L${xx(n - 1).toFixed(1)},${MT + ph} L${xx(0).toFixed(1)},${MT + ph} Z`;
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setHi(Math.max(0, Math.min(n - 1, Math.round(((x - ML) / pw) * (n - 1)))));
  };
  const last = pts[n - 1];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={aria} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={ML} x2={W - MR} y1={yy(top * f)} y2={yy(top * f)} stroke={GRID} strokeWidth={1} />
            <text x={ML - 4} y={yy(top * f) + 3} textAnchor="end" fontSize={9} fill={INK3}>{yFmt(top * f)}</text>
          </g>
        ))}
        <path d={area} fill={color} opacity={0.1} />
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {xTicks(n).map((i) => (
          <text key={i} x={xx(i)} y={H - 4} textAnchor="middle" fontSize={9} fill={INK3}>{pts[i].label}</text>
        ))}
        {hi !== null && <line x1={xx(hi)} x2={xx(hi)} y1={MT} y2={MT + ph} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />}
        {(() => {
          const i = hi ?? n - 1;
          return <circle cx={xx(i)} cy={yy(pts[i].value)} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />;
        })()}
        {hi === null && <text x={xx(n - 1)} y={yy(last.value) - 8} textAnchor="end" fontSize={9} fill={INK2}>{yFmt(last.value)}</text>}
      </svg>
      {hi !== null && (
        <div className="pointer-events-none absolute -top-1 z-10 px-2 py-1 rounded-md bg-black/80 border border-white/10 text-[11px] text-white/80 whitespace-nowrap"
          style={{ left: `${Math.min(78, Math.max(0, (xx(hi) / W) * 100 - 8))}%` }}>{pts[hi].tip}</div>
      )}
    </div>
  );
}

/** 가로 막대(크기 비교). 값은 막대 끝에, 라벨은 텍스트색 */
function HBars({ rows, color = S1, valueFmt = fmt, empty = "표시할 데이터가 없습니다." }: { rows: { label: string; value: number; tip?: string; color?: string }[]; color?: string; valueFmt?: (n: number) => string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-[12px] text-white/30 py-6 text-center">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2 text-[11px] group" title={r.tip ?? `${r.label}: ${valueFmt(r.value)}`}>
          <span className="w-24 shrink-0 truncate text-white/55" title={r.label}>{r.label}</span>
          <span className="flex-1 min-w-0 h-2 flex items-center">
            <span className="h-2 rounded-r-[4px] group-hover:opacity-80" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: r.color ?? color, maxWidth: "calc(100% - 44px)" }} />
          </span>
          <span className="w-12 shrink-0 text-right text-white/60 tabular-nums">{valueFmt(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** 구성비(부분-전체): 한 줄 누적 막대 + 범례. 칸 사이 2px 표면색 간격 */
function StackShare({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((p, x) => p + x.value, 0);
  if (!(total > 0)) return <p className="text-[12px] text-white/30 py-6 text-center">표시할 데이터가 없습니다.</p>;
  return (
    <div>
      <div className="flex h-5 rounded-[4px] overflow-hidden" style={{ gap: 2, background: SURFACE }} role="img" aria-label="구성비 누적 막대">
        {parts.filter((x) => x.value > 0).map((x) => {
          const share = pct(x.value, total);
          return (
            <div key={x.label} title={`${x.label}: ${fmt(x.value)}편 (${share.toFixed(1)}%)`} className="flex items-center justify-center text-[10px] text-white/90 font-medium min-w-[2px]"
              style={{ width: `${share}%`, background: x.color }}>{share >= 14 ? `${Math.round(share)}%` : ""}</div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-white/55">
        {parts.filter((x) => x.value > 0).map((x) => (
          <li key={x.label} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: x.color }} />
            {x.label} <span className="text-white/35 tabular-nums">{pct(x.value, total).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CITE_BINS: { label: string; lo: number; hi: number }[] = [
  { label: "0", lo: 0, hi: 0 }, { label: "1–4", lo: 1, hi: 4 }, { label: "5–19", lo: 5, hi: 19 },
  { label: "20–99", lo: 20, hi: 99 }, { label: "100–499", lo: 100, hi: 499 }, { label: "500+", lo: 500, hi: Infinity },
];

export interface ChartPaper {
  id: string; journal: string; citations: number; keywords: string[];
  title?: string; abstract?: string;
  meta?: { jif?: number | null; jifQ?: string; fwci?: number } | null;
}

// ── 단어 빈도 ──────────────────────────────────────────────
// 학술 글에서 의미 없이 자주 나오는 말(기능어·일반 학술어)은 뺀다. 검색어도 뺀다(모든 논문에 나와 그래프를 덮어 버림).
const STOP = new Set((
  "a an the and or of in on at to for from by with without within into onto over under between among across through during after before about as is are was were be been being " +
  "this that these those it its their there which who whom whose what when where how why not no nor than then thus also can could may might must shall should will would do does did done " +
  "has have had having we our us you your they them he she his her i s via per et al vs versus using used use based study studies paper papers article articles result results method methods " +
  "analysis approach approaches new novel review effect effects case cases show shows shown showed found find finding findings however moreover therefore furthermore both each other such more most " +
  "less least many much several various different within among toward towards one two three first second third high low well here present presents presented propose proposed provide provides " +
  "provided including include includes included between during whether while although because since further overall remain remains still only very often like well due can able " +
  "및 대한 위한 통한 대해 에서 으로 하는 있는 이다 본 연구 분석 결과 방법 통해 따른 관한 것으로 있다 수행"
).split(/\s+/).filter(Boolean));

// 한국어는 흔한 조사·어미만 단순히 뗀다(형태소 분석이 아님). 두 글자 이하 단어는 건드리지 않는다("평가", "전문가" 같은 오탐을 피함).
const KO_TAIL = /(으로|에서|에게|까지|부터|한다|했다|하는|된다|은|는|을|를|의|에|와|과|로)$/;

const stem = (w: string) => {
  if (/[가-힣]/.test(w)) {
    if (w.length < 3) return w;
    const s = w.replace(KO_TAIL, "");
    return s.length >= 2 ? s : w;
  }
  return w.length > 4 && w.endsWith("ies") ? `${w.slice(0, -3)}y`
    : w.length > 4 && w.endsWith("s") && !/(ss|us|is|ics)$/.test(w) ? w.slice(0, -1) : w;
};

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [])
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => (/[가-힣]/.test(t) ? t.length >= 2 : t.length >= 3) && !/^\d+$/.test(t));
}

interface WordStats { words: { w: string; n: number }[]; pairs: { w: string; n: number }[]; docs: number }

/** 논문 단위 등장 편수(문서 빈도). 한 논문에서 여러 번 나와도 1로 센다 — 긴 초록 하나가 결과를 좌우하지 않게. */
function wordStats(papers: ChartPaper[], query: string): WordStats {
  const q = new Set(tokenize(query).flatMap((t) => [t, stem(t)]));
  const df = new Map<string, number>(), pdf = new Map<string, number>();
  let docs = 0;
  for (const p of papers) {
    const text = `${p.title ?? ""} . ${p.abstract ?? ""}`;
    if (text.trim().length < 5) continue;
    docs += 1;
    const seen = new Set<string>(), seenP = new Set<string>();
    // 문장부호·마침표에서 끊어 단어쌍이 문장 경계를 넘지 않게 한다.
    for (const part of text.split(/[.;:!?()\[\]]+/)) {
      let prev: string | null = null;
      for (const raw of tokenize(part)) {
        const t = stem(raw);
        const keep = !STOP.has(raw) && !STOP.has(t) && !q.has(raw) && !q.has(t);
        if (keep) {
          seen.add(t);
          if (prev) seenP.add(`${prev} ${t}`);
          prev = t;
        } else prev = null;
      }
    }
    seen.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
    seenP.forEach((t) => pdf.set(t, (pdf.get(t) ?? 0) + 1));
  }
  const minN = docs >= 12 ? 2 : 1;
  const top = (m: Map<string, number>, k: number, min: number) =>
    [...m.entries()].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k).map(([w, n]) => ({ w, n }));
  return { words: top(df, 40, minN), pairs: top(pdf, 8, 2), docs };
}

/** 빈도순으로 가운데에서 바깥으로 번갈아 놓아, 큰 단어가 중앙에 모이는 구름 모양이 되게 한다. */
function centerOut<T>(sorted: T[]): T[] {
  const out: T[] = [];
  sorted.forEach((x, i) => (i % 2 === 0 ? out.push(x) : out.unshift(x)));
  return out;
}

function WordCloud({ words }: { words: { w: string; n: number }[] }) {
  if (!words.length) return <p className="text-[12px] text-white/30 py-6 text-center">단어를 셀 만한 제목·초록이 부족합니다.</p>;
  const max = words[0].n, min = words[words.length - 1].n;
  const span = Math.max(1, max - min);
  const placed = centerOut(words);
  const rank = new Map(words.map((x, i) => [x.w, i]));
  return (
    <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 py-1 leading-tight" role="img" aria-label={`자주 나온 단어: ${words.slice(0, 8).map((x) => `${x.w} ${x.n}편`).join(", ")}`}>
      {placed.map((x) => {
        const f = Math.sqrt((x.n - min) / span);
        const r = rank.get(x.w) ?? 0;
        return (
          <span key={x.w} title={`${x.w}: ${x.n}편에 등장`} className="cursor-default hover:underline"
            style={{ fontSize: `${(12 + f * 22).toFixed(1)}px`, fontWeight: f > 0.55 ? 600 : 400, color: `rgba(255,255,255,${(0.95 - Math.min(0.5, r * 0.015)).toFixed(2)})` }}>
            {x.w}
          </span>
        );
      })}
    </div>
  );
}

export default function LlbChartDashboard({ insights, papers, lower, query = "" }: { insights: any | null; papers: ChartPaper[]; lower?: boolean; query?: string }) {
  const text = useMemo(() => wordStats(papers, query), [papers, query]);
  const yearly: any[] = useMemo(() => {
    if (!insights) return [];
    const src: any[] = Array.isArray(insights.yearly) && insights.yearly.length ? insights.yearly : (insights.years ?? []).map((y: any) => ({ year: y.year, n: y.n, cited: y.cited }));
    const clean = src.filter((y) => Number(y.year) >= 1900 && Number(y.year) <= new Date().getFullYear() + 1).sort((a, b) => a.year - b.year);
    return clean.length > 40 ? clean.slice(-40) : clean;
  }, [insights]);

  const hasOaSeries = yearly.some((y) => y.oa !== undefined);
  const total = insights ? Number(insights.total) || 0 : 0;

  // 현재 결과 페이지 기반 집계
  const page = useMemo(() => {
    const journals = new Map<string, number>();
    const kw = new Map<string, number>();
    const q: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, none: 0 };
    const bins = CITE_BINS.map(() => 0);
    for (const p of papers) {
      if (p.journal) journals.set(p.journal, (journals.get(p.journal) ?? 0) + 1);
      for (const k of p.keywords ?? []) { const kk = k.trim(); if (kk) kw.set(kk, (kw.get(kk) ?? 0) + 1); }
      const jq = p.meta?.jifQ;
      if (jq && jq in q) q[jq] += 1; else q.none += 1;
      const c = Number(p.citations) || 0;
      bins[CITE_BINS.findIndex((b) => c >= b.lo && c <= b.hi)] += 1;
    }
    const top = (m: Map<string, number>, k: number) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k);
    return { journals: top(journals, 8), kw: top(kw, 8).filter(([, n]) => n >= 1), q, bins };
  }, [papers]);

  if (!insights && !papers.length) return null;

  const maxYear = yearly.length ? yearly[yearly.length - 1].year : 0;
  const sumCited = yearly.reduce((p, y) => p + Number(y.cited || 0), 0);
  const sumN = yearly.reduce((p, y) => p + Number(y.n || 0), 0);
  const recent = yearly.filter((y) => y.year >= maxYear - 4).reduce((p, y) => p + Number(y.n || 0), 0);
  const oaN = insights?.oa ? Number(insights.oa.open) : 0;
  const sciN = insights ? Number((insights.indexes ?? []).find((i: any) => String(i.key).startsWith("SCI"))?.n ?? 0) : 0;
  const areas: { area: string; n: number }[] = insights?.areas ?? [];
  const langs: { lang: string; n: number }[] = insights?.langs ?? [];
  const lowerMark = lower ? " 이상" : "";

  const yearPts = (f: (y: any) => number, tip: (y: any, v: number) => string): Pt[] => yearly.map((y) => { const v = f(y); return { label: String(y.year), value: v, tip: tip(y, v) }; });

  return (
    <div className="space-y-3" aria-label="검색 결과 시각화">
      <p className="text-[12px] text-white/30">
        {insights ? `일치 집합 전체(${fmt(total)}편${lowerMark}) 기준 · 일부 차트는 지금 보이는 ${papers.length}편 기준` : `지금 보이는 ${papers.length}편 기준`}
      </p>

      {insights && (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <Stat label="일치 논문" value={`${compact(total)}${lowerMark}`} sub={`${fmt(total)}편`} />
          <Stat label="평균 인용" value={sumN ? (sumCited / sumN).toFixed(1) : "–"} sub="편당" />
          <Stat label="최근 5년 비중" value={`${pct(recent, sumN).toFixed(0)}%`} sub={maxYear ? `${maxYear - 4}–${maxYear}` : undefined} />
          <Stat label="OA 비율" value={`${pct(oaN, total).toFixed(0)}%`} sub="원문 공개" />
          <Stat label="SCI(E)/SSCI" value={`${pct(sciN, total).toFixed(0)}%`} sub="색인 포함" />
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {insights && yearly.length > 0 && (
          <Card title="연도별 논문 수" sub="출간 연도별 편수" table={{ head: ["연도", "편수"], rows: yearly.map((y) => [String(y.year), Number(y.n)]) }}>
            <Columns aria={`연도별 논문 수, 최대 ${fmt(Math.max(...yearly.map((y) => Number(y.n))))}편`} pts={yearPts((y) => Number(y.n), (y, v) => `${y.year}: ${fmt(v)}편`)} />
          </Card>
        )}
        {insights && yearly.length > 1 && (
          <Card title="연도별 평균 인용" sub="편당 인용 수 (최근 연도는 인용이 덜 쌓여 낮게 보임)" table={{ head: ["연도", "편당 인용"], rows: yearly.map((y) => [String(y.year), (Number(y.cited) / Math.max(1, Number(y.n))).toFixed(1)]) }}>
            <Line aria="연도별 편당 평균 인용 추이" color={S2} yFmt={(v) => (v >= 100 ? String(Math.round(v)) : v.toFixed(1))}
              pts={yearPts((y) => Number(y.cited) / Math.max(1, Number(y.n)), (y, v) => `${y.year}: 편당 ${v.toFixed(1)}회`)} />
          </Card>
        )}
        {insights && hasOaSeries && yearly.length > 1 && (
          <Card title="OA 비율 추이" sub="원문 공개 논문 비중(%)" table={{ head: ["연도", "OA %"], rows: yearly.map((y) => [String(y.year), pct(Number(y.oa), Number(y.n)).toFixed(1)]) }}>
            <Line aria="연도별 OA 비율 추이" color={S3} yMax={100} yFmt={(v) => `${Math.round(v)}%`}
              pts={yearPts((y) => pct(Number(y.oa), Number(y.n)), (y, v) => `${y.year}: OA ${v.toFixed(1)}% (${fmt(Number(y.oa))}/${fmt(Number(y.n))})`)} />
          </Card>
        )}
        {insights && hasOaSeries && yearly.length > 1 && (
          <Card title="색인 포함 비율 추이" sub="SCI(E)/SSCI 저널에 실린 논문 비중(%)" table={{ head: ["연도", "SCI(E)/SSCI %", "Scopus %"], rows: yearly.map((y) => [String(y.year), pct(Number(y.sci), Number(y.n)).toFixed(1), pct(Number(y.scopus), Number(y.n)).toFixed(1)]) }}>
            <Line aria="연도별 SCI(E)/SSCI 포함 비율 추이" color={S7} yMax={100} yFmt={(v) => `${Math.round(v)}%`}
              pts={yearPts((y) => pct(Number(y.sci), Number(y.n)), (y, v) => `${y.year}: SCI(E)/SSCI ${v.toFixed(1)}%`)} />
          </Card>
        )}
        {insights && areas.length > 0 && (
          <Card title="분야 구성" sub="일치 논문의 대분야 비중" table={{ head: ["분야", "편수"], rows: areas.map((a) => [AREA_NAME[a.area] ?? a.area, Number(a.n)]) }}>
            <StackShare parts={areas.map((a) => ({ label: AREA_NAME[a.area] ?? a.area, value: Number(a.n), color: AREA_COLOR[a.area] ?? GRAY }))} />
          </Card>
        )}
        {insights && (insights.indexes ?? []).length > 0 && (
          <Card title="색인 포함 비율" sub="일치 논문 중 각 색인에 실린 비중" table={{ head: ["색인", "편수"], rows: (insights.indexes ?? []).map((i: any) => [String(i.key), Number(i.n)]) }}>
            <HBars valueFmt={(v) => `${v.toFixed(0)}%`}
              rows={(insights.indexes ?? []).map((i: any) => ({ label: String(i.key), value: pct(Number(i.n), total), tip: `${i.key}: ${fmt(Number(i.n))}편 (${pct(Number(i.n), total).toFixed(1)}%)` }))} />
          </Card>
        )}
        {insights && langs.length > 0 && (
          <Card title="언어 분포" sub="논문 언어별 편수" table={{ head: ["언어", "편수"], rows: langs.map((l) => [LANG_NAME[l.lang] ?? l.lang, Number(l.n)]) }}>
            <HBars valueFmt={compact} rows={langs.slice(0, 6).map((l) => ({ label: LANG_NAME[l.lang] ?? (l.lang || "미상"), value: Number(l.n) }))} />
          </Card>
        )}
        {papers.length > 0 && (
          <Card title="상위 저널" sub={`지금 보이는 ${papers.length}편 중 편수 상위`} table={{ head: ["저널", "편수"], rows: page.journals.map(([j, n]) => [j, n]) }}>
            <HBars color={S5} valueFmt={(v) => `${v}편`} empty="저널 정보가 없습니다." rows={page.journals.map(([j, n]) => ({ label: j, value: n }))} />
          </Card>
        )}
        {papers.length > 0 && (
          <Card title="JIF 사분위" sub={`지금 보이는 ${papers.length}편 · 저널 영향력 등급`} table={{ head: ["등급", "편수"], rows: [["Q1", page.q.Q1], ["Q2", page.q.Q2], ["Q3", page.q.Q3], ["Q4", page.q.Q4], ["JIF 없음", page.q.none]] }}>
            <Columns aria="JIF 사분위별 편수" color={S1} yFmt={(v) => String(Math.round(v))}
              pts={[["Q1", page.q.Q1], ["Q2", page.q.Q2], ["Q3", page.q.Q3], ["Q4", page.q.Q4], ["없음", page.q.none]].map(([l, v]) => ({ label: String(l), value: Number(v), tip: `${l}: ${v}편` }))} />
          </Card>
        )}
        {papers.length > 0 && (
          <Card title="인용 수 분포" sub={`지금 보이는 ${papers.length}편 · 인용 횟수 구간`} table={{ head: ["인용 구간", "편수"], rows: CITE_BINS.map((b, i) => [b.label, page.bins[i]]) }}>
            <Columns aria="인용 수 구간별 편수" color={S3} yFmt={(v) => String(Math.round(v))}
              pts={CITE_BINS.map((b, i) => ({ label: b.label, value: page.bins[i], tip: `인용 ${b.label}회: ${page.bins[i]}편` }))} />
          </Card>
        )}
        {text.words.length > 0 && (
          <div style={{ gridColumn: "1 / -1" }} className="min-w-0">
            <Card title="단어 빈도" sub={`제목·초록에서 자주 나온 단어 · 글자 크기 = 등장한 논문 수 (${text.docs}편 중) · 검색어${query ? ` “${query}”` : ""}와 일반 학술어는 제외`}
              table={{ head: ["단어", "등장 논문 수"], rows: text.words.map((x) => [x.w, x.n]) }}>
              <WordCloud words={text.words} />
            </Card>
          </div>
        )}
        {text.pairs.length > 0 && (
          <Card title="자주 함께 나오는 단어쌍" sub="바로 이어서 쓰인 두 단어 · 2편 이상에서 등장" table={{ head: ["단어쌍", "등장 논문 수"], rows: text.pairs.map((x) => [x.w, x.n]) }}>
            <HBars color={S3} valueFmt={(v) => `${v}편`} rows={text.pairs.map((x) => ({ label: x.w, value: x.n, tip: `“${x.w}”: ${x.n}편에 등장` }))} />
          </Card>
        )}
        {text.words.length > 0 && (
          <Card title="상위 단어 TOP 10" sub="등장 논문 수 기준" table={{ head: ["단어", "등장 논문 수"], rows: text.words.slice(0, 10).map((x) => [x.w, x.n]) }}>
            <HBars color={S1} valueFmt={(v) => `${v}편`} rows={text.words.slice(0, 10).map((x) => ({ label: x.w, value: x.n }))} />
          </Card>
        )}
        {papers.length > 0 && (
          <Card title="상위 키워드" sub={`지금 보이는 ${papers.length}편에서 자주 나온 키워드`} table={{ head: ["키워드", "편수"], rows: page.kw.map(([k, n]) => [k, n]) }}>
            <HBars color={S7} valueFmt={(v) => `${v}편`} empty="키워드 정보가 없습니다." rows={page.kw.map(([k, n]) => ({ label: k, value: n }))} />
          </Card>
        )}
      </div>
    </div>
  );
}
