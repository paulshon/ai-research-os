"use client";

/* 대시보드 확장 — K 종단 분석, L 횡단 분석, 그리고 기존 영역에 더하는 도넛·와플·게이지·레이더·범프·슬로프 */

import { useMemo } from "react";
import { Card, Empty, Forest, Heatmap, LineChart, Notice, PAL, nfmt } from "@/components/literature/viz";
import { Bump, Donut, ForecastChart, Gauge, Lollipop, Quadrant, Radar, Slope, SparkGrid, Waffle } from "@/components/literature/viz2";

const nf = new Intl.NumberFormat("ko-KR");
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const topKeys = (m: Map<string, number>, k: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([x]) => x);

// ───────────────────────── 기존 영역 보강 ─────────────────────────
export function TypeDonut({ D }: { D: any }) {
  const m = new Map<string, number>(); D.yearType.forEach((r: any) => m.set(r.type, (m.get(r.type) ?? 0) + r.n));
  return <Card title="논문 유형 구성 (도넛)" sub="가운데 = 전체 편수. 조각을 가리키면 비율이 표시됩니다."><Donut items={[...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} /></Card>;
}
export function FieldBump({ D }: { D: any }) {
  const ys = [...new Set<number>(D.fieldYear.map((r: any) => r.year))].filter((y) => y >= 2000).sort((a, b) => a - b), lo = ys[0], hi = ys[ys.length - 1];
  if (!ys.length || hi - lo < 8) return null;
  const span = Math.ceil((hi - lo + 1) / 4), per = [0, 1, 2, 3].map((i) => [lo + i * span, Math.min(hi, lo + (i + 1) * span - 1)] as const).filter(([a]) => a <= hi);
  const cnt = (f: string, [a, b]: readonly [number, number]) => D.fieldYear.filter((r: any) => r.field === f && r.year >= a && r.year <= b).reduce((s: number, r: any) => s + r.n, 0);
  const fields = topKeys(D.fieldYear.reduce((m: Map<string, number>, r: any) => m.set(r.field, (m.get(r.field) ?? 0) + r.n), new Map()), 8);
  const rank = per.map((p) => { const order = [...fields].sort((x, y) => cnt(y, p) - cnt(x, p)); return new Map(order.map((f, i) => [f, cnt(f, p) > 0 ? i + 1 : null])); });
  return <Card title="분야 순위 변화 (범프 차트)" sub="기간별 편수 순위(위가 1위). 선을 가리키면 해당 분야가 강조됩니다."><Bump periods={per.map(([a, b]) => `${a}–${b}`)} series={fields.map((f) => ({ name: f, ranks: rank.map((r) => r.get(f) ?? null) }))} /></Card>;
}
export function ImpactGauges({ D }: { D: any }) {
  return <Card title="인용 집중 게이지" sub="상위 논문이 인용을 얼마나 독차지하는가"><div className="grid grid-cols-3 gap-1"><Gauge value={D.topShare1} label="상위 1%가 가진 인용" color="#e8782e" /><Gauge value={D.topShare10} label="상위 10%가 가진 인용" color="#d3a53f" /><Gauge value={D.gini} label="지니계수" color="#8e5c70" fmt={(v) => v.toFixed(2)} /></div></Card>;
}
export function CoverageWaffle({ D }: { D: any }) {
  const c = D.coverage;
  return <Card title="JCR 지표 보유 비율 (와플)" sub="칸 100개 = 검색 결과 전체. 채워진 칸이 JIF·사분위 같은 저널 지표를 쓸 수 있는 논문입니다."><Waffle value={c.jcr} total={c.n} label="JCR 지표가 있는 논문" /><p className="text-[12px] text-white/40 mt-2">나머지(학술대회 논문·학위논문·프리프린트 등)는 저널 지표 분석에서 빠집니다.</p></Card>;
}
export function JournalRadar({ D }: { D: any }) {
  const js = D.journals.filter((j: any) => j.jif > 0).slice(0, 5); if (js.length < 3) return null;
  const qw: Record<string, number> = { Q1: 1, Q2: 0.7, Q3: 0.4, Q4: 0.2 }, mx = (k: string) => Math.max(1e-9, ...js.map((j: any) => j[k]));
  const axes = ["편수", "JIF", "논문당 평균 인용", "OA 비율", "사분위"];
  return <Card title="상위 저널 프로필 (레이더)" sub="편수 상위 5개 저널(JCR 가 있는 저널). 각 축은 이 5개 안에서의 상대값입니다."><Radar axes={axes} series={js.map((j: any) => ({ name: j.journal, values: [j.n / mx("n"), j.jif / mx("jif"), (j.c / Math.max(1, j.n)) / Math.max(1e-9, ...js.map((x: any) => x.c / Math.max(1, x.n))), j.oa, qw[j.q] ?? 0] }))} /></Card>;
}
export function TopicBump({ D }: { D: any }) {
  const ys = [...new Set<number>(D.rows.map((r: any) => r.year))].sort((a, b) => a - b); if (ys.length < 8) return null;
  const span = Math.ceil(ys.length / 4), per = [0, 1, 2, 3].map((i) => ys.slice(i * span, (i + 1) * span)).filter((p) => p.length);
  const cnt = (t: string, p: number[]) => D.rows.filter((r: any) => r.topic === t && p.includes(r.year)).reduce((s: number, r: any) => s + r.n, 0);
  const topics = topKeys(D.rows.reduce((m: Map<string, number>, r: any) => m.set(r.topic, (m.get(r.topic) ?? 0) + r.n), new Map()), 10);
  const rank = per.map((p) => { const o = [...topics].sort((a, b) => cnt(b, p) - cnt(a, p)); return new Map(o.map((t, i) => [t, cnt(t, p) > 0 ? i + 1 : null])); });
  return <Card title="주제 순위 변화 (범프 차트)" sub="상위 10개 주제의 기간별 순위" wide><Bump periods={per.map((p) => `${p[0]}–${p[p.length - 1]}`)} series={topics.map((t) => ({ name: t, ranks: rank.map((r) => r.get(t) ?? null) }))} height={320} /></Card>;
}
export function TopicSlope({ D }: { D: any }) {
  const ys = [...new Set<number>(D.rows.map((r: any) => r.year))].sort((a, b) => a - b); if (ys.length < 8) return null;
  const k = Math.max(3, Math.floor(ys.length / 3)), early = ys.slice(0, k), late = ys.slice(-k), te = D.rows.filter((r: any) => early.includes(r.year)).reduce((s: number, r: any) => s + r.n, 0) || 1, tl = D.rows.filter((r: any) => late.includes(r.year)).reduce((s: number, r: any) => s + r.n, 0) || 1;
  const topics = topKeys(D.rows.reduce((m: Map<string, number>, r: any) => m.set(r.topic, (m.get(r.topic) ?? 0) + r.n), new Map()), 14);
  const items = topics.map((t) => ({ label: t, a: (D.rows.filter((r: any) => r.topic === t && early.includes(r.year)).reduce((s: number, r: any) => s + r.n, 0) / te) * 100, b: (D.rows.filter((r: any) => r.topic === t && late.includes(r.year)).reduce((s: number, r: any) => s + r.n, 0) / tl) * 100 }));
  return <Card title="주제 점유율 변화 (슬로프 차트)" sub="초기 구간 대 최근 구간에서 상위 주제가 차지한 비중(%). 주황 = 늘어난 주제, 청록 = 줄어든 주제" wide><Slope left={`${early[0]}–${early[early.length - 1]}`} right={`${late[0]}–${late[late.length - 1]}`} items={items} fmt={(n) => n.toFixed(1) + "%"} /></Card>;
}
export function OaDonut({ D }: { D: any }) {
  const m = new Map<string, number>(); D.oaYear.forEach((r: any) => m.set(r.s, (m.get(r.s) ?? 0) + r.n));
  const col: Record<string, string> = { gold: "#d3a53f", green: "#9dbb5a", hybrid: "#7b93c9", bronze: "#c98a5a", diamond: "#5aa0b8", closed: "#5b6470", "(미상)": "#3d4650" };
  return <Card title="오픈액세스 구성 (도넛)" sub="전체 검색 결과의 OA 유형 비율"><Donut items={[...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: col[label] }))} /></Card>;
}
export function ClusterRadar({ D }: { D: any }) {
  if (!D.journals?.length) return null;
  const ks = [0, 1, 2, 3].filter((k) => D.journals.some((j: any) => j.k === k)), mean = (k: number, f: (j: any) => number) => { const l = D.journals.filter((j: any) => j.k === k); return l.reduce((s: number, j: any) => s + f(j), 0) / Math.max(1, l.length); };
  const feats: [string, (j: any) => number][] = [["편수(로그)", (j) => Math.log1p(j.n)], ["JIF(로그)", (j) => Math.log1p(j.jif)], ["평균 인용(로그)", (j) => Math.log1p(j.c)], ["OA 비율", (j) => j.oa]];
  const mx = feats.map(([, f]) => Math.max(1e-9, ...ks.map((k) => mean(k, f))));
  return <Card title="저널 군집 프로필 (레이더)" sub="군집별 평균 특성(각 축은 군집 간 최댓값 = 1)"><Radar axes={feats.map(([a]) => a)} series={ks.map((k) => ({ name: `군집 ${k + 1} (${D.journals.filter((j: any) => j.k === k).length}개)`, values: feats.map(([, f], i) => mean(k, f) / mx[i]) }))} /></Card>;
}

// ───────────────────────── K. 종단 분석 ─────────────────────────
const PHASE_COLOR: Record<string, string> = { 신흥: "#b5c23c", 성장: "#e8782e", 성숙: "#4fa89f", 쇠퇴: "#8e5c70", 정체: "#8a98a0" };
const MODEL_KO: Record<string, string> = { linear: "선형", exponential: "지수", logistic: "로지스틱(S자)" };
export function Longi({ D }: { D: any }) {
  const g = D.growth?.[0];
  const fmtM: Record<string, (v: number) => string> = { au: (v) => v.toFixed(1), oa: (v) => (v * 100).toFixed(0) + "%", intl: (v) => (v * 100).toFixed(0) + "%", refs: (v) => v.toFixed(0), jcr: (v) => (v * 100).toFixed(0) + "%", abs: (v) => v.toFixed(0), fu: (v) => (v * 100).toFixed(0) + "%", kr: (v) => (v * 100).toFixed(1) + "%" };
  const phases = useMemo(() => { const m = new Map<string, any[]>(); (D.topics ?? []).forEach((t: any) => (m.get(t.phase) ?? m.set(t.phase, []).get(t.phase)!).push(t)); return m; }, [D]);
  if (!g) return <div className="md:col-span-2"><Empty text="연도 자료가 부족해 종단 분석을 할 수 없습니다(최소 5개 연도)" /></div>;
  const last = D.years[D.years.length - 1];
  return <>
    <div className="md:col-span-2"><Notice><b>종단 분석</b> — 같은 대상을 <b>시간 순서로 따라가며</b> 변화를 봅니다(성장·변화점·추세 검정·주제 생애주기·저자 유입·코호트 추적). {last + 1}년 이후는 집계 중이라 제외하고 {D.years[0]}–{last}년 완결 연도만 씁니다.</Notice></div>
    <Card title="연도별 편수 성장 모형과 3년 예측" sub={`AIC 가 가장 작은 모형: ${MODEL_KO[g.model]} — ${g.note} (설명력 R² ${g.r2.toFixed(2)}). 주황 점선 = 예측, 옅은 띠 = 95% 예측구간, 노란 선 = 변화점(평균 수준이 바뀐 해)`} wide>
      <ForecastChart years={D.years} counts={D.counts} fitted={g.fitted} forecast={g.forecast} changePoints={D.changePoints} />
      <div className="mt-2 overflow-x-auto"><table className="text-[12.5px] w-full"><thead><tr className="text-white/35 text-left"><th className="py-1 font-normal">모형</th><th className="font-normal text-right">AIC</th><th className="font-normal text-right">R²</th><th className="font-normal pl-4">해석</th><th className="font-normal text-right">예측 {g.forecast.map((f: any) => f.x).join("·")}</th></tr></thead>
        <tbody>{D.growth.map((m: any) => <tr key={m.model} className={`border-t border-white/[0.04] tabular-nums ${m.model === g.model ? "text-white" : "text-white/55"}`}><td className="py-1">{MODEL_KO[m.model]}{m.model === g.model ? " ★" : ""}</td><td className="text-right">{m.aic.toFixed(1)}</td><td className="text-right">{m.r2.toFixed(3)}</td><td className="pl-4">{m.note}</td><td className="text-right">{m.forecast.map((f: any) => nfmt(Math.round(f.y))).join(" · ")}</td></tr>)}</tbody></table></div>
      {D.changePoints.length > 0 && <p className="text-[12px] text-white/45 mt-2">변화점: {D.changePoints.join(", ")}년 — 그 해를 기점으로 연간 편수 수준이 달라졌습니다(로그 편수 평균 이동 기준).</p>}
    </Card>

    <Card title="예측 모형 검증 (최근 3년을 감추고 맞히기)" sub={`최근 ${D.holdout}년 값을 숨긴 채 앞부분만으로 모형을 맞춘 뒤 실제와 비교한 오차입니다. 오차(MAPE)가 작을수록 믿을 만한 모형 — 가장 잘 맞힌 모형이 AIC 최선 모형과 다르면 예측을 조심해서 읽으세요.`}>
      {D.backtest?.length ? <div className="overflow-x-auto"><table className="w-full text-[12.5px]"><thead><tr className="text-white/35 text-left"><th className="py-1 font-normal">모형</th><th className="font-normal text-right">평균 절대 백분율 오차</th><th className="font-normal text-right">RMSE(편)</th></tr></thead>
        <tbody>{D.backtest.map((b: any, i: number) => <tr key={b.model} className={`border-t border-white/[0.04] tabular-nums ${i === 0 ? "text-[#7fd0c6]" : "text-white/65"}`}><td className="py-1">{b.model}{i === 0 ? " ★ 가장 정확" : ""}</td><td className="text-right">{(b.mape * 100).toFixed(1)}%</td><td className="text-right">{nf.format(Math.round(b.rmse))}</td></tr>)}</tbody></table></div> : <Empty text="검증하려면 10개 연도 이상이 필요합니다" />}
      {D.holt && <p className="text-[12px] text-white/50 mt-2">Holt 지수평활 예측(α {D.holt.alpha.toFixed(1)}, β {D.holt.beta.toFixed(2)}, 감쇠 φ {D.holt.phi}): {D.holt.forecast.map((f: any) => `${f.x}년 ${nf.format(f.y)}편(${nf.format(f.lo)}~${nf.format(f.hi)})`).join(" · ")}</p>}
      <p className="text-[12px] text-white/40 mt-1">잔차 1차 자기상관 r₁ = {D.residual.r1.toFixed(2)}, Durbin–Watson = {D.residual.dw.toFixed(2)} {Math.abs(D.residual.r1) > 0.4 ? "(자기상관이 커서 예측구간이 좁게 나올 수 있음)" : "(자기상관은 크지 않음)"}{D.pettitt?.year ? ` · Pettitt 변화점 검정: ${D.pettitt.year}년, p ${D.pettitt.p < 0.001 ? "<0.001" : D.pettitt.p.toFixed(3)}` : ""}</p>
    </Card>
    <Card title="전년 대비 증감률 (95% 구간)" sub="연도별 편수가 전년보다 몇 % 늘었는지(포아송 로그비 근사 95% 구간). 구간이 0 %를 지나지 않으면 그 해의 증감은 우연으로 보기 어렵습니다.">
      <LineChart series={[{ name: "증감률", points: D.yoy.map((r: any) => ({ x: r.year, y: r.yoy * 100 })) }, { name: "95% 하한", points: D.yoy.map((r: any) => ({ x: r.year, y: r.lo * 100 })) }, { name: "95% 상한", points: D.yoy.map((r: any) => ({ x: r.year, y: r.hi * 100 })) }]} yFmt={(n) => n.toFixed(0) + "%"} />
    </Card>
    <Card title="저자 활동 지속 (Kaplan–Meier)" sub="처음 등장한 해로부터 몇 해째까지 계속 논문을 쓰는지의 생존 곡선(저자 해시 표본). 마지막 논문이 최근 3년 이내인 저자는 ‘아직 활동 중’으로 처리(중도절단). 곡선이 높을수록 오래 머뭅니다.">
      {D.survival?.length ? <><LineChart series={D.survival.map((g: any) => ({ name: `${g.label} (${nf.format(g.n)}명)`, points: g.curve.map((c: any) => ({ x: c.t, y: c.s * 100 })) }))} yFmt={(n) => n.toFixed(0) + "%"} />
        <p className="text-[12px] text-white/45 mt-1">가로 = 첫 등장 후 연수. {D.survival.map((g: any) => `${g.label}: 5년 뒤 ${((g.curve[5]?.s ?? 0) * 100).toFixed(0)}% · 10년 뒤 ${((g.curve[10]?.s ?? 0) * 100).toFixed(0)}%`).join(" / ")}</p></> : <Empty text="저자 표본이 부족합니다" />}
    </Card>
    <Card title="지표 추세 패널 — Mann–Kendall 검정" sub="각 지표를 연도 순으로 따라가며 단조 추세가 있는지 검정(p < 0.05 이면 상승·하락). 노란 점선 = 변화점" wide>
      <SparkGrid items={D.metrics.map((m: any) => ({ label: m.label, years: m.years, values: m.values, badge: m.mk.dir, tone: m.mk.dir === "상승" ? "up" : m.mk.dir === "하락" ? "down" : "flat", note: `τ ${m.mk.tau.toFixed(2)} · p ${m.mk.p < 0.001 ? "<0.001" : m.mk.p.toFixed(3)} · Sen ${m.mk.slope >= 0 ? "+" : ""}${(Math.abs(m.mk.slope) < 0.1 ? m.mk.slope.toFixed(3) : m.mk.slope.toFixed(1))}/년${m.tfpw?.adjusted ? ` · 자기상관 보정 p ${m.tfpw.p < 0.001 ? "<0.001" : m.tfpw.p.toFixed(3)}` : ""}${m.pettitt?.year ? ` · Pettitt ${m.pettitt.year}년(p ${m.pettitt.p < 0.001 ? "<0.001" : m.pettitt.p.toFixed(3)})` : ""}`, fmt: fmtM[m.key], marks: m.changePoints }))} />
    </Card>
    <Card title="분야별 성장률 (CAGR)" sub={`처음 3년 평균 → 최근 3년 평균의 연평균 성장률. 보조 표기 = 추세 검정 결과`}><Lollipop labelW={190} items={[...D.fields].sort((a: any, b: any) => b.cagr - a.cagr).map((f: any) => ({ label: f.field, value: f.cagr * 100, sub: f.mk.dir, color: f.cagr >= 0 ? "#e8782e" : "#4fa89f" }))} fmt={(n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%"} /></Card>
    <Card title="저자 신규 유입과 재참여" sub={`${D.authorSample ? `저자 해시 표본(1/${D.authorSample}) · ` : ""}신규 = 이 해가 코퍼스에서 처음 등장한 해인 저자 비율, 재참여 = 이후 3년 안에 다시 쓴 저자 비율`}>
      <LineChart series={[{ name: "신규 저자 비율", points: D.authors.map((a: any) => ({ x: a.year, y: a.newShare * 100 })) }, { name: "3년 내 재참여율", points: D.authors.filter((a: any) => a.retention != null).map((a: any) => ({ x: a.year, y: a.retention * 100 })) }]} yFmt={(n) => n.toFixed(0) + "%"} />
    </Card>
    <Card title="주제 생애주기 (규모 × 최근 성장)" sub="가로 = 누적 편수(로그), 세로 = 전체 대비 점유율의 최근 5년 vs 그 이전 5년 증감(전체 성장 효과를 뺀 상대 성장). 점 색 = 단계(신흥·성장·성숙·쇠퇴·정체). 점을 가리키면 주제 이름" wide>
      <Quadrant points={(D.topics ?? []).slice(0, 60).map((t: any) => ({ x: t.total, y: t.growth, label: `${t.topic} · ${t.phase} · 최근 ${(t.growth * 100).toFixed(0)}% · 정점 ${t.peakYear}년`, color: PHASE_COLOR[t.phase], r: 4 + Math.min(7, Math.sqrt(t.total) / 6) }))} xLabel="누적 편수" yLabel="점유율 증감(최근 5년)" />
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[12px] text-white/55">{Object.entries(PHASE_COLOR).map(([p, c]) => <span key={p} className="flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c }} />{p} {phases.get(p)?.length ?? 0}</span>)}</div>
      <div className="grid md:grid-cols-3 gap-3 mt-3">{(["신흥", "성장", "쇠퇴"] as const).map((p) => <div key={p}><p className="text-[12.5px] mb-1" style={{ color: PHASE_COLOR[p] }}>{p} 주제</p>{(phases.get(p) ?? []).slice(0, 6).map((t: any) => <p key={t.topic} className="text-[12px] text-white/65 break-words">▸ {t.topic} <span className="text-white/30">({(t.growth * 100).toFixed(0)}%)</span></p>)}{!(phases.get(p) ?? []).length && <p className="text-[12px] text-white/25">해당 없음</p>}</div>)}</div>
    </Card>
    <Card title="코호트 추적 — 출판 연도별 인용 궤적" sub="출판 연도(2000·2003·…)별 논문 1편당 평균 누적 인용. 가로 = 출판 후 연수" wide>
      {D.cohorts.length ? <><LineChart series={D.cohorts.map((c: any) => ({ name: `${c.year}년 논문`, points: c.curve.map((p: any) => ({ x: p.age, y: p.cum })) }))} yFmt={(n) => n.toFixed(1)} />
        <div className="overflow-x-auto mt-2"><table className="text-[12.5px] w-full"><thead><tr className="text-white/35 text-left"><th className="py-1 font-normal">코호트</th><th className="font-normal text-right">논문(표본)</th><th className="font-normal text-right">12년 누적 인용/편</th><th className="font-normal text-right">인용 정점(출판 후)</th><th className="font-normal text-right">인용 반감기</th></tr></thead>
          <tbody>{D.cohorts.map((c: any) => <tr key={c.year} className="border-t border-white/[0.04] text-white/70 tabular-nums"><td className="py-1">{c.year}</td><td className="text-right">{nf.format(c.papers)}</td><td className="text-right">{c.total.toFixed(1)}</td><td className="text-right">{c.peakAge}년</td><td className="text-right">{c.halfAge}년</td></tr>)}</tbody></table></div></> : <Empty />}
    </Card>
  </>;
}

// ───────────────────────── L. 횡단 분석 ─────────────────────────
const cohenWord = (d: number) => { const a = Math.abs(d); return a < 0.2 ? "효과 미미" : a < 0.5 ? "작은 효과" : a < 0.8 ? "중간 효과" : "큰 효과"; };
const pWord = (p: number) => (p < 0.001 ? "p<0.001" : "p=" + p.toFixed(3));
export function Cross({ D, refYear, setRefYear }: { D: any; refYear: number; setRefYear: (y: number) => void }) {
  const fields = D.fields.slice(0, 6), mx = (k: string) => Math.max(1e-9, ...fields.map((f: any) => f[k]));
  const rt = D.tabs?.typeOa, rf = D.tabs?.fieldOa;
  const regRows = D.regression?.coef ? D.regression.names.map((n: string, i: number) => ({ label: n, coef: D.regression.coef[i], se: D.regression.se[i] })).filter((r: any) => r.label !== "절편" && !r.label.includes("논문 나이")) : [];
  const tabCard = (title: string, t: any, rowLabel: string) => t && <Card title={title} sub={`한 시점(${refYear}년)의 범주 간 연관을 보는 교차표. 칸 = 표준화 잔차(+2 이상 = 기대보다 훨씬 많음 주황, −2 이하 = 훨씬 적음 청색)`} wide>
    <Heatmap rows={t.rows} cols={t.cols} values={t.resid} lo={-4} hi={4} scheme="div" cell={62} rowW={180} fmt={(v) => v.toFixed(1)} />
    <p className="text-[12.5px] text-white/60 mt-2">카이제곱 χ²({t.df}) = {t.chi2.toFixed(1)}, {pWord(t.p)}, Cramér V = {t.v.toFixed(2)} → {rowLabel}와(과) OA 유형은 {t.p < 0.05 ? <b className="text-[#f0a070]">서로 관련이 있습니다</b> : "관련이 뚜렷하지 않습니다"}{t.p < 0.05 ? ` (연관 강도 ${t.v < 0.1 ? "약함" : t.v < 0.3 ? "보통" : "강함"})` : ""}.</p>
  </Card>;
  return <>
    <div className="md:col-span-2"><div className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05] flex flex-wrap items-center gap-3 text-[13px] text-white/60"><b className="text-[#7fd0c6]">횡단 분석</b><span>한 시점에 출판된 논문들을 <b>같은 시점끼리</b> 비교합니다(논문 나이가 같아 인용을 공정하게 비교).</span>
      <label className="flex items-center gap-1.5 ml-auto">기준 연도 <select value={refYear} onChange={(e) => setRefYear(Number(e.target.value))} className="bg-[#0d0f14] border border-white/[0.08] rounded px-2 py-1 text-white/85">{D.years.slice().reverse().map((y: number) => <option key={y} value={y}>{y}</option>)}</select></label></div></div>
    {!fields.length ? <div className="md:col-span-2"><Empty text={`${refYear}년 논문이 너무 적어 비교할 수 없습니다. 다른 연도를 고르세요.`} /></div> : <>
      <Card title={`${refYear}년 분야 프로필 (레이더)`} sub="상위 6개 분야를 중앙 인용·FWCI·OA 비율·국제 공동·팀 규모·JCR 보유로 비교(각 축 = 6개 분야 안의 최댓값 1)"><Radar axes={["중앙 인용", "FWCI", "OA 비율", "국제 공동", "팀 규모", "JCR 보유"]} series={fields.map((f: any) => ({ name: f.name, values: [f.med / mx("med"), f.f / mx("f"), f.oa / mx("oa"), f.intl / mx("intl"), f.au / mx("au"), f.jcr / mx("jcr")] }))} /></Card>
      <Card title={`${refYear}년 분야별 중앙 인용`} sub="같은 해 논문끼리의 인용 중앙값(보조 = 논문 수)"><Lollipop labelW={190} items={D.fields.map((f: any) => ({ label: f.name, value: f.med, sub: `${nf.format(f.n)}편` }))} fmt={(n) => n.toFixed(0) + "회"} /></Card>
      <Card title={`${refYear}년 논문 유형별 비교`}><Lollipop labelW={150} items={D.types.map((t: any) => ({ label: t.name, value: t.med, sub: `OA ${(t.oa * 100).toFixed(0)}% · ${nf.format(t.n)}편` }))} fmt={(n) => n.toFixed(0) + "회"} color="#e8782e" /></Card>
      <Card title={`${refYear}년 국가별 중앙 인용`} sub="논문 15편 이상인 상위 국가"><Lollipop labelW={120} items={D.countries.map((c: any) => ({ label: c.name, value: c.med, sub: `FWCI ${c.f ? c.f.toFixed(2) : "-"} · ${nf.format(c.n)}편` }))} fmt={(n) => n.toFixed(0) + "회"} color="#b5c23c" /></Card>
      {tabCard("교차표 ① 논문 유형 × OA 유형", rt, "논문 유형")}
      {tabCard("교차표 ② 분야 × OA 유형", rf, "분야")}
      <Card title="집단 간 차이 검정 (Welch t)" sub={`log(1+피인용) 평균 차이와 95% 신뢰구간. 0 에서 멀고 구간이 0 을 지나지 않으면 유의. Cohen d 로 효과 크기를 표시`} wide>
        {D.compare.length ? <><Forest rows={D.compare.map((c: any) => ({ label: c.label, coef: c.diff, se: (c.ci[1] - c.ci[0]) / 3.92 }))} />
          <div className="overflow-x-auto mt-2"><table className="w-full text-[12.5px]"><thead><tr className="text-white/35 text-left"><th className="py-1 font-normal">비교</th><th className="font-normal text-right">앞 집단(편수·중앙 인용)</th><th className="font-normal text-right">뒤 집단</th><th className="font-normal text-right">인용 배율</th><th className="font-normal text-right">t / p</th><th className="font-normal text-right">Cohen d</th></tr></thead>
            <tbody>{D.compare.map((c: any) => <tr key={c.label} className="border-t border-white/[0.04] text-white/70 tabular-nums"><td className="py-1">{c.label}</td><td className="text-right">{nf.format(c.yes.n)} · {c.yes.med}</td><td className="text-right">{nf.format(c.no.n)} · {c.no.med}</td><td className="text-right">×{Math.exp(c.diff).toFixed(2)}</td><td className="text-right">{c.t.toFixed(1)} / {pWord(c.p)}{c.pAdj != null ? ` (Holm 보정 ${pWord(c.pAdj)})` : ""}</td><td className="text-right">{c.d.toFixed(2)} <span className="text-white/35">({cohenWord(c.d)})</span></td></tr>)}</tbody></table></div>
          <p className="text-[11.5px] text-white/30 mt-2">인용 배율 = exp(평균 차이) — 로그 척도라 대략 ‘앞 집단이 뒤 집단보다 몇 배 인용되는가’. 상관이지 인과가 아닙니다.</p></> : <Empty text="비교할 두 집단이 충분하지 않습니다" />}
      </Card>
      <Card title="분산분석 — 어떤 구분이 인용 차이를 가장 잘 설명하나" sub="η² = 집단 간 차이가 전체 인용 변동에서 차지하는 비율(같은 해 논문끼리)">
        <div className="grid grid-cols-2 gap-2"><Gauge value={D.anova.field.eta2} label={`분야(${D.anova.nFields}개)`} sub={`F=${D.anova.field.f.toFixed(1)}, ${pWord(D.anova.field.p)}`} color="#4fa89f" /><Gauge value={D.anova.type.eta2} label="논문 유형" sub={`F=${D.anova.type.f.toFixed(1)}, ${pWord(D.anova.type.p)}`} color="#e8782e" /></div>
        <p className="text-[12px] text-white/45 mt-1">η² 가 클수록 그 구분이 인용 차이를 많이 설명합니다(0.01 작음 · 0.06 중간 · 0.14 큼 — Cohen 기준).</p>
        {D.kw?.field && <p className="text-[12px] text-white/50 mt-1">비모수 확인(Kruskal–Wallis, 표본 {nf.format(D.kw.field.n)}편{D.kw.sampleEvery > 1 ? ` · 1/${D.kw.sampleEvery} 해시 표본` : ""}): 분야 H({D.kw.field.df}) = {D.kw.field.h.toFixed(1)}, {pWord(D.kw.field.p)}, ε² = {D.kw.field.eps2.toFixed(3)}{D.kw.type ? ` · 유형 H(${D.kw.type.df}) = ${D.kw.type.h.toFixed(1)}, ${pWord(D.kw.type.p)}, ε² = ${D.kw.type.eps2.toFixed(3)}` : ""} — 분포가 치우쳐도 결론이 같은지 보는 검정입니다.</p>}</Card>

      {D.effects?.some((e: any) => e.points.length > 2) && <Card title="반복 횡단 — 해마다 같은 비교의 효과 크기 추이" sub="같은 비교(예: OA vs 비OA)를 해마다 되풀이해 효과 크기(Hedges g, log FWCI 기준 — 논문 나이를 FWCI 로 보정)가 시간에 따라 커지는지 줄어드는지 봅니다. 0 위 = 앞 집단이 더 높음" wide>
        <LineChart series={D.effects.filter((e: any) => e.points.length > 2).map((e: any) => ({ name: e.label, points: e.points.map((p: any) => ({ x: p.year, y: p.d })) }))} yFmt={(n) => n.toFixed(2)} />
        <div className="overflow-x-auto mt-2"><table className="w-full text-[12.5px]"><thead><tr className="text-white/35 text-left"><th className="py-1 font-normal">비교</th><th className="font-normal text-right">가장 최근 연도</th><th className="font-normal text-right">g (95% 구간)</th><th className="font-normal text-right">p</th><th className="font-normal text-right">평균 g(전 기간)</th></tr></thead>
          <tbody>{D.effects.filter((e: any) => e.points.length > 2).map((e: any) => { const l = e.points[e.points.length - 1], avg = e.points.reduce((s2: number, q: any) => s2 + q.d, 0) / e.points.length; return <tr key={e.key} className="border-t border-white/[0.04] text-white/70 tabular-nums"><td className="py-1">{e.label}</td><td className="text-right">{l.year}</td><td className="text-right">{l.d.toFixed(2)} ({l.lo.toFixed(2)}~{l.hi.toFixed(2)}) · {cohenWord(l.d)}</td><td className="text-right">{pWord(l.p)}</td><td className="text-right">{avg.toFixed(2)}</td></tr>; })}</tbody></table></div>
      </Card>}
      {D.fields?.length > 1 && <Card title={`${refYear}년 분야별 인용 분위수 (25·50·75·90%)`} sub="평균이 아닌 분포의 위치로 비교합니다(인용은 매우 치우친 분포). 상자 = 25~75%, 가운데 선 = 중앙값, 점 = 90%" wide>
        <div className="overflow-x-auto"><table className="w-full text-[12.5px]"><thead><tr className="text-white/35 text-left"><th className="py-1 font-normal">분야</th><th className="font-normal text-right">편수</th><th className="font-normal text-right">25%</th><th className="font-normal text-right">중앙값</th><th className="font-normal text-right">75%</th><th className="font-normal text-right">90%</th><th className="font-normal text-right">FWCI</th></tr></thead>
          <tbody>{D.fields.slice(0, 10).map((f: any) => <tr key={f.name} className="border-t border-white/[0.04] text-white/70 tabular-nums"><td className="py-1">{f.name}</td><td className="text-right">{nf.format(f.n)}</td><td className="text-right">{f.q25}</td><td className="text-right">{f.med}</td><td className="text-right">{f.q75}</td><td className="text-right">{f.q90}</td><td className="text-right">{f.f ? f.f.toFixed(2) : "-"}</td></tr>)}</tbody></table></div>
      </Card>}
      {D.corr.m.length > 0 && <Card title={`${refYear}년 상관 스냅샷`} sub={`표본 ${nf.format(D.corr.n)}편, 피어슨 상관(−1 ~ 1)`}><Heatmap rows={D.corr.names} cols={D.corr.names} values={D.corr.m} lo={-1} hi={1} scheme="div" cell={44} rowW={100} /></Card>}
      {regRows.length > 0 && <Card title={`${refYear}년 횡단 회귀`} sub={`log(1+피인용) ~ 요인, 표본 ${nf.format(D.regression.n)}편, R² ${D.regression.r2.toFixed(2)}. 같은 해 논문만 쓰므로 ‘논문 나이’ 효과가 없습니다. 연속 변수는 표준화`}><Forest rows={regRows} /></Card>}
    </>}
  </>;
}
