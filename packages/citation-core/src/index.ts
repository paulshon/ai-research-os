/**
 * Citation Core v3.0 — Complete Citation Processing System
 * AI Research OS v22
 *
 * 설계 철학:
 *   "텍스트 변환"이 아니라 "학술 메타데이터 재구성"
 *
 * 처리 파이프라인:
 *   PDF → GROBID → TEI XML → Metadata Extraction
 *   → DOI Discovery → Crossref/OpenAlex/Semantic Scholar
 *   → Metadata Merge → Confidence Scoring
 *   → Author Normalization → CSL Formatting
 *   → Validation → Export
 *
 * 지원 스타일: APA7, MLA9, Chicago, IEEE, Vancouver, Harvard, Nature
 * 
 * v22 새로운 기능:
 * - GROBID 통합 (PDF → TEI XML)
 * - DOI Discovery Engine (자동 DOI 탐색)
 * - Crossref Resolver (실제 API 구현)
 * - OpenAlex Resolver (실제 API 구현)
 * - Semantic Scholar Resolver (실제 API 구현)
 * - Metadata Merge Engine (다중 소스 병합)
 * - CSL Engine (citeproc-js 기반)
 * - Confidence Engine (상세 신뢰도 점수)
 * - Author Normalization Engine (저자명 정규화)
 * - Reference Segmentation Engine (참고문헌 분할)
 * - PDF Layout Engine (레이아웃 인식)
 * - Citation Validation Engine (AI 검증)
 */

// ══════════════════════════════════════════════════
// 1. 기본 타입 정의
// ══════════════════════════════════════════════════

export type CitationFormat =
  | "apa7"
  | "mla9"
  | "chicago"
  | "ieee"
  | "vancouver"
  | "harvard"
  | "nature";

export type CitationType =
  | "journal-article"
  | "book"
  | "book-chapter"
  | "conference-paper"
  | "thesis"
  | "report"
  | "website"
  | "dataset"
  | "preprint"
  | "unknown";

export type InTextCitationType = "parenthetical" | "narrative";

export type ValidationSeverity = "error" | "warning" | "info";

export type ConfidenceScore = number; // 0-100

// ══════════════════════════════════════════════════
// 2. Canonical Citation Object
// ══════════════════════════════════════════════════

export interface CitationAuthor {
  given: string;
  family: string;
  /** 전체 표기명 (한글 저자/단일 필드 호환용) */
  fullName?: string;
  orcid?: string;
  /** 소속기관 */
  affiliation?: string;
}

/**
 * Canonical Citation Object — 모든 인용의 내부 표준 표현
 */
export interface CanonicalCitation {
  id: string;
  type: CitationType;
  title: string;
  authors: CitationAuthor[];
  journal?: string;
  publisher?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  keywords: string[];
  isbn?: string;
  issn?: string;
  accessDate?: string;
  language: string;
  rawText?: string;
  confidence: ConfidenceScore;
  doiVerified: boolean;
  crossrefMatched: boolean;
  userOverridden: boolean;
  metadataSource:
    | "crossref"
    | "openalex"
    | "semantic_scholar"
    | "pubmed"
    | "parsed"
    | "manual"
    | "grobid";
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════
// 3. DOI Engine
// ══════════════════════════════════════════════════

export const DOI_PATTERN = /\b(10\.\d{4,}(?:\.\d+)*\/\S+)\b/gi;
export const DOI_URL_PATTERN =
  /https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,}(?:\.\d+)*\/\S+)/gi;

export function extractDOIs(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(DOI_URL_PATTERN)) {
    found.add(m[1].replace(/[.,;)\]]+$/, ""));
  }
  for (const m of text.matchAll(DOI_PATTERN)) {
    found.add(m[1].replace(/[.,;)\]]+$/, ""));
  }
  return [...found];
}

export function isValidDOI(doi: string): boolean {
  return /^10\.\d{4,}\/\S+$/.test(doi);
}

// ══════════════════════════════════════════════════
// 4. Crossref / OpenAlex API 클라이언트
// ══════════════════════════════════════════════════

export const CROSSREF_API_BASE = "https://api.crossref.org/works";
export const OPENALEX_API_BASE = "https://api.openalex.org/works";
export const SEMANTIC_SCHOLAR_API_BASE =
  "https://api.semanticscholar.org/graph/v1/paper";

export function getCrossRefUrl(doi: string): string {
  return `${CROSSREF_API_BASE}/${encodeURIComponent(doi)}`;
}
export function getOpenAlexUrl(doi: string): string {
  return `${OPENALEX_API_BASE}/https://doi.org/${encodeURIComponent(doi)}`;
}
export function getSemanticScholarUrl(doi: string): string {
  return `${SEMANTIC_SCHOLAR_API_BASE}/DOI:${encodeURIComponent(
    doi
  )}?fields=title,authors,year,journal,externalIds,abstract`;
}

export function parseCrossRefResponse(
  data: Record<string, unknown>
): Partial<CanonicalCitation> | null {
  try {
    const msg = data.message as Record<string, unknown>;
    if (!msg) return null;
    const titleArr = msg.title as string[] | undefined;
    const authorArr =
      (msg.author as Array<{
        given?: string;
        family?: string;
        ORCID?: string;
      }>) || [];
    const publishedPrint = msg["published-print"] as
      | { "date-parts": number[][] }
      | undefined;
    const publishedOnline = msg["published-online"] as
      | { "date-parts": number[][] }
      | undefined;
    const published = publishedPrint || publishedOnline;
    const journalArr = msg["container-title"] as string[] | undefined;
    const typeStr = msg.type as string | undefined;

    return {
      title: titleArr?.[0] || "",
      authors: authorArr.map((a) => ({
        given: a.given || "",
        family: a.family || "",
        orcid: a.ORCID?.replace("https://orcid.org/", ""),
      })),
      year: published?.["date-parts"]?.[0]?.[0] || 0,
      journal: journalArr?.[0],
      publisher: msg.publisher as string | undefined,
      volume: msg.volume as string | undefined,
      issue: msg.issue as string | undefined,
      pages: msg.page as string | undefined,
      doi: msg.DOI as string | undefined,
      issn: (msg.ISSN as string[] | undefined)?.[0],
      type: mapCrossrefType(typeStr),
      language: (msg.language as string) || "en",
      metadataSource: "crossref",
      doiVerified: true,
      crossrefMatched: true,
      confidence: 95,
    };
  } catch {
    return null;
  }
}

export function parseOpenAlexResponse(
  data: Record<string, unknown>
): Partial<CanonicalCitation> | null {
  try {
    const authorships =
      (data.authorships as Array<{
        author: { display_name: string; orcid?: string };
      }>) || [];
    const primaryLocation = data.primary_location as
      | { source?: { display_name?: string; issn?: string[] } }
      | undefined;
    const biblio = data.biblio as
      | {
          volume?: string;
          issue?: string;
          first_page?: string;
          last_page?: string;
        }
      | undefined;
    const ids = data.ids as { doi?: string; issn?: string[] } | undefined;
    const pages =
      biblio?.first_page && biblio?.last_page
        ? `${biblio.first_page}–${biblio.last_page}`
        : biblio?.first_page;

    return {
      title: (data.title as string) || "",
      authors: authorships.map((a) => {
        const nameParts = a.author.display_name.trim().split(/\s+/);
        const family = nameParts.pop() || "";
        const given = nameParts.join(" ");
        return {
          given,
          family,
          orcid: a.author.orcid?.replace("https://orcid.org/", ""),
        };
      }),
      year: (data.publication_year as number) || 0,
      journal: primaryLocation?.source?.display_name,
      volume: biblio?.volume,
      issue: biblio?.issue,
      pages,
      doi: (ids?.doi?.replace("https://doi.org/", "") as string) || undefined,
      issn: primaryLocation?.source?.issn?.[0],
      type: "journal-article",
      language: (data.language as string) || "en",
      metadataSource: "openalex",
      doiVerified: true,
      crossrefMatched: false,
      confidence: 80,
    };
  } catch {
    return null;
  }
}

function mapCrossrefType(type?: string): CitationType {
  const map: Record<string, CitationType> = {
    "journal-article": "journal-article",
    book: "book",
    "book-chapter": "book-chapter",
    "proceedings-article": "conference-paper",
    dissertation: "thesis",
    report: "report",
    dataset: "dataset",
    "posted-content": "preprint",
  };
  return map[type || ""] || "unknown";
}

// ══════════════════════════════════════════════════
// 5. Citation Style Engine — CSL 기반 스타일 렌더링
// ══════════════════════════════════════════════════

export function formatAPA7(c: CanonicalCitation): string {
  const authorsStr = formatAuthorsAPA(c.authors);
  const yearStr = `(${c.year || "n.d."})`;
  const titleStr = formatTitleAPA(c.title, c.type);
  const journalPart = c.journal ? ` *${c.journal}*` : "";
  const volumePart = c.volume ? `, *${c.volume}*` : "";
  const issuePart = c.issue ? `(${c.issue})` : "";
  const pagesPart = c.pages ? `, ${c.pages}` : "";
  const doiPart = c.doi
    ? ` https://doi.org/${c.doi}`
    : c.url
    ? ` ${c.url}`
    : "";
  return `${authorsStr} ${yearStr}. ${titleStr}.${journalPart}${volumePart}${issuePart}${pagesPart}.${doiPart}`;
}

export function formatMLA9(c: CanonicalCitation): string {
  const authorsStr = formatAuthorsMLA(c.authors);
  const titleStr = c.type === "book" ? `*${c.title}*` : `"${c.title}."`;
  const journalPart = c.journal ? ` *${c.journal}*,` : "";
  const volumePart = c.volume ? ` vol. ${c.volume},` : "";
  const issuePart = c.issue ? ` no. ${c.issue},` : "";
  const yearPart = ` ${c.year}`;
  const pagesPart = c.pages ? `, pp. ${c.pages}` : "";
  const doiPart = c.doi
    ? `. https://doi.org/${c.doi}`
    : c.url
    ? `. ${c.url}`
    : "";
  return `${authorsStr} ${titleStr}${journalPart}${volumePart}${issuePart}${yearPart}${pagesPart}${doiPart}.`;
}

export function formatChicago(c: CanonicalCitation): string {
  const authorsStr = formatAuthorsChicago(c.authors);
  const titleStr = c.type === "book" ? `*${c.title}*` : `"${c.title}."`;
  const journalPart = c.journal ? ` *${c.journal}*` : "";
  const volumePart = c.volume ? ` ${c.volume}` : "";
  const issuePart = c.issue ? `, no. ${c.issue}` : "";
  const yearPart = ` (${c.year})`;
  const pagesPart = c.pages ? `: ${c.pages}` : "";
  const doiPart = c.doi ? `. https://doi.org/${c.doi}` : "";
  return `${authorsStr} ${titleStr}${journalPart}${volumePart}${issuePart}${yearPart}${pagesPart}${doiPart}.`;
}

export function formatIEEE(c: CanonicalCitation): string {
  const authorsStr = c.authors
    .map((a) => {
      const initials = a.given
        .split(/\s+/)
        .map((p) => p[0] + ".")
        .join(" ");
      return `${initials} ${a.family}`;
    })
    .join(", ");
  const titleStr = `"${c.title},"`;
  const journalPart = c.journal ? ` *${c.journal}*,` : "";
  const volumePart = c.volume ? ` vol. ${c.volume},` : "";
  const issuePart = c.issue ? ` no. ${c.issue},` : "";
  const pagesPart = c.pages ? ` pp. ${c.pages},` : "";
  const doiPart = c.doi ? ` doi: ${c.doi}.` : ".";
  return `${authorsStr}, ${titleStr}${journalPart}${volumePart}${issuePart}${pagesPart} ${c.year}${doiPart}`;
}

export function formatVancouver(c: CanonicalCitation): string {
  const authorList = c.authors.slice(0, 6).map((a) => {
    const initials = a.given
      .split(/\s+/)
      .map((p) => p[0])
      .join("");
    return `${a.family} ${initials}`;
  });
  const etAl = c.authors.length > 6 ? ", et al" : "";
  const authorsStr = authorList.join(", ") + etAl;
  const journalPart = c.journal ? ` ${c.journal}.` : "";
  const yearPart = ` ${c.year}`;
  const volumePart = c.volume ? `;${c.volume}` : ";";
  const issuePart = c.issue ? `(${c.issue})` : "";
  const pagesPart = c.pages ? `:${c.pages}` : "";
  const doiPart = c.doi ? ` doi:${c.doi}` : "";
  return `${authorsStr}. ${c.title}.${journalPart}${yearPart}${volumePart}${issuePart}${pagesPart}.${doiPart}`;
}

export function formatHarvard(c: CanonicalCitation): string {
  const authorsStr = formatAuthorsHarvard(c.authors);
  const titleStr = c.type === "book" ? `*${c.title}*` : `'${c.title}'`;
  const journalPart = c.journal ? `, *${c.journal}*` : "";
  const volumePart = c.volume ? `, vol. ${c.volume}` : "";
  const issuePart = c.issue ? `, no. ${c.issue}` : "";
  const pagesPart = c.pages ? `, pp. ${c.pages}` : "";
  const doiPart = c.doi ? `, doi:${c.doi}` : "";
  return `${authorsStr} (${c.year}) ${titleStr}${journalPart}${volumePart}${issuePart}${pagesPart}${doiPart}.`;
}

export function formatNature(c: CanonicalCitation): string {
  const authorsStr = c.authors
    .slice(0, 6)
    .map((a) => {
      const initials = a.given
        .split(/\s+/)
        .map((p) => p[0] + ".")
        .join(" ");
      return `${a.family}, ${initials}`;
    })
    .join(", ");
  const etAl = c.authors.length > 6 ? " et al." : ".";
  const journalPart = c.journal ? ` *${c.journal}*` : "";
  const volumePart = c.volume ? ` **${c.volume}**,` : "";
  const pagesPart = c.pages ? ` ${c.pages}` : "";
  const yearPart = ` (${c.year})`;
  const doiPart = c.doi ? ` https://doi.org/${c.doi}` : "";
  return `${authorsStr}${etAl} ${c.title}.${journalPart}${volumePart}${pagesPart}${yearPart}.${doiPart}`;
}

export function formatCitation(
  c: CanonicalCitation,
  format: CitationFormat
): string {
  switch (format) {
    case "apa7":
      return formatAPA7(c);
    case "mla9":
      return formatMLA9(c);
    case "chicago":
      return formatChicago(c);
    case "ieee":
      return formatIEEE(c);
    case "vancouver":
      return formatVancouver(c);
    case "harvard":
      return formatHarvard(c);
    case "nature":
      return formatNature(c);
    default:
      return formatAPA7(c);
  }
}

// ══════════════════════════════════════════════════
// 6. In-text Citation Engine
// ══════════════════════════════════════════════════

export function formatInTextCitation(
  citations: CanonicalCitation[],
  format: CitationFormat,
  type: InTextCitationType = "parenthetical",
  page?: string
): string {
  if (citations.length === 0) return "";
  if (citations.length > 1) {
    const parts = citations.map((c) =>
      buildSingleInText(c, format, "parenthetical", page)
    );
    return `(${parts.join("; ")})`;
  }
  return buildSingleInText(citations[0], format, type, page);
}

function buildSingleInText(
  c: CanonicalCitation,
  format: CitationFormat,
  type: InTextCitationType,
  page?: string
): string {
  const lastName = getFirstAuthorLastName(c);
  const year = c.year || "n.d.";
  const pagePart = page ? `, p. ${page}` : "";

  let authorPart = lastName;
  if (c.authors.length === 2) {
    const second = c.authors[1].family;
    authorPart =
      format === "apa7" || format === "harvard"
        ? `${lastName} & ${second}`
        : `${lastName} and ${second}`;
  } else if (c.authors.length > 2) {
    authorPart = `${lastName} et al.`;
  }

  if (type === "narrative") return `${authorPart} (${year}${pagePart})`;
  return `${authorPart}, ${year}${pagePart}`;
}

function getFirstAuthorLastName(c: CanonicalCitation): string {
  if (c.authors.length === 0) return c.title.substring(0, 20);
  return c.authors[0].family || c.authors[0].fullName || "";
}

// ══════════════════════════════════════════════════
// 7. Validation Engine
// ══════════════════════════════════════════════════

export interface ValidationIssue {
  id: string;
  citationId: string;
  severity: ValidationSeverity;
  type:
    | "missing_doi"
    | "author_mismatch"
    | "year_mismatch"
    | "journal_normalization"
    | "duplicate"
    | "missing_required_field"
    | "format_error"
    | "hallucination_suspected";
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface ValidationResult {
  citationId: string;
  issues: ValidationIssue[];
  overallConfidence: ConfidenceScore;
  isValid: boolean;
}

export function validateCitation(c: CanonicalCitation): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!c.doi) {
    issues.push({
      id: `${c.id}-no-doi`,
      citationId: c.id,
      severity: "warning",
      type: "missing_doi",
      message: "DOI가 없습니다. DOI를 추가하면 인용 정확도가 높아집니다.",
      suggestion: "DOI를 직접 입력하거나 재검색을 시도하세요.",
      autoFixable: false,
    });
  } else if (!isValidDOI(c.doi)) {
    issues.push({
      id: `${c.id}-invalid-doi`,
      citationId: c.id,
      severity: "error",
      type: "format_error",
      message: `DOI 형식이 올바르지 않습니다: ${c.doi}`,
      suggestion: "10.XXXX/... 형식인지 확인하세요.",
      autoFixable: false,
    });
  }

  if (c.authors.length === 0) {
    issues.push({
      id: `${c.id}-no-authors`,
      citationId: c.id,
      severity: "error",
      type: "missing_required_field",
      message: "저자 정보가 없습니다.",
      suggestion: "저자를 직접 입력하세요.",
      autoFixable: false,
    });
  }

  const currentYear = new Date().getFullYear();
  if (!c.year || c.year < 1900 || c.year > currentYear + 1) {
    issues.push({
      id: `${c.id}-invalid-year`,
      citationId: c.id,
      severity: "error",
      type: "year_mismatch",
      message: `출판 연도가 유효하지 않습니다: ${c.year}`,
      suggestion: "정확한 출판 연도를 입력하세요.",
      autoFixable: false,
    });
  }

  if (!c.title || c.title.length < 3) {
    issues.push({
      id: `${c.id}-no-title`,
      citationId: c.id,
      severity: "error",
      type: "missing_required_field",
      message: "제목이 없습니다.",
      autoFixable: false,
    });
  }

  if (c.type === "journal-article" && !c.journal) {
    issues.push({
      id: `${c.id}-no-journal`,
      citationId: c.id,
      severity: "warning",
      type: "journal_normalization",
      message: "저널명이 없습니다.",
      suggestion: "저널명을 추가하거나 Crossref에서 재검색하세요.",
      autoFixable: false,
    });
  }

  const isValid = !issues.some((i) => i.severity === "error");
  const confidencePenalty = issues.reduce((acc, i) => {
    if (i.severity === "error") return acc - 20;
    if (i.severity === "warning") return acc - 5;
    return acc - 1;
  }, 0);

  return {
    citationId: c.id,
    issues,
    overallConfidence: Math.max(0, c.confidence + confidencePenalty),
    isValid,
  };
}

// ══════════════════════════════════════════════════
// 8. Confidence Scoring System
// ══════════════════════════════════════════════════

export interface ConfidenceBreakdown {
  doiScore: number;
  metadataScore: number;
  parseScore: number;
  ocrScore: number;
  total: number;
  level: "high" | "medium" | "low";
  label: string;
}

export function computeConfidenceScore(
  c: Partial<CanonicalCitation>
): ConfidenceBreakdown {
  let doiScore = 0;
  let metadataScore = 0;
  let parseScore = 0;
  const ocrScore = 15;

  if (c.doi && isValidDOI(c.doi)) doiScore = c.doiVerified ? 30 : 20;

  if (c.title && c.title.length > 3) metadataScore += 8;
  if (c.authors && c.authors.length > 0) metadataScore += 8;
  if (c.year && c.year > 1900) metadataScore += 5;
  if (c.journal) metadataScore += 5;
  if (c.volume || c.pages) metadataScore += 4;

  if (c.crossrefMatched) parseScore = 25;
  else if (c.metadataSource === "openalex") parseScore = 20;
  else if (c.metadataSource === "parsed") parseScore = 12;
  else parseScore = 5;

  const total = Math.min(100, doiScore + metadataScore + parseScore + ocrScore);
  const level = total >= 80 ? "high" : total >= 50 ? "medium" : "low";
  const label =
    level === "high"
      ? "DOI 검증됨"
      : level === "medium"
      ? "부분 검증"
      : "수동 확인 필요";

  return { doiScore, metadataScore, parseScore, ocrScore, total, level, label };
}

// ══════════════════════════════════════════════════
// 9. BibTeX / RIS Export Layer
// ══════════════════════════════════════════════════

export function toBibTeX(c: CanonicalCitation): string {
  const entryType = getBibTeXType(c.type);
  const key = generateBibTeXKey(c);
  const authorsStr = c.authors
    .map((a) => `${a.family}, ${a.given}`)
    .join(" and ");

  const fields: string[] = [
    `  author    = {${authorsStr}}`,
    `  title     = {${c.title}}`,
    `  year      = {${c.year}}`,
  ];
  if (c.journal) fields.push(`  journal   = {${c.journal}}`);
  if (c.volume) fields.push(`  volume    = {${c.volume}}`);
  if (c.issue) fields.push(`  number    = {${c.issue}}`);
  if (c.pages) fields.push(`  pages     = {${c.pages}}`);
  if (c.doi) fields.push(`  doi       = {${c.doi}}`);
  if (c.url) fields.push(`  url       = {${c.url}}`);
  if (c.publisher) fields.push(`  publisher = {${c.publisher}}`);
  if (c.issn) fields.push(`  issn      = {${c.issn}}`);

  return `@${entryType}{${key},\n${fields.join(",\n")}\n}`;
}

export function toRIS(c: CanonicalCitation): string {
  const lines: string[] = [];
  lines.push(`TY  - ${getRISType(c.type)}`);
  lines.push(`TI  - ${c.title}`);
  c.authors.forEach((a) => lines.push(`AU  - ${a.family}, ${a.given}`));
  lines.push(`PY  - ${c.year}`);
  if (c.journal) lines.push(`JO  - ${c.journal}`);
  if (c.volume) lines.push(`VL  - ${c.volume}`);
  if (c.issue) lines.push(`IS  - ${c.issue}`);
  if (c.pages) {
    const [start, end] = c.pages.split(/[-–]/);
    if (start) lines.push(`SP  - ${start.trim()}`);
    if (end) lines.push(`EP  - ${end.trim()}`);
  }
  if (c.doi) lines.push(`DO  - ${c.doi}`);
  if (c.url) lines.push(`UR  - ${c.url}`);
  if (c.publisher) lines.push(`PB  - ${c.publisher}`);
  if (c.abstract) lines.push(`AB  - ${c.abstract}`);
  lines.push("ER  -");
  return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  RIS / BibTeX Import Parsers (서지정보 포맷 불러오기)
// ══════════════════════════════════════════════════

function risTypeToCitation(ty: string): CitationType {
  const map: Record<string, CitationType> = {
    JOUR: "journal-article",
    BOOK: "book",
    CHAP: "book-chapter",
    CONF: "conference-paper",
    THES: "thesis",
    RPRT: "report",
    ELEC: "website",
    DATA: "dataset",
  };
  return map[ty?.toUpperCase()] || "journal-article";
}

/** RIS(.ris) 텍스트 파싱 → CanonicalCitation 부분 객체 */
export function parseRIS(text: string): Partial<CanonicalCitation> {
  const lines = text.split(/\r?\n/);
  const authors: CitationAuthor[] = [];
  const out: Partial<CanonicalCitation> = {
    authors: [],
    keywords: [],
    metadataSource: "manual",
    type: "journal-article",
  };
  let sp = "";
  let ep = "";
  for (const line of lines) {
    const m = line.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/);
    if (!m) continue;
    const tag = m[1];
    const val = m[2].trim();
    switch (tag) {
      case "TY":
        out.type = risTypeToCitation(val);
        break;
      case "TI":
      case "T1":
        out.title = val;
        break;
      case "AU":
      case "A1": {
        const parts = val.split(",");
        const family = (parts[0] ?? "").trim();
        const given = (parts[1] ?? "").trim();
        authors.push({ family, given, fullName: val });
        break;
      }
      case "PY":
      case "Y1": {
        const y = parseInt(val.replace(/[^0-9]/g, "").slice(0, 4), 10);
        if (!Number.isNaN(y)) out.year = y;
        break;
      }
      case "JO":
      case "JF":
      case "T2":
        out.journal = val;
        break;
      case "VL":
        out.volume = val;
        break;
      case "IS":
        out.issue = val;
        break;
      case "SP":
        sp = val;
        break;
      case "EP":
        ep = val;
        break;
      case "DO":
        out.doi = val.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
        break;
      case "UR":
        out.url = val;
        break;
      case "PB":
        out.publisher = val;
        break;
      case "AB":
      case "N2":
        out.abstract = val;
        break;
      case "KW":
        (out.keywords as string[]).push(val);
        break;
      case "SN":
        out.issn = val;
        break;
    }
  }
  if (sp) out.pages = ep ? `${sp}-${ep}` : sp;
  out.authors = authors;
  if (out.doi) {
    out.doiVerified = false;
    out.confidence = 50;
  }
  return out;
}

/** BibTeX(.bib) 텍스트 파싱 → CanonicalCitation 부분 객체 */
export function parseBibTeX(text: string): Partial<CanonicalCitation> {
  const out: Partial<CanonicalCitation> = {
    authors: [],
    keywords: [],
    metadataSource: "manual",
    type: "journal-article",
  };
  const typeMatch = text.match(/@(\w+)\s*\{/);
  if (typeMatch) {
    const t = typeMatch[1].toLowerCase();
    const map: Record<string, CitationType> = {
      article: "journal-article",
      book: "book",
      incollection: "book-chapter",
      inproceedings: "conference-paper",
      conference: "conference-paper",
      phdthesis: "thesis",
      mastersthesis: "thesis",
      techreport: "report",
      misc: "unknown",
    };
    out.type = map[t] || "journal-article";
  }
  // field = {value} 또는 field = "value"
  const fieldRe = /(\w+)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"]*)")/g;
  let m: RegExpExecArray | null;
  const fields: Record<string, string> = {};
  while ((m = fieldRe.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    const val = (m[2] ?? m[3] ?? "").replace(/\s+/g, " ").trim();
    fields[key] = val;
  }
  if (fields.title) out.title = fields.title.replace(/[{}]/g, "");
  if (fields.journal) out.journal = fields.journal;
  if (fields.booktitle && !out.journal) out.journal = fields.booktitle;
  if (fields.volume) out.volume = fields.volume;
  if (fields.number) out.issue = fields.number;
  if (fields.pages) out.pages = fields.pages.replace(/--/g, "-");
  if (fields.doi) out.doi = fields.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  if (fields.url) out.url = fields.url;
  if (fields.publisher) out.publisher = fields.publisher;
  if (fields.abstract) out.abstract = fields.abstract;
  if (fields.issn) out.issn = fields.issn;
  if (fields.year) {
    const y = parseInt(fields.year.replace(/[^0-9]/g, "").slice(0, 4), 10);
    if (!Number.isNaN(y)) out.year = y;
  }
  if (fields.author) {
    out.authors = fields.author.split(/\s+and\s+/i).map((name) => {
      const trimmed = name.trim();
      if (trimmed.includes(",")) {
        const [family, given] = trimmed.split(",").map((s) => s.trim());
        return { family, given, fullName: `${given} ${family}` };
      }
      const parts = trimmed.split(/\s+/);
      const family = parts.pop() ?? "";
      const given = parts.join(" ");
      return { family, given, fullName: trimmed };
    });
  }
  if (out.doi) {
    out.doiVerified = false;
    out.confidence = 50;
  }
  return out;
}

/**
 * 입력 텍스트 형식 자동 감지 후 파싱 (RIS/BibTeX)
 * 반환: 부분 CanonicalCitation, 감지 실패 시 null
 */
export function parseBibliographicText(
  text: string
): { format: "ris" | "bibtex"; data: Partial<CanonicalCitation> } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^@\w+\s*\{/.test(trimmed)) {
    return { format: "bibtex", data: parseBibTeX(trimmed) };
  }
  if (/^TY\s{2}-/m.test(trimmed) || /^\s*TY\s{2}-/.test(trimmed)) {
    return { format: "ris", data: parseRIS(trimmed) };
  }
  return null;
}

/** 부분 객체를 완전한 CanonicalCitation으로 보정 */
export function toCanonicalCitation(
  partial: Partial<CanonicalCitation>,
  id?: string
): CanonicalCitation {
  const nowIso = new Date().toISOString();
  const base: CanonicalCitation = {
    id: id || `cite-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: partial.type || "journal-article",
    title: partial.title || "",
    authors: partial.authors || [],
    journal: partial.journal,
    publisher: partial.publisher,
    year: partial.year || 0,
    volume: partial.volume,
    issue: partial.issue,
    pages: partial.pages,
    doi: partial.doi,
    url: partial.url,
    abstract: partial.abstract,
    keywords: partial.keywords || [],
    isbn: partial.isbn,
    issn: partial.issn,
    accessDate: partial.accessDate,
    language: partial.language || "en",
    rawText: partial.rawText,
    confidence: partial.confidence ?? 0,
    doiVerified: partial.doiVerified ?? false,
    crossrefMatched: partial.crossrefMatched ?? false,
    userOverridden: partial.userOverridden ?? false,
    metadataSource: partial.metadataSource || "manual",
    createdAt: partial.createdAt || nowIso,
    updatedAt: nowIso,
  };
  return base;
}

function getBibTeXType(type: CitationType): string {
  const map: Record<CitationType, string> = {
    "journal-article": "article",
    book: "book",
    "book-chapter": "incollection",
    "conference-paper": "inproceedings",
    thesis: "phdthesis",
    report: "techreport",
    website: "misc",
    dataset: "misc",
    preprint: "article",
    unknown: "misc",
  };
  return map[type] || "misc";
}

function getRISType(type: CitationType): string {
  const map: Record<CitationType, string> = {
    "journal-article": "JOUR",
    book: "BOOK",
    "book-chapter": "CHAP",
    "conference-paper": "CONF",
    thesis: "THES",
    report: "RPRT",
    website: "ELEC",
    dataset: "DATA",
    preprint: "JOUR",
    unknown: "GEN",
  };
  return map[type] || "GEN";
}

function generateBibTeXKey(c: CanonicalCitation): string {
  const lastName = c.authors[0]?.family?.replace(/\s+/g, "") || "Unknown";
  const year = c.year || "0000";
  const titleWord =
    c.title
      .split(/\s+/)
      .find((w) => w.length > 3)
      ?.replace(/[^a-zA-Z0-9가-힣]/g, "")
      ?.substring(0, 10) || "Paper";
  return `${lastName}${year}${titleWord}`;
}

// ══════════════════════════════════════════════════
// 10. 참고문헌 텍스트 파싱 (클라이언트 보조 파서)
// ══════════════════════════════════════════════════

export function parseReferenceText(
  rawText: string,
  index: number
): Partial<CanonicalCitation> {
  const text = rawText.trim();
  const dois = extractDOIs(text);
  const doi = dois[0];

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : 0;

  const authorMatch = text.match(
    /^([A-Z][a-zÀ-ÿ]+(?:,\s+[A-Z]\.?)+(?:\s*[,&]\s+[A-Z][a-zÀ-ÿ]+(?:,\s+[A-Z]\.?)+)*)/
  );

  return {
    id: `parsed-ref-${index}`,
    rawText: text,
    doi,
    year,
    authors: authorMatch
      ? [{ given: "", family: authorMatch[1], fullName: authorMatch[1] }]
      : [],
    confidence: doi ? 40 : 20,
    metadataSource: "parsed",
    doiVerified: false,
    crossrefMatched: false,
    type: "unknown",
    keywords: [],
    language: "en",
    userOverridden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════
// 11. 저자 포맷 헬퍼
// ══════════════════════════════════════════════════

function formatAuthorsAPA(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  const fmt = (a: CitationAuthor) => {
    if (!a.given && a.fullName) return a.fullName;
    const initials = a.given
      .split(/\s+/)
      .map((p) => (p[0] || "").toUpperCase() + ".")
      .join(" ");
    return `${a.family}, ${initials}`;
  };
  if (authors.length === 1) return fmt(authors[0]);
  if (authors.length === 2) return `${fmt(authors[0])}, & ${fmt(authors[1])}`;
  if (authors.length <= 20)
    return (
      authors.slice(0, -1).map(fmt).join(", ") +
      ", & " +
      fmt(authors[authors.length - 1])
    );
  return (
    authors.slice(0, 19).map(fmt).join(", ") +
    ", ... " +
    fmt(authors[authors.length - 1])
  );
}

function formatTitleAPA(title: string, type: CitationType): string {
  if (type === "book") return `*${title}*`;
  return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
}

function formatAuthorsMLA(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  const first = authors[0];
  const firstStr = `${first.family}, ${first.given}`;
  if (authors.length === 1) return `${firstStr}.`;
  if (authors.length === 2)
    return `${firstStr}, and ${authors[1].given} ${authors[1].family}.`;
  return `${firstStr}, et al.`;
}

function formatAuthorsChicago(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  const first = `${authors[0].family}, ${authors[0].given}`;
  if (authors.length === 1) return `${first}.`;
  if (authors.length <= 3) {
    const rest = authors
      .slice(1)
      .map((a) => `${a.given} ${a.family}`)
      .join(", and ");
    return `${first}, and ${rest}.`;
  }
  return `${first}, et al.`;
}

function formatAuthorsHarvard(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  const fmt = (a: CitationAuthor) => {
    const initials = a.given
      .split(/\s+/)
      .map((p) => p[0] + ".")
      .join(" ");
    return `${a.family}, ${initials}`;
  };
  if (authors.length === 1) return fmt(authors[0]);
  if (authors.length === 2) return `${fmt(authors[0])} and ${fmt(authors[1])}`;
  if (authors.length <= 3)
    return (
      authors.slice(0, -1).map(fmt).join(", ") +
      " and " +
      fmt(authors[authors.length - 1])
    );
  return `${fmt(authors[0])} et al.`;
}

// ══════════════════════════════════════════════════
// 12. 스타일 레이블 / 메타데이터
// ══════════════════════════════════════════════════

export interface CitationStyleMeta {
  id: CitationFormat;
  name: string;
  fullName: string;
  field: string;
  inTextExample: string;
  bibliographyExample: string;
}

export const CITATION_STYLE_META: CitationStyleMeta[] = [
  {
    id: "apa7",
    name: "APA 7",
    fullName: "American Psychological Association 7th Edition",
    field: "사회과학, 심리학, 교육학",
    inTextExample: "(Smith & Lee, 2024)",
    bibliographyExample:
      "Smith, J., & Lee, K. (2024). Title. *Journal*, *12*(3), 45–67.",
  },
  {
    id: "mla9",
    name: "MLA 9",
    fullName: "Modern Language Association 9th Edition",
    field: "인문학, 문학, 언어학",
    inTextExample: "(Smith and Lee 45)",
    bibliographyExample:
      'Smith, John, and Kim Lee. "Title." *Journal*, vol. 12, no. 3, 2024, pp. 45–67.',
  },
  {
    id: "chicago",
    name: "Chicago",
    fullName: "Chicago Author-Date 17th Edition",
    field: "역사학, 사회과학",
    inTextExample: "(Smith and Lee 2024, 45)",
    bibliographyExample:
      'Smith, John, and Kim Lee. "Title." *Journal* 12, no. 3 (2024): 45–67.',
  },
  {
    id: "ieee",
    name: "IEEE",
    fullName: "Institute of Electrical and Electronics Engineers",
    field: "공학, 컴퓨터과학",
    inTextExample: "[1]",
    bibliographyExample:
      'J. Smith and K. Lee, "Title," *Journal*, vol. 12, no. 3, pp. 45–67, 2024.',
  },
  {
    id: "vancouver",
    name: "Vancouver",
    fullName: "Vancouver / ICMJE",
    field: "의학, 생명과학",
    inTextExample: "(1)",
    bibliographyExample: "Smith J, Lee K. Title. Journal. 2024;12(3):45-67.",
  },
  {
    id: "harvard",
    name: "Harvard",
    fullName: "Harvard Referencing",
    field: "일반학술",
    inTextExample: "(Smith and Lee 2024)",
    bibliographyExample:
      "Smith, J. and Lee, K. (2024) 'Title', *Journal*, vol. 12, no. 3, pp. 45–67.",
  },
  {
    id: "nature",
    name: "Nature",
    fullName: "Nature Journal Style",
    field: "자연과학",
    inTextExample: "¹",
    bibliographyExample:
      "Smith, J. & Lee, K. Title. *Nature* **12**, 45–67 (2024).",
  },
];

// ══════════════════════════════════════════════════
// 13. v22 Pipeline Export
// ══════════════════════════════════════════════════

export {
  processCitation,
  processCitationsBatch,
  type PipelineOptions,
  type PipelineResult
} from './pipeline';

// ══════════════════════════════════════════════════
// 14. v22 Engines Export
// ══════════════════════════════════════════════════

export * from './engines';

// ══════════════════════════════════════════════════
// 15. v18 CitationData 하위 호환 레이어
// ══════════════════════════════════════════════════

/** @deprecated v18 호환용. CanonicalCitation 사용 권장 */
export interface CitationData {
  doi?: string;
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  publisher?: string;
}

export function upgradeLegacyCitation(
  legacy: CitationData,
  id?: string
): CanonicalCitation {
  const now = new Date().toISOString();
  const confidence = computeConfidenceScore({
    doi: legacy.doi,
    title: legacy.title,
    year: legacy.year,
    journal: legacy.journal,
    doiVerified: false,
    crossrefMatched: false,
    metadataSource: "parsed",
  });

  return {
    id: id || `legacy-${Date.now()}`,
    type: "journal-article",
    title: legacy.title,
    authors: legacy.authors.map((name) => {
      const parts = name.trim().split(/\s+/);
      const family = parts.pop() || "";
      const given = parts.join(" ");
      return { given, family, fullName: name };
    }),
    journal: legacy.journal,
    publisher: legacy.publisher,
    year: legacy.year,
    volume: legacy.volume,
    issue: legacy.issue,
    pages: legacy.pages,
    doi: legacy.doi,
    url: legacy.url,
    keywords: [],
    language: "en",
    confidence: confidence.total,
    doiVerified: false,
    crossrefMatched: false,
    userOverridden: false,
    metadataSource: "parsed",
    createdAt: now,
    updatedAt: now,
  };
}
