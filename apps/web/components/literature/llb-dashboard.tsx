"use client";

/* ════════════════════════════════════════════════════════════
   LLB 데이터 분석 대시보드 — A~L 12개 영역
   A 규모·동향 · B 영향력 · C 저널·출판 · D 저자·협력 · E 기관·국가 · F 주제·지식 구조(5개 분석) · G 재원·오픈액세스 · H 인용 구조 · I 통계 모델 · J 품질·검색 설계
   서버(/api/scholar/dashboard)가 검색 조건에 일치한 논문 집합을 집계하고, 이 화면이 차트로 그린다.
═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarsH, BoxRows, Card, Chord, Columns, Empty, Flow, Forest, Heatmap, LineChart, Lorenz, Notice, PAL, Sankey, Scatter, Spark, StackedBars, Stream, Sunburst, TileMap, Treemap, UpSet, nfmt,
} from "@/components/literature/viz";
import { Donut, Gauge, Lollipop } from "@/components/literature/viz2";
import { PALETTES } from "@/lib/literature/viz-style";
import DonutLoader from "@/components/literature/donut-loader";
import { ClusterRadar, CoverageWaffle, Cross, FieldBump, ImpactGauges, JournalRadar, Longi, OaDonut, TopicBump, TopicSlope, TypeDonut } from "@/components/literature/llb-dashboard-extra";

type Sec = "trend" | "impact" | "journal" | "author" | "geo" | "topic_year" | "topic_evo" | "topic_rs" | "topic_map" | "topic_gap" | "funding" | "citation" | "model" | "quality" | "longitudinal" | "cross";
interface Resp { section: Sec; matched: number | null; staged: boolean; ms: number; data: any; error?: string }

const GROUPS: { id: string; label: string; subs?: { id: Sec; label: string }[]; sec?: Sec; desc: string }[] = [
  { id: "A", label: "A 규모·동향", sec: "trend", desc: "연도별 편수, 분야·주제 구성, 분야별 변화, 언어" },
  { id: "B", label: "B 영향력", sec: "impact", desc: "인용 분포·집중도, FWCI, 인용 궤적, 핵심 문헌" },
  { id: "C", label: "C 저널·출판", sec: "journal", desc: "저널 순위, 사분위, 색인 DB 중복, 출판사, 투고처 추천" },
  { id: "D", label: "D 저자·협력", sec: "author", desc: "팀 규모, 저자 생산성(Lotka), 상위 저자" },
  { id: "E", label: "E 기관·국가", sec: "geo", desc: "국가 지도, 국제 협력, 기관 유형, 한국 비교" },
  { id: "F", label: "F 주제·지식 구조", desc: "주제 변천, 학제성, 토픽 지도, 연구 공백", subs: [
    { id: "topic_year", label: "주제 흐름(스트림)" }, { id: "topic_evo", label: "주제 변천(샌키)" }, { id: "topic_rs", label: "학제성(Rao–Stirling)" }, { id: "topic_map", label: "토픽·초록 지도" }, { id: "topic_gap", label: "연구 공백 매트릭스" } ] },
  { id: "G", label: "G 재원·오픈액세스", sec: "funding", desc: "지원 여부별 인용, OA 추이·이점, APC" },
  { id: "H", label: "H 인용 구조", sec: "citation", desc: "참고문헌 연령, 인용 주경로" },
  { id: "I", label: "I 통계 모델", sec: "model", desc: "인용 영향 요인 회귀, 상관, 저널 군집" },
  { id: "J", label: "J 품질·검색 설계", sec: "quality", desc: "메타데이터 완전성, 철회·오결합, PRISMA 흐름도" },
  { id: "K", label: "K 종단 분석", sec: "longitudinal", desc: "성장 모형·예측, 변화점, 추세 검정, 주제 생애주기, 저자 유입, 코호트 추적" },
  { id: "L", label: "L 횡단 분석", sec: "cross", desc: "한 시점 비교: 분야·유형·국가, 교차표 χ², 집단 간 t 검정, 분산분석, 횡단 회귀" },
];
const SECTION_HELP: Record<Sec, string> = {
  trend: "검색에 일치한 전체 논문을 SQL 로 집계합니다.", impact: "일치한 전체 논문의 인용을 집계합니다(인용 궤적은 연도 코호트 표본).", journal: "일치한 전체 논문의 저널·색인 정보를 집계합니다.",
  author: "저자 생산성은 일치 집합이 25만 편을 넘으면 해시 표본으로 계산합니다.", geo: "일치한 전체 논문의 국가·기관 정보를 집계합니다.", topic_year: "일치한 전체 논문의 주제 상위 24개를 연도별로 집계합니다.",
  topic_evo: "순위 상위 최대 4,000편에서 연도 구간별 키워드 군집을 만들고, 이웃 구간의 군집을 구성원 겹침(Jaccard)으로 이어 신규·소멸·분기·합류를 판정합니다.",
  topic_rs: "순위 상위 최대 4,000편의 OpenAlex 개념으로 개념 간 거리(1−동시출현 코사인)를 만들고 논문마다 Rao–Stirling 다양성을 계산합니다.",
  topic_map: "상위 최대 1,800편의 제목·초록을 TF-IDF → 잠재 의미 분석(LSA) → k-means 로 묶어 2차원에 배치합니다(임베딩 모델이 아닌 통계 기반 근사).",
  topic_gap: "상위 주제 18개 × 연구 방법·대상 사전(제목+초록 검색)의 관측/기대 비율입니다. 기대보다 적은 칸이 공백 후보입니다.",
  funding: "일치한 전체 논문을 집계합니다. 연구비 정보는 일부 논문에만 있습니다.", citation: "인용순 상위 260편의 참고문헌(papers_v2)으로 계산합니다.", model: "무작위 표본(최대 4만 편)으로 로그 인용을 회귀합니다.", quality: "일치한 전체 논문의 항목 채움률을 집계합니다.",
  longitudinal: "연도별 완결 자료(올해 제외)를 시간 순서로 따라가며 성장 모형·변화점·Mann–Kendall 추세 검정·주제 생애주기·저자 유입·코호트 인용 궤적을 계산합니다.",
  cross: "선택한 기준 연도 한 해의 논문만으로 분야·유형·국가를 비교하고 교차표(χ²)·Welch t 검정·분산분석·횡단 회귀를 계산합니다.",
};
const YEAR_NOW = 2026;
/** 한 번에 분석할 때의 호출 순서(가벼운 것 먼저, 텍스트·인용망 같은 무거운 것은 뒤) */
const SEC_LABEL: Record<string, string> = { trend: "A 규모·동향", impact: "B 영향력", journal: "C 저널·출판", author: "D 저자·협력", geo: "E 기관·국가", funding: "G 재원·OA", quality: "J 품질·검색 설계", longitudinal: "K 종단 분석", cross: "L 횡단 분석", model: "I 통계 모델", topic_year: "F 주제 흐름", topic_evo: "F 주제 변천", topic_rs: "F 학제성", topic_map: "F 토픽·초록 지도", topic_gap: "F 연구 공백", citation: "H 인용 구조" };
const ALL_SECS: Sec[] = ["trend", "impact", "journal", "author", "geo", "funding", "quality", "longitudinal", "cross", "model", "topic_year", "topic_evo", "topic_rs", "topic_map", "topic_gap", "citation"];
const nf = new Intl.NumberFormat("ko-KR");
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const topKeys = (m: Map<string, number>, k: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([x]) => x);

export default function LlbDashboard({ initialQuery = "artificial intelligence", endpoint = "/api/scholar/dashboard", extraParams = "" }: { initialQuery?: string; endpoint?: string; extraParams?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [committed, setCommitted] = useState<string | null>(null);
  const [group, setGroup] = useState("A");
  const [sub, setSub] = useState<Sec>("topic_year");
  const [store, setStore] = useState<Record<string, Resp>>({});
  const [loading, setLoading] = useState<string>("");
  const [err, setErr] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [refYear, setRefYear] = useState(2024);
  const [mode, setMode] = useState<"single" | "all">("single");
  const [runId, setRunId] = useState(0);
  const [palId, setPalId] = useState("pastel");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const pending = useRef(new Map<string, Promise<Resp>>());
  const storeRef = useRef(store);
  storeRef.current = store;
  const inflight = useRef(new Set<string>());
  const regionNames = useMemo(() => { try { return new Intl.DisplayNames(["ko"], { type: "region" }); } catch { return null; } }, []);
  const cname = useCallback((c: string) => { try { return regionNames?.of(c) ?? c; } catch { return c; } }, [regionNames]);

  const g = GROUPS.find((x) => x.id === group)!;
  const sec: Sec = g.sec ?? sub;
  const keyOf = (x: Sec) => `${committed}|${x}|${x === "cross" ? refYear : ""}|${extraParams}`;
  const key = committed && mode === "single" ? keyOf(sec) : "";
  const cur = key ? store[key] : undefined;

  useEffect(() => {
    if (!committed || !key || store[key] || inflight.current.has(key)) return;
    inflight.current.add(key); setLoading(key); setErr(""); const t0 = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    fetch(`${endpoint}?q=${encodeURIComponent(committed)}&section=${sec}${sec === "cross" ? `&refYear=${refYear}` : ""}${extraParams}`).then(async (r) => {
      const d = (await r.json()) as Resp; if (!r.ok || d.error) throw new Error(d.error || `HTTP ${r.status}`);
      setStore((s) => ({ ...s, [key]: d }));
    }).catch((e) => setErr(String(e?.message ?? e))).finally(() => { inflight.current.delete(key); clearInterval(tick); setLoading((l) => (l === key ? "" : l)); setElapsed(0); });
    return () => clearInterval(tick);
  }, [committed, key, sec, endpoint, extraParams, store]);

  // 한 번에 분석: 모든 영역을 두 개씩 차례로 불러온다(같은 검색의 결과는 서버가 5분 캐시)
  useEffect(() => {
    if (mode !== "all" || !committed) return;
    let stop = false; const HEAVY = new Set<Sec>(["topic_evo", "topic_rs", "topic_map", "citation"]), retried = new Set<Sec>(), queue = ALL_SECS.filter((x) => !storeRef.current[keyOf(x)] && !HEAVY.has(x)), heavy = ALL_SECS.filter((x) => !storeRef.current[keyOf(x)] && HEAVY.has(x));
    const worker = async () => {
      while (!stop) {
        const x = queue.shift(); if (!x) return; const k = keyOf(x); setLoading(k);
        try {
          let pr = pending.current.get(k);   // 같은 영역을 두 번 요청하지 않는다(재실행·빠른 전환 시 서버 과부하 방지)
          if (!pr) { pr = fetch(`${endpoint}?q=${encodeURIComponent(committed)}&section=${x}${x === "cross" ? `&refYear=${refYear}` : ""}${extraParams}`).then(async (r) => { const j = (await r.json()) as Resp; if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`); return j; }); pending.current.set(k, pr); const kk = k; void pr.then(() => pending.current.delete(kk), () => pending.current.delete(kk)); }
          const d = await pr;
          if (!stop) { setStore((st) => ({ ...st, [k]: d })); setErrs((e) => { const n = { ...e }; delete n[x]; return n; }); }
        } catch (e) { const msg = String((e as Error)?.message ?? e); if (!stop && /Timeout|TIMEOUT|HTTP 5/.test(msg) && !retried.has(x)) { retried.add(x); queue.push(x); } else if (!stop) setErrs((er) => ({ ...er, [x]: msg })); }
      }
    };
    // 가벼운 영역은 둘씩, 텍스트·인용망처럼 무거운 영역은 그 뒤에 하나씩(서버·DB 과부하로 시간 초과가 나는 것을 막는다)
    void Promise.all([worker(), worker()]).then(() => { queue.push(...heavy); return worker(); }).then(() => { if (!stop) setLoading(""); });
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, committed, runId, refYear, endpoint, extraParams]);

  const applyPalette = (id: string) => { const c = PALETTES.find((x) => x.id === id)?.colors ?? PALETTES[0].colors; PAL.splice(0, PAL.length, ...c, ...PALETTES[0].colors.slice(0, Math.max(0, 12 - c.length))); setPalId(id); };
  const doneN = ALL_SECS.filter((x) => store[keyOf(x)]).length;
  const D = cur?.data;
  const run = () => { if (q.trim()) { setStore({}); setErrs({}); setRunId((n) => n + 1); setCommitted(q.trim()); } };

  const renderSec = (x: Sec, Dx: any) => (
    <>
      {x === "trend" && <Trend D={Dx} />}
      {x === "impact" && <Impact D={Dx} />}
      {x === "journal" && <Journal D={Dx} />}
      {x === "author" && <Author D={Dx} />}
      {x === "geo" && <Geo D={Dx} cname={cname} />}
      {x === "topic_year" && <TopicYear D={Dx} />}
      {x === "topic_evo" && <TopicEvo D={Dx} />}
      {x === "topic_rs" && <TopicRs D={Dx} />}
      {x === "topic_map" && <TopicMap D={Dx} />}
      {x === "topic_gap" && <TopicGap D={Dx} />}
      {x === "funding" && <Funding D={Dx} />}
      {x === "citation" && <Citation D={Dx} />}
      {x === "model" && <Model D={Dx} />}
      {x === "quality" && <Quality D={Dx} />}
      {x === "longitudinal" && <Longi D={Dx} />}
      {x === "cross" && <Cross D={Dx} refYear={refYear} setRefYear={setRefYear} />}
    </>
  );

  return (
    <div className="max-w-6xl space-y-4">
      <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05] space-y-3">
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }} placeholder={'검색어 (예: machine learning cancer, "deep learning", 우울 청소년)'} className="flex-1 px-3 py-2 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-white text-[14px]" />
          <button type="button" onClick={run} className="px-4 py-2 rounded-lg bg-[#e8b84b]/20 text-[#e8b84b] border border-[#e8b84b]/30 text-[14px]">{loading ? "분석 중…" : "분석 실행"}</button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/45">
          <span className="flex gap-1">{([["single", "영역별 보기"], ["all", "A~L 한 번에 보기"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setMode(id)} className={`px-3 py-1 rounded-lg border ${mode === id ? "border-[#e8b84b]/50 bg-[#e8b84b]/15 text-[#e8c97a] font-medium" : "border-white/[0.06] hover:text-white/75"}`}>{label}</button>)}</span>
          <label className="flex items-center gap-1.5">차트 색상 모드 <select value={palId} onChange={(e) => applyPalette(e.target.value)} className="bg-[#0d0f14] border border-white/[0.08] rounded px-1.5 py-0.5 text-white/80">{PALETTES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select><span className="flex">{PAL.slice(0, 6).map((c, i) => <i key={i} className="inline-block w-2.5 h-2.5" style={{ background: c }} />)}</span></label>
          <span className="text-white/30">각 차트 오른쪽 위 PNG·JPG 단추로 이미지 저장 · 차트 아래 ‘해석 도움말’에서 쉬운 해석·학술적 해석</span>
        </div>
        <Notice tone="warn"><b>JCR 지표 안내</b> — JIF·사분위 등 JCR 지표는 <b>학술지 논문의 약 31%에만</b> 있습니다. 값이 있는 논문까지만 저널 지표 분석에 쓰이며, <b>학술대회 논문·학위논문은 저널 지표 분석에서 빠집니다</b>(해당 분석 화면에 실제 비율을 표시합니다).</Notice>
        <div className="flex flex-wrap gap-1.5">{GROUPS.map((x) => (
          <button key={x.id} type="button" onClick={() => setGroup(x.id)} title={x.desc} className={`px-3 py-1.5 rounded-lg text-[13.5px] border ${group === x.id ? "border-[#4fa89f]/60 bg-[#4fa89f]/15 text-[#7fd0c6] font-medium" : "border-white/[0.06] text-white/45 hover:text-white/75"}`}>{x.label}</button>))}</div>
        {g.subs && <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.05]">{g.subs.map((s) => (
          <button key={s.id} type="button" onClick={() => setSub(s.id)} className={`px-3 py-1 rounded-lg text-[13px] border ${sub === s.id ? "border-[#e8782e]/60 bg-[#e8782e]/15 text-[#f0a070] font-medium" : "border-white/[0.06] text-white/45 hover:text-white/75"}`}>{s.label}</button>))}</div>}
        <p className="text-[12px] text-white/35">{g.desc} · {SECTION_HELP[sec]}</p>
        {cur && <p className="text-[12.5px] text-white/50">일치 <b className="text-white/80">{cur.matched != null ? nf.format(cur.matched) : "?"}편</b>{cur.staged ? " (제목 일치 우선 단계 — 검색 화면과 같은 기준)" : ""} · 계산 {(cur.ms / 1000).toFixed(1)}초</p>}
        {err && <p className="text-[13px] text-[#f87171]">오류: {err}</p>}
      </div>

      {!committed && <p className="text-center py-16 text-white/20 text-[15px]">검색어를 넣고 ‘분석 실행’을 누르면 일치한 논문 집합을 12개 영역으로 분석합니다.</p>}
      {committed && mode === "single" && !cur && !err && <DonutLoader title={`${g.label} 분석 중`} expectedSec={sec.startsWith("topic") || sec === "citation" || sec === "longitudinal" || sec === "cross" ? 60 : 25} hint="큰 집합·텍스트·인용 분석은 1분 안팎 걸립니다. 같은 검색의 결과는 5분간 캐시됩니다." steps={[{ label: "검색 일치 집합 확정", state: "done" }, { label: "SQL 집계·통계 계산", state: "active" }, { label: "차트 구성", state: "pending" }]} />}

      {mode === "single" && cur && D && (
        <div key={palId} className="grid md:grid-cols-2 gap-4">{renderSec(sec, D)}</div>
      )}
      {mode === "all" && committed && (
        <div key={palId} className="space-y-8">
          {doneN < ALL_SECS.length && <DonutLoader title="A~L 전체 분석 중" percent={(doneN / ALL_SECS.length) * 100} hint="영역마다 차례로 계산해 끝나는 대로 아래에 채워집니다(전체 3~5분)." steps={ALL_SECS.map((x) => ({ label: SEC_LABEL[x] ?? x, state: store[keyOf(x)] ? "done" as const : errs[x] ? "done" as const : (loading === keyOf(x) || ALL_SECS.findIndex((y) => !store[keyOf(y)] && !errs[y]) === ALL_SECS.indexOf(x)) ? "active" as const : "pending" as const }))} />}
          <div className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05] text-[13px] text-white/60 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>전체 분석 진행 <b className="text-white/85">{doneN}</b> / {ALL_SECS.length} 영역{loading ? ` · 계산 중 ${elapsed ? elapsed + "초" : ""}` : doneN === ALL_SECS.length ? " · 완료" : ""}</span>
            <span className="flex flex-wrap gap-1">{GROUPS.map((x) => <a key={x.id} href={`#llb-${x.id}`} className="px-2 py-0.5 rounded-md border border-white/[0.08] hover:text-white/90">{x.id}</a>)}</span>
            {Object.keys(errs).length > 0 && <span className="text-[#f87171]">오류: {Object.entries(errs).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>}
          </div>
          {GROUPS.map((x) => {
            const parts: Sec[] = x.sec ? [x.sec] : (x.subs ?? []).map((u) => u.id);
            return (
              <section key={x.id} id={`llb-${x.id}`} className="space-y-3 scroll-mt-4">
                <h2 className="text-[17px] font-semibold text-[#7fd0c6] border-b border-white/[0.06] pb-1.5">{x.label} <span className="text-[12.5px] font-normal text-white/35">{x.desc}</span></h2>
                {parts.map((ps) => {
                  const r = store[keyOf(ps)];
                  return (
                    <div key={ps} className="space-y-2">
                      {x.subs && <h3 className="text-[14px] text-[#f0a070]">{x.subs.find((u) => u.id === ps)?.label}</h3>}
                      {r?.data ? <div className="grid md:grid-cols-2 gap-4">{renderSec(ps, r.data)}</div> : <p className="py-6 text-center text-white/30 text-[14px]">{errs[ps] ? `오류: ${errs[ps]}` : <DonutLoader compact size={52} title="계산 중" steps={[{ label: "집계·통계 계산", state: "active" }]} />}</p>}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── A ─────────────────────────
function Trend({ D }: { D: any }) {
  const types = topKeys(D.yearType.reduce((m: Map<string, number>, r: any) => m.set(r.type, (m.get(r.type) ?? 0) + r.n), new Map()), 5);
  const series = types.map((t) => ({ name: t, points: D.yearType.filter((r: any) => r.type === t).map((r: any) => ({ x: r.year, y: r.n })) }));
  const tree = useMemo(() => {
    const root: any = { name: "root", value: 0, children: [] }, find = (n: any, name: string) => n.children.find((c: any) => c.name === name) ?? (n.children.push({ name, value: 0, children: [] }), n.children[n.children.length - 1]);
    for (const r of D.hierarchy) { let n = root; for (const k of [r.domain || "(영역 없음)", r.field, r.subfield, r.topic]) { n = find(n, k || "(없음)"); n.value += r.n; } root.value += r.n; }
    return root;
  }, [D]);
  const fields = topKeys(D.fieldYear.reduce((m: Map<string, number>, r: any) => m.set(r.field, (m.get(r.field) ?? 0) + r.n), new Map()), 8);
  const years = [...new Set<number>(D.fieldYear.map((r: any) => r.year))].filter((y) => y >= 1995).sort((a, b) => a - b);
  const langs = topKeys(D.langYear.reduce((m: Map<string, number>, r: any) => m.set(r.lang, (m.get(r.lang) ?? 0) + r.n), new Map()), 5);
  const ly = [...new Set<number>(D.langYear.map((r: any) => r.year))].filter((y) => y >= 1995).sort((a, b) => a - b);
  const total = D.yearType.reduce((s: number, r: any) => s + r.n, 0), last = Math.max(...D.yearType.map((r: any) => r.year));
  const byY = new Map<number, number>(); D.yearType.forEach((r: any) => byY.set(r.year, (byY.get(r.year) ?? 0) + r.n));
  const lastFull = [...byY.keys()].filter((y) => y < YEAR_NOW).sort((a, b) => b - a)[0], prev = byY.get(lastFull - 1) ?? 0;
  return <>
    <Card title="연도별 논문 편수 (유형별 누적)" sub={`총 ${nf.format(total)}편 · 최근 연도 ${last}년은 집계 중이라 낮을 수 있습니다${prev ? ` · ${lastFull}년 전년 대비 ${(((byY.get(lastFull) ?? 0) / prev - 1) * 100).toFixed(1)}%` : ""}`} wide><LineChart series={series} stacked /></Card>
    <TypeDonut D={D} /><FieldBump D={D} /><Card title="분야·주제 구성 (선버스트)" sub="영역 → 분야 → 세부분야 → 주제, 호의 길이 = 편수. 마우스를 올리면 해당 가지가 강조됩니다."><Sunburst root={tree} /></Card>
    <Card title="분야 → 세부분야 (트리맵)" sub="상자 크기 = 편수"><Treemap root={{ name: "all", value: tree.value, children: tree.children.flatMap((d: any) => d.children) }} /></Card>
    <Card title="분야별 연도 변화 (스트림)" sub="상위 8개 분야, 가운데 기준선으로 쌓은 면적" wide><Stream years={years} layers={fields.map((f) => ({ name: f, values: years.map((y) => D.fieldYear.find((r: any) => r.field === f && r.year === y)?.n ?? 0) }))} /></Card>
    <Card title="언어 구성 추이 (100% 누적)" sub="상위 5개 언어"><StackedBars rows={ly.filter((_, i) => i % Math.max(1, Math.floor(ly.length / 16)) === 0).map((y) => ({ label: String(y), values: Object.fromEntries(langs.map((l) => [l, D.langYear.find((r: any) => r.year === y && r.lang === l)?.n ?? 0])) }))} keys={langs} /></Card>
    <Card title="한글 비율 추이" sub="제목·초록 글자 중 한글 비중(한국어 논문 비중의 지표)"><LineChart series={[{ name: "평균 한글 비율", points: ly.map((y) => ({ x: y, y: D.langYear.filter((r: any) => r.year === y).reduce((s: number, r: any) => s + r.ko * r.n, 0) / Math.max(1, D.langYear.filter((r: any) => r.year === y).reduce((s: number, r: any) => s + r.n, 0)) * 100 })) }]} yFmt={(n) => n.toFixed(0) + "%"} /></Card>
  </>;
}

// ───────────────────────── B ─────────────────────────
function Impact({ D }: { D: any }) {
  const t = D.total, [logY, setLogY] = useState(true);
  const lab = (b: number) => (b === 0 ? "0" : b === 1 ? "1-2" : `${2 ** b - 1}+`);
  const aging = useMemo(() => [2005, 2010, 2015, 2020].map((y) => { let cum = 0; const rows = D.aging.filter((r: any) => r.year === y).sort((a: any, b: any) => a.age - b.age); const pap = Math.max(1, ...rows.map((r: any) => r.papers)); return { name: `${y}년 논문`, points: rows.map((r: any) => ({ x: r.age, y: (cum += r.cites / pap) })) }; }).filter((s) => s.points.length > 1), [D]);
  const fy = [...new Set<number>(D.fieldFwci.map((r: any) => r.year))].sort((a, b) => a - b).filter((y) => y >= 2005 && y <= 2024), fields = topKeys(D.fieldFwci.reduce((m: Map<string, number>, r: any) => m.set(r.field, (m.get(r.field) ?? 0) + r.n), new Map()), 14);
  return <>
    <Card title="인용 한눈에" sub="일치한 전체 논문 기준" wide>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{([["논문", nf.format(t.n)], ["인용 합", nfmt(t.s)], ["중앙값 / 평균", `${t.p50} / ${(t.s / Math.max(1, t.n)).toFixed(1)}`], ["무인용 비율", pct(t.zero, t.n).toFixed(1) + "%"], ["상위 10% 문턱", `${t.p90}회`], ["상위 1% 문턱", `${t.p99}회`], ["상위 1%가 차지한 인용", (D.topShare1 * 100).toFixed(0) + "%"], ["지니계수", D.gini.toFixed(2)]] as [string, string][]).map(([k, v]) => <div key={k} className="px-3 py-2 rounded-lg bg-[#0d0f14] border border-white/[0.04]"><p className="text-[11px] text-white/35">{k}</p><p className="text-[18px] font-semibold text-[#7fd0c6] tabular-nums">{v}</p></div>)}</div>
    </Card>
    <ImpactGauges D={D} /><Card title="인용 분포 (로그 구간)" sub="가로: 피인용 구간(2의 거듭제곱), 세로: 논문 수. 긴 꼬리 = 소수 논문이 대부분의 인용을 받는 구조"><div className="flex justify-end mb-1"><button type="button" className="text-[12px] text-white/50 border border-white/[0.08] rounded px-2" onClick={() => setLogY((v) => !v)}>{logY ? "로그 축" : "선형 축"}</button></div><Columns data={D.bins.map((b: any) => ({ label: lab(b.b), value: b.n }))} log={logY} /></Card>
    <Card title="인용 집중도 (로렌츠 곡선)" sub={`논문의 상위 10%가 인용의 ${(D.topShare10 * 100).toFixed(0)}%, 상위 1%가 ${(D.topShare1 * 100).toFixed(0)}% 를 차지 (지니 ${D.gini.toFixed(2)})`}><Lorenz points={D.lorenz} /></Card>
    <Card title="연도별 상대 인용지수(FWCI, OpenAlex)" sub="1 = 세계 평균. 평균과 중앙값(점선 대신 두 선)"><LineChart series={[{ name: "평균 FWCI", points: D.fwciYear.map((r: any) => ({ x: r.year, y: r.f })) }, { name: "중앙값", points: D.fwciYear.map((r: any) => ({ x: r.year, y: r.fm })) }]} yFmt={(n) => n.toFixed(1)} /></Card>
    <Card title="연도별 상위 1%·10% 논문" sub="OpenAlex 가 표시한 상위 인용 논문 수"><LineChart series={[{ name: "상위 10%", points: D.fwciYear.map((r: any) => ({ x: r.year, y: r.t10 })) }, { name: "상위 1%", points: D.fwciYear.map((r: any) => ({ x: r.year, y: r.t1 })) }]} /></Card>
    <Card title="분야 × 연도 FWCI 히트맵" sub="진할수록 세계 평균보다 많이 인용" wide><Heatmap rows={fields} cols={fy.map(String)} cell={26} rowW={190} lo={0} hi={3} values={fields.map((f) => fy.map((y) => D.fieldFwci.find((r: any) => r.field === f && r.year === y)?.f ?? 0))} fmt={(v) => v.toFixed(1)} /></Card>
    <Card title="인용 궤적 — 논문이 나이 들며 받는 누적 인용" sub={aging.length ? "출판 연도 코호트별 논문 1편당 평균 누적 인용(표본). 가로 = 출판 후 연수" : "표본이 작아 계산할 수 없습니다"} wide>{aging.length ? <LineChart series={aging} yFmt={(n) => n.toFixed(1)} /> : <Empty />}</Card>
    <Card title="핵심 문헌 추천" sub="점수 = 0.5×정규화 인용 백분위 + 0.3×FWCI(상한 20) + 0.2×로그 인용. 막대는 구성 요소(인용 백분위·FWCI·인용)" wide>
      <div className="space-y-1.5">{D.keyPapers.map((p: any, i: number) => <div key={p.wid} className="flex items-center gap-3"><span className="text-white/30 w-5 text-[12px]">{i + 1}</span><div className="flex-1 min-w-0"><p className="text-[13px] text-white/80 truncate">{p.title}</p><p className="text-[11.5px] text-white/35 truncate">{p.author} · {p.journal} · {p.year} · 인용 {nf.format(p.cited)} · FWCI {p.f}</p></div>
        <div className="w-40 h-3 rounded bg-white/[0.05] overflow-hidden flex">{p.parts.map((v: number, k: number) => <div key={k} style={{ width: `${(v / 1) * 100}%`, background: PAL[k] }} />)}</div><span className="w-10 text-right text-[12px] tabular-nums text-white/60">{p.score.toFixed(2)}</span></div>)}</div>
    </Card>
    <Card title="인용 상위 20편" sub="롤리팝 차트: 점 위치 = 피인용 수, 보조 = 제1저자" wide><Lollipop labelW={330} items={D.topCited.map((p: any) => ({ label: `${p.title.slice(0, 70)} (${p.year})`, value: p.cited, sub: p.author }))} /></Card>
  </>;
}

// ───────────────────────── C ─────────────────────────
function Journal({ D }: { D: any }) {
  const cov = D.coverage, share = pct(cov.jcr, cov.n);
  const sets = ["scie", "ssci", "ahci", "esci", "scopus", "doaj", "kci"], lab: Record<string, string> = { scie: "SCIE", ssci: "SSCI", ahci: "A&HCI", esci: "ESCI", scopus: "Scopus", doaj: "DOAJ", kci: "KCI" };
  const qCol: Record<string, string> = { Q1: "#4fa89f", Q2: "#b5c23c", Q3: "#d3a53f", Q4: "#d9706a" };
  return <>
    <div className="md:col-span-2"><Notice tone="warn"><b>JCR 지표 범위</b> — 이 검색 결과 {nf.format(cov.n)}편 중 JCR 지표가 있는 논문은 <b>{nf.format(cov.jcr)}편({share.toFixed(1)}%)</b>입니다(전체 DB 평균 약 31%). 아래의 JIF·사분위·범주 분석은 <b>값이 있는 논문까지만</b> 집계하며, <b>학술대회 논문·학위논문은 저널 지표 분석에서 빠집니다</b>. 편수·출판사·색인 DB 분석은 전체 논문을 씁니다.</Notice></div>
    <CoverageWaffle D={D} /><Card title="논문 유형별 JCR 지표 보유 비율" sub="유형마다 저널 지표를 쓸 수 있는 정도" wide><div className="space-y-1">{D.byType.map((t: any) => <div key={t.type} className="flex items-center gap-2 text-[12.5px]"><span className="w-36 text-white/70 truncate">{t.type}</span><div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden"><div className="h-full" style={{ width: `${pct(t.jcr, t.n)}%`, background: "#e8782e99" }} /></div><span className="w-44 text-right tabular-nums text-white/50">{nf.format(t.n)}편 중 {pct(t.jcr, t.n).toFixed(1)}%</span></div>)}</div></Card>
    <Card title="저널 순위 (편수)" sub="막대 = 편수, 보조 = 평균 JIF·사분위"><BarsH items={D.journals.slice(0, 20).map((j: any) => ({ label: j.journal, value: j.n, sub: j.jif ? `JIF ${j.jif.toFixed(1)} ${j.q}` : "JCR 없음", color: qCol[j.q] }))} /></Card>
    <Card title="저널 버블 — 편수 × JIF" sub="가로: 편수(로그), 세로: JIF(로그), 색: 사분위"><Scatter points={D.journals.filter((j: any) => j.jif > 0).map((j: any) => ({ x: j.n, y: j.jif, c: ["Q1", "Q2", "Q3", "Q4"].indexOf(j.q), label: `${j.journal} · ${j.n}편 · JIF ${j.jif.toFixed(1)} ${j.q}`, r: 3 + Math.min(10, Math.sqrt(j.c) / 40) }))} xLog yLog xLabel="논문 수" yLabel="JIF" colors={["#4fa89f", "#b5c23c", "#d3a53f", "#d9706a"]} legend={["Q1", "Q2", "Q3", "Q4"].map((q) => ({ name: q, color: qCol[q] }))} /></Card>
    <Card title="사분위 분포 (JCR 보유 논문)" sub="Q1 이 가장 높은 JIF 구간"><Donut items={D.quartiles.map((q: any) => ({ label: q.q || "?", value: q.n, color: qCol[q.q] }))} /></Card>
    <Card title="JIF 분포 (JCR 보유 논문)" sub="2 단위 구간, 40 이상은 한 칸"><Columns data={D.jifHist.map((b: any) => ({ label: String(b.b), value: b.n }))} /></Card>
    <Card title="색인 DB 중복 (UpSet)" sub="각 열 = 어떤 DB 조합에 동시에 등재됐는가, 막대 = 논문 수" wide><UpSet sets={sets} label={lab} items={D.upset} /></Card>
    <Card title="JCR 범주별 JIF 분포" sub="상위 14개 범주, 상자 = 사분위 범위, 흰 선 = 중앙값" wide><BoxRows items={D.categories.map((c: any) => ({ label: c.cat, lo: c.lo, q1: c.q1, q2: c.q2, q3: c.q3, hi: Math.min(c.hi, Math.max(c.q3 * 3, c.q3 + 5)), n: c.n }))} /></Card>
    <Card title="출판사 점유율 (편수)"><Lollipop labelW={190} items={D.publishers.slice(0, 15).map((p: any) => ({ label: p.publisher, value: p.n }))} /></Card>
    <Card title="출처 유형 (도넛)"><Donut items={D.sourceTypes.map((s: any) => ({ label: s.type, value: s.n }))} /></Card>
    <JournalRadar D={D} /><Card title="투고처 추천" sub="점수 = 0.55×주제 적합(편수, 로그) + 0.30×사분위 + 0.15×평균 인용. JCR 가 있는 저널만 대상" wide>{D.recommend.length ? <BarsH items={D.recommend.map((j: any) => ({ label: `${j.journal} (${j.publisher || "-"})`, value: j.score, sub: `${j.n}편 · JIF ${j.jif.toFixed(1)} ${j.q}`, color: qCol[j.q] }))} fmt={(n) => n.toFixed(2)} /> : <Empty text="JCR 가 있는 저널이 없습니다" />}</Card>
  </>;
}

// ───────────────────────── D ─────────────────────────
function Author({ D }: { D: any }) {
  const total = D.teamYear.reduce((s: number, r: any) => s + r.n, 0), lastYears = D.teamYear.filter((r: any) => r.year >= 2000);
  return <>
    <Card title="팀 규모 추이" sub="출판 연도별 평균·중앙값 저자 수" wide><LineChart series={[{ name: "평균 저자 수", points: lastYears.map((r: any) => ({ x: r.year, y: r.a })) }, { name: "중앙값", points: lastYears.map((r: any) => ({ x: r.year, y: r.m })) }]} yFmt={(n) => n.toFixed(1)} /></Card>
    <Card title="단독 저자 비율"><LineChart series={[{ name: "단독 저자 논문", points: lastYears.map((r: any) => ({ x: r.year, y: pct(r.solo, r.n) })) }]} yFmt={(n) => n.toFixed(0) + "%"} /></Card>
    <Card title="저자 수 분포" sub={`${nf.format(total)}편`}><Columns data={["1", "2", "3", "4", "5", "6-10", "11-20", "21-50", "51+"].map((b) => ({ label: b, value: D.teamHist.find((x: any) => x.b === b)?.n ?? 0 }))} /></Card>
    <Card title="저자 생산성 (Lotka 법칙)" sub={`가로: 저자 1명이 쓴 논문 수, 세로: 그런 저자의 수(로그-로그). 추정 지수 α ≈ ${D.alpha.toFixed(2)} (Lotka 이론값 2) — ${D.alpha > 2.5 ? "소수 다작 저자 비중이 이론보다 작음(대부분 1편)" : D.alpha < 1.8 ? "다작 저자 비중이 큼" : "이론값과 비슷"}${D.sampled ? ` · 논문 ${D.sampled}분의 1 해시 표본` : ""}`} wide><Scatter points={D.lotka.map((p: any) => ({ x: p.n, y: p.m, label: `${p.n}편 쓴 저자 ${nf.format(p.m)}명` }))} xLog yLog xLabel="저자당 논문 수" yLabel="저자 수" /></Card>
    <Card title="다작 저자 상위 20" sub="이름이 같은 저자는 OpenAlex 저자 번호로 구분"><Lollipop labelW={190} items={D.topAuthors.map((a: any) => ({ label: a.name, value: a.n, sub: `인용 ${nfmt(a.c)}` }))} /></Card>
    <Card title="제1저자 상위 15"><BarsH items={D.firstAuthors.map((a: any) => ({ label: a.name, value: a.n, sub: `인용 ${nfmt(a.c)}` }))} /></Card>
  </>;
}

// ───────────────────────── E ─────────────────────────
function Geo({ D, cname }: { D: any; cname: (c: string) => string }) {
  const vals = new Map<string, number>(D.countries.map((c: any) => [c.c, c.n]));
  const topC = D.countries.slice(0, 14).map((c: any) => c.c), idx = new Map(topC.map((c: string, i: number) => [c, i]));
  const m = topC.map(() => topC.map(() => 0)); D.pairs.forEach((p: any) => { const a = idx.get(p.a), b = idx.get(p.b); if (a != null && b != null) { m[a as number][b as number] += p.n; if (a !== b) m[b as number][a as number] += 0; } });
  const sym = m.map((r: number[], i: number) => r.map((v, j) => (i <= j ? v : 0)));
  const types = topKeys(D.instType.reduce((mm: Map<string, number>, r: any) => mm.set(r.t, (mm.get(r.t) ?? 0) + r.n), new Map()), 5), ys = [...new Set<number>(D.instType.map((r: any) => r.year))].sort((a, b) => a - b).filter((y) => y >= 2000);
  const kr = D.kr.filter((r: any) => r.year >= 2000);
  return <>
    <Card title="국가별 논문 수 (타일 지도)" sub="저자 소속 국가 기준(한 논문이 여러 국가에 중복 계산)" wide><TileMap values={vals} names={cname} /></Card>
    <Card title="국가 순위 (편수 · 평균 FWCI)"><Lollipop labelW={120} items={D.countries.slice(0, 20).map((c: any) => ({ label: cname(c.c), value: c.n, sub: c.f ? `FWCI ${c.f.toFixed(2)}` : "" }))} /></Card>
    <Card title="국가 간 공동연구 (코드 다이어그램)" sub="상위 14개 국가, 띠 폭 = 공동 논문 수. 국가 위에 마우스를 올리면 그 국가의 협력이 강조됩니다."><Chord names={topC.map(cname)} matrix={sym.map((r: number[], i: number) => r.map((v, j) => (i <= j ? v : sym[j][i])))} /></Card>
    <Card title="국제 공동연구 비율" sub="2개 국가 이상이 참여한 논문 비율(국가 정보가 있는 논문 대비, 연 30편 미만인 해는 제외)"><LineChart series={[{ name: "국제 공동", points: D.intl.filter((r: any) => r.year >= 1995 && r.withc >= 30).map((r: any) => ({ x: r.year, y: pct(r.intl, r.withc) })) }]} yFmt={(n) => n.toFixed(0) + "%"} /></Card>
    <Card title="기관 유형 비중 추이" sub="논문에 참여한 기관 유형(한 논문이 여러 유형이면 중복)"><LineChart series={types.map((t) => ({ name: t, points: ys.map((y) => ({ x: y, y: D.instType.find((r: any) => r.year === y && r.t === t)?.n ?? 0 })) }))} stacked percent /></Card>
    <Card title="한국 소속 논문 비중" sub="한국 소속 저자가 포함된 논문 / 전체"><LineChart series={[{ name: "한국 소속 포함", points: kr.map((r: any) => ({ x: r.year, y: pct(r.kr, r.n) })) }]} yFmt={(n) => n.toFixed(1) + "%"} /></Card>
    <Card title="한국과 가장 많이 협력한 국가"><Lollipop labelW={120} items={D.krCollab.map((c: any) => ({ label: cname(c.c), value: c.n }))} color="#e8782e" /></Card>
    <Card title="기관 상위 30" wide><BarsH items={D.institutions.map((i: any) => ({ label: i.name, value: i.n, sub: `인용 ${nfmt(i.c)}` }))} /></Card>
  </>;
}

// ───────────────────────── F ─────────────────────────
function Net() { return <div className="md:col-span-2"><Notice>✅ <b>키워드 동시출현·군집·신흥 주제</b>는 <b>네트워크분석</b> 화면(네트워크 · 군집 요약 · 신흥 주제 탭)에서 이미 제공됩니다. 이 영역에서는 그 위에 더 정밀한 분석 4가지를 제공합니다.</Notice></div>; }
function TopicYear({ D }: { D: any }) {
  const topics = topKeys(D.rows.reduce((m: Map<string, number>, r: any) => m.set(r.topic, (m.get(r.topic) ?? 0) + r.n), new Map()), 24), years = [...new Set<number>(D.rows.map((r: any) => r.year))].sort((a, b) => a - b);
  return <><Net /><Card title="주제 흐름 (스트림그래프)" sub="상위 24개 주제가 연도별로 얼마나 비중을 차지하는지. 띠를 가리키면 주제 이름이 표시됩니다." wide><Stream years={years} layers={topics.map((t) => ({ name: t, values: years.map((y) => D.rows.find((r: any) => r.topic === t && r.year === y)?.n ?? 0) }))} height={320} /></Card><TopicBump D={D} /><TopicSlope D={D} /></>;
}
function TopicEvo({ D }: { D: any }) {
  if (!D.nodes?.length) return <><Net /><div className="md:col-span-2"><Empty text={D.note || "표본이 작아 계산할 수 없습니다"} /></div></>;
  const cnt = (s: string) => D.nodes.filter((n: any) => n.status === s).length;
  return <><Net />
    <Card title="주제 변천 (샌키 — 군집 계통)" sub={`표본 ${nf.format(D.sample)}편을 연도 ${D.periods.length}구간으로 나누고, 구간마다 키워드 동시출현 군집을 만든 뒤 이웃 구간 군집의 구성원 겹침으로 이었습니다. 상자 높이 = 군집의 논문 비중. 색: 지속(청록)·신규(주황)·소멸(자주)·분기(노랑)·합류(파랑)`} wide><Sankey nodes={D.nodes} links={D.links} periods={D.periods.map((p: string, i: number) => `${p} (${D.periodPapers[i]}편)`)} height={420} /></Card>
    <Card title="변천 요약"><div className="space-y-1 text-[13px] text-white/70">{[["지속", "#4fa89f"], ["신규", "#e8782e"], ["분기", "#d3a53f"], ["합류", "#7b93c9"], ["소멸", "#8e5c70"]].map(([s, c]) => <div key={s} className="flex items-center gap-2"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: c }} /><span className="w-10">{s}</span><span className="tabular-nums">{cnt(s)}개 군집</span></div>)}</div><p className="text-[12px] text-white/30 mt-2">‘신규’는 이전 구간에서 이어지지 않은 새 주제, ‘소멸’은 다음 구간으로 이어지지 않은 주제입니다(마지막 구간 제외).</p></Card>
    <Card title="군집 구성 (구간별 대표어)"><div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">{D.nodes.filter((n: any) => n.period === D.periods.length - 1 || n.status === "신규" || n.status === "분기").slice(0, 14).map((n: any) => <p key={n.id} className="text-[12.5px] text-white/65"><b className="text-white/85">{D.periods[n.period]}</b> · {n.status} · {n.members.slice(0, 6).join(", ")}</p>)}</div></Card>
  </>;
}
function TopicRs({ D }: { D: any }) {
  return <><Net />
    <Card title="학제성(Rao–Stirling) 개요" sub={`개념이 2개 이상인 ${nf.format(D.n)}편의 평균 다양성 ${D.mean.toFixed(2)} (0 = 한 분야, 1 에 가까울수록 서로 먼 개념을 섞음)`}><Columns data={D.hist.map((h: any) => ({ label: h.lo.toFixed(1), value: h.n }))} /></Card>
    <Card title="연도별 평균 학제성"><LineChart series={[{ name: "평균 RS", points: D.byYear.map((r: any) => ({ x: r.year, y: r.rs })) }]} yFmt={(n) => n.toFixed(2)} /></Card>
    <Card title="분야별 학제성 (높은 순)"><BarsH items={D.byField.map((f: any) => ({ label: f.field, value: f.rs, sub: `${f.n}편` }))} fmt={(n) => n.toFixed(2)} /></Card>
    <Card title="가장 학제적인 논문 10편" sub="서로 먼 개념을 함께 쓴 논문"><div className="space-y-1.5">{D.top.map((p: any, i: number) => <div key={i}><p className="text-[12.5px] text-white/80 truncate">{p.title}</p><p className="text-[11.5px] text-white/35 truncate">RS {p.rs.toFixed(2)} · {p.year} · 인용 {nf.format(p.cited)} · {p.concepts.join(", ")}</p></div>)}</div></Card>
    <Card title="분야 간 유사도 히트맵" sub="분야별 개념 빈도 벡터의 코사인 유사도(1 = 같은 개념을 씀). 낮은 칸 = 서로 다른 분야" wide><Heatmap rows={D.fieldHeat.names} cols={D.fieldHeat.names} values={D.fieldHeat.m} lo={0} hi={1} cell={42} rowW={170} /></Card>
    <Card title="개념 거리 히트맵 (상위 24개 개념)" sub="가까운 개념이 이웃하도록 정렬. 진한 칸 = 거리가 먼 개념 쌍(1−동시출현 코사인)" wide><Heatmap rows={D.conceptHeat.names} cols={D.conceptHeat.names} values={D.conceptHeat.m} lo={0} hi={1} cell={26} rowW={170} fmt={(v) => v.toFixed(1)} /></Card>
  </>;
}
function TopicMap({ D }: { D: any }) {
  const [hl, setHl] = useState<number | null>(null);
  if (!D.points?.length) return <><Net /><div className="md:col-span-2"><Empty text={D.note || "표본이 작아 계산할 수 없습니다"} /></div></>;
  return <><Net />
    <Card title="토픽·초록 지도" sub={`상위 ${nf.format(D.docs)}편의 제목·초록(어휘 ${nf.format(D.vocab)}개)을 TF-IDF → 잠재 의미 분석(LSA) → k-means 로 묶고 상위 2개 주성분으로 배치했습니다. 가까운 점 = 비슷한 어휘. 점을 가리키면 제목이 보입니다.`} wide>
      <Scatter points={D.points.map((p: any) => ({ x: p.x, y: p.y, c: p.c, hi: hl === p.c, label: `[${p.c + 1}] ${p.title} (${p.year}, 인용 ${p.cited})`, r: hl == null ? 3 : hl === p.c ? 4 : 2 }))} height={380} xFmt={() => ""} yFmt={() => ""} />
    </Card>
    <Card title="토픽(군집) 목록" sub="군집 이름을 가리키면 지도에서 강조됩니다" wide><div className="grid md:grid-cols-2 gap-2">{D.clusters.map((c: any) => <div key={c.id} onMouseEnter={() => setHl(c.id)} onMouseLeave={() => setHl(null)} className="p-3 rounded-xl bg-[#0d0f14] border border-white/[0.04]"><p className="text-[13.5px] text-white/90"><i className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle" style={{ background: PAL[c.id % PAL.length] }} /><b>토픽 {c.id + 1}</b> <span className="text-white/35 text-[12px]">· {c.size}편 · 평균 {c.yearMean.toFixed(0)}년 · 평균 인용 {c.citedMean.toFixed(0)}</span></p><p className="text-[13px] text-[#7fd0c6] mt-0.5">{c.terms.join(" · ")}</p>{c.top.map((p: any, i: number) => <p key={i} className="text-[11.5px] text-white/45 truncate">▸ {p.title} ({p.year}, {nf.format(p.cited)})</p>)}</div>)}</div></Card>
  </>;
}
function TopicGap({ D }: { D: any }) {
  if (!D.topics?.length) return <><Net /><div className="md:col-span-2"><Empty /></div></>;
  const ratio = D.matrix.map((r: any[]) => r.map((c) => Math.min(2, c.ratio))), flag = (r: number, c: number) => D.matrix[r][c].e >= 4 && D.matrix[r][c].ratio < 0.4;
  const gaps = D.matrix.flatMap((r: any[], i: number) => r.map((c, j) => ({ i, j, ...c }))).filter((x: any) => x.e >= 4 && x.ratio < 0.4).sort((a: any, b: any) => b.e - a.e).slice(0, 12);
  return <><Net />
    <Card title="연구 공백 매트릭스 — 주제 × 방법·대상" sub={`행: 상위 주제 ${D.topics.length}개, 열: 연구 방법(앞 9) · 연구 대상(뒤 7)을 제목+초록에서 사전 검색. 값 = 관측/기대(기대 = 주제 편수 × 열 점유율). 노란 테두리 = 기대 4건 이상인데 관측이 40% 미만인 공백 후보${D.sampled ? ` · 해시 표본(1/${D.sampled})` : ""}`} wide>
      <Heatmap rows={D.topics} cols={D.cols.map((c: any) => c.label)} values={ratio} lo={0} hi={2} scheme="div" cell={44} rowW={210} flag={flag} fmt={(v) => v.toFixed(1)} />
      <p className="text-[11.5px] text-white/30 mt-2">파랑 = 기대보다 적음(공백 후보), 주황 = 기대보다 많음. 단어 사전 기반이라 표기 차이로 누락될 수 있습니다.</p></Card>
    <Card title="공백 후보 상위" sub="기대 건수가 큰 순서"><div className="space-y-1">{gaps.length ? gaps.map((g: any, k: number) => <p key={k} className="text-[12.5px] text-white/70">▸ <b className="text-white/90">{D.topics[g.i]}</b> × {D.cols[g.j].label} — 관측 {g.o}건 / 기대 {g.e.toFixed(1)}건</p>) : <Empty text="뚜렷한 공백 후보가 없습니다" />}</div></Card>
    <Card title="사전(방법·대상)"><p className="text-[12px] text-white/45 leading-relaxed">{D.cols.map((c: any) => `${c.kind === "method" ? "방법" : "대상"}:${c.label}`).join(" · ")}</p></Card>
  </>;
}

// ───────────────────────── G ─────────────────────────
function Funding({ D }: { D: any }) {
  const f = D.funded.find((x: any) => x.funded), n = D.funded.find((x: any) => !x.funded);
  const sts = topKeys(D.oaYear.reduce((m: Map<string, number>, r: any) => m.set(r.s, (m.get(r.s) ?? 0) + r.n), new Map()), 6), ys = [...new Set<number>(D.oaYear.map((r: any) => r.year))].sort((a, b) => a - b);
  return <>
    <Card title="연구비 지원 여부별 인용" sub={f && n ? `지원기관이 기록된 논문은 ${nf.format(f.n)}편(${pct(f.n, f.n + n.n).toFixed(1)}%). 연구비 정보는 일부 논문에만 있어 ‘기록 없음’이 ‘지원 없음’은 아닙니다.` : ""}>{f && n ? <BarsH items={[{ label: "지원 기록 있음 — 평균 인용", value: f.c }, { label: "지원 기록 없음 — 평균 인용", value: n.c }, { label: "지원 기록 있음 — 중앙값", value: f.m }, { label: "지원 기록 없음 — 중앙값", value: n.m }, { label: "지원 기록 있음 — 평균 FWCI", value: f.fw }, { label: "지원 기록 없음 — 평균 FWCI", value: n.fw }]} fmt={(v) => v.toFixed(2)} /> : <Empty />}</Card>
    <Card title="후원기관 상위 20"><Lollipop labelW={220} items={D.topFunders.map((x: any) => ({ label: x.name, value: x.n, sub: `평균 인용 ${x.c.toFixed(1)}` }))} color="#d3a53f" /></Card>
    <Card title="오픈액세스 유형 추이 (100%)" sub="gold·green·hybrid·bronze·diamond·closed" wide><StackedBars rows={ys.filter((y) => y >= 2000).map((y) => ({ label: String(y), values: Object.fromEntries(sts.map((s) => [s, D.oaYear.find((r: any) => r.year === y && r.s === s)?.n ?? 0])) }))} keys={sts} /></Card>
    <OaDonut D={D} /><Card title="OA 유형별 인용 (OA 이점)" sub="같은 검색 결과 안의 유형별 평균 FWCI — 분야·연도 차이가 섞여 있어 참고용"><BarsH items={D.oaAdv.map((o: any) => ({ label: o.s, value: o.fw, sub: `${nf.format(o.n)}편 · 평균 인용 ${o.c.toFixed(1)}` }))} fmt={(v) => v.toFixed(2)} /></Card>
    <Card title="논문게재료(APC) × JIF" sub="가로: APC(달러, 로그), 세로: JIF(로그). 표본 최대 1,500편(APC·JIF 가 모두 있는 논문)"><Scatter points={D.apc.map((p: any) => ({ x: p.apc, y: p.jif, label: `${p.journal} · APC $${p.apc} · JIF ${p.jif.toFixed(1)}`, r: 2.8 }))} xLog yLog xLabel="APC (USD)" yLabel="JIF" /></Card>
    <Card title="연구과제(Award) 연결 논문 수" sub="연도별 과제가 기록된 논문"><LineChart series={[{ name: "과제 기록 논문", points: D.awards.filter((r: any) => r.year >= 2000).map((r: any) => ({ x: r.year, y: r.w })) }]} /></Card>
  </>;
}

// ───────────────────────── H ─────────────────────────
function Citation({ D }: { D: any }) {
  const mp = D.mainPath, ra = D.refAge, ys = mp.path.map((p: any) => p.year).filter((y: number) => y > 0), y0 = Math.min(...ys, 3000), y1 = Math.max(...ys, 0);
  return <>
    <Card title="참고문헌 연령 분포" sub={`인용순 상위 논문 ${ra.papers}편이 인용한 ${nf.format(ra.n)}건(DB 에 있는 것). Price 지수(최근 5년 이내 참고문헌 비율) = ${(ra.price * 100).toFixed(1)}% — 높을수록 빠르게 바뀌는 분야`}><Columns data={ra.hist.map((h: any) => ({ label: h.age === 15 ? "15+" : String(h.age), value: h.n }))} /></Card>
    <Card title="Price 지수 (최근성)" sub={`참고문헌 ${nf.format(ra.n)}건 중 최근 5년 이내 비율. 높을수록 지식이 빨리 낡는 분야`}><Gauge value={ra.price} label="최근 5년 이내 참고문헌" sub={`주경로 길이 ${mp.path.length}편${y0 < 3000 ? ` (${y0}–${y1}년)` : ""}`} color="#e8782e" /></Card>
    <Card title="인용 주경로 (Main Path)" sub="가로 = 출판 연도. 화살표 = 지식이 흘러간 방향(인용받은 논문 → 인용한 논문)" wide>
      {mp.path.length ? <div className="space-y-2">{mp.path.map((p: any, i: number) => <div key={p.id} className="flex items-start gap-3"><div className="flex flex-col items-center w-12"><span className="text-[13px] font-semibold text-[#e8782e] tabular-nums">{p.year}</span>{i < mp.path.length - 1 && <span className="text-white/30 leading-none mt-0.5">↓</span>}</div><div className="min-w-0"><p className="text-[13.5px] text-white/85">{p.title}</p><p className="text-[11.5px] text-white/40">{p.author} · 인용 {nf.format(p.cited)}{i < mp.edges.length ? ` · 다음으로의 경로 가중치 ${nfmt(mp.edges[i].spc)}` : ""}</p></div></div>)}</div> : <Empty />}
    </Card>
  </>;
}

// ───────────────────────── I ─────────────────────────
function Model({ D }: { D: any }) {
  if (!D.coef) return <div className="md:col-span-2"><Empty text={D.note || "표본이 작아 계산할 수 없습니다"} /></div>;
  const rows = D.names.map((nm: string, i: number) => ({ label: nm, coef: D.coef[i], se: D.se[i] })).filter((r: any) => r.label !== "절편");
  const strong = [...rows].sort((a: any, b: any) => Math.abs(b.coef) - Math.abs(a.coef)).slice(0, 3);
  const cl = ["#4fa89f", "#e8782e", "#b5c23c", "#8e5c70"];
  return <>
    <div className="md:col-span-2"><Notice tone="warn"><b>JCR 지표 범위</b> — 회귀의 ‘JCR 있음’·‘JIF’ 항은 JCR 지표가 있는 논문(학술지 논문의 약 31%)에서만 값을 가지며, 학술대회 논문·학위논문은 이 항에 기여하지 못합니다. 저널 군집도 JIF 가 있는 저널만 JIF 축을 씁니다.</Notice></div>
    <Card title="인용에 영향을 주는 요인 (회귀)" sub={`종속변수 = log(1+피인용), 표본 ${nf.format(D.n)}편${D.sampled ? `(해시 1/${D.sampled})` : ""}, 설명력 R² = ${D.r2.toFixed(2)}. 연속 변수는 표준화(1 표준편차 변화당 효과), 점 = 계수, 선 = 95% 구간, 주황 = 인용 증가, 청색 = 감소, 회색 = 유의하지 않음`} wide><Forest rows={rows} />
      <p className="text-[12px] text-white/45 mt-2">영향이 큰 요인 상위 3: {strong.map((s: any) => `${s.label}(${s.coef > 0 ? "+" : ""}${s.coef.toFixed(2)})`).join(", ")}. 상관이지 인과가 아니며, ‘논문 나이’가 클수록 인용이 쌓이는 효과가 섞여 있습니다.</p></Card>
    <Card title="요인 간 상관" sub="피어슨 상관(−1 ~ 1)" wide><Heatmap rows={D.corr.names} cols={D.corr.names} values={D.corr.m} lo={-1} hi={1} scheme="div" cell={46} rowW={110} /></Card>
    <Card title="기대보다 많이 인용된 논문 (회귀 잔차 상위 10)" sub="요인을 모두 고려하고도 예상보다 많이 인용된 고성과 논문"><div className="space-y-1.5">{D.outliers.map((o: any, i: number) => <div key={i}><p className="text-[12.5px] text-white/80 truncate">{o.title}</p><p className="text-[11.5px] text-white/35">{o.year} · 인용 {nf.format(o.cited)} · 잔차 +{o.residual.toFixed(2)}</p></div>)}</div></Card>
    <Card title="저널 군집 (편수·JIF·평균 인용·OA 비율)" sub="저널 200개를 k-means 4군집으로 묶어 상위 2개 주성분으로 배치. 점을 가리키면 저널명"><Scatter points={D.journals.map((j: any) => ({ x: j.x, y: j.y, c: j.k, label: `[군집 ${j.k + 1}] ${j.journal} · ${j.n}편 · JIF ${j.jif ? j.jif.toFixed(1) : "-"} · 평균 인용 ${j.c.toFixed(0)}`, r: 3 + Math.min(8, Math.sqrt(j.n)) }))} colors={cl} xFmt={() => ""} yFmt={() => ""} legend={[0, 1, 2, 3].map((k) => ({ name: `군집 ${k + 1}`, color: cl[k] }))} /></Card><ClusterRadar D={D} />
  </>;
}

// ───────────────────────── J ─────────────────────────
function Quality({ D }: { D: any }) {
  const yrs = D.completeness.filter((r: any) => r.year >= 2000 && r.year <= YEAR_NOW).map((r: any) => r.year), items: [string, string][] = [["abs", "초록"], ["doi", "DOI"], ["jn", "저널명"], ["au", "저자"], ["inst", "소속 기관"], ["cn", "국가"], ["kw", "키워드"], ["oa", "OA 유형"], ["jcr", "JCR 지표"], ["fu", "연구비 지원기관"], ["mesh", "MeSH"], ["pmid", "PubMed 번호"]];
  const row = (y: number) => D.completeness.find((r: any) => r.year === y);
  return <>
    <Card title="메타데이터 완전성 (연도 × 항목)" sub="값이 있는 논문의 비율(%). 연도가 오래될수록·유형에 따라 비는 항목이 다릅니다. JCR 는 학술지 논문에만 있습니다." wide><Heatmap rows={items.map((i) => i[1])} cols={yrs.map((y: number) => String(y).slice(2))} values={items.map(([k]) => yrs.map((y: number) => pct(row(y)[k], row(y).n)))} lo={0} hi={100} cell={26} rowW={130} fmt={(v) => v.toFixed(0)} /></Card>
    <Card title="철회·비본문 논문 추이" sub="1,000편당 철회 논문 수"><LineChart series={[{ name: "철회(1,000편당)", points: D.flags.filter((r: any) => r.year >= 1995).map((r: any) => ({ x: r.year, y: (r.ret / Math.max(1, r.n)) * 1000 })) }]} yFmt={(n) => n.toFixed(1)} /></Card>
    <Card title="오결합 의심 비율" sub="DOI 중복 또는 저널·분야 모순으로 표시된 논문 비율(%)"><LineChart series={[{ name: "오결합 의심", points: D.flags.filter((r: any) => r.year >= 1995).map((r: any) => ({ x: r.year, y: pct(r.conf, r.n) })) }]} yFmt={(n) => n.toFixed(1) + "%"} /></Card>
    <Card title="PRISMA 흐름도 (검색 → 포함)" sub="문헌 선별 과정을 그대로 보고서에 옮길 수 있는 단계별 편수. ‘최근 10년’은 현재 연도 기준" wide><Flow steps={D.prisma.filter((s: any) => s.n > 0)} /></Card>
  </>;
}
