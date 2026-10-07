import { NextRequest, NextResponse } from "next/server";
import { syncLlbEndpoint } from "@/lib/literature/llb-endpoint";
import { getNetwork, MAX_SCOPE } from "@/lib/literature/llb-network";
import { NET_KINDS, type NetKind } from "@/lib/literature/network-graph";

// 상위 1만 편을 모으는 질의는 흔한 단어에서 수십 초가 걸릴 수 있다.
export const maxDuration = 120;

/**
 * GET /api/scholar/network?q=…&kind=coauthor&scope=100[&yearFrom=&yearTo=&lang=&indexes=&minJif=&jifQuartile=&oaOnly=1&hasAbstract=1&area=&types=]
 *   scope: 분석할 상위 편수(40·100·200·500·1000·5000·15000). 검색 화면과 같은 순위·같은 필터.
 *   응답: 전체 일치 편수(matched), 실제 분석한 편수(sampleSize), 노드·엣지, 표본 요약(summary).
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "검색어(q)가 필요합니다." }, { status: 400 });
  const kind = (sp.get("kind") ?? "coauthor") as NetKind;
  if (!NET_KINDS.some((k) => k.id === kind)) return NextResponse.json({ error: "알 수 없는 네트워크 종류입니다.", kinds: NET_KINDS.map((k) => k.id) }, { status: 400 });
  const scope = Math.min(MAX_SCOPE, Math.max(10, parseInt(sp.get("scope") ?? "100", 10) || 100));
  const maxNodes = Math.min(200, Math.max(20, parseInt(sp.get("maxNodes") ?? "120", 10) || 120));

  const list = (k: string) => (sp.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  const opts = {
    q: q.slice(0, 200),
    yearFrom: num("yearFrom"), yearTo: num("yearTo"), lang: sp.get("lang") || undefined, indexes: list("indexes"),
    minJif: num("minJif"), jifQuartile: sp.get("jifQuartile") || undefined, oaOnly: sp.get("oaOnly") === "1", hasAbstract: sp.get("hasAbstract") === "1",
    citableOnly: sp.get("citableOnly") !== "0", sort: sp.get("sort") || "relevance",
    domestic: sp.get("region") === "domestic" ? true : undefined, area: sp.get("area") || undefined, types: list("types"),
  };
  try {
    await syncLlbEndpoint();
    const r = await getNetwork(opts, kind, scope, maxNodes);
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e).slice(0, 300) }, { status: 502 });
  }
}
