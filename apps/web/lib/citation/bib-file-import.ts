/**
 * v41: 서지정보 파일/텍스트 다중 임포트 헬퍼
 *
 * 문제: 기존 참고문헌 정리 화면은 RIS/BibTeX/EndNote(.enw)/PubMed(.nbib) 파일을
 *       업로드해도 isSupportedFile(문서 추출용) 필터에 걸려 전혀 불러와지지 않았다.
 *       또한 붙여넣기도 1건만 파싱했다.
 *
 * 해결:
 *   - 확장자/내용으로 서지 텍스트 포맷 판별
 *   - RIS / BibTeX / ENW / NBIB 를 "여러 건"으로 분할하여 각각 RefEntry로 변환
 *   - PDF/DOCX/HWP 등 문서 파일은 기존 추출 경로(loadPDFs)로 위임
 */

import {
  parseBibTextToRefEntry,
  canonicalToRefEntry,
} from "./citation-bridge";
import { toCanonicalCitation } from "@ai-research-os/citation-core";
import type { RefEntry, RefAuthor } from "./apa-utils";

/** 서지정보 "텍스트" 파일 확장자 (문서 추출이 아니라 텍스트 파싱 대상) */
const BIB_TEXT_EXT = /\.(ris|bib|bibtex|nbib|enw|txt)$/i;

export function isBibTextFile(fileName: string): boolean {
  return BIB_TEXT_EXT.test(fileName);
}

/** input accept 속성 — 문서 + 서지 텍스트 포맷 모두 허용 */
export const REFERENCES_ACCEPT =
  ".pdf,.docx,.doc,.hwp,.hwpx,.txt,.md,.rtf,.ris,.bib,.bibtex,.nbib,.enw";

function parseAuthorName(name: string): RefAuthor {
  const trimmed = (name || "").trim();
  const isKorean = /[가-힣]/.test(trimmed);
  if (isKorean) {
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

/** RIS 텍스트를 ER 구분으로 분할 */
function splitRIS(text: string): string[] {
  // 각 레코드는 ... ER  - 로 끝남
  const blocks: string[] = [];
  const re = /([\s\S]*?^ER\s{2}-.*$)/gim;
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(text)) !== null) {
    blocks.push(m[1]);
    consumed = re.lastIndex;
  }
  if (blocks.length === 0 && text.trim()) blocks.push(text);
  // ER 이후 잔여 텍스트 무시
  void consumed;
  return blocks.map((b) => b.trim()).filter(Boolean);
}

/** BibTeX 텍스트를 @entry 단위로 분할 */
function splitBibTeX(text: string): string[] {
  const blocks: string[] = [];
  const re = /@\w+\s*\{/g;
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) starts.push(m.index);
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : text.length;
    blocks.push(text.slice(start, end).trim());
  }
  if (blocks.length === 0 && text.trim()) blocks.push(text);
  return blocks.filter(Boolean);
}

/** EndNote(.enw) — %A 저자 / %T 제목 / %J 저널 / %D 연도 / %V 권 / %P 페이지 / %R DOI */
function parseENW(block: string): RefEntry | null {
  const lines = block.split(/\r?\n/);
  const authors: RefAuthor[] = [];
  let title = "", journal = "", year = "", volume = "", issue = "", pages = "", doi = "", url = "", publisher = "";
  for (const line of lines) {
    const m = line.match(/^%(\w)\s+(.*)$/);
    if (!m) continue;
    const tag = m[1];
    const val = m[2].trim();
    switch (tag) {
      case "A": authors.push(parseAuthorName(val)); break;
      case "T": title = val; break;
      case "J": case "B": journal = journal || val; break;
      case "D": year = (val.match(/\d{4}/)?.[0]) || val; break;
      case "V": volume = val; break;
      case "N": issue = val; break;
      case "P": pages = val; break;
      case "R": doi = val.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""); break;
      case "U": url = val; break;
      case "I": publisher = val; break;
    }
  }
  if (!title) return null;
  return {
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    raw: block.slice(0, 2000),
    type: journal ? "journal" : "other",
    authors, year, title, journal, volume, issue, pages,
    doi, url: url || (doi ? `https://doi.org/${doi}` : ""),
    publisher, source: doi || url || title, cited: false, keywords: [],
  };
}

/** PubMed(.nbib) — PMID / TI 제목 / FAU 저자 / JT 저널 / DP 연도 / VI 권 / IP 호 / PG 페이지 / LID·AID DOI */
function parseNBIB(block: string): RefEntry | null {
  // 연속 라인(들여쓰기)은 직전 태그에 이어붙임
  const rawLines = block.split(/\r?\n/);
  const merged: { tag: string; val: string }[] = [];
  for (const line of rawLines) {
    const m = line.match(/^([A-Z]{2,4})\s*-\s?(.*)$/);
    if (m) merged.push({ tag: m[1], val: m[2] });
    else if (merged.length && /^\s+/.test(line)) merged[merged.length - 1].val += " " + line.trim();
  }
  const authors: RefAuthor[] = [];
  let title = "", journal = "", year = "", volume = "", issue = "", pages = "", doi = "";
  for (const { tag, val } of merged) {
    switch (tag) {
      case "FAU": authors.push(parseAuthorName(val)); break;
      case "AU": if (authors.length === 0) authors.push(parseAuthorName(val)); break;
      case "TI": title = (title ? title + " " : "") + val; break;
      case "JT": case "TA": journal = journal || val; break;
      case "DP": year = (val.match(/\d{4}/)?.[0]) || year; break;
      case "VI": volume = val; break;
      case "IP": issue = val; break;
      case "PG": pages = val; break;
      case "LID": case "AID": {
        const d = val.match(/10\.\d{4,9}\/[^\s\]]+/);
        if (d && !doi) doi = d[0].replace(/[.,;)\]]+$/, "");
        break;
      }
    }
  }
  if (!title) return null;
  return {
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    raw: block.slice(0, 2000),
    type: journal ? "journal" : "other",
    authors, year, title: title.trim(), journal, volume, issue, pages,
    doi, url: doi ? `https://doi.org/${doi}` : "", publisher: "",
    source: doi || title, cited: false, keywords: [],
  };
}

/**
 * 한 덩어리의 서지 텍스트(여러 건 가능)를 RefEntry[] 로 파싱.
 * @param hintExt  파일 확장자 힌트(.enw/.nbib 등). 없으면 내용으로 판별.
 */
export function parseBibTextMulti(text: string, hintExt?: string): RefEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const ext = (hintExt || "").toLowerCase();
  const out: RefEntry[] = [];

  // EndNote
  if (ext === "enw" || /^%[A-Z0]\s/m.test(trimmed)) {
    for (const block of trimmed.split(/\n\s*\n/)) {
      const ref = parseENW(block);
      if (ref) out.push(ref);
    }
    if (out.length) return out;
  }

  // PubMed nbib
  if (ext === "nbib" || /^PMID\s*-\s*\d+/m.test(trimmed) || /^TI\s*-\s/m.test(trimmed)) {
    for (const block of trimmed.split(/\n\s*\n(?=PMID|TI\s*-)/)) {
      const ref = parseNBIB(block);
      if (ref) out.push(ref);
    }
    if (out.length) return out;
  }

  // BibTeX
  if (/@\w+\s*\{/.test(trimmed)) {
    for (const block of splitBibTeX(trimmed)) {
      const parsed = parseBibTextToRefEntry(block);
      if (parsed) out.push(parsed.ref);
    }
    if (out.length) return out;
  }

  // RIS
  if (/^\s*TY\s{2}-/m.test(trimmed)) {
    for (const block of splitRIS(trimmed)) {
      const parsed = parseBibTextToRefEntry(block);
      if (parsed) out.push(parsed.ref);
    }
    if (out.length) return out;
  }

  // 단건 폴백 (RIS/BibTeX 단일)
  const single = parseBibTextToRefEntry(trimmed);
  if (single) out.push(single.ref);
  return out;
}

/** 파일 1개를 읽어 RefEntry[] 로 변환 (서지 텍스트 파일 전용) */
export async function importBibFile(file: File): Promise<RefEntry[]> {
  const text = await file.text();
  const ext = file.name.split(".").pop() || "";
  return parseBibTextMulti(text, ext);
}

/** toCanonicalCitation 재노출(필요 시) */
export { toCanonicalCitation, canonicalToRefEntry };
