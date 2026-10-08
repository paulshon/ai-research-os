"use client";

/* ════════════════════════════════════════════════════════════
   LLB 데이터 분석 — 차트 부품(외부 라이브러리 없이 SVG/HTML)
   선·면적·스택·스트림 / 막대 / 히스토그램 / 히트맵 / 산점도 / 트리맵·선버스트 / 샌키 / UpSet / 타일 지도 / 코드 / 포레스트 / 로렌츠 / 상자 / 흐름도
═══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import { CardGuide } from "@/components/literature/guide-box";
import { Lines, useBox } from "@/components/literature/viz-text";
import { maxTextWidth, spread, textWidth, wrapText } from "@/lib/literature/text-measure";
import { exportSvgElement, type ImgFormat } from "@/lib/literature/export-image";

export const PAL = ["#4fa89f", "#e8782e", "#b5c23c", "#8e5c70", "#7b93c9", "#d3a53f", "#a07eb5", "#d9706a", "#9dbb5a", "#5aa0b8", "#c98a5a", "#6f8f6a"];
export const nfmt = (n: number) => (Math.abs(n) >= 1e8 ? (n / 1e8).toFixed(1) + "억" : Math.abs(n) >= 1e4 ? (n / 1e4).toFixed(n >= 1e5 ? 0 : 1) + "만" : n.toLocaleString("ko-KR", { maximumFractionDigits: 1 }));
const AX = "rgba(255,255,255,0.35)", GRID = "rgba(255,255,255,0.07)";

export function Card({ title, sub, children, wide }: { title: string; sub?: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasSvg, setHasSvg] = useState(false), [busy, setBusy] = useState(false);
  // 글자 크기 통일: viewBox 를 줄이거나 늘려 그리는 차트는 카드 폭에 따라 글자가 들쑥날쑥해진다. 화면에 보이는 크기가 항상 11~12.5px 이 되도록 맞춘다(큰 숫자 글자는 14~24px).
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const norm = () => el.querySelectorAll("svg").forEach((svg) => {
      if (svg.closest("[data-guide]")) return;
      const vb = svg.viewBox?.baseVal, w = svg.getBoundingClientRect().width; if (!vb || !vb.width || !w) return;
      const k = w / vb.width;
      svg.querySelectorAll("text").forEach((t) => {
        const o = Number(t.getAttribute("data-fs") ?? t.getAttribute("font-size") ?? 11); if (!t.hasAttribute("data-fs")) t.setAttribute("data-fs", String(o));
        const eff = o > 13 ? Math.min(24, Math.max(14, o * k)) : Math.min(12.5, Math.max(11, o * k));
        t.setAttribute("font-size", (eff / k).toFixed(2));
      });
    });
    norm(); const ro = new ResizeObserver(norm); ro.observe(el); return () => ro.disconnect();
  });
  // 그림(SVG)이 있는 카드에만 내보내기 단추를 보인다(표·HTML 히트맵은 제외)
  useEffect(() => { const t = setTimeout(() => setHasSvg(!!ref.current && [...ref.current.querySelectorAll("svg")].some((x) => !x.closest("[data-guide]") && x.getBoundingClientRect().width > 120)), 400); return () => clearTimeout(t); });
  const save = async (fmt: ImgFormat) => {
    const svgs = ref.current ? ([...ref.current.querySelectorAll("svg")] as SVGSVGElement[]).filter((x) => !x.closest("[data-guide]")) : [];
    if (!svgs.length) return;
    const svg = svgs.reduce((m, x) => (x.getBoundingClientRect().width * x.getBoundingClientRect().height > m.getBoundingClientRect().width * m.getBoundingClientRect().height ? x : m), svgs[0]);
    setBusy(true); try { await exportSvgElement(svg, fmt, `${title.replace(/[^\w가-힣]+/g, "_").slice(0, 40)}.${fmt === "jpeg" ? "jpg" : fmt}`, { title }); } finally { setBusy(false); }
  };
  return (
    <div ref={ref} className={`p-4 rounded-2xl bg-[#13161e] border border-white/[0.05] ${wide ? "md:col-span-2" : ""}`} data-card>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-[14.5px] font-semibold text-white/90">{title}</p>
        {hasSvg && <span className="flex gap-1 flex-shrink-0" data-noexport>{(["png", "jpeg"] as const).map((f) => <button key={f} type="button" disabled={busy} onClick={() => save(f)} title={`이 차트를 ${f.toUpperCase()} 이미지로 저장`} className="px-1.5 py-0.5 rounded-md text-[11px] border border-white/[0.08] text-white/40 hover:text-white/80 disabled:opacity-40">{f === "jpeg" ? "JPG" : "PNG"}</button>)}</span>}
      </div>
      {sub && <p className="text-[12px] text-white/35 mt-0.5 mb-2 leading-relaxed">{sub}</p>}
      <div className={sub ? "" : "mt-2"}>{children}</div>
      <CardGuide title={title} />
    </div>
  );
}
export function Empty({ text = "표시할 자료가 없습니다" }: { text?: string }) { return <p className="text-[13px] text-white/25 py-6 text-center">{text}</p>; }
export function Notice({ tone = "info", children }: { tone?: "info" | "warn"; children: React.ReactNode }) {
  const c = tone === "warn" ? { b: "rgba(232,184,75,0.35)", bg: "rgba(232,184,75,0.07)", t: "#e8c97a" } : { b: "rgba(79,168,159,0.35)", bg: "rgba(79,168,159,0.07)", t: "#7fd0c6" };
  return <div className="px-3 py-2 rounded-lg text-[12.5px] leading-relaxed" style={{ border: `1px solid ${c.b}`, background: c.bg, color: c.t }}>{children}</div>;
}
export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[12px] text-white/55">{items.map((i) => <span key={i.name} className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />{i.name}</span>)}</div>;
}

// ─────────── 축 계산 ───────────
function niceTicks(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) return [lo];
  const step0 = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), r = step0 / mag, step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const out: number[] = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toPrecision(12)); return out;
}

// ─────────── 선·면적·스택 ───────────
export interface Series { name: string; color?: string; points: { x: number; y: number }[] }
export function LineChart({ series, height = 240, area = false, stacked = false, percent = false, yFmt = nfmt, xInt = true, ymax }: { series: Series[]; height?: number; area?: boolean; stacked?: boolean; percent?: boolean; yFmt?: (n: number) => string; xInt?: boolean; ymax?: number }) {
  const [boxRef, W] = useBox(), P = { l: 46, r: 12, t: 10, b: 24 };
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  const [hover, setHover] = useState<number | null>(null);
  const d = useMemo(() => {
    const m = series.map((s) => new Map(s.points.map((p) => [p.x, p.y])));
    const has = series.map((_, i) => xs.map((x) => m[i].has(x)));
    let layers = series.map((_, i) => xs.map((x) => m[i].get(x) ?? 0));
    if (percent) { const tot = xs.map((_, j) => layers.reduce((s, l) => s + l[j], 0) || 1); layers = layers.map((l) => l.map((v, j) => (v / tot[j]) * 100)); }
    const base = xs.map(() => 0), tops = layers.map((l) => l.map((v, j) => (stacked || percent ? (base[j] += v) : v)));
    const mx = ymax ?? Math.max(1e-9, ...(stacked || percent ? tops[tops.length - 1] ?? [0] : tops.flat()));
    return { layers, tops, mx, has };
  }, [series, xs.join(","), stacked, percent, ymax]);
  if (!xs.length) return <Empty />;
  const x0 = xs[0], x1 = xs[xs.length - 1], X = (x: number) => P.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - P.l - P.r), Y = (v: number) => P.t + (1 - v / d.mx) * (height - P.t - P.b);
  const ticks = niceTicks(0, d.mx, 4).filter((t, i, a) => i === 0 || yFmt(t) !== yFmt(a[i - 1])), xt = niceTicks(x0, x1, 6).filter((v) => !xInt || Number.isInteger(v));
  const col = (i: number) => series[i].color ?? PAL[i % PAL.length];
  return (
    <div ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} className="block" onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; let best = 0, bd = 1e9; xs.forEach((x, i) => { const dd = Math.abs(X(x) - px); if (dd < bd) { bd = dd; best = i; } }); setHover(best); }}>
        {ticks.map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} stroke={GRID} /><text x={P.l - 6} y={Y(t) + 3.5} textAnchor="end" fontSize={10.5} fill={AX}>{yFmt(t)}</text></g>)}
        {xt.map((t) => { const edge = X(t) - 16 < 0 ? "start" : X(t) + 16 > W ? "end" : "middle"; return <text key={t} x={X(t)} y={height - 7} textAnchor={edge} fontSize={10.5} fill={AX}>{t}</text>; })}
        {series.map((_, i) => {
          const top = d.tops[i], bot = stacked || percent ? (i ? d.tops[i - 1] : xs.map(() => 0)) : xs.map(() => 0);
          const idx = xs.map((_, j) => j).filter((j) => stacked || percent || d.has[i][j]);   // 값이 없는 해는 0 으로 떨어뜨리지 않고 건너뛴다
          const line = idx.map((j, k) => `${k ? "L" : "M"}${X(xs[j]).toFixed(1)} ${Y(top[j]).toFixed(1)}`).join("");
          const poly = line + xs.map((_, j) => `L${X(xs[xs.length - 1 - j]).toFixed(1)} ${Y(bot[xs.length - 1 - j]).toFixed(1)}`).join("") + "Z";
          return <g key={i}>{(area || stacked || percent) && <path d={poly} fill={col(i)} fillOpacity={stacked || percent ? 0.82 : 0.2} />}<path d={line} fill="none" stroke={col(i)} strokeWidth={stacked || percent ? 1 : 2} strokeLinejoin="round" /></g>;
        })}
        {hover != null && <g><line x1={X(xs[hover])} x2={X(xs[hover])} y1={P.t} y2={height - P.b} stroke="rgba(255,255,255,0.3)" />{series.map((_, i) => (d.has[i][hover] || stacked || percent) && <circle key={i} cx={X(xs[hover])} cy={Y(d.tops[i][hover])} r={3} fill={col(i)} />)}</g>}
      </svg>
      <div className="min-h-[18px] text-[12px] text-white/55 tabular-nums">{hover != null ? `${xs[hover]} — ` + series.map((s, i) => (d.has[i][hover] ? `${s.name} ${percent ? d.layers[i][hover].toFixed(1) + "%" : yFmt(d.layers[i][hover])}` : "")).filter(Boolean).join(" · ") : " "}</div>
      {series.length > 1 && <Legend items={series.map((s, i) => ({ name: s.name, color: col(i) }))} />}
    </div>
  );
}

/** 스트림그래프: 중심선을 가운데로 둔 쌓은 면적(주제 변천) */
export function Stream({ years, layers, height = 280 }: { years: number[]; layers: { name: string; values: number[] }[]; height?: number }) {
  const [boxRef, W] = useBox(), P = { l: 24, r: 24, t: 8, b: 22 };
  const { paths, mx } = useMemo(() => {
    const tot = years.map((_, j) => layers.reduce((s, l) => s + l.values[j], 0)), mx = Math.max(1, ...tot), base = tot.map((t) => -t / 2);
    const x0 = years[0], x1 = years[years.length - 1], X = (x: number) => P.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - P.l - P.r), Y = (v: number) => P.t + (0.5 - v / mx / 1) * (height - P.t - P.b);
    const cum = base.slice(), paths = layers.map((l) => { const lo = cum.slice(), hi = cum.map((c, j) => c + l.values[j]); hi.forEach((v, j) => (cum[j] = v)); const up = years.map((y, j) => `${j ? "L" : "M"}${X(y).toFixed(1)} ${Y(hi[j]).toFixed(1)}`).join(""); const dn = years.map((_, j) => { const k = years.length - 1 - j; return `L${X(years[k]).toFixed(1)} ${Y(lo[k]).toFixed(1)}`; }).join(""); return up + dn + "Z"; });
    return { paths, mx };
  }, [years, layers, height, W]);
  const [hl, setHl] = useState<number | null>(null);
  if (years.length < 2) return <Empty />;
  const x0 = years[0], x1 = years[years.length - 1], X = (x: number) => P.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - P.l - P.r);
  return (
    <div ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} className="block">
        {paths.map((p, i) => <path key={i} d={p} fill={PAL[i % PAL.length]} fillOpacity={hl == null || hl === i ? 0.88 : 0.2} stroke="#13161e" strokeWidth={0.6} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)}><title>{layers[i].name}</title></path>)}
        {niceTicks(x0, x1, 7).filter(Number.isInteger).map((t) => <text key={t} x={X(t)} y={height - 6} textAnchor="middle" fontSize={10.5} fill={AX}>{t}</text>)}
      </svg>
      <div className="min-h-[18px] text-[12px] text-white/60">{hl != null ? layers[hl].name : " "} <span className="text-white/25">(최대 {nfmt(mx)}편/년)</span></div>
      <Legend items={layers.map((l, i) => ({ name: l.name, color: PAL[i % PAL.length] }))} />
    </div>
  );
}

// ─────────── 막대 ───────────
export function BarsH({ items, fmt = nfmt, color = "#4fa89f", max, onClick }: { items: { label: string; value: number; sub?: string; color?: string }[]; fmt?: (n: number) => string; color?: string; max?: number; onClick?: (i: number) => void }) {
  if (!items.length) return <Empty />;
  const mx = max ?? Math.max(1e-9, ...items.map((i) => i.value));
  return <div className="space-y-1">{items.map((it, i) => (
    <div key={i} className="relative min-h-[24px] rounded bg-white/[0.03] overflow-hidden" style={{ cursor: onClick ? "pointer" : "default" }} onClick={() => onClick?.(i)} title={`${it.label}: ${fmt(it.value)}${it.sub ? " · " + it.sub : ""}`}>
      <div className="absolute inset-y-0 left-0" style={{ width: `${Math.max(1, (Math.abs(it.value) / mx) * 100)}%`, background: (it.color ?? color) + "66" }} />
      <span className="relative px-2 py-[3px] text-[12px] leading-[18px] text-white/78 flex justify-between items-start gap-2"><span className="min-w-0 break-words"><span className="text-white/30 mr-1.5">{i + 1}</span>{it.label}</span><span className="tabular-nums text-white/55 whitespace-nowrap">{fmt(it.value)}{it.sub ? <span className="text-white/30"> · {it.sub}</span> : null}</span></span>
    </div>))}</div>;
}
export function Columns({ data, height = 190, color = "#4fa89f", log = false, fmt = nfmt }: { data: { label: string; value: number; color?: string }[]; height?: number; color?: string; log?: boolean; fmt?: (n: number) => string }) {
  const [ref, W] = useBox();
  if (!data.length) return <Empty />;
  const P = { l: 44, r: 8, t: 8, b: 30 }, f = (v: number) => (log ? Math.log10(v + 1) : v), mx = Math.max(1e-9, ...data.map((d) => f(d.value))), bw = (W - P.l - P.r) / data.length;
  const ticks = log ? [0, 1, 2, 3, 4, 5, 6, 7].filter((t) => t <= mx + 0.01).map((t) => ({ v: t, label: nfmt(10 ** t - 1) })) : niceTicks(0, mx, 4).map((t) => ({ v: t, label: fmt(t) }));
  const Y = (v: number) => P.t + (1 - v / mx) * (height - P.t - P.b), stride = Math.max(1, Math.ceil((maxTextWidth(data.map((d) => d.label), 11, 120) + 8) / bw));
  return <div ref={ref}><svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} className="block">
    {ticks.map((t) => <g key={t.v}><line x1={P.l} x2={W - P.r} y1={Y(t.v)} y2={Y(t.v)} stroke={GRID} /><text x={P.l - 5} y={Y(t.v) + 3.5} textAnchor="end" fontSize={11} fill={AX}>{t.label}</text></g>)}
    {data.map((d, i) => <g key={i}><rect x={P.l + i * bw + bw * 0.1} y={Y(f(d.value))} width={bw * 0.8} height={Math.max(0, height - P.b - Y(f(d.value)))} fill={d.color ?? color} fillOpacity={0.85} rx={2}><title>{d.label}: {nfmt(d.value)}</title></rect>
      {(i % stride === 0 || i === data.length - 1 && stride === 1) && <text x={P.l + i * bw + bw / 2} y={height - 14} textAnchor="middle" fontSize={11} fill={AX}>{d.label}</text>}</g>)}
  </svg></div>;
}
export function StackedBars({ rows, keys, height = 230, percent = true }: { rows: { label: string; values: Record<string, number> }[]; keys: string[]; height?: number; percent?: boolean }) {
  const [ref, W] = useBox();
  if (!rows.length) return <Empty />;
  const P = { l: 40, r: 8, t: 8, b: 30 }, bw = (W - P.l - P.r) / rows.length, stride = Math.max(1, Math.ceil((maxTextWidth(rows.map((r) => r.label), 11, 120) + 8) / bw));
  const tot = rows.map((r) => keys.reduce((s, k) => s + (r.values[k] ?? 0), 0) || 1), mx = percent ? 100 : Math.max(...tot), Y = (v: number) => P.t + (1 - v / mx) * (height - P.t - P.b);
  return <div ref={ref}><svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} className="block">
    {niceTicks(0, mx, 4).map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} stroke={GRID} /><text x={P.l - 5} y={Y(t) + 3.5} textAnchor="end" fontSize={11} fill={AX}>{percent ? t + "%" : nfmt(t)}</text></g>)}
    {rows.map((r, i) => { let acc = 0; return <g key={i}>{keys.map((k, ki) => { const v = ((r.values[k] ?? 0) / (percent ? tot[i] : 1)) * (percent ? 100 : 1), y1 = Y(acc + v), y0 = Y(acc); acc += v; return <rect key={k} x={P.l + i * bw + bw * 0.08} y={y1} width={bw * 0.84} height={Math.max(0, y0 - y1)} fill={PAL[ki % PAL.length]} fillOpacity={0.85}><title>{r.label} · {k}: {nfmt(r.values[k] ?? 0)}</title></rect>; })}
      {i % stride === 0 && <text x={P.l + i * bw + bw / 2} y={height - 14} textAnchor="middle" fontSize={11} fill={AX}>{r.label}</text>}</g>; })}
  </svg><Legend items={keys.map((k, i) => ({ name: k, color: PAL[i % PAL.length] }))} /></div>;
}

// ─────────── 히트맵 ───────────
export function Heatmap({ rows, cols, values, fmt = (v: number) => v.toFixed(2), lo, hi, scheme = "teal", cell = 34, rowW = 150, flag }: { rows: string[]; cols: string[]; values: number[][]; fmt?: (v: number) => string; lo?: number; hi?: number; scheme?: "teal" | "div"; cell?: number; rowW?: number; flag?: (r: number, c: number) => boolean }) {
  if (!rows.length) return <Empty />;
  const flat = values.flat().filter((v) => Number.isFinite(v)), a = lo ?? Math.min(...flat), b = hi ?? Math.max(...flat);
  const color = (v: number) => {
    const t = b > a ? Math.min(1, Math.max(0, (v - a) / (b - a))) : 0;
    if (scheme === "div") { const m = 0.5; return t < m ? `rgba(90,160,184,${0.15 + (m - t) / m * 0.75})` : `rgba(232,120,46,${0.15 + (t - m) / (1 - m) * 0.75})`; }
    return `rgba(79,168,159,${0.08 + t * 0.85})`;
  };
  const rw = Math.min(300, Math.max(rowW, maxTextWidth(rows, 11.5, 300) + 12)), colMax = maxTextWidth(cols, 10.5, 200), vertical = colMax > cell - 4, headH = vertical ? colMax + 10 : 26;
  return (
    <div className="overflow-x-auto"><div style={{ display: "grid", gridTemplateColumns: `${rw}px repeat(${cols.length}, ${cell}px)`, gap: 1, minWidth: rw + cols.length * (cell + 1) }}>
      <div />{cols.map((c, j) => <div key={j} className="text-[10.5px] text-white/50 flex items-end justify-center" style={{ height: headH }} title={c}>{vertical ? <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>{c}</span> : <span className="text-center leading-tight">{c}</span>}</div>)}
      {rows.map((r, i) => (<><div key={"r" + i} className="text-[11.5px] text-white/70 pr-1 leading-[15px] flex items-center break-words" style={{ minHeight: 28 }} title={r}>{r}</div>{cols.map((_, j) => { const v = values[i]?.[j] ?? 0, fl = flag?.(i, j); return <div key={i + "-" + j} title={`${r} × ${cols[j]}: ${fmt(v)}`} className="text-[10px] text-center tabular-nums rounded-[3px] text-white/80 flex items-center justify-center" style={{ minHeight: 28, background: color(v), outline: fl ? "1.5px solid #ffd24a" : "none" }}>{cell >= 30 ? fmt(v) : ""}</div>; })}</>))}
    </div></div>
  );
}

// ─────────── 산점도 ───────────
export interface Pt { x: number; y: number; c?: number; label?: string; r?: number; hi?: boolean }
export function Scatter({ points, height = 300, xLog = false, yLog = false, xLabel = "", yLabel = "", colors = PAL, legend, xFmt = nfmt, yFmt = nfmt, onPick }: { points: Pt[]; height?: number; xLog?: boolean; yLog?: boolean; xLabel?: string; yLabel?: string; colors?: string[]; legend?: { name: string; color: string }[]; xFmt?: (n: number) => string; yFmt?: (n: number) => string; onPick?: (p: Pt) => void }) {
  const [boxRef, W] = useBox(), P = { l: 48, r: 10, t: 10, b: 34 };
  const [hov, setHov] = useState<Pt | null>(null);
  if (!points.length) return <Empty />;
  const fx = (v: number) => (xLog ? Math.log10(Math.max(0, v) + 1) : v), fy = (v: number) => (yLog ? Math.log10(Math.max(0, v) + 1) : v);
  const xs = points.map((p) => fx(p.x)), ys = points.map((p) => fy(p.y)), xa = Math.min(...xs), xb = Math.max(...xs), ya = Math.min(...ys), yb = Math.max(...ys);
  const X = (v: number) => P.l + ((fx(v) - xa) / Math.max(1e-9, xb - xa)) * (W - P.l - P.r), Y = (v: number) => P.t + (1 - (fy(v) - ya) / Math.max(1e-9, yb - ya)) * (height - P.t - P.b);
  const tk = (lo: number, hi: number, lg: boolean) => (lg ? [0, 1, 2, 3, 4, 5, 6].filter((t) => t >= lo - 0.01 && t <= hi + 0.01).map((t) => ({ pos: t, label: nfmt(10 ** t - 1) })) : niceTicks(lo, hi, 5).map((t) => ({ pos: t, label: nfmt(t) })));
  return (
    <div ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} className="block" onMouseLeave={() => setHov(null)}>
        {tk(ya, yb, yLog).map((t) => { const y = P.t + (1 - (t.pos - ya) / Math.max(1e-9, yb - ya)) * (height - P.t - P.b); return <g key={"y" + t.pos}><line x1={P.l} x2={W - P.r} y1={y} y2={y} stroke={GRID} /><text x={P.l - 5} y={y + 3.5} textAnchor="end" fontSize={10.5} fill={AX}>{t.label}</text></g>; })}
        {tk(xa, xb, xLog).map((t) => { const x = P.l + ((t.pos - xa) / Math.max(1e-9, xb - xa)) * (W - P.l - P.r); return <g key={"x" + t.pos}><line x1={x} x2={x} y1={P.t} y2={height - P.b} stroke={GRID} /><text x={x} y={height - P.b + 14} textAnchor="middle" fontSize={10.5} fill={AX}>{t.label}</text></g>; })}
        <text x={W / 2} y={height - 4} textAnchor="middle" fontSize={11} fill={AX}>{xLabel}</text><text x={13} y={height / 2} fontSize={11} fill={AX} transform={`rotate(-90 13 ${height / 2})`} textAnchor="middle">{yLabel}</text>
        {points.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={p.r ?? (p.hi ? 4.5 : 3)} fill={colors[(p.c ?? 0) % colors.length]} fillOpacity={p.hi ? 1 : 0.62} stroke={p.hi ? "#fff" : "none"} strokeWidth={1.2} onMouseEnter={() => setHov(p)} onClick={() => onPick?.(p)} style={{ cursor: onPick ? "pointer" : "default" }} />)}
      </svg>
      <div className="min-h-[18px] text-[12px] text-white/60 break-words">{hov?.label ?? " "}</div>
      {legend && <Legend items={legend} />}
    </div>
  );
}

// ─────────── 트리맵 · 선버스트 ───────────
interface TNode { name: string; value: number; children?: TNode[] }
function squarify(items: { v: number; i: number }[], x: number, y: number, w: number, h: number): { i: number; x: number; y: number; w: number; h: number }[] {
  const out: { i: number; x: number; y: number; w: number; h: number }[] = [];
  const total = items.reduce((s, a) => s + a.v, 0); if (!total) return out;
  let rest = items.slice().sort((a, b) => b.v - a.v), cx = x, cy = y, cw = w, ch = h;
  while (rest.length) {
    const short = Math.min(cw, ch), scale = (cw * ch) / rest.reduce((s, a) => s + a.v, 0), row: typeof rest = []; let best = Infinity, sum = 0;
    for (const it of rest) {
      const s2 = sum + it.v * scale, mx = Math.max(...[...row, it].map((a) => a.v * scale)), mn = Math.min(...[...row, it].map((a) => a.v * scale)), worst = Math.max((short * short * mx) / (s2 * s2), (s2 * s2) / (short * short * mn));
      if (row.length && worst > best) break; row.push(it); sum = s2; best = worst;
    }
    rest = rest.slice(row.length);
    const thick = sum / short;
    if (cw >= ch) { let yy = cy; for (const it of row) { const hh = (it.v * scale) / thick; out.push({ i: it.i, x: cx, y: yy, w: thick, h: hh }); yy += hh; } cx += thick; cw -= thick; }
    else { let xx = cx; for (const it of row) { const ww = (it.v * scale) / thick; out.push({ i: it.i, x: xx, y: cy, w: ww, h: thick }); xx += ww; } cy += thick; ch -= thick; }
  }
  return out;
}
export function Treemap({ root, height = 300 }: { root: TNode; height?: number }) {
  const [ref, W] = useBox();
  const top = root.children ?? [];
  if (!top.length) return <Empty />;
  const L1 = squarify(top.map((c, i) => ({ v: c.value, i })), 0, 0, W, height);
  return <div ref={ref}><svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} className="block">{L1.map((r) => {
    const n = top[r.i], kids = n.children ?? [], head = r.w > 60 ? wrapText(n.name, r.w - 12, 11, 2) : [], hh = head.length ? head.length * 13 + 4 : 2;
    const L2 = kids.length ? squarify(kids.map((c, i) => ({ v: c.value, i })), r.x + 2, r.y + hh, r.w - 4, r.h - hh - 2) : [];
    return <g key={r.i}><rect x={r.x + 1} y={r.y + 1} width={r.w - 2} height={r.h - 2} fill={PAL[r.i % PAL.length]} fillOpacity={0.18} stroke={PAL[r.i % PAL.length]} strokeOpacity={0.6} rx={3}><title>{n.name}: {nfmt(n.value)}편</title></rect>
      {head.length > 0 && <text x={r.x + 6} y={r.y + 13} fontSize={11} fill="#fff" fillOpacity={0.92} fontWeight={600}>{head.map((l, i) => <tspan key={i} x={r.x + 6} dy={i ? 13 : 0}>{l}</tspan>)}</text>}
      {L2.map((k) => { const nm = kids[k.i].name, fit = Math.max(0, Math.floor((k.h - 4) / 12)), ln = k.w > 36 && fit > 0 ? wrapText(nm, k.w - 6, 10.5, fit) : [], cut = ln.some((l) => l.endsWith("…")); return <g key={k.i}><rect x={k.x} y={k.y} width={Math.max(0, k.w - 1)} height={Math.max(0, k.h - 1)} fill={PAL[r.i % PAL.length]} fillOpacity={0.55} rx={2}><title>{n.name} › {nm}: {nfmt(kids[k.i].value)}편</title></rect>
        {ln.length > 0 && !cut && <text x={k.x + 3} y={k.y + 11} fontSize={10.5} fill="#fff" fillOpacity={0.92}>{ln.map((l, i) => <tspan key={i} x={k.x + 3} dy={i ? 12 : 0}>{l}</tspan>)}</text>}</g>; })}</g>;
  })}</svg><Legend items={top.map((c, i) => ({ name: `${c.name} (${nfmt(c.value)})`, color: PAL[i % PAL.length] }))} /></div>;
}
export function Sunburst({ root, size = 360 }: { root: TNode; size?: number }) {
  const [hl, setHl] = useState<string>("");
  const cx = size / 2, cy = size / 2, rings = 4, R = size / 2 - 6, rw = R / (rings + 0.6);
  const arcs = useMemo(() => {
    const out: { path: string; name: string; v: number; ring: number; color: string; key: string }[] = [];
    const walk = (n: TNode, a0: number, a1: number, ring: number, color: string, key: string) => {
      if (ring > rings) return; const tot = n.children?.reduce((s, c) => s + c.value, 0) ?? 0; let a = a0;
      for (const [i, c] of (n.children ?? []).entries()) {
        const span = tot ? ((a1 - a0) * c.value) / tot : 0, aa = a, bb = a + span; a = bb;
        if (span < 0.004) continue; const col = ring === 1 ? PAL[i % PAL.length] : color, r0 = (ring - 1 + 0.6) * rw, r1 = r0 + rw - 1.5, large = bb - aa > Math.PI ? 1 : 0;
        const p = (r: number, ang: number) => [cx + r * Math.cos(ang - Math.PI / 2), cy + r * Math.sin(ang - Math.PI / 2)];
        const [x0, y0] = p(r1, aa), [x1, y1] = p(r1, bb), [x2, y2] = p(r0, bb), [x3, y3] = p(r0, aa);
        out.push({ path: `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`, name: c.name, v: c.value, ring, color: col, key: key + "/" + c.name });
        walk(c, aa, bb, ring + 1, col, key + "/" + c.name);
      }
    };
    walk(root, 0, Math.PI * 2, 1, PAL[0], ""); return out;
  }, [root, size]);
  if (!arcs.length) return <Empty />;
  const cur = arcs.find((a) => a.key === hl);
  return <div className="flex flex-col items-center"><svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[420px] h-auto">
    {arcs.map((a) => <path key={a.key} d={a.path} fill={a.color} fillOpacity={hl && !a.key.startsWith(hl) && !hl.startsWith(a.key) ? 0.18 : 0.35 + a.ring * 0.14} stroke="#13161e" strokeWidth={0.6} onMouseEnter={() => setHl(a.key)} onMouseLeave={() => setHl("")}><title>{a.name}: {nfmt(a.v)}편</title></path>)}
    {(() => { const ls = wrapText(cur ? cur.name : "영역 → 분야", rw * 1.2, 11, 3); return <><Lines x={cx} y={cy - 12 - (ls.length - 1) * 6.5} lines={ls} lh={13} anchor="middle" opacity={0.92} size={11} /><text x={cx} y={cy + 14 + (ls.length - 1) * 6.5 + 8} textAnchor="middle" fontSize={11} fill={AX}>{cur ? nfmt(cur.v) + "편" : "→ 세부분야 → 주제"}</text></>; })()}</svg></div>;
}

// ─────────── 샌키(주제 변천) ───────────
export function Sankey({ nodes, links, periods, height = 380 }: { nodes: { id: string; period: number; label: string; size: number; status: string }[]; links: { source: string; target: string; value: number }[]; periods: string[]; height?: number }) {
  const [ref, W] = useBox(420, 700), colW = 14, labW = Math.min(190, Math.max(110, Math.round(W * 0.26))), P = { l: 6, r: 6, t: 26, b: 8 };
  const [hl, setHl] = useState<string | null>(null);
  const stat = (s: string) => (s === "신규" ? "#e8782e" : s === "소멸" ? "#8e5c70" : s === "분기" ? "#d3a53f" : s === "합류" ? "#7b93c9" : "#4fa89f");
  const span = Math.max(1, periods.length - 1), colX = (p: number) => P.l + (p * (W - P.l - P.r - colW - labW)) / span, step = periods.length > 1 ? (W - P.l - P.r - colW - labW) / span : labW;
  const lw = Math.max(90, Math.min(labW, step - colW - 14));
  const L = useMemo(() => {
    const per = periods.map((_, p) => nodes.filter((n) => n.period === p).sort((a, b) => b.size - a.size)), gap = 8;
    const lab = new Map(nodes.map((n) => [n.id, wrapText(n.label, lw, 11, 3)])), minH = (n: (typeof nodes)[number]) => ((lab.get(n.id)?.length ?? 1) + 1) * 13;
    const maxCol = Math.max(1, ...per.map((l) => l.reduce((s, n) => s + n.size, 0))), usable0 = height - P.t - P.b;
    const sc = usable0 / (maxCol * 1.15), pos = new Map<string, { x: number; y: number; h: number; n: (typeof nodes)[number]; lines: string[] }>();
    let used = 0;
    per.forEach((l, p) => { let y = P.t; l.forEach((n) => { const h = Math.max(minH(n), n.size * sc); pos.set(n.id, { x: colX(p), y, h, n, lines: lab.get(n.id)! }); y += h + gap; }); used = Math.max(used, y); });
    return { pos, H: Math.max(height, used + P.b) };
  }, [nodes, periods, height, W, lw]);
  if (!nodes.length) return <Empty />;
  const out = new Map<string, number>(), inn = new Map<string, number>();
  return <div ref={ref}><svg viewBox={`0 0 ${W} ${L.H}`} width={W} height={L.H} className="block">
    {periods.map((p, i) => <text key={p} x={colX(i)} y={14} fontSize={11} fill="#fff" fillOpacity={0.7}>{p}</text>)}
    {links.map((l, i) => { const a = L.pos.get(l.source), b = L.pos.get(l.target); if (!a || !b) return null; const ha = (l.value / Math.max(1, a.n.size)) * a.h * 0.9 + 1.5, hb = (l.value / Math.max(1, b.n.size)) * b.h * 0.9 + 1.5; const oa = out.get(l.source) ?? 0, ob = inn.get(l.target) ?? 0; out.set(l.source, oa + ha); inn.set(l.target, ob + hb);
      const y0 = a.y + oa + ha / 2, y1 = b.y + ob + hb / 2, x0 = a.x + colW, x1 = b.x, mx = (x0 + x1) / 2, on = !hl || hl === l.source || hl === l.target;
      return <path key={i} d={`M${x0} ${y0}C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`} fill="none" stroke={stat(b.n.status)} strokeOpacity={on ? 0.5 : 0.08} strokeWidth={Math.max(1.5, (ha + hb) / 2)} />; })}
    {[...L.pos.values()].map(({ x, y, h, n, lines }) => <g key={n.id} onMouseEnter={() => setHl(n.id)} onMouseLeave={() => setHl(null)}><rect x={x} y={y} width={colW} height={h} rx={2} fill={stat(n.status)} fillOpacity={0.9}><title>{n.label} · {n.status} · 노드 {n.size}</title></rect>
      <text x={x + colW + 5} y={y + 10} fontSize={11} fill="#fff" fillOpacity={0.88}>{lines.map((l, i) => <tspan key={i} x={x + colW + 5} dy={i ? 13 : 0}>{l}</tspan>)}<tspan x={x + colW + 5} dy={13} fill={stat(n.status)} fontSize={10.5}>{n.status}</tspan></text></g>)}
  </svg></div>;
}

// ─────────── UpSet ───────────
export function UpSet({ sets, items, label }: { sets: string[]; items: { sets: string[]; n: number }[]; label: Record<string, string> }) {
  const [ref, W] = useBox(420, 640);
  const top = items.slice(0, 16);
  if (!top.length) return <Empty />;
  const left = Math.min(Math.round(W * 0.34), maxTextWidth(sets.map((x) => label[x] ?? x), 11, 220) + 18), rowH = 22, H = 120 + sets.length * rowH, colW = (W - left - 8) / top.length, mx = Math.max(...top.map((t) => t.n)), nl = (n: number) => nfmt(n);
  const showNum = colW >= textWidth("9.9만", 10) + 4;
  return <div ref={ref}><svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block">
    {top.map((t, i) => { const h = (t.n / mx) * 76, x = left + i * colW + colW * 0.15; return <g key={i}><rect x={x} y={100 - h} width={colW * 0.7} height={h} fill="#4fa89f" fillOpacity={0.8} rx={2}><title>{t.sets.map((x2) => label[x2] ?? x2).join(" + ") || "(없음)"}: {t.n.toLocaleString("ko-KR")}편</title></rect>{(showNum || i % 2 === 0) && <text x={x + colW * 0.35} y={96 - h} textAnchor="middle" fontSize={10} fill="#fff" fillOpacity={0.72}>{nl(t.n)}</text>}</g>; })}
    {sets.map((s2, r) => <g key={s2}><text x={left - 10} y={120 + r * rowH + 15} textAnchor="end" fontSize={11} fill="#fff" fillOpacity={0.75}>{label[s2] ?? s2}</text>
      {top.map((t, i) => { const cx = left + i * colW + colW * 0.5, cy = 120 + r * rowH + 11, on = t.sets.includes(s2); return <circle key={i} cx={cx} cy={cy} r={5} fill={on ? "#e8782e" : "#ffffff"} fillOpacity={on ? 0.95 : 0.1} />; })}</g>)}
    {top.map((t, i) => { const idx = sets.map((s2, r) => (t.sets.includes(s2) ? r : -1)).filter((r) => r >= 0); if (idx.length < 2) return null; const cx = left + i * colW + colW * 0.5; return <line key={"l" + i} x1={cx} x2={cx} y1={120 + Math.min(...idx) * rowH + 11} y2={120 + Math.max(...idx) * rowH + 11} stroke="#e8782e" strokeWidth={2.2} />; })}
    {top.some((t) => t.sets.length === 0) && <text x={left} y={H - 4} fontSize={10.5} fill={AX}>(아무 색인에도 없는 논문 포함)</text>}
  </svg></div>;
}

// ─────────── 타일 지도(국가) ───────────
const TILES: Record<string, [number, number]> = {
  IS: [8, 0], NO: [11, 0], SE: [12, 0], FI: [13, 0], IE: [8, 1], GB: [9, 1], DK: [11, 1], EE: [13, 1], LV: [14, 1], RU: [16, 1], FR: [9, 2], NL: [10, 2], DE: [11, 2], PL: [12, 2], LT: [13, 2], BY: [14, 2],
  PT: [8, 3], ES: [9, 3], BE: [10, 3], CZ: [11, 3], SK: [12, 3], UA: [13, 3], MD: [14, 3], CH: [9, 4], IT: [10, 4], AT: [11, 4], HU: [12, 4], RO: [13, 4], BG: [14, 4], SI: [10, 5], HR: [11, 5], RS: [12, 5], GR: [13, 5], TR: [14, 5], CY: [13, 6], MT: [10, 6],
  GE: [15, 4], AM: [16, 4], AZ: [17, 4], KZ: [18, 3], UZ: [18, 4], TM: [17, 5], KG: [19, 4], TJ: [19, 5], AF: [18, 6], IR: [16, 5], IQ: [15, 5], SY: [14, 6], LB: [14, 7], IL: [13, 7], JO: [15, 7], SA: [15, 8], KW: [16, 7], AE: [17, 8], QA: [16, 8], OM: [17, 9], YE: [15, 9], PK: [18, 7], IN: [19, 8], NP: [20, 7], BD: [20, 8], LK: [19, 10], MM: [21, 8], TH: [21, 9], LA: [22, 8], VN: [22, 9], KH: [22, 10], MY: [21, 11], SG: [22, 11], ID: [23, 12], PH: [24, 9], MN: [20, 3], CN: [21, 5], TW: [23, 7], HK: [22, 7], KR: [23, 5], KP: [23, 4], JP: [24, 5],
  MA: [8, 7], DZ: [9, 7], TN: [10, 7], LY: [11, 7], EG: [12, 7], SN: [7, 8], ML: [8, 8], NE: [9, 8], TD: [10, 8], SD: [11, 8], ET: [12, 8], CI: [7, 9], GH: [8, 9], NG: [9, 9], CM: [10, 9], SS: [11, 9], KE: [12, 9], UG: [12, 10], GA: [9, 10], CG: [10, 10], CD: [11, 10], RW: [11, 11], TZ: [12, 11], AO: [10, 11], ZM: [11, 12], MZ: [12, 12], MW: [13, 12], NA: [9, 12], BW: [10, 12], ZW: [11, 13], ZA: [10, 13], MG: [13, 13],
  CA: [2, 1], US: [2, 2], MX: [1, 3], GT: [1, 4], HN: [2, 4], SV: [1, 5], NI: [2, 5], CR: [2, 6], PA: [3, 6], CU: [3, 3], HT: [4, 3], DO: [5, 3], JM: [3, 4], PR: [5, 4],
  CO: [3, 7], VE: [4, 7], GY: [5, 7], EC: [2, 8], PE: [3, 8], BR: [4, 8], BO: [3, 9], PY: [4, 9], CL: [2, 10], AR: [3, 10], UY: [4, 10],
  AU: [23, 14], NZ: [24, 15], PG: [24, 13],
};
export function TileMap({ values, fmt = nfmt, names, lo = 0 }: { values: Map<string, number>; fmt?: (n: number) => string; names?: (c: string) => string; lo?: number }) {
  const [hov, setHov] = useState<string>("");
  const mx = Math.max(1e-9, ...values.values()), cell = 24, W = 25 * cell + 10, H = 17 * cell + 10;
  return <div><svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
    {Object.entries(TILES).map(([c, [x, y]]) => { const v = values.get(c) ?? 0, t = v > lo ? Math.log1p(v) / Math.log1p(mx) : 0; return <g key={c} onMouseEnter={() => setHov(c)} onMouseLeave={() => setHov("")}><rect x={5 + x * cell} y={5 + y * cell} width={cell - 2} height={cell - 2} rx={4} fill={v > lo ? `rgba(232,120,46,${0.18 + t * 0.8})` : "rgba(255,255,255,0.05)"} stroke={hov === c ? "#fff" : "none"}><title>{(names?.(c) ?? c)}: {fmt(v)}</title></rect><text x={5 + x * cell + (cell - 2) / 2} y={5 + y * cell + (cell - 2) / 2 + 3.5} textAnchor="middle" fontSize={9} fill="#fff" fillOpacity={v > lo ? 0.95 : 0.3}>{c}</text></g>; })}
  </svg><div className="min-h-[18px] text-[12px] text-white/60">{hov ? `${names?.(hov) ?? hov} (${hov}): ${fmt(values.get(hov) ?? 0)}` : "타일 지도 — 대륙 배치를 닮은 격자, 색이 진할수록 많음(로그 눈금)"}</div></div>;
}

// ─────────── 코드(chord) ───────────
export function Chord({ names, matrix, size = 420 }: { names: string[]; matrix: number[][]; size?: number }) {
  const [hl, setHl] = useState(-1), [ref, boxW] = useBox(300, size);
  const n = names.length; if (!n) return <Empty />;
  const S = Math.min(boxW, 520), labW = maxTextWidth(names, 11, 140) + 14, R = Math.max(60, S / 2 - labW - 6), cx = S / 2, cy = S / 2, H = Math.max(S, 2 * (R + 30));
  const tot = matrix.map((r) => r.reduce((s2, v) => s2 + v, 0)), all = tot.reduce((s2, v) => s2 + v, 0) || 1, gap = 0.03;
  let a = 0; const arcs = tot.map((t) => { const span = (t / all) * (Math.PI * 2 - gap * n); const r = { a0: a, a1: a + span }; a += span + gap; return r; });
  const P = (r: number, ang: number) => [cx + r * Math.cos(ang - Math.PI / 2), cy + r * Math.sin(ang - Math.PI / 2)];
  const used = arcs.map((x) => x.a0), ribbons: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    const v = matrix[i][j]; if (!v) continue;
    const s1 = ((arcs[i].a1 - arcs[i].a0) * v) / (tot[i] || 1), s2 = ((arcs[j].a1 - arcs[j].a0) * v) / (tot[j] || 1);
    const ai0 = used[i], ai1 = ai0 + s1, aj0 = used[j], aj1 = aj0 + s2; used[i] = ai1; used[j] = aj1;
    const [x0, y0] = P(R - 4, ai0), [x1, y1] = P(R - 4, ai1), [x2, y2] = P(R - 4, aj0), [x3, y3] = P(R - 4, aj1);
    ribbons.push(<path key={i + "-" + j} d={`M${x0} ${y0}A${R - 4} ${R - 4} 0 0 1 ${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}A${R - 4} ${R - 4} 0 0 1 ${x3} ${y3}Q${cx} ${cy} ${x0} ${y0}Z`} fill={PAL[i % PAL.length]} fillOpacity={hl < 0 ? 0.42 : hl === i || hl === j ? 0.7 : 0.06}><title>{names[i]} ↔ {names[j]}: {v}편</title></path>);
  }
  // 라벨: 원 바깥쪽에 놓되 좌우 방향에 맞춰 정렬하고, 위아래로 겹치면 밀어 편다
  const mids = arcs.map((r) => (r.a0 + r.a1) / 2), pos = mids.map((m) => P(R + 14, m)), left = pos.map(([x]) => x < cx - 2);
  const ys = [0, 1].map((side) => { const idx = pos.map((_, i) => i).filter((i) => (left[i] ? 0 : 1) === side); const adj = spread(idx.map((i) => pos[i][1]), idx.map(() => 13), 6, H - 6, 1); return new Map(idx.map((i, k) => [i, adj[k]])); });
  return <div ref={ref}><svg viewBox={`0 0 ${S} ${H}`} width={S} height={H} className="block mx-auto">
    {ribbons}
    {arcs.map((r, i) => { const [x0, y0] = P(R, r.a0), [x1, y1] = P(R, r.a1), large = r.a1 - r.a0 > Math.PI ? 1 : 0, [tx] = pos[i], ty = ys[left[i] ? 0 : 1].get(i) ?? pos[i][1]; return <g key={i} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(-1)}><path d={`M${x0} ${y0}A${R} ${R} 0 ${large} 1 ${x1} ${y1}`} stroke={PAL[i % PAL.length]} strokeWidth={9} fill="none" /><text x={tx} y={ty + 3.5} textAnchor={left[i] ? "end" : "start"} fontSize={11} fill="#fff" fillOpacity={0.88}>{names[i]}</text></g>; })}
  </svg></div>;
}

// ─────────── 포레스트(회귀 계수) ───────────
export function Forest({ rows }: { rows: { label: string; coef: number; se: number }[] }) {
  const [ref, W] = useBox(360, 640);
  if (!rows.length) return <Empty />;
  const lw = Math.min(Math.round(W * 0.46), maxTextWidth(rows.map((r) => r.label), 11, 320) + 4), P = { l: lw + 14, r: 18, t: 6, b: 24 }, lay = rows.map((r) => wrapText(r.label, lw, 11, 3)), rhs = lay.map((l) => Math.max(26, l.length * 13 + 10));
  const ys: number[] = []; rhs.reduce((acc, h) => { ys.push(acc + h / 2); return acc + h; }, P.t); const H = P.t + P.b + rhs.reduce((s2, h) => s2 + h, 0);
  const lo = Math.min(...rows.map((r) => r.coef - 1.96 * r.se), 0), hi = Math.max(...rows.map((r) => r.coef + 1.96 * r.se), 0), X = (v: number) => P.l + ((v - lo) / Math.max(1e-9, hi - lo)) * (W - P.l - P.r);
  return <div ref={ref}><svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block">
    <line x1={X(0)} x2={X(0)} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
    {niceTicks(lo, hi, Math.max(2, Math.floor((W - P.l) / 70))).map((t) => <text key={t} x={X(t)} y={H - 7} textAnchor="middle" fontSize={11} fill={AX}>{t.toFixed(2)}</text>)}
    {rows.map((r, i) => { const y = ys[i], sig = Math.abs(r.coef) > 1.96 * r.se; return <g key={i}><Lines x={P.l - 10} y={y} lines={lay[i]} anchor="end" opacity={0.78} /><line x1={X(r.coef - 1.96 * r.se)} x2={X(r.coef + 1.96 * r.se)} y1={y} y2={y} stroke={r.coef >= 0 ? "#e8782e" : "#5aa0b8"} strokeWidth={2} /><circle cx={X(r.coef)} cy={y} r={4.5} fill={sig ? (r.coef >= 0 ? "#e8782e" : "#5aa0b8") : "#8a98a0"}><title>{r.label}: {r.coef.toFixed(3)} ± {(1.96 * r.se).toFixed(3)}</title></circle></g>; })}
  </svg></div>;
}

// ─────────── 로렌츠 ───────────
export function Lorenz({ points }: { points: [number, number][] }) {
  const S = 260, P = 34; if (points.length < 2) return <Empty />;
  const X = (v: number) => P + v * (S - P - 8), Y = (v: number) => S - P - v * (S - P - 8);
  return <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[300px] h-auto mx-auto">
    <rect x={P} y={8} width={S - P - 8} height={S - P - 8} fill="none" stroke={GRID} />
    <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 3" />
    <path d={points.map((p, i) => `${i ? "L" : "M"}${X(p[0])} ${Y(p[1])}`).join("") + `L${X(1)} ${Y(0)}L${X(0)} ${Y(0)}Z`} fill="#e8782e" fillOpacity={0.18} />
    <path d={points.map((p, i) => `${i ? "L" : "M"}${X(p[0])} ${Y(p[1])}`).join("")} fill="none" stroke="#e8782e" strokeWidth={2.2} />
    <text x={S / 2} y={S - 6} textAnchor="middle" fontSize={10.5} fill={AX}>논문 누적 비율</text><text x={10} y={S / 2} fontSize={10.5} fill={AX} transform={`rotate(-90 10 ${S / 2})`} textAnchor="middle">인용 누적 비율</text>
  </svg>;
}

// ─────────── 상자수염(가로) ───────────
export function BoxRows({ items, fmt = (n: number) => n.toFixed(1) }: { items: { label: string; lo: number; q1: number; q2: number; q3: number; hi: number; n: number }[]; fmt?: (n: number) => string }) {
  const [ref, W] = useBox(360, 640);
  if (!items.length) return <Empty />;
  const lab = (i: { label: string; n: number }) => `${i.label} (${i.n})`, lw = Math.min(Math.round(W * 0.42), maxTextWidth(items.map(lab), 11, 300) + 4), P = { l: lw + 14, r: 18, t: 6, b: 24 };
  const lay = items.map((i) => wrapText(lab(i), lw, 11, 3)), rhs = lay.map((l) => Math.max(26, l.length * 13 + 10)), ys: number[] = []; rhs.reduce((acc, h) => { ys.push(acc + h / 2); return acc + h; }, P.t);
  const H = P.t + P.b + rhs.reduce((s2, h) => s2 + h, 0), hi = Math.max(...items.map((i) => i.hi)), X = (v: number) => P.l + (v / Math.max(1e-9, hi)) * (W - P.l - P.r);
  return <div ref={ref}><svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block">
    {niceTicks(0, hi, Math.max(2, Math.floor((W - P.l) / 70))).map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1={P.t} y2={H - P.b} stroke={GRID} /><text x={X(t)} y={H - 7} textAnchor="middle" fontSize={11} fill={AX}>{t}</text></g>)}
    {items.map((it, i) => { const y = ys[i]; return <g key={i}><Lines x={P.l - 10} y={y} lines={lay[i]} anchor="end" opacity={0.75} />
      <line x1={X(it.lo)} x2={X(it.hi)} y1={y} y2={y} stroke="rgba(255,255,255,0.35)" /><rect x={X(it.q1)} y={y - 7} width={Math.max(1, X(it.q3) - X(it.q1))} height={14} fill={PAL[i % PAL.length]} fillOpacity={0.55} rx={2}><title>{it.label}: 최소 {fmt(it.lo)} · Q1 {fmt(it.q1)} · 중앙 {fmt(it.q2)} · Q3 {fmt(it.q3)} · 최대 {fmt(it.hi)}</title></rect><line x1={X(it.q2)} x2={X(it.q2)} y1={y - 7} y2={y + 7} stroke="#fff" strokeWidth={2} /></g>; })}
  </svg></div>;
}

// ─────────── 흐름도(PRISMA) ───────────
export function Flow({ steps }: { steps: { label: string; n: number }[] }) {
  const mx = Math.max(1, ...steps.map((s) => s.n));
  return <div className="space-y-1.5">{steps.map((s, i) => (
    <div key={i}>{i > 0 && <p className="text-[11px] text-white/30 ml-3 mb-0.5">▼ {steps[i - 1].n > 0 ? `${((s.n / steps[i - 1].n) * 100).toFixed(1)}% 남음 (제외 ${nfmt(Math.max(0, steps[i - 1].n - s.n))}편)` : ""}</p>}
      <div className="relative h-[34px] rounded-lg bg-white/[0.04] overflow-hidden"><div className="absolute inset-y-0 left-0" style={{ width: `${Math.max(2, (Math.sqrt(s.n) / Math.sqrt(mx)) * 100)}%`, background: PAL[i % PAL.length] + "55" }} />
        <span className="relative px-3 text-[13px] leading-[34px] text-white/85 flex justify-between"><span>{i + 1}. {s.label}</span><span className="tabular-nums font-semibold">{nfmt(s.n)}편</span></span></div></div>))}</div>;
}

export function Spark({ values, color = "#e8782e" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null; const mx = Math.max(1, ...values);
  return <svg width="84" height="24" viewBox="-2 -1 86 26"><polyline points={values.map((v, i) => `${(i / (values.length - 1)) * 80},${22 - (v / mx) * 20}`).join(" ")} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" /></svg>;
}
