"use client";

/* ════════════════════════════════════════════════════════════
   LLB 데이터 분석 — 추가 차트 부품(도넛·롤리팝·레이더·범프·슬로프·와플·게이지·소형 다중 선·예측 밴드·사분면)
═══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { PAL, Empty, nfmt } from "@/components/literature/viz";

const AX = "rgba(255,255,255,0.35)", GRID = "rgba(255,255,255,0.07)";
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** 도넛: 구성 비율. 가운데에 합계(또는 가리킨 조각) 표시 */
export function Donut({ items, size = 230, unit = "편", center }: { items: { label: string; value: number; color?: string }[]; size?: number; unit?: string; center?: string }) {
  const [hl, setHl] = useState(-1);
  const tot = items.reduce((s, i) => s + i.value, 0);
  if (!tot) return <Empty />;
  const R = size / 2 - 6, r = R * 0.62, cx = size / 2, cy = size / 2; let a = -Math.PI / 2;
  const arcs = items.map((it, i) => { const span = (it.value / tot) * Math.PI * 2, a0 = a, a1 = a + span; a = a1; const p = (rad: number, ang: number) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)], large = span > Math.PI ? 1 : 0, gap = span > 0.04 ? 0.012 : 0;
    const [x0, y0] = p(R, a0 + gap), [x1, y1] = p(R, a1 - gap), [x2, y2] = p(r, a1 - gap), [x3, y3] = p(r, a0 + gap);
    return { d: `M${x0} ${y0}A${R} ${R} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${large} 0 ${x3} ${y3}Z`, color: it.color ?? PAL[i % PAL.length], i }; });
  const cur = hl >= 0 ? items[hl] : null;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[230px] h-auto flex-shrink-0">
        {arcs.map((x) => <path key={x.i} d={x.d} fill={x.color} fillOpacity={hl < 0 || hl === x.i ? 0.92 : 0.25} onMouseEnter={() => setHl(x.i)} onMouseLeave={() => setHl(-1)} style={{ transition: "fill-opacity .15s", transform: hl === x.i ? "scale(1.015)" : "none", transformOrigin: "center" }}><title>{x.i >= 0 ? items[x.i].label : ""}: {nfmt(items[x.i].value)}{unit} ({((items[x.i].value / tot) * 100).toFixed(1)}%)</title></path>)}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={cur ? 19 : 22} fontWeight={600} fill="#fff">{cur ? ((cur.value / tot) * 100).toFixed(1) + "%" : center ?? nfmt(tot)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill={AX}>{cur ? short(cur.label, 14) : unit}</text>
      </svg>
      <div className="space-y-1 text-[12.5px] min-w-0 flex-1">{items.map((it, i) => <div key={i} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(-1)} className="flex items-center gap-2 text-white/70"><i className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: it.color ?? PAL[i % PAL.length] }} /><span className="truncate flex-1">{it.label}</span><span className="tabular-nums text-white/40">{((it.value / tot) * 100).toFixed(1)}%</span></div>)}</div>
    </div>
  );
}

/** 롤리팝: 순위(막대보다 가볍게) */
export function Lollipop({ items, fmt = nfmt, color = "#4fa89f", labelW = 170 }: { items: { label: string; value: number; sub?: string; color?: string }[]; fmt?: (n: number) => string; color?: string; labelW?: number }) {
  if (!items.length) return <Empty />;
  const W = 640, rh = 24, P = { l: labelW, r: 90, t: 4, b: 4 }, H = P.t + P.b + items.length * rh, mx = Math.max(1e-9, ...items.map((i) => Math.abs(i.value)));
  const X = (v: number) => P.l + (Math.abs(v) / mx) * (W - P.l - P.r);
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
    <defs><linearGradient id="lolg" x1="0" x2="1"><stop offset="0" stopColor={color} stopOpacity="0.25" /><stop offset="1" stopColor={color} stopOpacity="0.9" /></linearGradient></defs>
    {items.map((it, i) => { const y = P.t + i * rh + rh / 2, c = it.color ?? color; return <g key={i}>
      <text x={P.l - 8} y={y + 4} textAnchor="end" fontSize={11.5} fill="#fff" fillOpacity={0.78}>{short(it.label, Math.floor(labelW / 6.2))}</text>
      <line x1={P.l} x2={X(it.value)} y1={y} y2={y} stroke={c} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" /><circle cx={X(it.value)} cy={y} r={5.5} fill={c} fillOpacity={0.95}><title>{it.label}: {fmt(it.value)}{it.sub ? " · " + it.sub : ""}</title></circle>
      <text x={X(it.value) + 10} y={y + 4} fontSize={11} fill="#fff" fillOpacity={0.62} className="tabular-nums">{fmt(it.value)}{it.sub ? <tspan fill="#fff" fillOpacity={0.3}> · {short(it.sub, 14)}</tspan> : null}</text></g>; })}
  </svg>;
}

/** 레이더: 여러 지표를 한눈에 비교(각 축은 0~1 로 정규화된 값을 받는다) */
export function Radar({ axes, series, size = 300 }: { axes: string[]; series: { name: string; values: number[]; color?: string }[]; size?: number }) {
  const [hl, setHl] = useState(-1);
  if (axes.length < 3 || !series.length) return <Empty />;
  const R = size / 2 - 46, cx = size / 2, cy = size / 2, n = axes.length, pt = (i: number, v: number) => [cx + R * v * Math.cos((i / n) * Math.PI * 2 - Math.PI / 2), cy + R * v * Math.sin((i / n) * Math.PI * 2 - Math.PI / 2)];
  return <div>
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[340px] h-auto mx-auto">
      {[0.25, 0.5, 0.75, 1].map((g) => <polygon key={g} points={axes.map((_, i) => pt(i, g).join(",")).join(" ")} fill="none" stroke={GRID} />)}
      {axes.map((a, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.17); return <g key={a}><line x1={cx} y1={cy} x2={x} y2={y} stroke={GRID} /><text x={lx} y={ly + 3.5} textAnchor="middle" fontSize={10.5} fill="#fff" fillOpacity={0.65}>{a}</text></g>; })}
      {series.map((s, k) => { const c = s.color ?? PAL[k % PAL.length]; return <g key={s.name} onMouseEnter={() => setHl(k)} onMouseLeave={() => setHl(-1)} opacity={hl < 0 || hl === k ? 1 : 0.15}><polygon points={s.values.map((v, i) => pt(i, Math.min(1, Math.max(0, v))).join(",")).join(" ")} fill={c} fillOpacity={0.16} stroke={c} strokeWidth={2} strokeLinejoin="round" />{s.values.map((v, i) => { const [x, y] = pt(i, Math.min(1, Math.max(0, v))); return <circle key={i} cx={x} cy={y} r={2.8} fill={c} />; })}</g>; })}
    </svg>
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[12px] text-white/60">{series.map((s, k) => <span key={s.name} onMouseEnter={() => setHl(k)} onMouseLeave={() => setHl(-1)} className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color ?? PAL[k % PAL.length] }} />{short(s.name, 22)}</span>)}</div>
  </div>;
}

/** 범프: 기간별 순위 변화(위가 1위) */
export function Bump({ periods, series, height = 300 }: { periods: string[]; series: { name: string; ranks: (number | null)[] }[]; height?: number }) {
  const [hl, setHl] = useState(-1);
  if (periods.length < 2 || !series.length) return <Empty />;
  const W = 640, P = { l: 12, r: 170, t: 22, b: 8 }, maxR = Math.max(...series.flatMap((s) => s.ranks.filter((r): r is number => r != null)), 1), X = (i: number) => P.l + (i / (periods.length - 1)) * (W - P.l - P.r), Y = (r: number) => P.t + ((r - 1) / Math.max(1, maxR - 1)) * (height - P.t - P.b);
  return <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto">
    {periods.map((p, i) => <text key={p} x={X(i)} y={13} textAnchor="middle" fontSize={11} fill={AX}>{p}</text>)}
    {series.map((s, k) => { const c = PAL[k % PAL.length], pts = s.ranks.map((r, i) => (r == null ? null : [X(i), Y(r)] as const)); const seg = pts.filter((p): p is readonly [number, number] => !!p), d = seg.map((p, i) => { if (!i) return `M${p[0]} ${p[1]}`; const q = seg[i - 1], mx = (q[0] + p[0]) / 2; return `C${mx} ${q[1]} ${mx} ${p[1]} ${p[0]} ${p[1]}`; }).join(""); const last = [...pts].reverse().find((p) => p), lastI = pts.lastIndexOf(last ?? null);
      return <g key={s.name} opacity={hl < 0 || hl === k ? 1 : 0.15} onMouseEnter={() => setHl(k)} onMouseLeave={() => setHl(-1)}><path d={d} fill="none" stroke={c} strokeWidth={hl === k ? 4 : 2.6} strokeLinecap="round" />{seg.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={5} fill="#13161e" stroke={c} strokeWidth={2} />)}{last && lastI === periods.length - 1 && <text x={last[0] + 9} y={last[1] + 4} fontSize={11} fill={c}>{short(s.name, 24)}</text>}</g>; })}
  </svg>;
}

/** 슬로프: 두 시점의 값을 선으로 이어 증감을 보여 준다 */
export function Slope({ left, right, items, fmt = (n: number) => n.toFixed(1) }: { left: string; right: string; items: { label: string; a: number; b: number }[]; fmt?: (n: number) => string }) {
  if (!items.length) return <Empty />;
  const W = 640, H = Math.max(240, items.length * 22 + 40), P = { l: 190, r: 190, t: 28, b: 8 }, mx = Math.max(...items.flatMap((i) => [i.a, i.b]), 1e-9), Y = (v: number) => P.t + (1 - v / mx) * (H - P.t - P.b);
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
    <text x={P.l} y={14} textAnchor="middle" fontSize={11.5} fill={AX}>{left}</text><text x={W - P.r} y={14} textAnchor="middle" fontSize={11.5} fill={AX}>{right}</text>
    {items.map((it, i) => { const up = it.b >= it.a, c = up ? "#e8782e" : "#4fa89f"; return <g key={i}><line x1={P.l} y1={Y(it.a)} x2={W - P.r} y2={Y(it.b)} stroke={c} strokeOpacity={0.7} strokeWidth={1.8} /><circle cx={P.l} cy={Y(it.a)} r={3.5} fill={c} /><circle cx={W - P.r} cy={Y(it.b)} r={3.5} fill={c} />
      <text x={P.l - 9} y={Y(it.a) + 3.5} textAnchor="end" fontSize={10.5} fill="#fff" fillOpacity={0.7}>{short(it.label, 26)} <tspan fill="#fff" fillOpacity={0.4}>{fmt(it.a)}</tspan></text><text x={W - P.r + 9} y={Y(it.b) + 3.5} fontSize={10.5} fill="#fff" fillOpacity={0.7}><tspan fill="#fff" fillOpacity={0.4}>{fmt(it.b)} </tspan>{short(it.label, 26)}</text></g>; })}
  </svg>;
}

/** 와플: 100칸 중 몇 칸이 채워지는가(보유 비율) */
export function Waffle({ value, total, label, color = "#e8782e" }: { value: number; total: number; label: string; color?: string }) {
  const pct = total ? (value / total) * 100 : 0, filled = Math.round(pct);
  return <div className="flex items-center gap-4"><svg viewBox="0 0 110 110" className="w-[120px] h-[120px] flex-shrink-0">{Array.from({ length: 100 }, (_, i) => { const col = i % 10, row = 9 - Math.floor(i / 10), on = i < filled; return <rect key={i} x={col * 11} y={row * 11} width={9.5} height={9.5} rx={2} fill={on ? color : "#ffffff"} fillOpacity={on ? 0.9 : 0.08} />; })}</svg>
    <div><p className="text-[26px] font-semibold tabular-nums" style={{ color }}>{pct.toFixed(1)}%</p><p className="text-[12.5px] text-white/55">{label}</p><p className="text-[11.5px] text-white/30 tabular-nums">{nfmt(value)} / {nfmt(total)}편</p></div></div>;
}

/** 게이지: 0~max 사이 값 */
export function Gauge({ value, max = 1, label, sub, color = "#4fa89f", fmt = (v: number) => (v * 100).toFixed(1) + "%" }: { value: number; max?: number; label: string; sub?: string; color?: string; fmt?: (v: number) => string }) {
  const t = Math.min(1, Math.max(0, value / max)), R = 80, cx = 100, cy = 100, a = Math.PI * (1 - t), x = cx + R * Math.cos(a), y = cy - R * Math.sin(a);
  return <div className="text-center"><svg viewBox="0 0 200 118" className="w-full max-w-[220px] h-auto mx-auto"><path d={`M${cx - R} ${cy}A${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={14} strokeLinecap="round" />
    <path d={`M${cx - R} ${cy}A${R} ${R} 0 0 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" /><text x={cx} y={cy - 8} textAnchor="middle" fontSize={26} fontWeight={600} fill="#fff">{fmt(value)}</text><text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill={AX}>{label}</text></svg>{sub && <p className="text-[11.5px] text-white/35 mt-1">{sub}</p>}</div>;
}

/** 소형 다중 선: 여러 지표의 시간 추이를 한 판에, 추세 판정 배지와 함께 */
export function SparkGrid({ items }: { items: { label: string; years: number[]; values: number[]; badge?: string; tone?: "up" | "down" | "flat"; note?: string; fmt?: (v: number) => string; marks?: number[] }[] }) {
  if (!items.length) return <Empty />;
  return <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">{items.map((it) => {
    const W = 180, H = 56, mn = Math.min(...it.values), mx = Math.max(...it.values), X = (i: number) => 4 + (i / Math.max(1, it.values.length - 1)) * (W - 8), Y = (v: number) => 6 + (1 - (v - mn) / Math.max(1e-9, mx - mn)) * (H - 14), c = it.tone === "up" ? "#e8782e" : it.tone === "down" ? "#4fa89f" : "#8a98a0";
    const line = it.values.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(""), area = line + `L${X(it.values.length - 1)} ${H - 4}L${X(0)} ${H - 4}Z`, f = it.fmt ?? ((v: number) => v.toFixed(1));
    return <div key={it.label} className="p-2.5 rounded-xl bg-[#0d0f14] border border-white/[0.04]"><div className="flex items-center justify-between gap-1"><p className="text-[12px] text-white/65 truncate">{it.label}</p>{it.badge && <span className="text-[10.5px] px-1.5 rounded" style={{ background: c + "33", color: c }}>{it.badge}</span>}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[56px]"><defs><linearGradient id={"sg" + it.label} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity="0.35" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill={`url(#sg${it.label})`} /><path d={line} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" />{it.marks?.map((y) => { const i = it.years.indexOf(y); return i >= 0 ? <line key={y} x1={X(i)} x2={X(i)} y1={2} y2={H - 4} stroke="#ffd24a" strokeDasharray="2 2" /> : null; })}<circle cx={X(it.values.length - 1)} cy={Y(it.values[it.values.length - 1])} r={3} fill={c} /></svg>
      <p className="text-[11px] text-white/40 tabular-nums">{it.years[0]} {f(it.values[0])} → {it.years[it.years.length - 1]} {f(it.values[it.values.length - 1])}</p>{it.note && <p className="text-[10.5px] text-white/30">{it.note}</p>}</div>; })}</div>;
}

/** 성장 모형 + 예측 구간 + 변화점 */
export function ForecastChart({ years, counts, fitted, forecast, changePoints, height = 280 }: { years: number[]; counts: number[]; fitted: number[]; forecast: { x: number; y: number; lo: number; hi: number }[]; changePoints: number[]; height?: number }) {
  const W = 640, P = { l: 48, r: 14, t: 12, b: 24 }, allX = [...years, ...forecast.map((f) => f.x)], x0 = allX[0], x1 = allX[allX.length - 1], mx = Math.max(...counts, ...forecast.map((f) => f.hi), 1);
  const X = (x: number) => P.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - P.l - P.r), Y = (v: number) => P.t + (1 - v / mx) * (height - P.t - P.b);
  if (!years.length) return <Empty />;
  const ticks = Array.from({ length: 5 }, (_, i) => (mx * i) / 4), line = (xs: number[], ys: number[]) => xs.map((x, i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(ys[i]).toFixed(1)}`).join("");
  const band = forecast.map((f, i) => `${i ? "L" : "M"}${X(f.x)} ${Y(f.hi)}`).join("") + [...forecast].reverse().map((f) => `L${X(f.x)} ${Y(f.lo)}`).join("") + "Z";
  const cpX = [x0, ...changePoints, x1 + 1];
  return <div><svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto">
    <defs><linearGradient id="fcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4fa89f" stopOpacity="0.35" /><stop offset="1" stopColor="#4fa89f" stopOpacity="0" /></linearGradient></defs>
    {ticks.map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} stroke={GRID} /><text x={P.l - 6} y={Y(t) + 3.5} textAnchor="end" fontSize={10.5} fill={AX}>{nfmt(Math.round(t))}</text></g>)}
    {cpX.slice(0, -1).map((a, i) => i % 2 === 0 ? null : <rect key={a} x={X(a)} y={P.t} width={Math.max(0, X(cpX[i + 1] - 1) - X(a))} height={height - P.t - P.b} fill="#fff" fillOpacity={0.03} />)}
    {changePoints.map((c) => <g key={c}><line x1={X(c)} x2={X(c)} y1={P.t} y2={height - P.b} stroke="#ffd24a" strokeDasharray="4 3" /><text x={X(c) + 4} y={P.t + 10} fontSize={10.5} fill="#ffd24a">{c} 변화점</text></g>)}
    <path d={line(years, counts) + `L${X(years[years.length - 1])} ${Y(0)}L${X(years[0])} ${Y(0)}Z`} fill="url(#fcg)" />
    <path d={band} fill="#e8782e" fillOpacity={0.18} /><path d={line([years[years.length - 1], ...forecast.map((f) => f.x)], [fitted[fitted.length - 1], ...forecast.map((f) => f.y)])} fill="none" stroke="#e8782e" strokeWidth={2.2} strokeDasharray="5 4" />
    <path d={line(years, fitted)} fill="none" stroke="#e8782e" strokeOpacity={0.6} strokeWidth={1.6} />
    <path d={line(years, counts)} fill="none" stroke="#4fa89f" strokeWidth={2.4} strokeLinejoin="round" />{years.map((y, i) => <circle key={y} cx={X(y)} cy={Y(counts[i])} r={2.8} fill="#4fa89f"><title>{y}: {counts[i]}편</title></circle>)}
    {[x0, ...years.filter((_, i) => i % Math.ceil(years.length / 7) === 0), x1].filter((v, i, a) => a.indexOf(v) === i).map((x) => <text key={x} x={X(x)} y={height - 7} textAnchor="middle" fontSize={10.5} fill={AX}>{x}</text>)}
  </svg><div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/55 mt-1"><span><i className="inline-block w-3 h-[3px] align-middle mr-1" style={{ background: "#4fa89f" }} />실제 편수</span><span><i className="inline-block w-3 h-[3px] align-middle mr-1" style={{ background: "#e8782e" }} />모형 적합·예측</span><span><i className="inline-block w-3 h-2 align-middle mr-1" style={{ background: "#e8782e55" }} />95% 예측구간</span><span><i className="inline-block w-3 h-[2px] align-middle mr-1" style={{ background: "#ffd24a" }} />변화점</span></div></div>;
}

/** 사분면: 가로 = 규모(로그), 세로 = 증가율, 색 = 단계 */
export function Quadrant({ points, xLabel, yLabel, height = 340 }: { points: { x: number; y: number; label: string; color: string; r?: number }[]; xLabel: string; yLabel: string; height?: number }) {
  const [hov, setHov] = useState<string>("");
  if (!points.length) return <Empty />;
  const W = 640, P = { l: 50, r: 14, t: 14, b: 34 }, xs = points.map((p) => Math.log10(p.x + 1)), ys = points.map((p) => p.y), xa = Math.min(...xs), xb = Math.max(...xs), ya = Math.min(...ys, -0.5), yb = Math.min(Math.max(...ys, 0.5), 4);
  const X = (v: number) => P.l + ((Math.log10(v + 1) - xa) / Math.max(1e-9, xb - xa)) * (W - P.l - P.r), Y = (v: number) => P.t + (1 - (Math.min(v, yb) - ya) / Math.max(1e-9, yb - ya)) * (height - P.t - P.b), mxX = P.l + (W - P.l - P.r) / 2;
  return <div><svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto">
    <line x1={P.l} x2={W - P.r} y1={Y(0)} y2={Y(0)} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 3" /><line x1={mxX} x2={mxX} y1={P.t} y2={height - P.b} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 3" />
    <text x={W - P.r - 4} y={P.t + 12} textAnchor="end" fontSize={11} fill="#e8782e" fillOpacity={0.7}>크고 빠르게 성장</text><text x={P.l + 4} y={P.t + 12} fontSize={11} fill="#b5c23c" fillOpacity={0.7}>작지만 급성장(신흥)</text><text x={W - P.r - 4} y={height - P.b - 6} textAnchor="end" fontSize={11} fill="#8e5c70" fillOpacity={0.8}>크지만 정체·쇠퇴</text>
    {[0, 25, 50, 75, 100].map((p) => <text key={p} x={P.l + (p / 100) * (W - P.l - P.r)} y={height - P.b + 14} textAnchor="middle" fontSize={10} fill={AX}>{p === 0 ? "작음" : p === 100 ? "큼" : ""}</text>)}
    {[-0.5, 0, 0.5, 1, 2, 3].filter((t) => t >= ya && t <= yb).map((t) => <text key={t} x={P.l - 6} y={Y(t) + 3.5} textAnchor="end" fontSize={10.5} fill={AX}>{t >= 0 ? "+" : ""}{(t * 100).toFixed(0)}%</text>)}
    <text x={W / 2} y={height - 4} textAnchor="middle" fontSize={11} fill={AX}>{xLabel}</text><text x={10} y={height / 2} fontSize={11} fill={AX} transform={`rotate(-90 10 ${height / 2})`} textAnchor="middle">{yLabel}</text>
    {points.map((p) => <circle key={p.label} cx={X(p.x)} cy={Y(p.y)} r={p.r ?? 5} fill={p.color} fillOpacity={hov === p.label ? 1 : 0.72} stroke={hov === p.label ? "#fff" : "none"} onMouseEnter={() => setHov(p.label)} onMouseLeave={() => setHov("")}><title>{p.label}</title></circle>)}
  </svg><div className="min-h-[18px] text-[12px] text-white/60 truncate">{hov || " "}</div></div>;
}
