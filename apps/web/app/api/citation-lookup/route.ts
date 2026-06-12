import { NextRequest, NextResponse } from "next/server";
import {
  extractDOIs,
  isValidDOI,
  getCrossRefUrl,
  getOpenAlexUrl,
  getSemanticScholarUrl,
  parseCrossRefResponse,
  parseOpenAlexResponse,
  computeConfidenceScore,
  type CanonicalCitation,
} from "@ai-research-os/citation-core";

/**
 * /api/citation-lookup — DOI-우선 서지정보 조회 (Issue 2/6)
 *
 * [개선된 파이프라인]
 *   Step 0: 입력 텍스트에서 DOI 추출 (최우선)
 *           - 정규식으로 10.xxxx/xxx 패턴 탐색
 *           - DOI URL(https://doi.org/...) 포함
 *   Step 3: DOI 발견 시 → Crossref 조회 (confidence 95%)
 *   Step 4: 실패 시 OpenAlex → Semantic Scholar 순차 시도
 *   Step 5: 모두 실패 시 에러 반환 (UI에서 수동 입력 안내)
 *
 * 핵심: DOI 하나만 맞으면 저널 형식과 무관하게 완전한 표준 메타데이터 보장.
 *       Crossref에는 Elsevier/Springer/IEEE/Nature 등 모든 주요 출판사 메타데이터가
 *       표준화되어 있음.
 *
 * RIS / BibTeX 텍스트를 붙여넣어도 그 안의 DOI를 추출하여 조회한다.
 */

const now = () => new Date().toISOString();

function emptyCitation(doi: string): CanonicalCitation {
  return {
    id: `cite-${Date.now()}`,
    type: "journal-article",
    title: "",
    authors: [],
    year: 0,
    doi,
    keywords: [],
    language: "en",
    confidence: 0,
    doiVerified: false,
    crossrefMatched: false,
    userOverridden: false,
    metadataSource: "parsed",
    createdAt: now(),
    updatedAt: now(),
  };
}

async function lookupCrossref(doi: string): Promise<Partial<CanonicalCitation> | null> {
  try {
    const res = await fetch(getCrossRefUrl(doi), {
      headers: { "User-Agent": "ai-research-os/1.0 (mailto:ai-research-os@example.com)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseCrossRefResponse(data);
  } catch {
    return null;
  }
}

async function lookupOpenAlex(doi: string): Promise<Partial<CanonicalCitation> | null> {
  try {
    const res = await fetch(getOpenAlexUrl(doi), { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const data = await res.json();
    return parseOpenAlexResponse(data);
  } catch {
    return null;
  }
}

async function lookupSemanticScholar(doi: string): Promise<Partial<CanonicalCitation> | null> {
  try {
    const res = await fetch(getSemanticScholarUrl(doi), { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || !d.title) return null;
    const authors = (d.authors ?? []).map((a: { name?: string }) => {
      const parts = (a.name ?? "").trim().split(/\s+/);
      const family = parts.pop() ?? "";
      const given = parts.join(" ");
      return { given, family, fullName: a.name };
    });
    return {
      title: d.title ?? "",
      authors,
      year: d.year ?? 0,
      journal: d.journal?.name ?? undefined,
      doi,
      abstract: d.abstract ?? undefined,
      type: "journal-article",
      language: "en",
      metadataSource: "semantic_scholar",
      doiVerified: true,
      crossrefMatched: false,
      confidence: 75,
    };
  } catch {
    return null;
  }
}

/**
 * DOI-우선 메타데이터 해석
 */
async function resolveByDOI(doi: string): Promise<{ citation: CanonicalCitation; source: string } | null> {
  // Step 3: Crossref (가장 표준화·신뢰도 높음)
  let partial = await lookupCrossref(doi);
  let source = "crossref";

  // Step 4: OpenAlex → Semantic Scholar 순차 폴백
  if (!partial || !partial.title) {
    partial = await lookupOpenAlex(doi);
    source = "openalex";
  }
  if (!partial || !partial.title) {
    partial = await lookupSemanticScholar(doi);
    source = "semantic_scholar";
  }
  if (!partial || !partial.title) return null;

  const base = emptyCitation(doi);
  const merged: CanonicalCitation = {
    ...base,
    ...partial,
    doi,
    keywords: partial.keywords ?? [],
    authors: partial.authors ?? [],
    updatedAt: now(),
  } as CanonicalCitation;

  const conf = computeConfidenceScore(merged);
  merged.confidence = conf.total;

  return { citation: merged, source };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawInput: string = (body.input ?? body.doi ?? body.text ?? "").toString();

    if (!rawInput.trim()) {
      return NextResponse.json({ ok: false, error: "DOI 또는 서지정보 텍스트를 입력하세요." }, { status: 400 });
    }

    // Step 0: DOI 추출 (최우선). 입력이 RIS/BibTeX여도 내부 DOI를 찾아낸다.
    let doi = rawInput.trim();
    if (!isValidDOI(doi)) {
      const found = extractDOIs(rawInput);
      doi = found[0] ?? "";
    }
    // doi.org URL이 그대로 들어온 경우 정리
    doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/[.,;)\]]+$/, "");

    if (!doi || !isValidDOI(doi)) {
      return NextResponse.json({
        ok: false,
        error: "유효한 DOI를 찾지 못했습니다. 10.XXXX/... 형식의 DOI를 입력하거나, DOI가 포함된 서지정보를 붙여넣으세요.",
        needsManual: true,
      }, { status: 422 });
    }

    const resolved = await resolveByDOI(doi);
    if (!resolved) {
      return NextResponse.json({
        ok: false,
        error: `DOI(${doi})에 대한 메타데이터를 Crossref/OpenAlex/Semantic Scholar에서 찾지 못했습니다.`,
        doi,
        needsManual: true,
      }, { status: 404 });
    }

    return NextResponse.json({ ok: true, citation: resolved.citation, source: resolved.source });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "조회 중 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
