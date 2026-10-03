import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * POST /api/scholar/affiliations  { ids: ["W123…"], dois: ["10.1234/abc"] }
 *   → { ok, works: [{ id, doi, authors: [{ n, i, inst: [{ n, id, c, t }] }], topic: { n, f } }] }
 *
 * 검색 결과 논문의 저자·소속(대학·단체)·주제를 OpenAlex 에서 한 번에 가져온다(최대 50편).
 * LLB 의 lit_papers 표에는 기관 정보가 없고(국가 코드만 있음) L1 결과도 저자 이름만 있어서 따로 조회한다.
 * 사용자가 보낸 값은 형식이 맞는 W-ID/DOI 만 통과시키고, 호출 대상은 api.openalex.org 로 고정된다.
 */

type Inst = { n: string; id: string; c: string; t: string };
type Author = { n: string; i: string; inst: Inst[] };
type Work = { id: string; doi: string; authors: Author[]; topic: { n: string; f: string } | null };

const CACHE = new Map<string, { at: number; works: Work[] }>();
const TTL_MS = 30 * 60 * 1000;
const MAILTO = "ai-research-os@example.com";

function slim(w: any): Work {
  const authors: Author[] = (w.authorships ?? []).slice(0, 12).map((a: any) => ({
    n: String(a.author?.display_name ?? ""),
    i: String(a.author?.id ?? "").split("/").pop() ?? "",
    inst: (a.institutions ?? []).slice(0, 2).map((x: any) => ({
      n: String(x.display_name ?? ""), id: String(x.id ?? "").split("/").pop() ?? "", c: String(x.country_code ?? ""), t: String(x.type ?? ""),
    })).filter((x: Inst) => x.n),
  })).filter((a: Author) => a.n);
  const pt = w.primary_topic;
  return {
    id: String(w.id ?? "").split("/").pop() ?? "",
    doi: String(w.doi ?? "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").toLowerCase(),
    authors,
    topic: pt?.display_name ? { n: String(pt.display_name), f: String(pt.field?.display_name ?? "") } : null,
  };
}

async function fetchBatch(filter: string): Promise<Work[]> {
  const url = `https://api.openalex.org/works?filter=${filter}&per-page=50&select=id,doi,authorships,primary_topic&mailto=${MAILTO}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map(slim);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids: string[] = [...new Set<string>((Array.isArray(body.ids) ? body.ids : []).map(String).filter((x: string) => /^W\d{3,}$/.test(x)))].slice(0, 50);
  const dois: string[] = [...new Set<string>((Array.isArray(body.dois) ? body.dois : [])
    .map((d: any) => String(d).trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, ""))
    .filter((d: string) => /^10\.\d{4,9}\/[^\s|,]+$/.test(d)))].slice(0, 50);
  if (!ids.length && !dois.length) return NextResponse.json({ ok: true, works: [] });

  const key = `${ids.slice().sort().join(",")}#${dois.slice().sort().join(",")}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ ok: true, works: hit.works, cached: true });

  try {
    const [a, b] = await Promise.all([
      ids.length ? fetchBatch(`openalex:${ids.join("|")}`) : Promise.resolve([] as Work[]),
      dois.length ? fetchBatch(`doi:${dois.map(encodeURIComponent).join("|")}`) : Promise.resolve([] as Work[]),
    ]);
    const seen = new Set<string>();
    const works = [...a, ...b].filter((w) => (w.id && !seen.has(w.id) ? (seen.add(w.id), true) : false));
    if (CACHE.size > 200) CACHE.clear();
    CACHE.set(key, { at: Date.now(), works });
    return NextResponse.json({ ok: true, works });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, { status: 502 });
  }
}
