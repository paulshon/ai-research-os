// ════════════════════════════════════════════════════════════════════════
//  APA Citation Knowledge Graph (CKG) — Engine  (RDOS v12)
//  ----------------------------------------------------------------------
//  첨부 IA 설계(L0 Ontology → L6 Citation AI)와 APA 7판 매뉴얼을 반영한
//  순수 TypeScript 인용 엔진. 외부 의존성 없음. 브라우저/노드 공용.
//
//  구성:
//    · Metadata Master Model (CSL 유사 52필드)            → CKGEntry
//    · Reference Taxonomy (15 families / 40+ types)        → FAMILIES
//    · Metadata Profile (type→필드 그룹/필수)             → PROFILES
//    · In-Text Citation Engine                             → buildInText
//    · Reference List Engine + Rendering(8 styles)         → renderReference
//    · Edge Case Engine (no-author/no-date/a·b·c suffix)   → applyEdgeCases
//    · Validation Engine (+ compliance score)              → validateEntry
//    · Transformation Engine (RIS/BibTeX/CSL-JSON/DOI)     → parseImport
//    · Identifier Engine (DOI/ISSN/ISBN/ORCID 정규식)      → ID_PATTERNS
//    · Knowledge Base (APA7 Rule DB 발췌)                  → APA_RULES
// ════════════════════════════════════════════════════════════════════════

/* ───────────────────────── L0. Metadata Master Model ───────────────────── */

export interface CSLName {
  family?: string; // 성
  given?: string; // 이름
  literal?: string; // 단체/그룹 저자(분해 불가)
  orcid?: string;
}

export interface CKGEntry {
  id: string;
  type: string; // reference type code (예: "journal-article")
  // Authorship
  authors: CSLName[];
  editors?: CSLName[];
  translators?: CSLName[];
  // Temporal
  year?: string;
  date?: string; // "May 5" / "2025, March 1" 형태의 추가 날짜(월·일)
  // Title
  title?: string;
  subtitle?: string;
  // Source
  containerTitle?: string; // 학술지/도서/사이트/플랫폼
  seriesTitle?: string;
  // Publication
  publisher?: string;
  institution?: string;
  // Location
  city?: string;
  // Numeric
  volume?: string;
  issue?: string;
  edition?: string;
  pages?: string; // "55-66"
  articleNumber?: string;
  // Identifiers
  doi?: string;
  isbn?: string;
  issn?: string;
  pmid?: string;
  arxivId?: string;
  // Digital
  url?: string;
  repository?: string;
  retrievalDate?: string;
  // Software/media/legal
  version?: string;
  format?: string; // "Tweet" / "Video" / "Data set" / "Large language model" 등 대괄호 표기
  degree?: string; // "Doctoral dissertation" / "Master's thesis"
  court?: string;
  number?: string; // 보고서/법령 번호
  jurisdiction?: string;
  // Status
  retracted?: boolean;
  // 기타
  note?: string;
  // 계산값(엣지케이스): 동저자·동년도 a/b/c
  suffix?: string;
}

export function emptyEntry(type = "journal-article"): CKGEntry {
  return { id: rid(), type, authors: [] };
}

export function rid(): string {
  return "ref_" + Math.random().toString(36).slice(2, 9);
}

/* ───────────────────────── L1. Reference Taxonomy ──────────────────────── */

export interface RefType {
  code: string;
  family: string;
  label: string; // 한글 표기
  profile: string; // 메타데이터 프로파일 키
  format?: string; // 대괄호 표기 기본값
}

export interface RefFamily {
  key: string;
  label: string;
  icon: string;
  types: RefType[];
}

export const FAMILIES: RefFamily[] = [
  {
    key: "periodical",
    label: "정기간행물",
    icon: "📰",
    types: [
      { code: "journal-article", family: "periodical", label: "학술지 논문", profile: "journal" },
      { code: "review-article", family: "periodical", label: "리뷰 논문", profile: "journal" },
      { code: "editorial", family: "periodical", label: "사설/논평", profile: "journal" },
      { code: "preprint", family: "periodical", label: "프리프린트", profile: "preprint" },
      { code: "magazine-article", family: "periodical", label: "잡지 기사", profile: "magazine" },
      { code: "newspaper-article", family: "periodical", label: "신문 기사", profile: "magazine" },
    ],
  },
  {
    key: "book",
    label: "단행본",
    icon: "📕",
    types: [
      { code: "book", family: "book", label: "단행본", profile: "book" },
      { code: "edited-book", family: "book", label: "편저(편집본)", profile: "edited-book" },
      { code: "ebook", family: "book", label: "전자책", profile: "book" },
      { code: "translated-book", family: "book", label: "번역서", profile: "book" },
    ],
  },
  {
    key: "chapter",
    label: "도서 챕터",
    icon: "📑",
    types: [{ code: "book-chapter", family: "chapter", label: "편집본 챕터", profile: "chapter" }],
  },
  {
    key: "conference",
    label: "학술대회",
    icon: "🎤",
    types: [
      { code: "conference-paper", family: "conference", label: "학회 발표", profile: "conference", format: "Paper presentation" },
      { code: "conference-proceeding", family: "conference", label: "학회 프로시딩", profile: "journal" },
    ],
  },
  {
    key: "thesis",
    label: "학위논문",
    icon: "🎓",
    types: [
      { code: "dissertation", family: "thesis", label: "박사 학위논문", profile: "thesis", format: "Doctoral dissertation" },
      { code: "masters-thesis", family: "thesis", label: "석사 학위논문", profile: "thesis", format: "Master's thesis" },
    ],
  },
  {
    key: "report",
    label: "보고서",
    icon: "📋",
    types: [
      { code: "report", family: "report", label: "보고서", profile: "report" },
      { code: "gov-report", family: "report", label: "정부 보고서", profile: "report" },
    ],
  },
  {
    key: "dataset",
    label: "데이터셋",
    icon: "🗃️",
    types: [{ code: "dataset", family: "dataset", label: "데이터셋", profile: "dataset", format: "Data set" }],
  },
  {
    key: "software",
    label: "소프트웨어",
    icon: "💾",
    types: [
      { code: "software", family: "software", label: "소프트웨어", profile: "software", format: "Computer software" },
      { code: "mobile-app", family: "software", label: "모바일 앱", profile: "software", format: "Mobile app" },
    ],
  },
  {
    key: "web",
    label: "웹",
    icon: "🌐",
    types: [
      { code: "webpage", family: "web", label: "웹페이지", profile: "web" },
      { code: "blog-post", family: "web", label: "블로그 글", profile: "web" },
    ],
  },
  {
    key: "social",
    label: "소셜미디어",
    icon: "💬",
    types: [
      { code: "tweet", family: "social", label: "X(트위터)", profile: "social", format: "Tweet" },
      { code: "instagram", family: "social", label: "인스타그램", profile: "social", format: "Photograph" },
      { code: "facebook", family: "social", label: "페이스북", profile: "social", format: "Status update" },
      { code: "linkedin", family: "social", label: "링크드인", profile: "social", format: "Post" },
    ],
  },
  {
    key: "video",
    label: "영상",
    icon: "🎬",
    types: [
      { code: "youtube", family: "video", label: "유튜브", profile: "video", format: "Video" },
      { code: "ted", family: "video", label: "TED", profile: "video", format: "Video" },
      { code: "film", family: "video", label: "영화", profile: "video", format: "Film" },
    ],
  },
  {
    key: "audio",
    label: "오디오",
    icon: "🎧",
    types: [
      { code: "podcast", family: "audio", label: "팟캐스트", profile: "video", format: "Audio podcast" },
      { code: "music", family: "audio", label: "음원", profile: "video", format: "Song" },
    ],
  },
  {
    key: "legal",
    label: "법률",
    icon: "⚖️",
    types: [
      { code: "statute", family: "legal", label: "법령/Act", profile: "legal" },
      { code: "case", family: "legal", label: "판례", profile: "legal" },
      { code: "constitution", family: "legal", label: "헌법", profile: "legal" },
      { code: "treaty", family: "legal", label: "조약/규정", profile: "legal" },
    ],
  },
  {
    key: "ai",
    label: "AI 생성물",
    icon: "🤖",
    types: [{ code: "ai-generated", family: "ai", label: "생성형 AI", profile: "ai", format: "Large language model" }],
  },
  {
    key: "personal",
    label: "개인교신",
    icon: "✉️",
    types: [{ code: "personal-communication", family: "personal", label: "개인교신(이메일/인터뷰)", profile: "personal" }],
  },
];

export const ALL_TYPES: RefType[] = FAMILIES.flatMap((f) => f.types);
export function typeByCode(code: string): RefType | undefined {
  return ALL_TYPES.find((t) => t.code === code);
}

/* ───────────────────────── L2. Metadata Profiles ──────────────────────── */

export interface FieldDef {
  key: keyof CKGEntry | string;
  label: string;
  kind?: "text" | "authors" | "textarea";
  required?: boolean;
  hint?: string;
}

export const PROFILES: Record<string, FieldDef[]> = {
  journal: [
    { key: "authors", label: "저자", kind: "authors", required: true, hint: "한 줄에 한 명 · '성, 이름' 또는 '홍길동'" },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "논문 제목", required: true },
    { key: "containerTitle", label: "학술지명", required: true },
    { key: "volume", label: "권(Vol.)" },
    { key: "issue", label: "호(Issue)" },
    { key: "pages", label: "페이지", hint: "예: 101-122" },
    { key: "articleNumber", label: "논문번호(Article No.)" },
    { key: "doi", label: "DOI", hint: "10.xxxx/xxxx 또는 https://doi.org/…" },
  ],
  preprint: [
    { key: "authors", label: "저자", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "제목", required: true },
    { key: "repository", label: "프리프린트 저장소", hint: "예: PsyArXiv, bioRxiv" },
    { key: "doi", label: "DOI" },
    { key: "url", label: "URL" },
  ],
  magazine: [
    { key: "authors", label: "저자", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "date", label: "월 일", hint: "예: May 5" },
    { key: "title", label: "기사 제목", required: true },
    { key: "containerTitle", label: "매체명", required: true },
    { key: "volume", label: "권" },
    { key: "issue", label: "호" },
    { key: "pages", label: "페이지" },
    { key: "url", label: "URL" },
  ],
  book: [
    { key: "authors", label: "저자", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "도서명", required: true },
    { key: "edition", label: "판(Edition)", hint: "예: 3rd" },
    { key: "publisher", label: "출판사", required: true },
    { key: "doi", label: "DOI/URL" },
  ],
  "edited-book": [
    { key: "editors", label: "편집자", kind: "authors", required: true, hint: "편집자를 입력 (Ed./Eds.)" },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "도서명", required: true },
    { key: "edition", label: "판(Edition)" },
    { key: "publisher", label: "출판사", required: true },
  ],
  chapter: [
    { key: "authors", label: "챕터 저자", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "챕터 제목", required: true },
    { key: "editors", label: "편집자", kind: "authors", required: true, hint: "도서 편집자" },
    { key: "containerTitle", label: "도서명", required: true },
    { key: "pages", label: "페이지", hint: "예: 55-72" },
    { key: "publisher", label: "출판사", required: true },
  ],
  conference: [
    { key: "authors", label: "발표자", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "date", label: "월 일" },
    { key: "title", label: "발표 제목", required: true },
    { key: "containerTitle", label: "학술대회명", required: true },
    { key: "city", label: "장소" },
    { key: "url", label: "URL" },
  ],
  thesis: [
    { key: "authors", label: "저자", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "논문 제목", required: true },
    { key: "institution", label: "수여 기관", required: true },
    { key: "repository", label: "저장소/DB", hint: "예: ProQuest, 기관 리포지터리" },
    { key: "url", label: "URL" },
  ],
  report: [
    { key: "authors", label: "저자/기관", kind: "authors", required: true, hint: "단체저자는 그대로 한 줄 입력" },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "보고서명", required: true },
    { key: "number", label: "보고서 번호", hint: "예: Report No. 123" },
    { key: "publisher", label: "발행기관", required: true },
    { key: "url", label: "URL" },
  ],
  dataset: [
    { key: "authors", label: "작성자", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "데이터셋명", required: true },
    { key: "version", label: "버전", hint: "예: 2.1" },
    { key: "publisher", label: "저장소/배포처", required: true, hint: "예: Zenodo, ICPSR" },
    { key: "doi", label: "DOI/URL" },
  ],
  software: [
    { key: "authors", label: "개발자/제작사", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "소프트웨어명", required: true },
    { key: "version", label: "버전" },
    { key: "publisher", label: "배포처(선택)" },
    { key: "url", label: "URL", required: true },
  ],
  web: [
    { key: "authors", label: "저자/기관", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "date", label: "월 일", hint: "예: May 5" },
    { key: "title", label: "페이지 제목", required: true },
    { key: "containerTitle", label: "사이트명", required: true },
    { key: "url", label: "URL", required: true },
    { key: "retrievalDate", label: "검색일(수시 변경 시)", hint: "예: Retrieved June 1, 2025" },
  ],
  social: [
    { key: "authors", label: "계정/표시이름", kind: "authors", required: true, hint: "표시이름. 사용자명은 note에 [@handle]" },
    { key: "year", label: "연도", required: true },
    { key: "date", label: "월 일", required: true },
    { key: "title", label: "게시물 내용(앞부분)", required: true, kind: "textarea" },
    { key: "containerTitle", label: "플랫폼", required: true, hint: "예: X, Instagram" },
    { key: "url", label: "URL", required: true },
  ],
  video: [
    { key: "authors", label: "제작자/채널", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "date", label: "월 일" },
    { key: "title", label: "제목", required: true },
    { key: "containerTitle", label: "플랫폼", required: true, hint: "예: YouTube, TED" },
    { key: "url", label: "URL", required: true },
  ],
  legal: [
    { key: "title", label: "법령/판례명", required: true },
    { key: "number", label: "번호/권수", hint: "예: Regulation (EU) 2024/1689" },
    { key: "year", label: "연도", required: true },
    { key: "containerTitle", label: "출처(Reporter/관보)" },
    { key: "jurisdiction", label: "관할" },
    { key: "url", label: "URL" },
  ],
  ai: [
    { key: "authors", label: "제작사", kind: "authors", required: true, hint: "예: OpenAI, Anthropic" },
    { key: "year", label: "연도", required: true },
    { key: "title", label: "모델명·버전", required: true, hint: "예: ChatGPT (June 11 version)" },
    { key: "publisher", label: "제공처(선택)" },
    { key: "url", label: "URL", required: true },
  ],
  personal: [
    { key: "authors", label: "발신자", kind: "authors", required: true },
    { key: "year", label: "연도", required: true },
    { key: "date", label: "월 일", required: true },
    { key: "title", label: "형태", hint: "예: personal communication, email" },
  ],
};

export function profileFor(code: string): FieldDef[] {
  const t = typeByCode(code);
  return (t && PROFILES[t.profile]) || PROFILES.journal;
}

/* ───────────────────────── Identifier Engine ──────────────────────────── */

export const ID_PATTERNS = {
  doi: /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/,
  issn: /^\d{4}-\d{3}[\dxX]$/,
  isbn: /^(?:\d[\d-]{10,16}\d|\d{9}[\dxX])$/,
  orcid: /^\d{4}-\d{4}-\d{4}-\d{3}[\dxX]$/,
  url: /^https?:\/\/\S+$/i,
};

export function normalizeDoi(raw: string): string {
  const d = raw.trim();
  if (!d) return "";
  if (/^https?:\/\//.test(d)) return d;
  return "https://doi.org/" + d.replace(/^doi:\s*/i, "");
}

/* ───────────────────────── Author Engine ──────────────────────────────── */

/** "성, 이름" / "홍길동" / "Smith J M" / 단체명 한 줄 → CSLName[] */
export function parseAuthors(raw: string): CSLName[] {
  return raw
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      // 단체저자: 공백 포함 + 쉼표 없음 + 영문 다단어가 아닌 경우는 literal 로 보존하기 어려우므로
      // 휴리스틱: 마지막 글자가 '.' 이 아니고 단어가 3개 이상이며 모두 첫 글자 대문자가 아니면 단체로 간주
      const looksOrg =
        /(university|institute|association|organization|department|ministry|oecd|who|unesco|openai|google|microsoft|회|원|부|청|학회|협회|연구소|대학교)/i.test(
          line
        );
      if (looksOrg && !line.includes(",")) return { literal: line };
      if (line.includes(",")) {
        const [fam, giv] = line.split(",");
        return { family: fam.trim(), given: (giv || "").trim() };
      }
      // 한글 이름: 성+이름 분리 어려움 → literal 로 두되 성은 첫 글자(가족명 관습은 전체 표기)
      if (/[가-힣]/.test(line)) return { literal: line };
      const parts = line.split(/\s+/);
      if (parts.length === 1) return { literal: parts[0] };
      const family = parts[parts.length - 1];
      const given = parts.slice(0, -1).join(" ");
      return { family, given };
    });
}

function initials(given?: string): string {
  if (!given) return "";
  return given
    .split(/\s|\./)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + ".")
    .join(" ");
}

/** 참고문헌 목록용 저자 표기 (APA7: 성, 이니셜.) */
function authorListRef(names: CSLName[]): string {
  if (!names.length) return "";
  const fmt = (n: CSLName) => {
    if (n.literal) return n.literal;
    const ini = initials(n.given);
    return ini ? `${n.family}, ${ini}` : n.family || "";
  };
  const arr = names.map(fmt).filter(Boolean);
  if (arr.length === 1) return arr[0];
  if (arr.length <= 20) return arr.slice(0, -1).join(", ") + ", & " + arr[arr.length - 1];
  // 21명 이상: 첫 19명 … 마지막 1명
  return arr.slice(0, 19).join(", ") + ", … " + arr[arr.length - 1];
}

/** 본문 인용용 성(姓) 추출 */
function familyName(n?: CSLName): string {
  if (!n) return "";
  if (n.literal) return n.literal;
  return n.family || "";
}

/** 챕터의 "In J. Lee (Ed.)," 위치용 — 이니셜 먼저, 성 나중 */
function editorsInline(names: CSLName[]): string {
  const fmt = (n: CSLName) => (n.literal ? n.literal : `${initials(n.given)} ${n.family || ""}`.trim());
  const arr = names.map(fmt).filter(Boolean);
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} & ${arr[1]}`;
  return arr.slice(0, -1).join(", ") + ", & " + arr[arr.length - 1];
}

/* ───────────────────────── Date Engine ────────────────────────────────── */

function yearStr(e: CKGEntry): string {
  const y = (e.year || "").trim();
  return (y || "n.d.") + (e.suffix || "");
}
function fullDate(e: CKGEntry): string {
  const y = (e.year || "").trim() || "n.d.";
  const d = (e.date || "").trim();
  return d ? `${y}, ${d}` : y;
}

/* ───────────────────── L4. In-Text Citation Engine ────────────────────── */

export type InTextKind = "narrative" | "parenthetical" | "direct" | "block";

export function authorInText(names: CSLName[], opts?: { narrative?: boolean }): string {
  const fams = names.map(familyName).filter(Boolean);
  if (fams.length === 0) return "";
  if (fams.length === 1) return fams[0];
  if (fams.length === 2) return opts?.narrative ? `${fams[0]} and ${fams[1]}` : `${fams[0]} & ${fams[1]}`;
  return `${fams[0]} et al.`; // 3+ 첫 인용부터 et al.
}

export function buildInText(e: CKGEntry, kind: InTextKind = "parenthetical", page?: string): string {
  // 개인교신: 참고문헌 없음, 본문 인용만 (이름, personal communication, 날짜)
  if (e.type === "personal-communication") {
    const a = authorInText(e.authors, { narrative: kind === "narrative" });
    return `(${a}, personal communication, ${fullDate(e)})`;
  }
  const y = yearStr(e);
  const hasAuthor = e.authors.length > 0 || e.editors?.length;
  if (!hasAuthor) {
    // No Author → 제목(짧게)으로 대체
    const t = e.title ? `"${e.title}"` : "Untitled";
    if (kind === "narrative") return `${t} (${y})`;
    return `(${t}, ${y})`;
  }
  const names = e.authors.length ? e.authors : e.editors || [];
  const pageStr = page ? `, p. ${page}` : "";
  switch (kind) {
    case "narrative":
      return `${authorInText(names, { narrative: true })} (${y})`;
    case "direct":
      return `(${authorInText(names)}, ${y}${page ? `, p. ${page}` : ", p. __"})`;
    case "block":
      return `(${authorInText(names)}, ${y}${page ? `, p. ${page}` : ", p. __"})  · 40단어↑ 블록인용(들여쓰기, 따옴표 없음)`;
    default:
      return `(${authorInText(names)}, ${y}${pageStr})`;
  }
}

/* ──────────────────── L5. Reference List / Rendering ──────────────────── */

export type StyleId =
  | "apa7"
  | "apa6"
  | "mla9"
  | "chicago"
  | "harvard"
  | "ieee"
  | "vancouver"
  | "kci";

export const STYLES: { id: StyleId; label: string }[] = [
  { id: "apa7", label: "APA 7" },
  { id: "apa6", label: "APA 6" },
  { id: "mla9", label: "MLA 9" },
  { id: "chicago", label: "Chicago" },
  { id: "harvard", label: "Harvard" },
  { id: "ieee", label: "IEEE" },
  { id: "vancouver", label: "Vancouver" },
  { id: "kci", label: "KCI(국문)" },
];

// 마크다운 이탤릭(*…*)으로 강조. UI에서 <em> 으로 렌더.
function it(s?: string) {
  return s ? `*${s}*` : "";
}
function clean(s: string) {
  return s.replace(/\s+([.,])/g, "$1").replace(/\.\.+/g, ".").replace(/\s{2,}/g, " ").trim();
}
function fullTitle(e: CKGEntry) {
  return e.subtitle ? `${e.title}: ${e.subtitle}` : e.title || "";
}
function pagesPart(e: CKGEntry) {
  return e.pages ? e.pages : e.articleNumber ? `Article ${e.articleNumber}` : "";
}
function linkPart(e: CKGEntry) {
  if (e.doi) return normalizeDoi(e.doi);
  if (e.url) return e.url;
  return "";
}
function bracket(e: CKGEntry): string {
  const t = typeByCode(e.type);
  const f = e.format || t?.format;
  return f ? ` [${f}]` : "";
}

/** APA 저자 요소는 마침표로 끝나야 한다. "Author. (date)." 형태로 안전 결합. */
function headAD(A: string, dateStr: string, ed = ""): string {
  const head = (A + ed).trim();
  const dot = !head || /[.)\]?!]$/.test(head) ? "" : ".";
  return `${head}${dot} (${dateStr}).`;
}

/* ── APA7 렌더 (핵심) ── */
function renderAPA7(e: CKGEntry): string {
  const A = authorListRef(e.authors.length ? e.authors : e.editors || []);
  const edSuffix =
    !e.authors.length && e.editors?.length ? ` (${e.editors.length > 1 ? "Eds." : "Ed."})` : "";
  const Y = yearStr(e);
  const fam = typeByCode(e.type)?.family;

  // Edge Case: 저자·편집자 모두 없음 → 제목을 저자 자리로 이동 (APA7_EDGE_002)
  const hasCreator = e.authors.length > 0 || (e.editors && e.editors.length > 0);
  if (!hasCreator && fam && fam !== "legal" && fam !== "personal" && fullTitle(e)) {
    const standalone = fam !== "periodical" && fam !== "chapter";
    const head = standalone ? it(fullTitle(e)) : fullTitle(e);
    const dateStr =
      fam === "web" || fam === "social" || fam === "video" || fam === "audio" || e.type === "magazine-article" || e.type === "newspaper-article"
        ? fullDate(e)
        : Y;
    let tail = "";
    if (fam === "periodical")
      tail = `${it(e.containerTitle)}${e.volume ? `, ${it(e.volume)}` : ""}${e.issue ? `(${e.issue})` : ""}${pagesPart(e) ? `, ${pagesPart(e)}` : ""}.`;
    else if (fam === "book" || fam === "report" || fam === "thesis") tail = `${e.publisher || e.institution || ""}.`;
    else if (fam === "web") tail = `${e.containerTitle || ""}.`;
    else if (fam === "social" || fam === "video" || fam === "audio")
      tail = `${bracket(e) ? bracket(e).trim() + ". " : ""}${e.containerTitle || ""}.`;
    else if (fam === "dataset" || fam === "software" || fam === "ai")
      tail = `${bracket(e) ? bracket(e).trim() + ". " : ""}${e.publisher ? e.publisher + ". " : ""}`;
    return clean(`${head}. (${dateStr}). ${tail} ${linkPart(e)}`);
  }

  switch (fam) {
    case "periodical": {
      if (e.type === "magazine-article" || e.type === "newspaper-article") {
        return clean(
          `${headAD(A, fullDate(e), edSuffix)} ${fullTitle(e)}. ${it(e.containerTitle)}${
            e.volume ? `, ${it(e.volume)}` : ""
          }${e.issue ? `(${e.issue})` : ""}${pagesPart(e) ? `, ${pagesPart(e)}` : ""}. ${linkPart(e)}`
        );
      }
      if (e.type === "preprint") {
        return clean(`${headAD(A, Y)} ${fullTitle(e)}. ${it(e.repository || "Preprint")}. ${linkPart(e)}`);
      }
      return clean(
        `${headAD(A, Y, edSuffix)} ${fullTitle(e)}. ${it(e.containerTitle)}${
          e.volume ? `, ${it(e.volume)}` : ""
        }${e.issue ? `(${e.issue})` : ""}${pagesPart(e) ? `, ${pagesPart(e)}` : ""}.${
          e.retracted ? " (Retraction published)" : ""
        } ${linkPart(e)}`
      );
    }
    case "book": {
      return clean(
        `${headAD(A, Y, edSuffix)} ${it(fullTitle(e))}${e.edition ? ` (${e.edition} ed.)` : ""}. ${
          e.publisher || ""
        }. ${linkPart(e)}`
      );
    }
    case "chapter": {
      const eds = editorsInline(e.editors || []);
      return clean(
        `${headAD(A, Y)} ${fullTitle(e)}. In ${eds} (${(e.editors?.length || 1) > 1 ? "Eds." : "Ed."}), ${it(
          e.containerTitle
        )}${e.pages ? ` (pp. ${e.pages})` : ""}. ${e.publisher || ""}. ${linkPart(e)}`
      );
    }
    case "conference": {
      return clean(
        `${headAD(A, fullDate(e))} ${it(fullTitle(e))}${bracket(e)}. ${e.containerTitle || ""}${
          e.city ? `, ${e.city}` : ""
        }. ${linkPart(e)}`
      );
    }
    case "thesis": {
      const deg = e.format || typeByCode(e.type)?.format || "Doctoral dissertation";
      return clean(
        `${headAD(A, Y)} ${it(fullTitle(e))} [${deg}, ${e.institution || ""}]. ${e.repository || ""}. ${linkPart(
          e
        )}`
      );
    }
    case "report": {
      return clean(
        `${headAD(A, Y)} ${it(fullTitle(e))}${e.number ? ` (${e.number})` : ""}. ${e.publisher || ""}. ${linkPart(
          e
        )}`
      );
    }
    case "dataset": {
      return clean(
        `${headAD(A, Y)} ${it(fullTitle(e))}${e.version ? ` (Version ${e.version})` : ""}${bracket(e)}. ${
          e.publisher || ""
        }. ${linkPart(e)}`
      );
    }
    case "software": {
      return clean(
        `${headAD(A, Y)} ${it(fullTitle(e))}${e.version ? ` (Version ${e.version})` : ""}${bracket(e)}. ${
          e.publisher ? e.publisher + ". " : ""
        }${linkPart(e)}`
      );
    }
    case "web": {
      return clean(
        `${headAD(A, fullDate(e))} ${it(fullTitle(e))}. ${e.containerTitle || ""}. ${
          e.retrievalDate ? e.retrievalDate + ", " : ""
        }${linkPart(e)}`
      );
    }
    case "social": {
      return clean(
        `${headAD(A, fullDate(e))} ${it(truncate(fullTitle(e), 20))}${bracket(e)}. ${e.containerTitle || ""}. ${linkPart(
          e
        )}`
      );
    }
    case "video":
    case "audio": {
      return clean(`${headAD(A, fullDate(e))} ${it(fullTitle(e))}${bracket(e)}. ${e.containerTitle || ""}. ${linkPart(e)}`);
    }
    case "legal": {
      return clean(`${fullTitle(e)}${e.number ? `, ${e.number}` : ""} (${Y}). ${e.containerTitle || ""} ${linkPart(e)}`);
    }
    case "ai": {
      return clean(`${headAD(A, Y)} ${it(fullTitle(e))}${bracket(e)}. ${e.publisher ? e.publisher + ". " : ""}${linkPart(e)}`);
    }
    case "personal":
      return "(개인교신은 참고문헌 목록에 포함하지 않습니다. 본문 인용만 사용하세요.)";
    default:
      return clean(`${headAD(A, Y)} ${it(fullTitle(e))}. ${linkPart(e)}`);
  }
}

function truncate(s: string, words: number) {
  const arr = s.split(/\s+/);
  return arr.length > words ? arr.slice(0, words).join(" ") + " …" : s;
}

/* ── 기타 스타일(주요 유형 중심 베스트에포트) ── */
function renderOther(e: CKGEntry, style: StyleId): string {
  const fam = typeByCode(e.type)?.family;
  const authorsFML = e.authors.map((n) => (n.literal ? n.literal : `${n.family}, ${initials(n.given)}`)).filter(Boolean);
  const authorsInline = e.authors
    .map((n) => (n.literal ? n.literal : `${n.given || ""} ${n.family || ""}`.trim()))
    .filter(Boolean);
  const Y = yearStr(e);
  const T = fullTitle(e);
  const J = e.containerTitle || "";
  const vol = e.volume ? e.volume : "";
  const iss = e.issue ? `(${e.issue})` : "";
  const pg = e.pages || "";
  const link = linkPart(e);

  switch (style) {
    case "apa6":
      // APA6: 위치(출판사 도시) 포함, DOI 'doi:' 표기 차이 정도만 반영
      if (fam === "book") return clean(`${authorsFML.join(", ")} (${Y}). ${it(T)}. ${e.city ? e.city + ": " : ""}${e.publisher || ""}.`);
      return clean(`${authorsFML.join(", ")} (${Y}). ${T}. ${it(J)}, ${it(vol)}${iss}, ${pg}. ${link}`);
    case "mla9":
      // MLA9: 저자. "제목." 컨테이너, 권.호, 연도, 페이지.
      if (fam === "book") return clean(`${authorsInline.join(", ")}. ${it(T)}. ${e.publisher || ""}, ${Y}.`);
      return clean(`${authorsInline.join(", ")}. "${T}." ${it(J)}, vol. ${vol}, no. ${e.issue || ""}, ${Y}, pp. ${pg}. ${link}`);
    case "chicago":
      if (fam === "book") return clean(`${authorsInline.join(", ")}. ${it(T)}. ${e.city ? e.city + ": " : ""}${e.publisher || ""}, ${Y}.`);
      return clean(`${authorsInline.join(", ")}. "${T}." ${it(J)} ${vol}, no. ${e.issue || ""} (${Y}): ${pg}. ${link}`);
    case "harvard":
      if (fam === "book") return clean(`${authorsFML.join(", ")} ${Y}, ${it(T)}, ${e.publisher || ""}${e.city ? ", " + e.city : ""}.`);
      return clean(`${authorsFML.join(", ")} ${Y}, '${T}', ${it(J)}, vol. ${vol}, no. ${e.issue || ""}, pp. ${pg}. ${link}`);
    case "ieee": {
      const ieeeAuthors = e.authors
        .map((n) => (n.literal ? n.literal : `${initials(n.given).replace(/\.\s?/g, ". ")}${n.family}`.trim()))
        .join(", ");
      if (fam === "book") return clean(`${ieeeAuthors}, ${it(T)}. ${e.city ? e.city + ": " : ""}${e.publisher || ""}, ${Y}.`);
      return clean(`${ieeeAuthors}, "${T}," ${it(J)}, vol. ${vol}, no. ${e.issue || ""}, pp. ${pg}, ${Y}. ${link}`);
    }
    case "vancouver": {
      const vanAuthors = e.authors
        .map((n) => (n.literal ? n.literal : `${n.family} ${initials(n.given).replace(/\./g, "").replace(/\s/g, "")}`))
        .join(", ");
      return clean(`${vanAuthors}. ${T}. ${J}. ${Y};${vol}${iss}:${pg}.`);
    }
    case "kci":
      // 국문 KCI 근사: 저자(연도). 제목. 학술지, 권(호), 페이지.
      return clean(`${e.authors.map((n) => n.literal || `${n.family}`).join(", ")} (${Y}). ${T}. ${J}, ${vol}${iss}, ${pg}.`);
    default:
      return renderAPA7(e);
  }
}

export function renderReference(e: CKGEntry, style: StyleId = "apa7"): string {
  if (style === "apa7") return renderAPA7(e);
  return renderOther(e, style);
}

/* ───────────────────── L9. Edge Case Engine ───────────────────────────── */

/** 동일 제1저자 + 동일 연도 → a/b/c 접미사 부여. 리스트 전체에 적용. */
export function applyEdgeCases(entries: CKGEntry[]): CKGEntry[] {
  const groups: Record<string, CKGEntry[]> = {};
  for (const e of entries) {
    const key = (familyName(e.authors[0] || e.editors?.[0]) || "anon") + "|" + (e.year || "nd");
    (groups[key] ||= []).push(e);
  }
  const out = entries.map((e) => ({ ...e, suffix: undefined as string | undefined }));
  for (const key of Object.keys(groups)) {
    const g = groups[key];
    if (g.length > 1) {
      g.forEach((e, i) => {
        const target = out.find((o) => o.id === e.id);
        if (target) target.suffix = String.fromCharCode(97 + i); // a, b, c…
      });
    }
  }
  return out;
}

/* ───────────────────── L4. Validation Engine ──────────────────────────── */

export interface Issue {
  level: "error" | "warn" | "ok";
  code: string;
  msg: string;
  fix?: string; // 자동수정 가능 코드
}

export function validateEntry(e: CKGEntry): Issue[] {
  const out: Issue[] = [];
  const prof = profileFor(e.type);
  const t = typeByCode(e.type);

  // 필수 필드
  for (const f of prof) {
    if (!f.required) continue;
    const v = (e as any)[f.key];
    const has = f.kind === "authors" ? Array.isArray(v) && v.length : !!(v && String(v).trim());
    if (!has) {
      if (f.key === "authors" && t?.family !== "legal") {
        out.push({ level: "warn", code: "MISSING_AUTHOR", msg: "저자 없음 → 제목을 저자 자리로 이동(APA 규칙).", fix: "no-author" });
      } else if (f.key === "year") {
        out.push({ level: "warn", code: "MISSING_DATE", msg: "연도 없음 → (n.d.)로 표기.", fix: "no-date" });
      } else {
        out.push({ level: "error", code: "MISSING_" + String(f.key).toUpperCase(), msg: `${f.label}(필수)가 비어 있습니다.` });
      }
    }
  }
  // DOI/URL
  if (e.doi && !ID_PATTERNS.doi.test(e.doi.replace(/^https?:\/\/doi\.org\//, "").replace(/^doi:\s*/i, "")))
    out.push({ level: "warn", code: "DOI_FORMAT", msg: "DOI 형식이 표준과 다릅니다 (10.xxxx/…).", fix: "doi-normalize" });
  if (e.url && /^http:\/\//.test(e.url))
    out.push({ level: "warn", code: "HTTP_URL", msg: "URL은 https:// 권장.", fix: "https" });
  if (e.issn && !ID_PATTERNS.issn.test(e.issn))
    out.push({ level: "warn", code: "ISSN_FORMAT", msg: "ISSN 형식 확인 필요 (####-###X)." });
  if (e.type === "journal-article" && !e.doi && !e.url)
    out.push({ level: "warn", code: "JOURNAL_NO_DOI", msg: "학술지 논문은 DOI 권장(있으면 반드시 표기)." });
  if (e.retracted)
    out.push({ level: "warn", code: "RETRACTED", msg: "철회(retracted) 문헌입니다 — 인용 시 명시 필요." });

  if (out.length === 0) out.push({ level: "ok", code: "OK", msg: "APA 7 기본 규칙 위반이 발견되지 않았습니다." });
  return out;
}

/** 리스트 전체 검증 + 중복 + 컴플라이언스 점수(0~100) */
export function validateList(entries: CKGEntry[]): {
  perEntry: Record<string, Issue[]>;
  duplicates: string[][];
  score: number;
} {
  const perEntry: Record<string, Issue[]> = {};
  let errs = 0;
  let warns = 0;
  for (const e of entries) {
    const iss = validateEntry(e);
    perEntry[e.id] = iss;
    errs += iss.filter((i) => i.level === "error").length;
    warns += iss.filter((i) => i.level === "warn").length;
  }
  // 중복: 제목+연도 동일
  const seen: Record<string, string[]> = {};
  for (const e of entries) {
    const k = (e.title || "").toLowerCase().replace(/\s+/g, " ").trim() + "|" + (e.year || "");
    if (!k.startsWith("|")) (seen[k] ||= []).push(e.id);
  }
  const duplicates = Object.values(seen).filter((g) => g.length > 1);
  const denom = Math.max(1, entries.length);
  const score = Math.max(0, Math.round(100 - (errs * 12 + warns * 4 + duplicates.length * 6) / denom));
  return { perEntry, duplicates, score };
}

/* ───────────────────── L13. Auto Repair Engine ────────────────────────── */

export function autoRepair(e: CKGEntry, fix: string): CKGEntry {
  const n = { ...e };
  switch (fix) {
    case "doi-normalize":
      n.doi = normalizeDoi(e.doi || "");
      break;
    case "https":
      if (n.url) n.url = n.url.replace(/^http:\/\//, "https://");
      break;
    case "no-date":
      if (!n.year) n.year = "";
      break; // 렌더 시 n.d. 자동
    case "no-author":
      break; // 렌더가 제목-우선 처리
  }
  return n;
}

/* ───────────────────── L10. Transformation Engine ─────────────────────── */

/** RIS / BibTeX / CSL-JSON / DOI 문자열 → CKGEntry (간이 파서) */
export function parseImport(text: string): CKGEntry | null {
  const t = text.trim();
  if (!t) return null;

  // DOI 단독
  if (ID_PATTERNS.doi.test(t.replace(/^https?:\/\/doi\.org\//, ""))) {
    return { ...emptyEntry("journal-article"), doi: t };
  }

  // CSL-JSON
  if (/^[\[{]/.test(t)) {
    try {
      const j = JSON.parse(t);
      const o = Array.isArray(j) ? j[0] : j;
      const e = emptyEntry(cslTypeToCode(o.type));
      e.title = o.title || "";
      e.year = String(o.issued?.["date-parts"]?.[0]?.[0] || o.year || "");
      e.containerTitle = o["container-title"] || o.containerTitle || "";
      e.volume = o.volume ? String(o.volume) : "";
      e.issue = o.issue ? String(o.issue) : "";
      e.pages = o.page || o.pages || "";
      e.doi = o.DOI || o.doi || "";
      e.publisher = o.publisher || "";
      e.authors = (o.author || []).map((a: any) => ({ family: a.family, given: a.given, literal: a.literal }));
      e.editors = (o.editor || []).map((a: any) => ({ family: a.family, given: a.given, literal: a.literal }));
      return e;
    } catch {
      return null;
    }
  }

  // RIS
  if (/(^|\n)TY\s+-\s+/i.test(t)) {
    const g = (tag: string) => {
      const m = t.match(new RegExp(`(?:^|\\n)${tag}\\s+-\\s+(.+)`, "i"));
      return m ? m[1].trim() : "";
    };
    const ty = g("TY").toUpperCase();
    const e = emptyEntry(ty.includes("BOOK") ? "book" : ty.includes("CHAP") ? "book-chapter" : ty.includes("CONF") ? "conference-paper" : "journal-article");
    e.authors = [...t.matchAll(/(?:^|\n)A[U1]\s+-\s+(.+)/gi)].map((m) => parseAuthors(m[1].trim())[0]).filter(Boolean) as CSLName[];
    e.year = g("PY") || g("Y1");
    e.title = g("TI") || g("T1");
    e.containerTitle = g("JO") || g("JF") || g("T2");
    e.volume = g("VL");
    e.issue = g("IS");
    const sp = g("SP"), ep = g("EP");
    e.pages = sp && ep ? `${sp}-${ep}` : sp;
    e.doi = g("DO");
    e.publisher = g("PB");
    e.url = g("UR");
    return e;
  }

  // BibTeX
  if (/@\w+\s*\{/.test(t)) {
    const typeMatch = t.match(/@(\w+)\s*\{/);
    const bt = (typeMatch?.[1] || "").toLowerCase();
    const code = bt === "book" ? "book" : bt === "inbook" || bt === "incollection" ? "book-chapter" : bt === "inproceedings" || bt === "conference" ? "conference-paper" : bt === "phdthesis" ? "dissertation" : "journal-article";
    const g = (k: string) => {
      const m = t.match(new RegExp(`${k}\\s*=\\s*[{\"]([^}\"]+)[}\"]`, "i"));
      return m ? m[1].trim() : "";
    };
    const e = emptyEntry(code);
    e.authors = parseAuthors(g("author").replace(/\s+and\s+/gi, "\n"));
    e.editors = parseAuthors(g("editor").replace(/\s+and\s+/gi, "\n"));
    e.year = g("year");
    e.title = g("title");
    e.containerTitle = g("journal") || g("booktitle");
    e.volume = g("volume");
    e.issue = g("number");
    e.pages = g("pages").replace(/--/, "-");
    e.doi = g("doi");
    e.publisher = g("publisher");
    e.url = g("url");
    return e;
  }
  return null;
}

function cslTypeToCode(t?: string): string {
  switch (t) {
    case "book":
      return "book";
    case "chapter":
      return "book-chapter";
    case "paper-conference":
      return "conference-paper";
    case "thesis":
      return "dissertation";
    case "webpage":
      return "webpage";
    case "dataset":
      return "dataset";
    case "software":
      return "software";
    default:
      return "journal-article";
  }
}

/* ── Export: CSL-JSON / BibTeX / RIS 직렬화 ── */
export function toCSLJSON(entries: CKGEntry[]): string {
  const arr = entries.map((e) => ({
    id: e.id,
    type: codeToCsl(e.type),
    title: e.title,
    author: e.authors.map((a) => (a.literal ? { literal: a.literal } : { family: a.family, given: a.given })),
    editor: (e.editors || []).map((a) => (a.literal ? { literal: a.literal } : { family: a.family, given: a.given })),
    issued: e.year ? { "date-parts": [[Number(e.year) || e.year]] } : undefined,
    "container-title": e.containerTitle || undefined,
    volume: e.volume || undefined,
    issue: e.issue || undefined,
    page: e.pages || undefined,
    publisher: e.publisher || undefined,
    DOI: e.doi || undefined,
    URL: e.url || undefined,
  }));
  return JSON.stringify(arr, null, 2);
}
function codeToCsl(code: string): string {
  const fam = typeByCode(code)?.family;
  if (fam === "book") return "book";
  if (fam === "chapter") return "chapter";
  if (fam === "conference") return "paper-conference";
  if (fam === "thesis") return "thesis";
  if (fam === "web") return "webpage";
  if (fam === "dataset") return "dataset";
  if (fam === "software") return "software";
  return "article-journal";
}
export function toBibTeX(entries: CKGEntry[]): string {
  return entries
    .map((e, i) => {
      const fam = typeByCode(e.type)?.family;
      const bt = fam === "book" ? "book" : fam === "chapter" ? "incollection" : fam === "conference" ? "inproceedings" : fam === "thesis" ? "phdthesis" : "article";
      const key = (e.authors[0]?.family || e.authors[0]?.literal || "ref").replace(/\W/g, "") + (e.year || i);
      const fields: string[] = [];
      const au = e.authors.map((a) => (a.literal ? a.literal : `${a.family}, ${a.given || ""}`.trim())).join(" and ");
      if (au) fields.push(`  author = {${au}}`);
      if (e.title) fields.push(`  title = {${e.title}}`);
      if (e.year) fields.push(`  year = {${e.year}}`);
      if (e.containerTitle) fields.push(`  ${fam === "periodical" ? "journal" : "booktitle"} = {${e.containerTitle}}`);
      if (e.volume) fields.push(`  volume = {${e.volume}}`);
      if (e.issue) fields.push(`  number = {${e.issue}}`);
      if (e.pages) fields.push(`  pages = {${e.pages.replace("-", "--")}}`);
      if (e.publisher) fields.push(`  publisher = {${e.publisher}}`);
      if (e.doi) fields.push(`  doi = {${e.doi}}`);
      if (e.url) fields.push(`  url = {${e.url}}`);
      return `@${bt}{${key},\n${fields.join(",\n")}\n}`;
    })
    .join("\n\n");
}
export function toRIS(entries: CKGEntry[]): string {
  return entries
    .map((e) => {
      const fam = typeByCode(e.type)?.family;
      const ty = fam === "book" ? "BOOK" : fam === "chapter" ? "CHAP" : fam === "conference" ? "CONF" : fam === "thesis" ? "THES" : "JOUR";
      const lines = [`TY  - ${ty}`];
      e.authors.forEach((a) => lines.push(`AU  - ${a.literal || `${a.family}, ${a.given || ""}`.trim()}`));
      if (e.year) lines.push(`PY  - ${e.year}`);
      if (e.title) lines.push(`TI  - ${e.title}`);
      if (e.containerTitle) lines.push(`JO  - ${e.containerTitle}`);
      if (e.volume) lines.push(`VL  - ${e.volume}`);
      if (e.issue) lines.push(`IS  - ${e.issue}`);
      if (e.pages) {
        const [sp, ep] = e.pages.split(/[-–]/);
        if (sp) lines.push(`SP  - ${sp.trim()}`);
        if (ep) lines.push(`EP  - ${ep.trim()}`);
      }
      if (e.doi) lines.push(`DO  - ${e.doi}`);
      if (e.url) lines.push(`UR  - ${e.url}`);
      if (e.publisher) lines.push(`PB  - ${e.publisher}`);
      lines.push("ER  - ");
      return lines.join("\n");
    })
    .join("\n\n");
}

/* ───────────────────── Type Detection (휴리스틱) ──────────────────────── */

export function detectType(input: string): string {
  const s = input.toLowerCase();
  if (/doi\.org|^10\.\d{4}/.test(s)) return "journal-article";
  if (/youtube\.com|youtu\.be/.test(s)) return "youtube";
  if (/ted\.com/.test(s)) return "ted";
  if (/twitter\.com|x\.com\//.test(s)) return "tweet";
  if (/instagram\.com/.test(s)) return "instagram";
  if (/facebook\.com/.test(s)) return "facebook";
  if (/github\.com|zenodo\.org/.test(s)) return /dataset|data/.test(s) ? "dataset" : "software";
  if (/chatgpt|openai|claude|gemini|perplexity/.test(s)) return "ai-generated";
  if (/\.gov|oecd|unesco|ministry|보고서|report/.test(s)) return "report";
  if (/dissertation|thesis|학위/.test(s)) return "dissertation";
  if (/isbn|publisher|press|단행본|book/.test(s)) return "book";
  if (/https?:\/\//.test(s)) return "webpage";
  return "journal-article";
}

/* ───────────────────── L6. Knowledge Base (Rule DB 발췌) ──────────────── */

export interface APARule {
  id: string;
  category: "in-text" | "reference" | "validation" | "edge" | "author" | "date";
  title: string;
  desc: string;
  example?: string;
}

export const APA_RULES: APARule[] = [
  { id: "APA7_ITX_001", category: "in-text", title: "저자 1명", desc: "괄호: (Kim, 2025) / 서술: Kim (2025).", example: "(Kim, 2025)" },
  { id: "APA7_ITX_002", category: "in-text", title: "저자 2명", desc: "괄호는 &, 서술은 and 사용.", example: "(Kim & Lee, 2025) / Kim and Lee (2025)" },
  { id: "APA7_ITX_003", category: "in-text", title: "저자 3명 이상", desc: "첫 인용부터 제1저자 + et al.", example: "(Kim et al., 2025)" },
  { id: "APA7_ITX_004", category: "in-text", title: "단체 저자", desc: "처음엔 전체명(약어), 이후 약어 사용 가능.", example: "(World Health Organization [WHO], 2024)" },
  { id: "APA7_ITX_005", category: "in-text", title: "직접 인용", desc: "저자·연도·쪽수 필수. 40단어↑는 블록 인용.", example: "(Kim, 2024, p. 22)" },
  { id: "APA7_ITX_006", category: "in-text", title: "2차 인용", desc: "원문을 못 봤을 때 as cited in 사용.", example: "(Freud, 1923, as cited in Kim, 2025)" },
  { id: "APA7_AUT_001", category: "author", title: "최대 20명", desc: "참고문헌은 최대 20명 표기, 21명↑은 첫 19명 … 마지막 1명.", example: "A, B, … Z." },
  { id: "APA7_DAT_001", category: "date", title: "날짜 미상", desc: "연도가 없으면 (n.d.).", example: "(n.d.)" },
  { id: "APA7_EDGE_001", category: "edge", title: "동저자·동년도", desc: "연도 뒤 a, b, c… 부여(제목 알파벳순).", example: "(Kim, 2025a); (Kim, 2025b)" },
  { id: "APA7_EDGE_002", category: "edge", title: "저자 없음", desc: "제목을 저자 자리로 이동(이탤릭/따옴표 규칙 유지).", example: "Title. (2024). Source." },
  { id: "APA7_REF_001", category: "reference", title: "구성 순서", desc: "Author → Date → Title → Source.", example: "Kim, M. (2025). Title. Journal." },
  { id: "APA7_REF_002", category: "reference", title: "제목 대소문자", desc: "논문/도서 제목은 sentence case, 학술지명은 title case+이탤릭.", example: "*AI Research Journal*" },
  { id: "APA7_REF_003", category: "reference", title: "DOI 표기", desc: "https://doi.org/ 형식. 'Retrieved from' 불필요.", example: "https://doi.org/10.1000/123" },
  { id: "APA7_REF_004", category: "reference", title: "전자책/온라인", desc: "포맷·플랫폼은 대괄호 표기.", example: "[Audiobook] / [Video]" },
  { id: "APA7_REF_005", category: "reference", title: "AI 생성물", desc: "제작사. (연도). 모델명(버전) [LLM]. URL.", example: "OpenAI. (2026). ChatGPT [Large language model]. https://…" },
  { id: "APA7_VAL_001", category: "validation", title: "개인교신", desc: "참고문헌 목록에 넣지 않고 본문에만 표기.", example: "(J. Kim, personal communication, May 1, 2025)" },
];
