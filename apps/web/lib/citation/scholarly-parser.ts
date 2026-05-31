/**
 * Scholarly Paper Parser — 저널 레이아웃별 정밀 메타데이터 추출
 * AI Research OS v20
 *
 * 첨부 지시(이미지 2·3)에 따라 두 저널 유형에서 다음을 정확히 캐치한다:
 *   - 발행연도 / 저널명 (journal + year)
 *   - 제목 (title)
 *   - 저자 (authors)
 *   - 요약 (abstract)
 *   - 핵심 키워드 (keywords)
 *   - DOI
 *
 * 대상 레이아웃:
 *   A) Elsevier / ScienceDirect 영문 저널
 *      예: "Image and Vision Computing 147 (2024) 105073"
 *          journal homepage / ABSTRACT / Keywords: ... / https://doi.org/10....
 *   B) 한국 디자인계열 저널 (국문+영문 혼용)
 *      예: 발행연도 라인 / 국문제목+영문제목 / 주저자·교신저자 /
 *          (요약)(Abstract) / (Keyword) / "Design Convergence Study 53 Vol.14. no.4 (2015.8)"
 */

import { RefAuthor, RefEntry, parseAuthorsAPA7 } from "./apa-utils";

export interface ScholarlyFields {
  title: string;
  authors: RefAuthor[];
  year: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  abstract: string;
  keywords: string[];
  /** 어떤 레이아웃으로 인식했는지 */
  layout: "elsevier" | "korean-journal" | "generic";
}

const DOI_RE = /\b10\.\d{4,}\/[^\s"<>]+/i;

function cleanDoi(s: string): string {
  return s
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/[.,;)\]]+$/, "")
    .trim();
}

/** Elsevier/ScienceDirect 영문 저널 헤더 인식 */
function looksElsevier(text: string): boolean {
  return (
    /sciencedirect/i.test(text) ||
    /journal homepage:/i.test(text) ||
    /A\s*B\s*S\s*T\s*R\s*A\s*C\s*T/.test(text) ||
    /Contents lists available at/i.test(text)
  );
}

/** 한국 저널(국문 요약/Keyword/Vol 표기) 인식 */
function looksKoreanJournal(text: string): boolean {
  return (
    /\(요\s*약\)|【?요약】?/.test(text) ||
    /\(Keyword[s]?\)/i.test(text) ||
    (/[가-힣]/.test(text) && /Vol\.?\s*\d+/i.test(text))
  );
}

/** 공통: DOI */
function extractDoi(text: string): string {
  const url = text.match(/https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,}\/[^\s"<>]+)/i);
  if (url) return cleanDoi(url[1]);
  const bare = text.match(DOI_RE);
  return bare ? cleanDoi(bare[0]) : "";
}

/** 공통: 요약(Abstract) 블록 추출 */
function extractAbstract(text: string): string {
  // 영문 ABSTRACT (자간 포함) ~ 다음 섹션(Keywords/1. Introduction) 전까지
  const en = text.match(
    /A\s*B\s*S\s*T\s*R\s*A\s*C\s*T\s*([\s\S]{40,1800}?)(?:\n\s*(?:Keywords?|©|\d+\.\s+Introduction|1\.\s|Received))/i
  );
  if (en && en[1].trim().length > 40) return squash(en[1]);

  // 국문 (요약) ~ (Abstract)/(Keyword) 전까지
  const ko = text.match(
    /\(\s*요\s*약\s*\)\s*([\s\S]{40,1800}?)(?:\(Abstract\)|\(Keyword)/i
  );
  if (ko && ko[1].trim().length > 30) return squash(ko[1]);

  // 영문 (Abstract) 괄호형
  const enParen = text.match(
    /\(\s*Abstract\s*\)\s*([\s\S]{40,1800}?)(?:\(Keyword|©|\n\s*\d+\.)/i
  );
  if (enParen && enParen[1].trim().length > 40) return squash(enParen[1]);

  return "";
}

/** 공통: 키워드 추출 */
function extractKeywords(text: string): string[] {
  // 영문 "Keywords: a; b; c" 또는 줄바꿈 나열
  const en = text.match(/Keywords?\s*[:\n]\s*([\s\S]{2,300}?)(?:\n\s*\n|©|\d\.\s+Introduction|ABSTRACT|$)/i);
  if (en) {
    const parts = splitKeywords(en[1]);
    if (parts.length) return parts;
  }
  // 국문 "(Keyword) a, b, c"
  const ko = text.match(/\(Keyword[s]?\)\s*([\s\S]{2,300}?)(?:\n\s*\n|$)/i);
  if (ko) {
    const parts = splitKeywords(ko[1]);
    if (parts.length) return parts;
  }
  return [];
}

function splitKeywords(raw: string): string[] {
  return raw
    .replace(/\n/g, " ")
    .split(/[;,·]|\s{2,}/)
    .map((k) => k.trim())
    .filter((k) => k.length >= 2 && k.length <= 40 && !/^https?:/i.test(k))
    .slice(0, 12);
}

function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 1500);
}

// ── 레이아웃 A: Elsevier / ScienceDirect ──────────────
function parseElsevier(text: string, lines: string[]): Partial<ScholarlyFields> {
  let journal = "",
    year = "",
    volume = "",
    title = "";
  const authors: RefAuthor[] = [];

  // 상단 "Journal Name 147 (2024) 105073"
  const headerIdx = lines.findIndex((l) =>
    /^[A-Z][A-Za-z&.\s]+\s+\d+\s*\(\s*(19|20)\d{2}\s*\)/.test(l)
  );
  if (headerIdx >= 0) {
    const m = lines[headerIdx].match(
      /^([A-Z][A-Za-z&.\s]+?)\s+(\d+)\s*\(\s*((?:19|20)\d{2})\s*\)/
    );
    if (m) {
      journal = m[1].trim();
      volume = m[2];
      year = m[3];
    }
  }
  // 저널명 보강: "journal homepage" 위쪽 큰 제목 라인
  if (!journal) {
    const jh = lines.findIndex((l) => /journal homepage:/i.test(l));
    if (jh > 0) {
      for (let i = jh - 1; i >= Math.max(0, jh - 4); i--) {
        if (lines[i].length >= 4 && /[A-Za-z]/.test(lines[i]) && !/contents lists/i.test(lines[i])) {
          journal = lines[i].trim();
          break;
        }
      }
    }
  }

  // 제목: ABSTRACT 위, 저자 위의 큰 라인 (homepage 이후 ~ ABSTRACT 전)
  const homeIdx = lines.findIndex((l) => /journal homepage:/i.test(l));
  const absIdx = lines.findIndex((l) => /^A\s*B\s*S\s*T\s*R\s*A\s*C\s*T/.test(l));
  const searchStart = homeIdx >= 0 ? homeIdx + 1 : 0;
  const searchEnd = absIdx >= 0 ? absIdx : Math.min(lines.length, searchStart + 12);
  const titleCands: string[] = [];
  for (let i = searchStart; i < searchEnd; i++) {
    const l = lines[i];
    if (
      l.length >= 12 &&
      l.length <= 220 &&
      !/check for updates|^A\s*R\s*T\s*I\s*C\s*L\s*E|keywords?:/i.test(l) &&
      !/^https?:|@/.test(l) &&
      /[A-Za-z]/.test(l)
    ) {
      titleCands.push(l);
      // 다음 줄이 저자 패턴이면 멈춤
      const next = lines[i + 1] || "";
      if (/^[A-Z][a-z]+ [A-Z][a-z]+(,| and |\s*\*|$)/.test(next)) break;
    }
  }
  if (titleCands.length) {
    title = titleCands.slice(0, 2).join(" ").replace(/\s+/g, " ").trim();
  }

  // 저자: 제목 직후 콤마 구분된 이름 라인
  if (title) {
    const ti = lines.findIndex((l) => l.includes(title.slice(0, 18)));
    for (let i = ti + 1; i < Math.min(lines.length, ti + 5); i++) {
      const l = (lines[i] || "").replace(/[\*†‡§¹²³⁴⁵⁶⁷⁸⁹⁰]/g, "").trim();
      if (/^[A-Z][a-z]+(\s+[A-Z]\.?)*\s+[A-Z][a-z]+(\s*,\s*[A-Z][a-z]+.*)*$/.test(l) && l.length < 160) {
        parseAuthorsAPA7(l.replace(/\s+and\s+/gi, ", ")).forEach((a) => authors.push(a));
        break;
      }
    }
  }

  return { journal, year, volume, title, authors, layout: "elsevier" };
}

// ── 레이아웃 B: 한국 저널 ──────────────────────────────
function parseKoreanJournal(text: string, lines: string[]): Partial<ScholarlyFields> {
  let journal = "",
    year = "",
    volume = "",
    issue = "",
    title = "";
  const authors: RefAuthor[] = [];

  // 발행연도: 상단 "확정일:2015.08.13" 또는 첫 4자리 연도
  const dateLine = lines.slice(0, 6).find((l) => /\d{4}[.\-]\d{1,2}[.\-]\d{1,2}/.test(l));
  if (dateLine) {
    const ym = dateLine.match(/(20\d{2}|19\d{2})/);
    if (ym) year = ym[1];
  }

  // 저널명 footer: "Design Convergence Study 53 Vol.14. no.4 (2015.8)"
  const footer = lines.find((l) => /Vol\.?\s*\d+/i.test(l) && /[A-Za-z]/.test(l));
  if (footer) {
    const fm = footer.match(/([A-Za-z][A-Za-z\s]+?)\s*\d*\s*Vol\.?\s*(\d+)\.?\s*(?:no\.?\s*(\d+))?\s*\(?\s*((?:19|20)\d{2})/i);
    if (fm) {
      journal = fm[1].trim();
      volume = fm[2] || "";
      issue = fm[3] || "";
      if (!year && fm[4]) year = fm[4];
    } else {
      journal = footer.replace(/\d.*$/, "").trim();
    }
  }

  // 제목: 상단 국문 제목 (발행연도 라인 이후 첫 한글 라인 묶음)
  const startIdx = dateLine ? lines.indexOf(dateLine) + 1 : 0;
  const titleCands: string[] = [];
  for (let i = startIdx; i < Math.min(lines.length, startIdx + 10); i++) {
    const l = lines[i];
    if (/[가-힣]/.test(l) && l.length >= 6 && l.length <= 120 && !/^(주저자|교신저자|요약|초록)/.test(l)) {
      titleCands.push(l);
      const next = lines[i + 1] || "";
      // 영문 제목이 이어지면 포함, 저자 라인이면 중단
      if (/^[A-Z]/.test(next) && next.length > 10 && !/^[A-Z][a-z]+,/.test(next)) {
        titleCands.push(next);
      }
      if (/^(주저자|교신저자|저자)/.test(next) || /[가-힣]{2,4}\s*\(/.test(next)) break;
    }
    if (titleCands.length >= 2) break;
  }
  if (titleCands.length) title = titleCands.join(" ").replace(/\s+/g, " ").trim();

  // 저자: "주저자 / 천은영 (Chun, Eunyoung)" 패턴
  const authorBlock = text.match(/(?:주저자|제1저자|저자)[\s\S]{0,40}?([가-힣]{2,4})\s*\(([A-Za-z,.\s]+)\)/);
  if (authorBlock) {
    authors.push({
      last: authorBlock[1],
      first: "",
      initials: "",
      full: `${authorBlock[1]} (${authorBlock[2].trim()})`,
      isKorean: true,
    });
  }
  const coAuthor = text.match(/(?:교신저자|공동저자)[\s\S]{0,40}?([가-힣]{2,4})\s*\(([A-Za-z,.\s]+)\)/);
  if (coAuthor && !authors.some((a) => a.last === coAuthor[1])) {
    authors.push({
      last: coAuthor[1],
      first: "",
      initials: "",
      full: `${coAuthor[1]} (${coAuthor[2].trim()})`,
      isKorean: true,
    });
  }

  return { journal, year, volume, issue, title, authors, layout: "korean-journal" };
}

/**
 * 메인 진입점 — 텍스트에서 저널 메타데이터를 정밀 추출.
 * 레이아웃 자동 감지 후 해당 파서 적용, 공통 필드(DOI/abstract/keywords) 병합.
 */
export function parseScholarlyFields(text: string, filename: string): ScholarlyFields {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let base: Partial<ScholarlyFields> = { layout: "generic" };
  if (looksElsevier(text)) {
    base = parseElsevier(text, lines);
  } else if (looksKoreanJournal(text)) {
    base = parseKoreanJournal(text, lines);
  }

  const doi = extractDoi(text);
  const abstract = extractAbstract(text);
  const keywords = extractKeywords(text);

  // 연도 폴백
  let year = base.year || "";
  if (!year) {
    const ym = text.match(/\b(20\d{2}|19\d{2})\b/);
    year = ym ? ym[0] : "";
  }

  // 제목 폴백: 파일명
  let title = base.title || "";
  if (!title || title.length < 5) {
    title = filename.replace(/\.[^.]+$/, "").replace(/[_\-]+/g, " ").trim();
  }

  return {
    title,
    authors: base.authors && base.authors.length ? base.authors : [],
    year,
    journal: base.journal || "",
    volume: base.volume || "",
    issue: base.issue || "",
    pages: base.pages || "",
    doi,
    url: doi ? "" : (text.match(/https?:\/\/[^\s)]+/)?.[0] || ""),
    abstract,
    keywords,
    layout: (base.layout as ScholarlyFields["layout"]) || "generic",
  };
}

/**
 * ScholarlyFields → RefEntry 변환 (citation UI 모델)
 */
export function scholarlyToRefEntry(
  f: ScholarlyFields,
  filename: string
): RefEntry {
  return {
    id: "ref_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    raw: "",
    type: f.journal ? "journal" : "other",
    authors: f.authors,
    year: f.year,
    title: f.title.slice(0, 240),
    journal: f.journal.slice(0, 120),
    volume: f.volume,
    issue: f.issue,
    pages: f.pages,
    doi: f.doi,
    url: f.url,
    publisher: "",
    source: filename,
    cited: false,
    abstract: f.abstract || undefined,
    keywords: f.keywords.length ? f.keywords : undefined,
  };
}
