import { NextRequest, NextResponse } from "next/server";
import { syncLlbEndpoint } from "@/lib/literature/llb-endpoint";
import { dashboardSection, SECTIONS, type Section } from "@/lib/literature/llb-dashboard";

export const maxDuration = 120;

/**
 * GET /api/scholar/dashboard?q=…&section=trend[&필터]
 *   section: trend impact journal author geo topic_year topic_evo topic_rs topic_map topic_gap funding citation model quality
 *   검색 화면과 같은 순위·필터로 일치한 논문 집합을 집계한다(큰 집합은 SQL 집계, 텍스트·네트워크 분석은 순위 상위 표본).
 */
const cache = new Map<string, { at: number; body: any }>();
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "검색어(q)가 필요합니다." }, { status: 400 });
  const section = (sp.get("section") ?? "trend") as Section;
  if (!SECTIONS.includes(section)) return NextResponse.json({ error: "알 수 없는 section 입니다.", sections: SECTIONS }, { status: 400 });
  const list = (k: string) => (sp.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  const opts = {
    q: q.slice(0, 200), yearFrom: num("yearFrom"), yearTo: num("yearTo"), lang: sp.get("lang") || undefined, indexes: list("indexes"), minJif: num("minJif"),
    jifQuartile: sp.get("jifQuartile") || undefined, oaOnly: sp.get("oaOnly") === "1", hasAbstract: sp.get("hasAbstract") === "1", citableOnly: sp.get("citableOnly") !== "0",
    sort: sp.get("sort") || "relevance", domestic: sp.get("region") === "domestic" ? true : undefined, area: sp.get("area") || undefined, types: list("types"),
  };
  const refYear = num("refYear");
  const key = JSON.stringify([opts, section, refYear]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return NextResponse.json(hit.body);
  try {
    await syncLlbEndpoint();
    const body = await dashboardSection(opts, section, { refYear });
    cache.set(key, { at: Date.now(), body });
    if (cache.size > 30) cache.delete([...cache.keys()][0]);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e).slice(0, 300) }, { status: 502 });
  }
}
