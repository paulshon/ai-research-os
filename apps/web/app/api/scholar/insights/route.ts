import { NextRequest, NextResponse } from "next/server";
import { facetsLlb, networkLlb } from "@/lib/literature/llb-search";
import { syncLlbEndpoint } from "@/lib/literature/llb-endpoint";

/**
 * /api/scholar/insights — LLB 코퍼스 전체(페이지 아님)에 대한 집계·네트워크.
 *   GET ?q=…&(scholar와 같은 필터)   → { years, areas, langs, indexes, oa, total }
 *   GET ?wids=1,2,3                 → { citations, coupling }  (인용·서지결합 그래프)
 * 로컬 ClickHouse가 없으면 503 — 다른 소스로 몰래 대체하지 않는다.
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  await syncLlbEndpoint();
  try {
    const wids = (sp.get("wids") ?? "").split(",").map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, 300);
    if (wids.length) return NextResponse.json({ ok: true, ...(await networkLlb(wids)) });

    const list = (k: string) => (sp.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
    const rows: any[] = await facetsLlb({
      q: (sp.get("q") ?? "").slice(0, 200),
      yearFrom: num("yearFrom"), yearTo: num("yearTo"), lang: sp.get("lang") || undefined,
      indexes: list("indexes"), minJif: num("minJif"), jifQuartile: sp.get("jifQuartile") || undefined,
      oaOnly: sp.get("oaOnly") === "1", citableOnly: sp.get("citableOnly") !== "0",
      domestic: sp.get("region") === "domestic" ? true : undefined, area: sp.get("area") || undefined,
    });
    const by = (key: string, pick: (r: any) => string | number) => {
      const m = new Map<string | number, { n: number; cited: number }>();
      for (const r of rows) {
        const k = pick(r); const e = m.get(k) ?? { n: 0, cited: 0 };
        e.n += Number(r.n); e.cited += Number(r.cited_sum); m.set(k, e);
      }
      return [...m.entries()].map(([k, v]) => ({ [key]: k, ...v }));
    };
    const total = rows.reduce((p, r) => p + Number(r.n), 0);
    // 연도별 상세(논문 수·인용 합·OA·색인별 편수): 추세 그래프용. 이미 가져온 집계 행에서 계산하므로 추가 질의가 없다.
    const yearly = new Map<number, { year: number; n: number; cited: number; oa: number; sci: number; scopus: number; kci: number }>();
    for (const r of rows) {
      const y = Number(r.year); const n = Number(r.n);
      const e = yearly.get(y) ?? { year: y, n: 0, cited: 0, oa: 0, sci: 0, scopus: 0, kci: 0 };
      e.n += n; e.cited += Number(r.cited_sum);
      if (Number(r.is_oa)) e.oa += n;
      if (Number(r.sci)) e.sci += n;
      if (Number(r.scopus)) e.scopus += n;
      if (Number(r.kci)) e.kci += n;
      yearly.set(y, e);
    }
    return NextResponse.json({
      ok: true, total,
      yearly: [...yearly.values()].sort((a, b) => a.year - b.year),
      years: (by("year", (r) => r.year) as any[]).sort((a, b) => a.year - b.year),
      areas: (by("area", (r) => r.area) as any[]).sort((a, b) => b.n - a.n),
      langs: (by("lang", (r) => r.lang) as any[]).sort((a, b) => b.n - a.n).slice(0, 8),
      indexes: [
        { key: "SCI(E)/SSCI", n: rows.filter((r) => Number(r.sci)).reduce((p, r) => p + Number(r.n), 0) },
        { key: "Scopus", n: rows.filter((r) => Number(r.scopus)).reduce((p, r) => p + Number(r.n), 0) },
        { key: "KCI", n: rows.filter((r) => Number(r.kci)).reduce((p, r) => p + Number(r.n), 0) },
      ],
      oa: { open: rows.filter((r) => Number(r.is_oa)).reduce((p, r) => p + Number(r.n), 0), total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, { status: 503 });
  }
}
