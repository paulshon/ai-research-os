/**
 * LLB 게이트웨이 주소를 Supabase 의 llb_endpoint 표에서 읽어 온다.
 *
 * 임시 터널(trycloudflare)은 켤 때마다 주소가 바뀐다. scripts/llb-start.ps1 이 새 주소를 이 표에 기록하므로
 * Vercel 환경변수(CLICKHOUSE_URL)를 고치거나 재배포할 필요가 없다.
 * 읽기에 실패하면(표 없음·Supabase 장애) 환경변수 CLICKHOUSE_URL 을 그대로 쓴다.
 */
const TTL_MS = 30_000;
let cache: { url: string; at: number } | null = null;

/** process.env.CLICKHOUSE_URL 을 최신 터널 주소로 맞춘다. llb-search/llb-status 가 그 값을 읽는다. */
export async function syncLlbEndpoint(force = false): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return;
  if (!force && cache && Date.now() - cache.at < TTL_MS) {
    process.env.CLICKHOUSE_URL = cache.url;
    return;
  }
  try {
    const res = await fetch(`${base}/rest/v1/llb_endpoint?id=eq.current&select=url`, {
      // 새 sb_secret_ 키는 apikey 헤더만 허용, 예전 JWT 키(eyJ...)는 Bearer 도 함께 보낸다.
      headers: key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return;
    const rows = (await res.json()) as { url?: string }[];
    const url = rows[0]?.url;
    if (url && /^https?:\/\//.test(url)) {
      cache = { url, at: Date.now() };
      process.env.CLICKHOUSE_URL = url;
    }
  } catch {
    /* 환경변수 값으로 계속 */
  }
}
