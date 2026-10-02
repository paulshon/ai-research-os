// LLB 적재 상태: openalex.lit_papers 가 원본(papers_v2)의 몇 %까지 채워졌는지, 지금 적재(INSERT)가 돌고 있는지.
// 행 수는 system.tables.total_rows(메모리의 메타데이터) 로 읽는다 — count() 를 돌리지 않으므로 적재·검색 중인 서버에 부하를 주지 않는다.
// 생성 파일(llb-search.ts)과 분리: 생성기를 다시 돌려도 지워지지 않는다.

const DB = (process.env.LLB_DB || "openalex").replace(/[^\w]/g, "");
const SRC = (process.env.LLB_SRC_DB || "openalex").replace(/[^\w]/g, "");

export interface LlbStatus {
  /** ClickHouse 에 닿았는가. 응답이 늦기만 한 경우(slow)는 true 로 두고 마지막 정상값을 돌려준다. */
  connected: boolean;
  /** 서버가 바빠 이번 조회가 시간 안에 끝나지 못함(연결 실패와 다르다) */
  slow: boolean;
  servedRows: number;
  sourceRows: number;
  /** 0~100, 서빙 표 / 원본. 원본이 0이면 null */
  percent: number | null;
  loading: boolean;
  activeInserts: number;
  activeMerges: number;
  /** 적재 완료로 볼 수 있는가(적재 중이 아니고 90% 이상) */
  complete: boolean;
  error?: string;
}

async function chRows(sql: string, params: Record<string, string>, signal: AbortSignal): Promise<any[]> {
  const url = new URL(process.env.CLICKHOUSE_URL || "http://127.0.0.1:8123");
  url.searchParams.set("query", sql + " FORMAT JSONEachRow");
  url.searchParams.set("max_execution_time", "10");
  for (const [k, v] of Object.entries(params)) url.searchParams.set("param_" + k, v);
  const headers: Record<string, string> = {};
  if (process.env.CLICKHOUSE_USER) {
    headers["Authorization"] =
      "Basic " + Buffer.from(process.env.CLICKHOUSE_USER + ":" + (process.env.CLICKHOUSE_PASSWORD || "")).toString("base64");
  }
  const res = await fetch(url, { method: "POST", headers, signal });
  const text = await res.text();
  if (!res.ok) throw new Error("ClickHouse " + res.status + ": " + text.slice(0, 200));
  return text.trim() ? text.trim().split("\n").map((l) => JSON.parse(l)) : [];
}

let last: LlbStatus | null = null;

export async function statusLlb(): Promise<LlbStatus> {
  const signal = AbortSignal.timeout(12000);
  try {
    const [tables, procs, merges] = await Promise.all([
      chRows(
        `SELECT name, total_rows FROM system.tables WHERE (database = {db:String} AND name = 'lit_papers') OR (database = {src:String} AND name = 'papers_v2')`,
        { db: DB, src: SRC }, signal,
      ),
      chRows(
        `SELECT count() AS n FROM system.processes WHERE query_kind = 'Insert' AND positionCaseInsensitive(query, 'lit_papers') > 0`,
        {}, signal,
      ),
      chRows(`SELECT count() AS n FROM system.merges WHERE database = {db:String} AND table = 'lit_papers'`, { db: DB }, signal),
    ]);
    const rows = (name: string) => Number(tables.find((t) => t.name === name)?.total_rows ?? 0);
    const servedRows = rows("lit_papers");
    const sourceRows = rows("papers_v2");
    const activeInserts = Number(procs[0]?.n ?? 0);
    const percent = sourceRows > 0 ? Math.min(100, (servedRows / sourceRows) * 100) : null;
    const loading = activeInserts > 0;
    last = {
      connected: true, slow: false, servedRows, sourceRows, percent, loading, activeInserts,
      activeMerges: Number(merges[0]?.n ?? 0),
      complete: !loading && percent !== null && percent >= 90,
    };
    return last;
  } catch (e: any) {
    const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
    // 늦은 것뿐이면 연결은 된 것 — 마지막 정상값을 유지하고 slow 만 켠다.
    if (timedOut && last) return { ...last, slow: true };
    return {
      connected: timedOut, slow: timedOut, servedRows: 0, sourceRows: 0, percent: null, loading: false,
      activeInserts: 0, activeMerges: 0, complete: false, error: String(e?.message ?? e).slice(0, 200),
    };
  }
}
