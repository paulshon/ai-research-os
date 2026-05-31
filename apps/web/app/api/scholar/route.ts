import { NextRequest, NextResponse } from "next/server";

/**
 * /api/scholar — 실제 학술 메타데이터 검색 API (v9)
 *
 * 100% 실제 데이터. Gemini 불사용.
 *
 * 해외 검색:
 *  - OpenAlex (무료, 키 불필요) — 가장 방대한 학술 메타DB
 *  - CrossRef (무료, 키 불필요) — DOI 기반 정확한 메타데이터
 *  - Semantic Scholar (무료, 키 불필요) — AI/CS 강점
 *
 * 국내 검색:
 *  - OpenAlex에서 한국 기관/저널 필터 (한국 논문도 DOI 있으면 등록됨)
 *  - CrossRef에서 한국 저널 검색
 *  - KCI Open API (한국연구재단 공식 API, 키 설정 시 활성화)
 *
 * 한국 학술 DB 현황 (2024 기준):
 *  RISS, DBpia, KISS, 교보스콜라, 코리아스칼라 → 공개 REST API 없음 (웹 전용)
 *  KCI → 공식 Open API 있음 (API 키 필요)
 *  KoreaScience → 공개 API 없음
 *  OAK → OAI-PMH 프로토콜 (별도 구현 필요)
 *  KOSSDA, KSDC, KRpia → 데이터/통계 DB (논문검색 아님)
 *  KIPRIS, WIPS ON → 특허 DB (별도 구현)
 *
 * → 국내 논문 중 DOI가 있는 논문은 OpenAlex/CrossRef에서 검색 가능
 * → KCI API 키를 설정하면 KCI 등재 논문 직접 검색 가능
 * → DOI가 없는 순수 국내 학위논문 등은 RISS 웹사이트 링크로 안내
 */

interface PaperResult {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  journal: string;
  abstract: string;
  doi: string;
  url: string;
  citations: number;
  keywords: string[];
  source: string;
  similarity: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OpenAlex — 세계 최대 무료 학술 메타DB (2억+ 논문)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchOpenAlex(
  query: string,
  perPage: number,
  filter?: string,
): Promise<PaperResult[]> {
  let url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${perPage}&sort=relevance_score:desc&mailto=ai-research-os@example.com`;
  if (filter) url += `&filter=${filter}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results ?? []).map((w: any, i: number) => {
    const rawDoi = w.doi ?? "";
    const doi = rawDoi.replace("https://doi.org/", "");
    const landingPage = w.primary_location?.landing_page_url;
    return {
      id: `openalex_${i}_${w.id?.split("/").pop() ?? i}`,
      title: w.title ?? "Untitled",
      authors: (w.authorships ?? [])
        .slice(0, 6)
        .map((a: any) => a.author?.display_name ?? "")
        .filter(Boolean)
        .join(", ") || "Unknown",
      year: w.publication_year ?? null,
      journal:
        w.primary_location?.source?.display_name ??
        w.host_venue?.display_name ?? "",
      abstract: reconstructAbstract(w.abstract_inverted_index),
      doi,
      url: rawDoi || landingPage || `https://openalex.org/works/${w.id?.split("/").pop()}`,
      citations: w.cited_by_count ?? 0,
      keywords: (w.keywords ?? []).slice(0, 5).map((k: any) =>
        typeof k === "string" ? k : k.display_name ?? "",
      ),
      source: "OpenAlex",
      similarity: w.relevance_score
        ? Math.min(0.99, Math.max(0.5, w.relevance_score / 150))
        : 0.7 - i * 0.005,
    };
  });
}

function reconstructAbstract(
  inv: Record<string, number[]> | null | undefined,
): string {
  if (!inv) return "";
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words
    .map((w) => w[1])
    .join(" ")
    .slice(0, 600);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CrossRef — DOI 기반 세계 표준 메타데이터
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchCrossRef(query: string, rows: number): Promise<PaperResult[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&sort=relevance&order=desc&mailto=ai-research-os@example.com`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.message?.items ?? []).map((w: any, i: number) => {
    const doi = w.DOI ?? "";
    const title = Array.isArray(w.title) ? w.title[0] : w.title ?? "Untitled";
    return {
      id: `crossref_${i}_${doi.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`,
      title,
      authors: (w.author ?? [])
        .slice(0, 6)
        .map((a: any) => `${a.given ?? ""} ${a.family ?? ""}`.trim())
        .filter(Boolean)
        .join(", ") || "Unknown",
      year:
        w.published?.["date-parts"]?.[0]?.[0] ??
        w["published-print"]?.["date-parts"]?.[0]?.[0] ?? null,
      journal: Array.isArray(w["container-title"])
        ? w["container-title"][0]
        : w["container-title"] ?? "",
      abstract: (w.abstract ?? "").replace(/<[^>]+>/g, "").slice(0, 600),
      doi,
      url: `https://doi.org/${doi}`,
      citations: w["is-referenced-by-count"] ?? 0,
      keywords: (w.subject ?? []).slice(0, 5),
      source: "CrossRef",
      similarity: w.score
        ? Math.min(0.99, Math.max(0.5, w.score / 100))
        : 0.7 - i * 0.005,
    };
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Semantic Scholar — AI/CS 분야 강점 (2억+ 논문)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchSemanticScholar(
  query: string,
  limit: number,
): Promise<PaperResult[]> {
  const fields = "title,authors,year,venue,abstract,externalIds,citationCount,s2FieldsOfStudy,url,openAccessPdf";
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.data ?? []).map((w: any, i: number) => {
    const doi = w.externalIds?.DOI ?? "";
    const pdfUrl = w.openAccessPdf?.url;
    return {
      id: `s2_${i}_${w.paperId?.slice(0, 10) ?? i}`,
      title: w.title ?? "Untitled",
      authors: (w.authors ?? [])
        .slice(0, 6)
        .map((a: any) => a.name ?? "")
        .filter(Boolean)
        .join(", ") || "Unknown",
      year: w.year ?? null,
      journal: w.venue ?? "",
      abstract: (w.abstract ?? "").slice(0, 600),
      doi,
      url: doi
        ? `https://doi.org/${doi}`
        : pdfUrl ?? w.url ?? `https://www.semanticscholar.org/paper/${w.paperId}`,
      citations: w.citationCount ?? 0,
      keywords: (w.s2FieldsOfStudy ?? [])
        .slice(0, 5)
        .map((f: any) => f.category ?? ""),
      source: "Semantic Scholar",
      similarity: 0.88 - i * 0.008,
    };
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KCI Open API — 한국연구재단 공식 API (API 키 필요)
// https://open.kci.go.kr
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchKCI(
  query: string,
  apiKey: string,
  displayCount: number,
): Promise<PaperResult[]> {
  if (!apiKey) return [];
  const url = `https://open.kci.go.kr/po/openapi/openApiSearch.kci?apiCode=articleSearch&key=${apiKey}&title=${encodeURIComponent(query)}&displayCount=${displayCount}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const text = await res.text();
    // KCI returns XML — parse it
    return parseKCIXml(text);
  } catch {
    return [];
  }
}

function parseKCIXml(xml: string): PaperResult[] {
  const results: PaperResult[] = [];
  // Simple regex-based XML parsing for <record> elements
  const records = xml.match(/<record>[\s\S]*?<\/record>/g) ?? [];
  records.forEach((rec, i) => {
    const get = (tag: string) => {
      const m = rec.match(new RegExp(`<${tag}><!\\[CDATA\\[([^]*?)\\]\\]><\\/${tag}>|<${tag}>([^<]*)<\\/${tag}>`));
      return m ? (m[1] ?? m[2] ?? "").trim() : "";
    };
    const articleId = get("articleId");
    const title = get("title") || get("titleEng") || "Untitled";
    const authors = get("author") || get("authorEng") || "Unknown";
    const journal = get("journalTitle") || get("journalTitleEng") || "";
    const year = parseInt(get("pubYear")) || null;
    const doi = get("doi");
    const kciUrl = articleId
      ? `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${articleId}`
      : "";

    if (title && title !== "Untitled") {
      results.push({
        id: `kci_${i}_${articleId || i}`,
        title,
        authors,
        year,
        journal,
        abstract: get("abstract") || get("abstractEng") || "",
        doi,
        url: doi ? `https://doi.org/${doi}` : kciUrl,
        citations: 0,
        keywords: [],
        source: "KCI",
        similarity: 0.85 - i * 0.005,
      });
    }
  });
  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유틸리티
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function dedup(results: PaperResult[]): PaperResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    // DOI 기준 중복 제거
    if (r.doi) {
      const key = r.doi.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
    }
    // 제목 기준 유사 중복 제거
    const titleKey = r.title.toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 40);
    if (titleKey.length > 5 && seen.has(`t_${titleKey}`)) return false;
    if (titleKey.length > 5) seen.add(`t_${titleKey}`);
    return true;
  });
}

function isKorean(paper: PaperResult): boolean {
  const text = `${paper.title} ${paper.authors} ${paper.journal}`;
  if (/[\uAC00-\uD7AF]/.test(text)) return true;
  const koPattern =
    /\bkorea[n]?\b|\bkci\b|\briss\b|\bdbpia\b|대한|학회|연구|한국|서울|부산|대구|인천|광주|대전|학교/i;
  if (koPattern.test(text)) return true;
  // 한국 기관 affiliation 체크 (OpenAlex)
  if (paper.source === "OpenAlex" && koPattern.test(text)) return true;
  return false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const region = searchParams.get("region") ?? "all";
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "30", 10));

  if (!query) {
    return NextResponse.json({ results: [], total: 0 });
  }

  // KCI API 키 (환경변수 또는 쿼리에서)
  const kciKey = process.env.KCI_API_KEY ?? searchParams.get("kciKey") ?? "";

  try {
    let allResults: PaperResult[] = [];
    const activeSources: string[] = [];

    if (region === "domestic") {
      // ── 국내 검색 ──
      // 전략: OpenAlex 한국 필터 + CrossRef 한국어 쿼리 + KCI API
      const koQuery = /[\uAC00-\uD7AF]/.test(query) ? query : query;
      const koFilter = "institutions.country_code:KR";

      const promises: Promise<PaperResult[]>[] = [
        searchOpenAlex(koQuery, limit, koFilter),
        searchOpenAlex(query + " Korea", limit),
        searchCrossRef(koQuery + " Korea Korean", limit),
      ];
      if (kciKey) promises.push(searchKCI(query, kciKey, limit));

      const settled = await Promise.allSettled(promises);
      for (const r of settled) {
        if (r.status === "fulfilled") allResults.push(...r.value);
      }

      // 한국 논문만 필터 (KCI 결과는 이미 한국 것이므로 source=KCI는 유지)
      allResults = allResults.filter(
        (p) => p.source === "KCI" || isKorean(p),
      );

      activeSources.push("OpenAlex (KR filter)", "CrossRef");
      if (kciKey) activeSources.push("KCI");

      // 국내 논문에 RISS 검색 링크 안내 추가 (0건이면)
      if (allResults.length === 0) {
        allResults.push({
          id: "riss_link",
          title: `RISS에서 "${query}" 직접 검색하기`,
          authors: "RISS (학술연구정보서비스)",
          year: null,
          journal: "KERIS",
          abstract: "DOI가 없는 국내 학위논문, 학술지 논문은 RISS에서 직접 검색할 수 있습니다. 클릭하면 RISS 검색 페이지로 이동합니다.",
          doi: "",
          url: `https://www.riss.kr/search/Search.do?isDetailSearch=N&searchGubun=true&viewYn=OP&queryText=&strQuery=${encodeURIComponent(query)}&exQuery=&exQueryText=&order=%2FDESC&onHanja=false&strSort=RANK&p_year1=&p_year2=&iStartCount=0&orderBy=&mat_type=&mat_subtype=&fulltext_kind=&t_gubun=&learning_type=&ccl_code=&inside_outside=&fric_yn=&image_yn=&gubun=&kdc=&ttsUseYn=`,
          citations: 0,
          keywords: [],
          source: "RISS (직접검색)",
          similarity: 0.99,
        });
      }
    } else if (region === "international") {
      // ── 해외 검색 ──
      const [oa, cr, s2] = await Promise.allSettled([
        searchOpenAlex(query, limit),
        searchCrossRef(query, limit),
        searchSemanticScholar(query, limit),
      ]);
      if (oa.status === "fulfilled") allResults.push(...oa.value);
      if (cr.status === "fulfilled") allResults.push(...cr.value);
      if (s2.status === "fulfilled") allResults.push(...s2.value);

      // 한국 논문 제외
      allResults = allResults.filter((p) => !isKorean(p));
      activeSources.push("OpenAlex", "CrossRef", "Semantic Scholar");
    } else {
      // ── 전체 ──
      const [oa, cr, s2] = await Promise.allSettled([
        searchOpenAlex(query, limit),
        searchCrossRef(query, limit),
        searchSemanticScholar(query, limit),
      ]);
      if (oa.status === "fulfilled") allResults.push(...oa.value);
      if (cr.status === "fulfilled") allResults.push(...cr.value);
      if (s2.status === "fulfilled") allResults.push(...s2.value);
      activeSources.push("OpenAlex", "CrossRef", "Semantic Scholar");
    }

    // 중복 제거 → similarity 내림차순
    allResults = dedup(allResults);
    allResults.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({
      results: allResults,
      total: allResults.length,
      sources: activeSources,
      region,
      note: region === "domestic"
        ? "국내 논문 중 DOI가 있는 논문은 OpenAlex/CrossRef에서 검색됩니다. RISS, DBpia 등은 공개 API가 없어 직접 검색 링크를 제공합니다."
        : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { results: [], total: 0, error: error?.message ?? "검색 중 오류" },
      { status: 500 },
    );
  }
}
