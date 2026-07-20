"use client";
// 내용분석 자체 그래프 렌더러 — 순수 SVG, 외부 라이브러리·데이터시각화 모듈 의존 없음.
// CaChartSpec 한 종류를 받아 15가지 차트 유형으로 그린다. 색은 CA_PALETTE + 테마 CSS 변수.
import { CaChartSpec, palette } from "@/lib/basic-stats/ca-charts";

const cssv = (v: string) => `var(${v})`;
const AXIS = cssv("--color-border-secondary");
const GRID = cssv("--color-border-tertiary");
const INK = cssv("--color-text-primary");
const INK3 = cssv("--color-text-tertiary");
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const W = 560, H = 320; // viewBox 기준(컨테이너 width 100%)

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p * Math.ceil(v / (step * p));
}

export default function CaChart({ spec }: { spec: CaChartSpec }) {
  if (!spec || !spec.labels?.length) return <div className="text-[12px] text-white/35 p-3">표시할 데이터가 없습니다.</div>;
  const t = spec.type;
  const body =
    t === "bar" || t === "lollipop" ? <BarChart spec={spec} lollipop={t === "lollipop"} /> :
    t === "hbar" ? <HBar spec={spec} /> :
    t === "stacked" ? <Stacked spec={spec} /> :
    t === "grouped" ? <Grouped spec={spec} /> :
    t === "line" || t === "area" ? <LineArea spec={spec} area={t === "area"} /> :
    t === "pie" || t === "donut" ? <PieChart spec={spec} donut={t === "donut"} /> :
    t === "heatmap" ? <Heatmap spec={spec} /> :
    t === "bubble" ? <Bubble spec={spec} /> :
    t === "wordcloud" ? <WordCloud spec={spec} /> :
    t === "network" ? <Network spec={spec} /> :
    t === "treemap" ? <Treemap spec={spec} /> :
    t === "radar" ? <Radar spec={spec} /> :
    t === "scatter" ? <Scatter spec={spec} /> :
    t === "histogram" ? <Histogram spec={spec} /> :
    t === "boxplot" ? <BoxPlot spec={spec} /> :
    t === "waffle" ? <Waffle spec={spec} /> :
    t === "dotstrip" ? <DotStrip spec={spec} /> :
    t === "polar" || t === "radialbar" ? <Polar spec={spec} radial={t === "radialbar"} /> :
    t === "slope" || t === "dumbbell" ? <Slope spec={spec} dumbbell={t === "dumbbell"} /> :
    t === "sankey" ? <Sankey spec={spec} /> :
    t === "arc" ? <Arc spec={spec} /> :
    t === "streamgraph" || t === "stackedarea" ? <StreamGraph spec={spec} /> :
    t === "parallel" ? <Parallel spec={spec} /> :
    t === "bump" ? <Bump spec={spec} /> :
    <BarChart spec={spec} />;
  return (
    <div className="rounded-md p-2" style={{ background: cssv("--color-background-primary"), border: "0.5px solid #1e2230" }}>
      {spec.title && <div className="text-[12.5px] font-semibold mb-1 px-1" style={{ color: cssv("--brand-ink") }}>{spec.title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img">{body}</svg>
      {spec.note && <div className="text-[11px] text-white/35 mt-1 px-1">{spec.note}</div>}
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return <g>{items.slice(0, 8).map((it, i) => (
    <g key={i} transform={`translate(${i * 90 + 50},14)`}>
      <rect width="10" height="10" rx="2" fill={it.color} />
      <text x="14" y="9" fontSize="10" fill={INK3}>{it.name.slice(0, 8)}</text>
    </g>
  ))}</g>;
}

// ── 세로 막대 / 롤리팝 ──
function BarChart({ spec, lollipop }: { spec: CaChartSpec; lollipop?: boolean }) {
  const vals = spec.series[0]?.values || [];
  const labels = spec.labels;
  const max = niceMax(Math.max(1, ...vals));
  const PL = 42, PR = 16, PT = 24, PB = 56;
  const cw = (W - PL - PR) / labels.length;
  const bw = Math.min(cw * 0.62, 46);
  const y = (v: number) => H - PB - (v / max) * (H - PT - PB);
  return <g>
    {[0, 0.25, 0.5, 0.75, 1].map((f, i) => { const yy = H - PB - f * (H - PT - PB); return <g key={i}>
      <line x1={PL} y1={yy} x2={W - PR} y2={yy} stroke={GRID} strokeDasharray="2 3" />
      <text x={PL - 6} y={yy + 3} fontSize="9" textAnchor="end" fill={INK3}>{fmt(max * f)}</text></g>; })}
    {vals.map((v, i) => {
      const cx = PL + cw * i + cw / 2;
      return <g key={i}>
        {lollipop
          ? <><line x1={cx} y1={H - PB} x2={cx} y2={y(v)} stroke={palette(i)} strokeWidth="2.5" /><circle cx={cx} cy={y(v)} r="6" fill={palette(i)} /></>
          : <rect x={cx - bw / 2} y={y(v)} width={bw} height={H - PB - y(v)} rx="3" fill={palette(i)} />}
        <text x={cx} y={y(v) - 5} fontSize="9.5" textAnchor="middle" fill={INK}>{fmt(v)}</text>
        <text x={cx} y={H - PB + 12} fontSize="9.5" textAnchor="middle" fill={INK3} transform={labels.length > 7 ? `rotate(35 ${cx} ${H - PB + 12})` : undefined}>{labels[i].slice(0, 9)}</text>
      </g>;
    })}
    <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AXIS} />
  </g>;
}

// ── 가로 막대 ──
function HBar({ spec }: { spec: CaChartSpec }) {
  const vals = spec.series[0]?.values || [];
  const labels = spec.labels;
  const max = niceMax(Math.max(1, ...vals));
  const PL = 96, PR = 36, PT = 12, PB = 18;
  const ch = (H - PT - PB) / labels.length;
  const bh = Math.min(ch * 0.66, 26);
  const x = (v: number) => PL + (v / max) * (W - PL - PR);
  return <g>
    {vals.map((v, i) => { const cy = PT + ch * i + ch / 2; return <g key={i}>
      <rect x={PL} y={cy - bh / 2} width={x(v) - PL} height={bh} rx="3" fill={palette(i)} />
      <text x={PL - 6} y={cy + 3} fontSize="10" textAnchor="end" fill={INK}>{labels[i].slice(0, 12)}</text>
      <text x={x(v) + 4} y={cy + 3} fontSize="9.5" fill={INK3}>{fmt(v)}</text></g>; })}
    <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={AXIS} />
  </g>;
}

// ── 누적 막대(행=문서/항목, 열=범주) ──
function Stacked({ spec }: { spec: CaChartSpec }) {
  const cats = spec.cols || [];
  const rows = spec.labels; // 각 막대(문서)
  const PL = 40, PR = 16, PT = 28, PB = 50;
  const totals = spec.series.map((s) => s.values.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(1, ...totals));
  const cw = (W - PL - PR) / rows.length;
  const bw = Math.min(cw * 0.6, 48);
  const scale = (v: number) => (v / max) * (H - PT - PB);
  return <g>
    <Legend items={cats.map((c, i) => ({ name: c, color: palette(i) }))} />
    {rows.map((rl, ri) => {
      const cx = PL + cw * ri + cw / 2; let acc = 0;
      return <g key={ri}>
        {(spec.series[ri]?.values || []).map((v, ci) => { const hgt = scale(v); const yy = H - PB - acc - hgt; acc += hgt;
          return <rect key={ci} x={cx - bw / 2} y={yy} width={bw} height={hgt} fill={palette(ci)} />; })}
        <text x={cx} y={H - PB + 12} fontSize="9.5" textAnchor="middle" fill={INK3} transform={rows.length > 6 ? `rotate(30 ${cx} ${H - PB + 12})` : undefined}>{rl.slice(0, 9)}</text>
      </g>;
    })}
    <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AXIS} />
  </g>;
}

// ── 묶음 막대 ──
function Grouped({ spec }: { spec: CaChartSpec }) {
  const cats = spec.cols || [];
  const rows = spec.labels;
  const PL = 40, PR = 16, PT = 28, PB = 50;
  const allVals = spec.series.flatMap((s) => s.values);
  const max = niceMax(Math.max(1, ...allVals));
  const gw = (W - PL - PR) / rows.length;
  const bw = Math.min((gw * 0.8) / Math.max(1, cats.length), 22);
  const y = (v: number) => H - PB - (v / max) * (H - PT - PB);
  return <g>
    <Legend items={cats.map((c, i) => ({ name: c, color: palette(i) }))} />
    {rows.map((rl, ri) => { const gx = PL + gw * ri + gw * 0.1;
      return <g key={ri}>
        {(spec.series[ri]?.values || []).map((v, ci) => <rect key={ci} x={gx + ci * bw} y={y(v)} width={bw - 2} height={H - PB - y(v)} fill={palette(ci)} />)}
        <text x={gx + (cats.length * bw) / 2} y={H - PB + 12} fontSize="9.5" textAnchor="middle" fill={INK3} transform={rows.length > 6 ? `rotate(30 ${gx + (cats.length * bw) / 2} ${H - PB + 12})` : undefined}>{rl.slice(0, 9)}</text>
      </g>; })}
    <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AXIS} />
  </g>;
}

// ── 선 / 영역 ──
function LineArea({ spec, area }: { spec: CaChartSpec; area?: boolean }) {
  const vals = spec.series[0]?.values || [];
  const labels = spec.labels;
  const max = niceMax(Math.max(1, ...vals));
  const PL = 40, PR = 18, PT = 20, PB = 46;
  const x = (i: number) => PL + (labels.length === 1 ? 0 : (i / (labels.length - 1)) * (W - PL - PR));
  const y = (v: number) => H - PB - (v / max) * (H - PT - PB);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return <g>
    {[0, 0.5, 1].map((f, i) => { const yy = H - PB - f * (H - PT - PB); return <g key={i}>
      <line x1={PL} y1={yy} x2={W - PR} y2={yy} stroke={GRID} strokeDasharray="2 3" />
      <text x={PL - 6} y={yy + 3} fontSize="9" textAnchor="end" fill={INK3}>{fmt(max * f)}</text></g>; })}
    {area && <polygon points={`${PL},${H - PB} ${pts} ${x(vals.length - 1)},${H - PB}`} fill={palette(0)} opacity="0.18" />}
    <polyline points={pts} fill="none" stroke={palette(0)} strokeWidth="2.2" />
    {vals.map((v, i) => <g key={i}><circle cx={x(i)} cy={y(v)} r="3.5" fill={palette(0)} />
      <text x={x(i)} y={H - PB + 12} fontSize="9" textAnchor="middle" fill={INK3} transform={labels.length > 8 ? `rotate(35 ${x(i)} ${H - PB + 12})` : undefined}>{labels[i].slice(0, 8)}</text></g>)}
    <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AXIS} />
  </g>;
}

// ── 파이 / 도넛 ──
function PieChart({ spec, donut }: { spec: CaChartSpec; donut?: boolean }) {
  const vals = spec.series[0]?.values || [];
  const labels = spec.labels;
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const cx = 170, cy = H / 2, r = 116, ri = donut ? 58 : 0;
  let a0 = -Math.PI / 2;
  const arc = (a1: number, a2: number) => {
    const big = a2 - a1 > Math.PI ? 1 : 0;
    const p = (a: number, rr: number) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
    if (ri > 0) return `M${p(a1, r)} A${r} ${r} 0 ${big} 1 ${p(a2, r)} L${p(a2, ri)} A${ri} ${ri} 0 ${big} 0 ${p(a1, ri)} Z`;
    return `M${cx},${cy} L${p(a1, r)} A${r} ${r} 0 ${big} 1 ${p(a2, r)} Z`;
  };
  return <g>
    {vals.map((v, i) => { const a1 = a0; const a2 = a0 + (v / total) * Math.PI * 2; a0 = a2; const mid = (a1 + a2) / 2; const pct = (v / total) * 100;
      return <g key={i}>
        <path d={arc(a1, a2)} fill={palette(i)} />
        {pct >= 5 && <text x={cx + (r * 0.62) * Math.cos(mid)} y={cy + (r * 0.62) * Math.sin(mid) + 3} fontSize="10" textAnchor="middle" fill="#fff">{pct.toFixed(0)}%</text>}
      </g>; })}
    {donut && <text x={cx} y={cy + 4} fontSize="15" textAnchor="middle" fontWeight="700" fill={INK}>{fmt(total)}</text>}
    {labels.map((l, i) => <g key={i} transform={`translate(${W - 168},${36 + i * 19})`}>
      <rect width="11" height="11" rx="2" fill={palette(i)} />
      <text x="16" y="10" fontSize="10.5" fill={INK}>{l.slice(0, 13)} ({((vals[i] / total) * 100).toFixed(1)}%)</text></g>)}
  </g>;
}

// ── 히트맵(행렬) ──
function Heatmap({ spec }: { spec: CaChartSpec }) {
  const rows = spec.labels, cols = spec.cols || [];
  const PL = 100, PT = 56, PR = 14, PB = 14;
  const cw = (W - PL - PR) / Math.max(1, cols.length);
  const ch = Math.min((H - PT - PB) / Math.max(1, rows.length), 30);
  const max = Math.max(1, ...spec.series.flatMap((s) => s.values));
  return <g>
    {cols.map((c, j) => <text key={j} x={PL + cw * j + cw / 2} y={PT - 6} fontSize="9.5" textAnchor="middle" fill={INK3} transform={cols.length > 6 ? `rotate(-35 ${PL + cw * j + cw / 2} ${PT - 6})` : undefined}>{c.slice(0, 8)}</text>)}
    {rows.map((rl, i) => <g key={i}>
      <text x={PL - 6} y={PT + ch * i + ch / 2 + 3} fontSize="9.5" textAnchor="end" fill={INK}>{rl.slice(0, 13)}</text>
      {(spec.series[i]?.values || []).map((v, j) => { const t = v / max;
        return <g key={j}>
          <rect x={PL + cw * j} y={PT + ch * i} width={cw - 1.5} height={ch - 1.5} rx="2" fill={palette(0)} opacity={0.12 + t * 0.85} />
          {cw > 26 && v > 0 && <text x={PL + cw * j + cw / 2} y={PT + ch * i + ch / 2 + 3} fontSize="9" textAnchor="middle" fill={t > 0.55 ? "#fff" : INK}>{fmt(v)}</text>}
        </g>; })}
    </g>)}
  </g>;
}

// ── 버블 ──
function Bubble({ spec }: { spec: CaChartSpec }) {
  const vals = spec.series[0]?.values || [];
  const labels = spec.labels;
  const max = Math.max(1, ...vals);
  const cols = Math.ceil(Math.sqrt(labels.length)) || 1;
  const cw = (W - 40) / cols, rh = (H - 30) / Math.ceil(labels.length / cols);
  return <g>{vals.map((v, i) => { const cx = 20 + (i % cols) * cw + cw / 2; const cy = 18 + Math.floor(i / cols) * rh + rh / 2;
    const r = 8 + Math.sqrt(v / max) * Math.min(cw, rh) * 0.42;
    return <g key={i}>
      <circle cx={cx} cy={cy} r={r} fill={palette(i)} opacity="0.78" />
      <text x={cx} y={cy + 3} fontSize="10" textAnchor="middle" fill="#fff">{fmt(v)}</text>
      <text x={cx} y={cy + r + 11} fontSize="9.5" textAnchor="middle" fill={INK3}>{labels[i].slice(0, 8)}</text></g>; })}</g>;
}

// ── 워드클라우드 ──
function WordCloud({ spec }: { spec: CaChartSpec }) {
  const vals = spec.series[0]?.values || [];
  const labels = spec.labels;
  const max = Math.max(1, ...vals), min = Math.min(...vals);
  const size = (v: number) => 12 + ((v - min) / Math.max(1, max - min)) * 30;
  // 간단한 행 배치(좌→우, 넘치면 줄바꿈)
  const lines: { w: string; s: number; i: number }[][] = [[]]; let lineW = 0; const maxW = W - 24;
  const order = labels.map((w, i) => ({ w, s: size(vals[i]), i })).sort((a, b) => b.s - a.s);
  order.forEach((it) => { const wpx = it.w.length * it.s * 0.62 + 14; if (lineW + wpx > maxW && lines[lines.length - 1].length) { lines.push([]); lineW = 0; } lines[lines.length - 1].push(it); lineW += wpx; });
  const lh = H / Math.max(1, lines.length);
  return <g>{lines.map((ln, li) => { const tw = ln.reduce((a, it) => a + it.w.length * it.s * 0.62 + 14, 0); let x = (W - tw) / 2;
    return <g key={li}>{ln.map((it) => { const tx = x + (it.w.length * it.s * 0.62) / 2 + 7; x += it.w.length * it.s * 0.62 + 14;
      return <text key={it.i} x={tx} y={lh * li + lh / 2 + it.s / 3} fontSize={it.s} textAnchor="middle" fontWeight={it.s > 26 ? 700 : 500} fill={palette(it.i)}>{it.w}</text>; })}</g>; })}</g>;
}

// ── 네트워크(공출현) ──
function Network({ spec }: { spec: CaChartSpec }) {
  const nodes = spec.nodes || [], edges = spec.edges || [];
  if (!nodes.length) return <text x={W / 2} y={H / 2} fontSize="12" textAnchor="middle" fill={INK3}>관계 데이터 없음</text>;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 46;
  const pos: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => { const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2; pos[n.id] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  const maxW = Math.max(1, ...edges.map((e) => e.w));
  const maxN = Math.max(1, ...nodes.map((n) => n.weight || 1));
  return <g>
    {edges.map((e, i) => { const p = pos[e.a], q = pos[e.b]; if (!p || !q) return null;
      return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={palette(0)} strokeOpacity={0.25 + (e.w / maxW) * 0.5} strokeWidth={1 + (e.w / maxW) * 4} />; })}
    {nodes.map((n, i) => { const p = pos[n.id]; const r = 9 + Math.sqrt((n.weight || 1) / maxN) * 14;
      return <g key={i}>
        <circle cx={p.x} cy={p.y} r={r} fill={palette(i)} />
        <text x={p.x} y={p.y - r - 3} fontSize="9.5" textAnchor="middle" fill={INK}>{n.id.slice(0, 9)}</text></g>; })}
  </g>;
}

// ── 트리맵(squarified 간이판) ──
function Treemap({ spec }: { spec: CaChartSpec }) {
  const items = (spec.tree && spec.tree.length)
    ? spec.tree.map((t, i) => ({ label: t.label, value: t.value, i }))
    : spec.labels.map((l, i) => ({ label: l, value: spec.series[0]?.values[i] || 0, i }));
  const data = items.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  // 행 기반 슬라이스 배치
  const rects: { x: number; y: number; w: number; h: number; d: typeof data[0] }[] = [];
  let x = 0, y = 0; const areaW = W, areaH = H; let row: typeof data = []; let rowVal = 0;
  const place = (rowItems: typeof data, ry: number, rh: number) => { let rx = 0; const rv = rowItems.reduce((a, d) => a + d.value, 0) || 1;
    rowItems.forEach((d) => { const w = (d.value / rv) * areaW; rects.push({ x: rx, y: ry, w, h: rh, d }); rx += w; }); };
  const remaining = [...data]; let usedH = 0;
  while (remaining.length) {
    row = []; rowVal = 0;
    const rowsLeft = Math.ceil(Math.sqrt(remaining.length));
    const take = Math.max(1, Math.ceil(remaining.length / rowsLeft));
    for (let k = 0; k < take && remaining.length; k++) { const d = remaining.shift()!; row.push(d); rowVal += d.value; }
    const rh = (rowVal / total) * areaH; place(row, usedH, rh); usedH += rh;
  }
  return <g>{rects.map((r, i) => <g key={i}>
    <rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} rx="3" fill={palette(r.d.i)} opacity="0.86" />
    {r.w > 46 && r.h > 24 && <><text x={r.x + 7} y={r.y + 17} fontSize="11" fill="#fff" fontWeight="600">{r.d.label.slice(0, Math.floor(r.w / 8))}</text>
      <text x={r.x + 7} y={r.y + 31} fontSize="10" fill="#fff" opacity="0.9">{fmt(r.d.value)} ({((r.d.value / total) * 100).toFixed(0)}%)</text></>}
  </g>)}</g>;
}

// ── 레이더 ──
function Radar({ spec }: { spec: CaChartSpec }) {
  const axes = spec.labels;
  const cx = W / 2, cy = H / 2 + 6, R = Math.min(W, H) / 2 - 50;
  const max = Math.max(1, ...spec.series.flatMap((s) => s.values));
  const pt = (i: number, v: number) => { const a = (i / axes.length) * Math.PI * 2 - Math.PI / 2; const rr = (v / max) * R; return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`; };
  return <g>
    {[0.25, 0.5, 0.75, 1].map((f, k) => <polygon key={k} points={axes.map((_, i) => { const a = (i / axes.length) * Math.PI * 2 - Math.PI / 2; return `${cx + R * f * Math.cos(a)},${cy + R * f * Math.sin(a)}`; }).join(" ")} fill="none" stroke={GRID} />)}
    {axes.map((ax, i) => { const a = (i / axes.length) * Math.PI * 2 - Math.PI / 2; const lx = cx + (R + 14) * Math.cos(a), ly = cy + (R + 14) * Math.sin(a);
      return <g key={i}><line x1={cx} y1={cy} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)} stroke={GRID} />
        <text x={lx} y={ly + 3} fontSize="9.5" textAnchor={Math.abs(Math.cos(a)) < 0.3 ? "middle" : lx > cx ? "start" : "end"} fill={INK3}>{ax.slice(0, 8)}</text></g>; })}
    {spec.series.slice(0, 3).map((s, si) => <polygon key={si} points={s.values.map((v, i) => pt(i, v)).join(" ")} fill={palette(si)} fillOpacity="0.22" stroke={palette(si)} strokeWidth="2" />)}
  </g>;
}

// ── 산점도(순위×값) ──
function Scatter({ spec }: { spec: CaChartSpec }) {
  const vals = spec.series[0]?.values || []; const labels = spec.labels;
  const PL = 40, PR = 16, PT = 18, PB = 40; const max = niceMax(Math.max(1, ...vals));
  const x = (i: number) => PL + (labels.length <= 1 ? 0 : (i / (labels.length - 1)) * (W - PL - PR));
  const y = (v: number) => H - PB - (v / max) * (H - PT - PB);
  return <g>
    {[0, 0.5, 1].map((f, i) => { const yy = H - PB - f * (H - PT - PB); return <g key={i}><line x1={PL} y1={yy} x2={W - PR} y2={yy} stroke={GRID} strokeDasharray="2 3" /><text x={PL - 6} y={yy + 3} fontSize="9" textAnchor="end" fill={INK3}>{fmt(max * f)}</text></g>; })}
    {vals.map((v, i) => <g key={i}><circle cx={x(i)} cy={y(v)} r="5" fill={palette(i)} opacity="0.85" /><text x={x(i)} y={H - PB + 12} fontSize="8.5" textAnchor="middle" fill={INK3} transform={labels.length > 8 ? `rotate(40 ${x(i)} ${H - PB + 12})` : undefined}>{labels[i].slice(0, 7)}</text></g>)}
    <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AXIS} />
  </g>;
}

// ── 히스토그램(값 도수분포) ──
function Histogram({ spec }: { spec: CaChartSpec }) {
  const vals = (spec.series[0]?.values || []).filter((v) => !isNaN(v));
  if (!vals.length) return <text x={W / 2} y={H / 2} fontSize="12" textAnchor="middle" fill={INK3}>데이터 없음</text>;
  const mn = Math.min(...vals), mx = Math.max(...vals); const bins = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(vals.length))));
  const bw = (mx - mn) / bins || 1; const counts = new Array(bins).fill(0);
  vals.forEach((v) => { let b = Math.floor((v - mn) / bw); if (b >= bins) b = bins - 1; if (b < 0) b = 0; counts[b]++; });
  const cmax = niceMax(Math.max(1, ...counts)); const PL = 36, PR = 16, PT = 18, PB = 40;
  const cw = (W - PL - PR) / bins; const y = (c: number) => H - PB - (c / cmax) * (H - PT - PB);
  return <g>
    {counts.map((c, i) => <g key={i}><rect x={PL + cw * i + 2} y={y(c)} width={cw - 4} height={H - PB - y(c)} fill={palette(0)} opacity="0.8" /><text x={PL + cw * i + cw / 2} y={y(c) - 4} fontSize="9" textAnchor="middle" fill={INK}>{c}</text><text x={PL + cw * i + cw / 2} y={H - PB + 12} fontSize="8" textAnchor="middle" fill={INK3}>{fmt(mn + bw * i)}</text></g>)}
    <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AXIS} />
  </g>;
}

// ── 박스플롯(범주별 단일값을 분포로 요약; 다계열이면 계열별 박스) ──
function BoxPlot({ spec }: { spec: CaChartSpec }) {
  // 각 시리즈(또는 단일 시리즈의 전체 값)에 대한 5수치 요약
  const groups = spec.series.length > 1 ? spec.series.map((s) => ({ name: s.name, v: s.values })) : [{ name: spec.series[0]?.name || "분포", v: spec.series[0]?.values || [] }];
  const all = groups.flatMap((g) => g.v); const max = niceMax(Math.max(1, ...all));
  const q = (arr: number[], p: number) => { const a = [...arr].sort((x, y) => x - y); const idx = (a.length - 1) * p; const lo = Math.floor(idx), hi = Math.ceil(idx); return a[lo] + (a[hi] - a[lo]) * (idx - lo); };
  const PL = 40, PR = 16, PT = 18, PB = 40; const gw = (W - PL - PR) / groups.length; const y = (v: number) => H - PB - (v / max) * (H - PT - PB);
  return <g>
    {[0, 0.5, 1].map((f, i) => { const yy = H - PB - f * (H - PT - PB); return <line key={i} x1={PL} y1={yy} x2={W - PR} y2={yy} stroke={GRID} strokeDasharray="2 3" />; })}
    {groups.map((g, i) => { if (!g.v.length) return null; const cx = PL + gw * i + gw / 2; const bw = Math.min(gw * 0.5, 44);
      const q1 = q(g.v, 0.25), q2 = q(g.v, 0.5), q3 = q(g.v, 0.75), lo = Math.min(...g.v), hi = Math.max(...g.v);
      return <g key={i}>
        <line x1={cx} y1={y(lo)} x2={cx} y2={y(hi)} stroke={palette(i)} />
        <rect x={cx - bw / 2} y={y(q3)} width={bw} height={Math.max(1, y(q1) - y(q3))} fill={palette(i)} opacity="0.35" stroke={palette(i)} />
        <line x1={cx - bw / 2} y1={y(q2)} x2={cx + bw / 2} y2={y(q2)} stroke={palette(i)} strokeWidth="2" />
        <text x={cx} y={H - PB + 12} fontSize="9" textAnchor="middle" fill={INK3}>{g.name.slice(0, 9)}</text>
      </g>; })}
    <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AXIS} />
  </g>;
}

// ── 와플(100칸 구성비) ──
function Waffle({ spec }: { spec: CaChartSpec }) {
  const vals = spec.series[0]?.values || []; const labels = spec.labels; const total = vals.reduce((a, b) => a + b, 0) || 1;
  const cells = vals.map((v) => Math.round((v / total) * 100)); const cols = 10, gap = 3; const size = Math.min((W - 180) / cols, (H - 20) / cols) - gap;
  const seq: number[] = []; cells.forEach((c, i) => { for (let k = 0; k < c; k++) seq.push(i); }); while (seq.length < 100) seq.push(-1); seq.length = 100;
  return <g>
    {seq.map((ci, idx) => { const r = Math.floor(idx / cols), c = idx % cols; return <rect key={idx} x={14 + c * (size + gap)} y={H - 14 - (r + 1) * (size + gap)} width={size} height={size} rx="2" fill={ci < 0 ? GRID : palette(ci)} opacity={ci < 0 ? 0.4 : 0.9} />; })}
    {labels.map((l, i) => <g key={i} transform={`translate(${W - 158},${24 + i * 18})`}><rect width="11" height="11" rx="2" fill={palette(i)} /><text x="16" y="10" fontSize="10.5" fill={INK}>{l.slice(0, 12)} {((vals[i] / total) * 100).toFixed(0)}%</text></g>)}
  </g>;
}

// ── 닷 스트립(한 축 위 점) ──
function DotStrip({ spec }: { spec: CaChartSpec }) {
  const vals = spec.series[0]?.values || []; const labels = spec.labels; const max = niceMax(Math.max(1, ...vals));
  const PL = 96, PR = 36, PT = 12, PB = 18; const ch = (H - PT - PB) / Math.max(1, labels.length); const x = (v: number) => PL + (v / max) * (W - PL - PR);
  return <g>{vals.map((v, i) => { const cy = PT + ch * i + ch / 2; return <g key={i}>
    <line x1={PL} y1={cy} x2={W - PR} y2={cy} stroke={GRID} strokeDasharray="2 3" />
    <circle cx={x(v)} cy={cy} r="6" fill={palette(i)} />
    <text x={PL - 6} y={cy + 3} fontSize="10" textAnchor="end" fill={INK}>{labels[i].slice(0, 12)}</text>
    <text x={x(v) + 9} y={cy + 3} fontSize="9.5" fill={INK3}>{fmt(v)}</text></g>; })}
    <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={AXIS} /></g>;
}

// ── 폴라 / 방사형 막대 ──
function Polar({ spec, radial }: { spec: CaChartSpec; radial?: boolean }) {
  const vals = spec.series[0]?.values || []; const labels = spec.labels; const max = Math.max(1, ...vals);
  const cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 40; const n = vals.length || 1;
  return <g>{vals.map((v, i) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + (radial ? 0.7 : 1)) / n) * Math.PI * 2 - Math.PI / 2;
    const rr = (radial ? 0.25 + (v / max) * 0.75 : v / max) * R; const ri = radial ? R * 0.22 : 0;
    const p = (a: number, r: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    const big = a1 - a0 > Math.PI ? 1 : 0;
    const d = ri > 0 ? `M${p(a0, ri)} L${p(a0, rr)} A${rr} ${rr} 0 ${big} 1 ${p(a1, rr)} L${p(a1, ri)} A${ri} ${ri} 0 ${big} 0 ${p(a0, ri)} Z`
      : `M${cx},${cy} L${p(a0, rr)} A${rr} ${rr} 0 ${big} 1 ${p(a1, rr)} Z`;
    const mid = (a0 + a1) / 2;
    return <g key={i}><path d={d} fill={palette(i)} opacity="0.85" /><text x={cx + (R + 12) * Math.cos(mid)} y={cy + (R + 12) * Math.sin(mid) + 3} fontSize="9" textAnchor="middle" fill={INK3}>{labels[i].slice(0, 7)}</text></g>;
  })}</g>;
}

// ── 기울기 그래프 / 덤벨(행×2열, 또는 단일 추세의 처음↔끝) ──
function Slope({ spec, dumbbell }: { spec: CaChartSpec; dumbbell?: boolean }) {
  // cols 2개면 행별 두 값; 아니면 단일 시리즈의 first↔last
  let rows: { name: string; a: number; b: number }[] = [];
  if (spec.cols && spec.cols.length >= 2) rows = spec.labels.map((l, i) => ({ name: l, a: spec.series[i]?.values[0] || 0, b: spec.series[i]?.values[1] || 0 }));
  else { const v = spec.series[0]?.values || []; rows = [{ name: "전체", a: v[0] || 0, b: v[v.length - 1] || 0 }]; if (spec.labels.length >= 2 && v.length >= 2) rows = spec.labels.map((l, i) => ({ name: l, a: v[i] || 0, b: v[Math.min(i + 1, v.length - 1)] || 0 })); }
  const all = rows.flatMap((r) => [r.a, r.b]); const max = niceMax(Math.max(1, ...all));
  const PT = 24, PB = 28; const xa = 120, xb = W - 120; const y = (v: number) => H - PB - (v / max) * (H - PT - PB);
  return <g>
    <text x={xa} y={16} fontSize="10" textAnchor="middle" fill={INK3}>{spec.cols?.[0] || "처음"}</text>
    <text x={xb} y={16} fontSize="10" textAnchor="middle" fill={INK3}>{spec.cols?.[1] || "끝"}</text>
    {rows.slice(0, 10).map((r, i) => <g key={i}>
      {dumbbell ? <line x1={xa} y1={y(r.a)} x2={xb} y2={y(r.b)} stroke={palette(i)} strokeWidth="3" opacity="0.4" /> : <line x1={xa} y1={y(r.a)} x2={xb} y2={y(r.b)} stroke={palette(i)} strokeWidth="2" />}
      <circle cx={xa} cy={y(r.a)} r="4" fill={palette(i)} /><circle cx={xb} cy={y(r.b)} r="4" fill={palette(i)} />
      <text x={xa - 8} y={y(r.a) + 3} fontSize="9.5" textAnchor="end" fill={INK}>{r.name.slice(0, 10)}</text>
      <text x={xb + 8} y={y(r.b) + 3} fontSize="9.5" fill={INK3}>{fmt(r.b)}</text></g>)}
  </g>;
}

// ── 생키(관계 흐름; edges 사용) ──
function Sankey({ spec }: { spec: CaChartSpec }) {
  const edges = (spec.edges || []).slice(0, 12); if (!edges.length) return <text x={W / 2} y={H / 2} fontSize="12" textAnchor="middle" fill={INK3}>관계 데이터 없음</text>;
  const lefts = Array.from(new Set(edges.map((e) => e.a))); const rights = Array.from(new Set(edges.map((e) => e.b)));
  const maxW = Math.max(...edges.map((e) => e.w)); const lh = (H - 20) / Math.max(1, lefts.length), rh = (H - 20) / Math.max(1, rights.length);
  const ly: Record<string, number> = {}; lefts.forEach((n, i) => ly[n] = 14 + lh * i + lh / 2); const ry: Record<string, number> = {}; rights.forEach((n, i) => ry[n] = 14 + rh * i + rh / 2);
  const x0 = 110, x1 = W - 110;
  return <g>
    {edges.map((e, i) => { const y0 = ly[e.a], y1 = ry[e.b]; const w = 1 + (e.w / maxW) * 14;
      return <path key={i} d={`M${x0},${y0} C${(x0 + x1) / 2},${y0} ${(x0 + x1) / 2},${y1} ${x1},${y1}`} fill="none" stroke={palette(lefts.indexOf(e.a))} strokeOpacity="0.4" strokeWidth={w} />; })}
    {lefts.map((n, i) => <g key={"l" + i}><rect x={x0 - 6} y={ly[n] - 9} width="6" height="18" fill={palette(i)} /><text x={x0 - 10} y={ly[n] + 3} fontSize="9.5" textAnchor="end" fill={INK}>{n.slice(0, 10)}</text></g>)}
    {rights.map((n, i) => <g key={"r" + i}><rect x={x1} y={ry[n] - 9} width="6" height="18" fill={palette(i)} opacity="0.7" /><text x={x1 + 10} y={ry[n] + 3} fontSize="9.5" fill={INK}>{n.slice(0, 10)}</text></g>)}
  </g>;
}

// ── 아크 다이어그램(한 축 위 노드를 호로 연결) ──
function Arc({ spec }: { spec: CaChartSpec }) {
  const nodes = spec.nodes || []; const edges = spec.edges || []; if (!nodes.length) return <text x={W / 2} y={H / 2} fontSize="12" textAnchor="middle" fill={INK3}>관계 데이터 없음</text>;
  const baseY = H - 46; const n = nodes.length; const px: Record<string, number> = {};
  nodes.forEach((nd, i) => px[nd.id] = 30 + (i / Math.max(1, n - 1)) * (W - 60)); const maxW = Math.max(1, ...edges.map((e) => e.w));
  return <g>
    {edges.map((e, i) => { const a = px[e.a], b = px[e.b]; if (a == null || b == null) return null; const r = Math.abs(b - a) / 2; const mx = (a + b) / 2;
      return <path key={i} d={`M${a},${baseY} A${r} ${r} 0 0 1 ${b},${baseY}`} fill="none" stroke={palette(0)} strokeOpacity={0.25 + (e.w / maxW) * 0.5} strokeWidth={1 + (e.w / maxW) * 3} />; })}
    {nodes.map((nd, i) => <g key={i}><circle cx={px[nd.id]} cy={baseY} r="5" fill={palette(i)} /><text x={px[nd.id]} y={baseY + 16} fontSize="8.5" textAnchor="middle" fill={INK3} transform={n > 8 ? `rotate(40 ${px[nd.id]} ${baseY + 16})` : undefined}>{nd.id.slice(0, 7)}</text></g>)}
  </g>;
}

// ── 스트림그래프 / 누적 영역(행=계열, 열=x축) ──
function StreamGraph({ spec }: { spec: CaChartSpec }) {
  const cats = spec.labels; const xs = spec.cols || []; if (!xs.length) return <text x={W / 2} y={H / 2} fontSize="12" textAnchor="middle" fill={INK3}>행렬 데이터 없음</text>;
  const PL = 36, PR = 14, PT = 16, PB = 40; const x = (j: number) => PL + (xs.length <= 1 ? 0 : (j / (xs.length - 1)) * (W - PL - PR));
  const colTot = xs.map((_, j) => cats.reduce((a, _c, i) => a + (spec.series[i]?.values[j] || 0), 0));
  const max = niceMax(Math.max(1, ...colTot)); const scale = (v: number) => (v / max) * (H - PT - PB);
  const baseAcc = xs.map(() => 0);
  return <g>
    {cats.map((ct, i) => {
      const top: string[] = [], bot: string[] = [];
      xs.forEach((_, j) => { const v = spec.series[i]?.values[j] || 0; const y0 = H - PB - baseAcc[j]; const y1 = y0 - scale(v); baseAcc[j] += scale(v); bot.push(`${x(j)},${y0}`); top.push(`${x(j)},${y1}`); });
      return <polygon key={i} points={[...top, ...bot.reverse()].join(" ")} fill={palette(i)} opacity="0.8" />;
    })}
    {xs.map((c, j) => <text key={j} x={x(j)} y={H - PB + 12} fontSize="8.5" textAnchor="middle" fill={INK3} transform={xs.length > 6 ? `rotate(35 ${x(j)} ${H - PB + 12})` : undefined}>{c.slice(0, 8)}</text>)}
    {cats.slice(0, 8).map((c, i) => <g key={i} transform={`translate(${PL + i * 80},6)`}><rect width="9" height="9" rx="2" fill={palette(i)} /><text x="12" y="8" fontSize="9" fill={INK3}>{c.slice(0, 7)}</text></g>)}
  </g>;
}

// ── 평행좌표(행=선, 열=축) ──
function Parallel({ spec }: { spec: CaChartSpec }) {
  const axes = spec.cols || []; const rows = spec.labels; if (axes.length < 2) return <text x={W / 2} y={H / 2} fontSize="12" textAnchor="middle" fill={INK3}>축이 2개 이상 필요</text>;
  const PL = 30, PR = 30, PT = 20, PB = 36; const ax = (j: number) => PL + (j / (axes.length - 1)) * (W - PL - PR);
  const colMax = axes.map((_, j) => Math.max(1, ...rows.map((_r, i) => spec.series[i]?.values[j] || 0)));
  const y = (j: number, v: number) => H - PB - (v / colMax[j]) * (H - PT - PB);
  return <g>
    {axes.map((a, j) => <g key={j}><line x1={ax(j)} y1={PT} x2={ax(j)} y2={H - PB} stroke={GRID} /><text x={ax(j)} y={H - PB + 12} fontSize="9" textAnchor="middle" fill={INK3}>{a.slice(0, 8)}</text></g>)}
    {rows.slice(0, 10).map((r, i) => <polyline key={i} points={axes.map((_, j) => `${ax(j)},${y(j, spec.series[i]?.values[j] || 0)}`).join(" ")} fill="none" stroke={palette(i)} strokeWidth="1.6" opacity="0.75" />)}
  </g>;
}

// ── 범프 차트(순위 변화; 행=계열, 열=시점) ──
function Bump({ spec }: { spec: CaChartSpec }) {
  const xs = spec.cols || []; const rows = spec.labels; if (xs.length < 2) return <text x={W / 2} y={H / 2} fontSize="12" textAnchor="middle" fill={INK3}>시점이 2개 이상 필요</text>;
  // 각 열에서 행들의 순위(값 큰 순=1위)
  const PL = 80, PR = 80, PT = 18, PB = 30; const x = (j: number) => PL + (j / (xs.length - 1)) * (W - PL - PR);
  const ranks = xs.map((_, j) => { const arr = rows.map((_r, i) => ({ i, v: spec.series[i]?.values[j] || 0 })).sort((a, b) => b.v - a.v); const rk: number[] = new Array(rows.length); arr.forEach((o, r) => rk[o.i] = r + 1); return rk; });
  const y = (rk: number) => PT + ((rk - 1) / Math.max(1, rows.length - 1)) * (H - PT - PB);
  return <g>
    {rows.slice(0, 8).map((r, i) => <g key={i}>
      <polyline points={xs.map((_, j) => `${x(j)},${y(ranks[j][i])}`).join(" ")} fill="none" stroke={palette(i)} strokeWidth="2.4" />
      {xs.map((_, j) => <circle key={j} cx={x(j)} cy={y(ranks[j][i])} r="4" fill={palette(i)} />)}
      <text x={PL - 8} y={y(ranks[0][i]) + 3} fontSize="9" textAnchor="end" fill={INK}>{r.slice(0, 10)}</text>
    </g>)}
    {xs.map((c, j) => <text key={j} x={x(j)} y={H - 10} fontSize="9" textAnchor="middle" fill={INK3}>{c.slice(0, 8)}</text>)}
  </g>;
}
