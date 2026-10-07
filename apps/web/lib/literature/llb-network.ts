// LLB 네트워크 분석용 서버 도우미 — 검색 조건에 맞는 상위 N편(40~10,000)을 모아 11종 네트워크를 만든다.
// 검색 SQL(순위·필터)은 생성 파일 llb-search.ts 의 buildSearch() 를 그대로 쓴다(검색 화면과 같은 순위·같은 필터).
// 이 파일은 생성 파일이 아니므로 직접 수정해도 된다.

import { buildSearch, searchLlb, networkLlb } from "@/lib/literature/llb-search";
import { buildGraph, summarize, type NetKind, type NetRecord, type Graph, type Summary } from "@/lib/literature/network-graph";
import { buildCocitation, emergingTerms, nodeMembership, paperTable, timelineGraphs, ENTITY_LABEL, type EmergingResult, type PaperLite, type Period } from "@/lib/literature/network-analysis-extra";

const DB = process.env.LLB_DB || "openalex";
const SRC = process.env.LLB_SRC_DB || "openalex";
export const MAX_SCOPE = 10000;          // 서버 메모리·응답 시간 안에서 안전한 최대 표본
export const SCOPES = [40, 100, 200, 500, 1000, 5000, 10000];

// ClickHouse HTTP: 값은 이스케이프된 텍스트(백슬래시·탭·개행·CR)
const esc = (x: unknown) => String(x).replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
const quote = (x: unknown) => "'" + String(x).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\r/g, "\\r") + "'";
const paramValue = (v: unknown) => (Array.isArray(v) ? "[" + v.map(quote).join(",") + "]" : esc(v));

/** SQL 은 본문으로 보낸다(URL 길이 한도를 피함). 값은 param_* 로만 전달한다. */
async function ch(sql: string, params: Record<string, unknown> = {}, timeoutS = 90): Promise<any[]> {
  const url = new URL(process.env.CLICKHOUSE_URL || "http://127.0.0.1:8123");
  url.searchParams.set("default_format", "JSONEachRow");
  url.searchParams.set("max_execution_time", String(Math.max(Number(process.env.LLB_TIMEOUT_S || 15), timeoutS)));
  url.searchParams.set("max_result_rows", "100000");   // 읽기 전용 계정(llb_ro)의 상한이 100000 이다 — 이보다 크게 요청하면 거부된다
  for (const [k, v] of Object.entries(params)) url.searchParams.set("param_" + k, paramValue(v));
  const headers: Record<string, string> = { "content-type": "text/plain; charset=utf-8" };
  if (process.env.CLICKHOUSE_USER) {
    headers["Authorization"] = "Basic " + Buffer.from(process.env.CLICKHOUSE_USER + ":" + (process.env.CLICKHOUSE_PASSWORD || "")).toString("base64");
  }
  const res = await fetch(url, { method: "POST", headers, body: sql, signal: AbortSignal.timeout((timeoutS + 10) * 1000) });
  const text = await res.text();
  if (!res.ok) throw new Error("LLB ClickHouse " + res.status + ": " + text.slice(0, 300));
  return text.trim() ? text.trim().split("\n").map((l) => JSON.parse(l)) : [];
}

const noFormat = (sql: string) => sql.replace(/\s*FORMAT JSONEachRow\s*$/, "");

/** 검색 순위(검색 화면과 같은 단계식 순위)로 상위 N편의 wid 를 가져온다. */
async function topWids(opts: any, n: number): Promise<number[]> {
  const s = buildSearch({ ...opts, limit: 200, offset: 0 });
  const take = async (sql: string, limitPattern: RegExp, limit: number) => {
    if (!limitPattern.test(sql)) throw new Error("검색 SQL 의 LIMIT 형식이 바뀌었습니다(llb-network.ts 확인 필요)");
    const q = noFormat(sql).replace(limitPattern, `LIMIT ${limit}`);
    return (await ch(`SELECT wid FROM (${q}) FORMAT JSONEachRow`, s.params, 110)).map((r) => Number(r.wid));
  };
  let wids: number[];
  if (s.staged) {
    wids = await take(s.stage1, /LIMIT \{off:UInt32\}, \{lim:UInt32\}/, n);
    if (wids.length < n) {
      const more = await take(s.stage2, /LIMIT \{off2:UInt32\}, \{lim2:UInt32\}/, n - wids.length);
      const have = new Set(wids);
      for (const w of more) if (!have.has(w)) wids.push(w);
    }
  } else {
    wids = await take(s.sql, /LIMIT \{off:UInt32\}, \{lim:UInt32\}/, n);
  }
  return wids.slice(0, n);
}

const arr = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : []);

/** wid 목록의 메타데이터(저자·키워드·기관·국가·후원기관·MeSH·개념)를 모은다. 순위는 wids 의 순서. */
async function loadRecords(wids: number[]): Promise<NetRecord[]> {
  if (wids.length === 0) return [];
  const ids = wids.map((w) => Math.trunc(Number(w))).filter((w) => Number.isFinite(w) && w > 0);   // 숫자만 SQL 에 넣는다
  // 게이트웨이는 질의를 URL 항목으로 ClickHouse 에 넘기고, ClickHouse 는 항목 하나를 128 KB 로 제한한다 → wid 목록을 5,000개씩 나눠 읽는다
  const CHUNK = 5000;
  const parts: number[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) parts.push(ids.slice(i, i + CHUNK));
  const rows: any[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    const got = await Promise.all(parts.slice(i, i + 3).map((chunk) => ch(
      `SELECT wid, title, year, cited, journal, author_names, keywords, inst_names, countries, funders, mesh_terms, concepts, fwci_oa, jif
       FROM ${DB}.lit_papers WHERE wid IN (${chunk.join(",")}) FORMAT JSONEachRow`,
      {}, 110,
    )));
    for (const g of got) rows.push(...g);
  }
  const rank = new Map(ids.map((w, i) => [w, i + 1]));
  const seen = new Set<number>();
  const out: NetRecord[] = [];
  for (const r of rows) {
    const wid = Number(r.wid);
    if (seen.has(wid)) continue;         // FINAL 없이 읽으므로 중복 행은 여기서 제거
    seen.add(wid);
    out.push({
      id: `https://openalex.org/W${wid}`, wid, title: String(r.title ?? ""), year: Number(r.year) || 0, cited: Number(r.cited) || 0, journal: String(r.journal ?? ""),
      authors: arr(r.author_names), keywords: arr(r.keywords), institutions: arr(r.inst_names), countries: arr(r.countries), funders: arr(r.funders),
      mesh: arr(r.mesh_terms), concepts: arr(r.concepts), fwci: Number(r.fwci_oa) || 0, jif: Number(r.jif) || 0, rank: rank.get(wid) ?? 1e9,
    });
  }
  return out.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}

interface Sample { at: number; records: NetRecord[]; matched: number | null; lower: boolean; stage: string; ms: number }
const cache = new Map<string, Sample>();
const TTL_MS = 5 * 60_000;

async function sample(opts: any, scope: number): Promise<Sample> {
  const key = JSON.stringify([opts, scope]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  const t0 = Date.now();
  // 전체 일치 편수(검색 화면과 같은 방식·같은 의미) — 1건만 가져오며 total 을 얻는다
  const head = await searchLlb({ ...opts, limit: 1, offset: 0 });
  const wids = await topWids(opts, scope);
  const records = await loadRecords(wids);
  const s: Sample = { at: Date.now(), records, matched: head.total ?? null, lower: !!head.totalIsLowerBound, stage: head.stage ?? "", ms: Date.now() - t0 };
  cache.set(key, s);
  if (cache.size > 8) cache.delete([...cache.keys()][0]);
  return s;
}

/** 표본 논문들의 참고문헌 목록(papers_v2). 질의 항목이 128 KB 를 넘지 않게 1,000편씩 나눠 읽는다 */
async function loadRefs(wids: number[]): Promise<Map<number, number[]>> {
  const out = new Map<number, number[]>();
  for (let i = 0; i < wids.length; i += 1000) {
    const ids = wids.slice(i, i + 1000).map((w) => `'https://openalex.org/W${Math.trunc(Number(w))}'`);
    const rows = await ch(
      `SELECT id, referenced_works FROM ${SRC}.papers_v2 WHERE id IN (${ids.join(",")}) ORDER BY ingested_at DESC LIMIT 1 BY id FORMAT JSONEachRow`, {}, 110,
    );
    for (const r of rows) {
      const w = Number(String(r.id).slice(String(r.id).lastIndexOf("W") + 1));
      out.set(w, (Array.isArray(r.referenced_works) ? r.referenced_works : []).map((x: string) => Number(String(x).slice(String(x).lastIndexOf("W") + 1))).filter((n: number) => n > 0));
    }
  }
  return out;
}

const lastName = (s: string) => { const t = String(s || "").trim(); if (!t) return ""; if (t.includes(",")) return t.split(",")[0].trim(); const p = t.split(/\s+/); return p[p.length - 1]; };

async function cocitationGraph(records: NetRecord[], maxNodes: number): Promise<{ graph: Graph; note?: string }> {
  const use = records.slice(0, 1500);
  const refs = await loadRefs(use.map((r) => r.wid!).filter(Boolean));
  const freq = new Map<number, number>();
  for (const list of refs.values()) for (const w of new Set(list)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 400).map(([w]) => w);
  const labels = new Map<number, { label: string; year: number; cited: number }>();
  for (let i = 0; i < top.length; i += 200) {
    const rows = await ch(`SELECT wid, first_author, year, cited FROM ${DB}.lit_papers WHERE wid IN (${top.slice(i, i + 200).join(",")}) FORMAT JSONEachRow`, {}, 110);
    for (const r of rows) labels.set(Number(r.wid), { label: `${lastName(r.first_author) || "W" + r.wid} ${Number(r.year) || ""}`.trim(), year: Number(r.year) || 0, cited: Number(r.cited) || 0 });
  }
  const graph = buildCocitation(refs, labels, { maxNodes });
  return { graph, note: `공인용은 순위 상위 ${use.length}편의 참고문헌으로 계산했습니다(노드 = 함께 인용된 참고문헌; 표본 밖 논문은 이름이 W번호로 보일 수 있음).` };
}

export interface NetworkResult {
  kind: NetKind; scope: number; matched: number | null; matchedIsLowerBound: boolean; sampleSize: number; ms: number;
  graph: Graph; summary: Summary; note?: string;
}

export interface NetworkResult {
  kind: NetKind; scope: number; matched: number | null; matchedIsLowerBound: boolean; sampleSize: number; ms: number;
  graph: Graph; summary: Summary; note?: string;
  timeline: Period[]; emerging: EmergingResult; entityLabel: string; paperTable: PaperLite[]; nodePapers: Record<string, number[]>;
}

export async function getNetwork(opts: any, kind: NetKind, scope: number, maxNodes = 120): Promise<NetworkResult> {
  const n = Math.min(MAX_SCOPE, Math.max(10, Math.trunc(scope) || 100));
  const s = await sample(opts, n);
  const nodes = Math.min(200, Math.max(20, maxNodes));
  let extra: Parameters<typeof buildGraph>[3] = {};
  let note: string | undefined;
  let graph: Graph;
  if (kind === "cocitation") {
    const c = await cocitationGraph(s.records, nodes);
    graph = c.graph; note = c.note;
  } else {
    if (kind === "citation" || kind === "coupling") {
      // 인용·서지결합은 원본 papers_v2 의 참고문헌 목록을 쓴다 — 상위 200편까지(쌍 비교 비용)
      const wids = s.records.slice(0, 200).map((r) => r.wid!).filter(Boolean);
      const net = await networkLlb(wids);
      extra = {
        citations: (net.citations ?? []).map((c: any) => ({ citing: Number(c.citing), cited: Number(c.cited) })),
        coupling: (net.coupling ?? []).map((c: any) => ({ a: Number(c.a_wid), b: Number(c.b_wid), shared: Number(c.shared_refs) })),
      };
      if (s.records.length > 200) note = `인용·서지결합은 상위 200편으로 계산했습니다(표본 ${s.records.length}편 중).`;
    }
    const records = kind === "citation" || kind === "coupling" ? s.records.slice(0, 200) : s.records;
    graph = buildGraph(records, kind, { maxNodes: nodes }, extra);
  }
  const entityLabel = ENTITY_LABEL[kind] ?? ENTITY_LABEL.default;
  return {
    kind, scope: n, matched: s.matched, matchedIsLowerBound: s.lower, sampleSize: s.records.length, ms: s.ms, graph, summary: summarize(s.records), note,
    timeline: timelineGraphs(s.records, kind, extra), emerging: emergingTerms(s.records, kind), entityLabel,
    paperTable: paperTable(s.records, 300), nodePapers: nodeMembership(s.records, kind, graph.nodes.map((x) => x.id), 300),
  };
}
