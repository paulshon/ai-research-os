/**
 * Citation Bridge — apa-utils(RefEntry) ↔ Citation Core v2.0
 * AI Research OS v19
 *
 * 역할:
 *   - 기존 RefEntry(로컬 UI 모델)를 Citation Core v2.0의 CanonicalCitation으로 변환
 *   - APA 외 MLA/Chicago/IEEE/Vancouver/Harvard/Nature 다중 스타일 렌더링
 *   - UODE 엔진으로 PDF 외 포맷(DOCX/HWP/HWPX 등)에서도 참고문헌 추출
 */

import {
  CanonicalCitation,
  CitationFormat,
  formatCitation,
  formatInTextCitation,
  computeConfidenceScore,
  CITATION_STYLE_META,
  parseBibliographicText,
  toCanonicalCitation,
} from "@ai-research-os/citation-core";
import { processDocument, isSupportedFile } from "@/lib/uode";
import {
  RefEntry,
  RefAuthor,
  parsePDFAsOnePaper,
  extractPDFText,
} from "./apa-utils";
import { parseScholarlyFields, scholarlyToRefEntry } from "./scholarly-parser";

/** 지원 인용 스타일 메타 (UI 셀렉터용) */
export const CITATION_STYLES = CITATION_STYLE_META;
export type { CitationFormat };

/** RefAuthor → CanonicalCitation author */
function toCanonicalAuthors(authors: RefAuthor[]) {
  return authors.map((a) => ({
    given: a.first || a.initials || "",
    family: a.last,
    fullName: a.full || a.last,
  }));
}

/** RefEntry → CanonicalCitation (Citation Core v2.0) */
export function refEntryToCanonical(ref: RefEntry): CanonicalCitation {
  const year = parseInt(ref.year, 10) || 0;
  const base = {
    doi: ref.doi || undefined,
    title: ref.title,
    year,
    journal: ref.journal || undefined,
    authors: toCanonicalAuthors(ref.authors),
    volume: ref.volume || undefined,
    pages: ref.pages || undefined,
    doiVerified: false,
    crossrefMatched: false,
    metadataSource: "parsed" as const,
  };
  const conf = computeConfidenceScore(base);
  const now = new Date().toISOString();

  return {
    id: ref.id,
    type:
      ref.type === "journal"
        ? "journal-article"
        : ref.type === "book"
        ? "book"
        : "unknown",
    title: ref.title,
    authors: toCanonicalAuthors(ref.authors),
    journal: ref.journal || undefined,
    publisher: ref.publisher || undefined,
    year,
    volume: ref.volume || undefined,
    issue: ref.issue || undefined,
    pages: ref.pages || undefined,
    doi: ref.doi || undefined,
    url: ref.url || undefined,
    keywords: [],
    language: ref.authors.some((a) => a.isKorean) ? "ko" : "en",
    rawText: ref.raw || undefined,
    confidence: conf.total,
    doiVerified: false,
    crossrefMatched: false,
    userOverridden: false,
    metadataSource: "parsed",
    createdAt: now,
    updatedAt: now,
  };
}

/** 특정 스타일의 참고문헌(bibliography) 항목 문자열 */
export function renderReference(
  ref: RefEntry,
  style: CitationFormat = "apa7"
): string {
  return formatCitation(refEntryToCanonical(ref), style);
}

/** 특정 스타일의 본문 내 인용(in-text) 문자열 */
export function renderInText(
  ref: RefEntry,
  style: CitationFormat = "apa7",
  opts?: { narrative?: boolean; page?: string }
): string {
  return formatInTextCitation(
    [refEntryToCanonical(ref)],
    style,
    opts?.narrative ? "narrative" : "parenthetical",
    opts?.page
  );
}

/** 여러 참고문헌을 한 스타일로 정렬·렌더 */
export function renderBibliography(
  refs: RefEntry[],
  style: CitationFormat = "apa7"
): string {
  const sorted = [...refs].sort((a, b) => {
    const la = (a.authors?.[0]?.last || a.title || "").toLowerCase();
    const lb = (b.authors?.[0]?.last || b.title || "").toLowerCase();
    return la.localeCompare(lb, "ko");
  });
  return sorted.map((r) => renderReference(r, style)).join("\n\n");
}

/**
 * UODE 통합: PDF 외 포맷(DOCX/HWP/HWPX 등)에서도 참고문헌 1건 추출.
 * - PDF는 기존 extractPDFText 경로 사용(이미지/레이아웃 정확도 유지)
 * - 그 외 포맷은 UODE processDocument로 텍스트 추출
 * - 추출 텍스트는 scholarly-parser로 저널 레이아웃별 정밀 파싱
 *   (Elsevier / 한국 저널: 발행연도·저널명·제목·저자·요약·키워드·DOI)
 *   실패 시 기존 parsePDFAsOnePaper 휴리스틱으로 폴백
 */
export async function extractRefFromAnyFile(
  file: File
): Promise<RefEntry | null> {
  const lower = file.name.toLowerCase();
  let text = "";

  if (lower.endsWith(".pdf")) {
    text = await extractPDFText(file);
  } else if (isSupportedFile(file.name)) {
    const doc = await processDocument(file);
    text = doc.text;
  } else {
    return null;
  }

  if (!text || text.trim().length < 20) return null;

  // 1차: 저널 레이아웃 정밀 파서
  const fields = parseScholarlyFields(text, file.name);
  if (fields.title && fields.title.length >= 5 && (fields.authors.length || fields.doi || fields.journal)) {
    const ref = scholarlyToRefEntry(fields, file.name);
    ref.raw = text.slice(0, 4000);
    // 휴리스틱 파서로 권/호/페이지 보강
    const fallback = parsePDFAsOnePaper(text, file.name);
    if (!ref.volume && fallback.volume) ref.volume = fallback.volume;
    if (!ref.issue && fallback.issue) ref.issue = fallback.issue;
    if (!ref.pages && fallback.pages) ref.pages = fallback.pages;
    if (!ref.authors.length && fallback.authors.length) ref.authors = fallback.authors;
    return ref;
  }

  // 2차: 기존 휴리스틱 파서
  return parsePDFAsOnePaper(text, file.name);
}

/** 사람 이름 문자열을 RefAuthor로 파싱 ("Smith, John" 또는 "John Smith" 또는 "홍길동") */
function parseAuthorName(name: string): RefAuthor {
  const trimmed = (name || "").trim();
  const isKorean = /[가-힣]/.test(trimmed);
  if (isKorean) {
    // 한글 이름: 성+이름 분리 없이 full 사용
    return { last: trimmed, first: "", initials: "", full: trimmed, isKorean: true };
  }
  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",").map((s) => s.trim());
    const initials = first ? first.split(/\s+/).map((p) => p[0]).filter(Boolean).join(". ") + "." : "";
    return { last: last || trimmed, first: first || "", initials, full: trimmed, isKorean: false };
  }
  const parts = trimmed.split(/\s+/);
  const last = parts.pop() || trimmed;
  const first = parts.join(" ");
  const initials = first ? first.split(/\s+/).map((p) => p[0]).filter(Boolean).join(". ") + "." : "";
  return { last, first, initials, full: trimmed, isKorean: false };
}

/** CanonicalCitation → RefEntry (DOI/RIS/BibTeX 불러오기 결과를 전역 refDB로 편입) */
export function canonicalToRefEntry(c: CanonicalCitation): RefEntry {
  const authors: RefAuthor[] = (c.authors || []).map((a) =>
    parseAuthorName(a.fullName || `${a.given || ""} ${a.family || ""}`.trim())
  );
  const type: RefEntry["type"] =
    c.type === "book" || c.type === "book-chapter"
      ? "book"
      : c.type === "journal-article"
      ? "journal"
      : "other";
  return {
    id: c.id || `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    raw: c.rawText || "",
    type,
    authors,
    year: c.year ? String(c.year) : "",
    title: c.title || "",
    journal: c.journal || "",
    volume: c.volume || "",
    issue: c.issue || "",
    pages: c.pages || "",
    doi: c.doi || "",
    url: c.url || (c.doi ? `https://doi.org/${c.doi}` : ""),
    publisher: c.publisher || "",
    source: c.doi || c.url || c.title || "",
    cited: false,
    abstract: c.abstract,
    keywords: c.keywords || [],
  };
}

/**
 * 서지정보 텍스트(RIS/BibTeX)를 파싱하여 RefEntry로 변환.
 * 형식 인식 실패 시 null.
 */
export function parseBibTextToRefEntry(
  text: string
): { format: "ris" | "bibtex"; ref: RefEntry } | null {
  const parsed = parseBibliographicText(text);
  if (!parsed) return null;
  const canonical = toCanonicalCitation(parsed.data);
  if (!canonical.title) return null;
  return { format: parsed.format, ref: canonicalToRefEntry(canonical) };
}
