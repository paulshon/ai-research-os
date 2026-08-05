/**
 * 논문 본문에서 7개 표준 섹션의 경계를 탐지한다.
 * 한국어/영어 제목 표기를 모두 인식하고, 못 찾은 섹션은 found:false 로
 * 표시해 "미작성" 처리(score.ts)로 이어지게 한다.
 */
export type SectionId =
  | "background"
  | "purpose"
  | "researchQuestion"
  | "method"
  | "resultsAnalysis"
  | "discussion"
  | "conclusion";

export const SECTION_ORDER: SectionId[] = [
  "background",
  "purpose",
  "researchQuestion",
  "method",
  "resultsAnalysis",
  "discussion",
  "conclusion",
];

export const SECTION_LABEL: Record<SectionId, string> = {
  background: "연구배경",
  purpose: "연구목적",
  researchQuestion: "연구질문",
  method: "연구방법",
  resultsAnalysis: "분석과 결과",
  discussion: "논의",
  conclusion: "결론",
};

/** 섹션별 제목 탐지 정규식 — 줄 시작 기준으로 매칭한다. */
const SECTION_PATTERNS: Record<SectionId, RegExp> = {
  background: /^\s*(?:1\s*[.\-)]?\s*1|1\.1|Ⅰ\s*[.\-)]?\s*1|서\s*론|연구\s*배경|Background)\b/im,
  purpose: /^\s*(?:1\s*[.\-)]?\s*2|1\.2|연구\s*목적|Purpose\s+of\s+(the\s+)?Study|Research\s+Purpose)\b/im,
  researchQuestion: /^\s*(?:1\s*[.\-)]?\s*3|1\.3|연구\s*질문|연구\s*문제|Research\s+Question)\b/im,
  method: /^\s*(?:[4Ⅳ]\s*[.\-)]?\s*|3\s*[.\-)]?\s*)?(?:연구\s*방법론?|방법론|Methodology|Research\s+Method)\b/im,
  resultsAnalysis: /^\s*(?:[5Ⅴ]\s*[.\-)]?\s*|4\s*[.\-)]?\s*)?(?:연구\s*결과|분석\s*(?:결과)?|Results|Findings)\b/im,
  discussion: /^\s*(?:6\s*[.\-)]?\s*1|6\.1|논\s*의|Discussion)\b/im,
  conclusion: /^\s*(?:6\s*[.\-)]?\s*3|6\.3|결\s*론|Conclusion)\b/im,
};

export interface DetectedSection {
  id: SectionId;
  label: string;
  found: boolean;
  startChar: number;
  endChar: number;
}

/**
 * 섹션별 첫 매칭 위치를 찾고, 발견된 순서대로 다음 섹션 시작점까지를
 * 경계로 삼는다. 마지막 섹션은 본문 끝까지 이어진다.
 */
export function detectSections(text: string): DetectedSection[] {
  const hits: { id: SectionId; start: number }[] = [];
  for (const id of SECTION_ORDER) {
    const m = SECTION_PATTERNS[id].exec(text);
    if (m) hits.push({ id, start: m.index });
  }
  hits.sort((a, b) => a.start - b.start);

  const starts = new Map(hits.map((h) => [h.id, h.start]));
  const orderedStarts = hits.map((h) => h.start);

  return SECTION_ORDER.map((id) => {
    const start = starts.get(id);
    if (start === undefined) {
      return { id, label: SECTION_LABEL[id], found: false, startChar: -1, endChar: -1 };
    }
    const idx = orderedStarts.findIndex((s) => s === start);
    const end = idx >= 0 && idx + 1 < orderedStarts.length ? orderedStarts[idx + 1] : text.length;
    return { id, label: SECTION_LABEL[id], found: true, startChar: start, endChar: end };
  });
}

export function getSectionText(sections: DetectedSection[], fullText: string, id: SectionId): string {
  const s = sections.find((x) => x.id === id);
  if (!s || !s.found) return "";
  return fullText.slice(s.startChar, s.endChar).trim();
}

/**
 * 사용자가 지정한 시작 위치(문자 오프셋)로 자동 인식 결과를 덮어쓴다.
 * 인스펙터의 "경계 직접 지정"에서 사용 — 다음 섹션 시작 전까지를 끝으로 재계산한다.
 */
export function applySectionOverrides(
  base: DetectedSection[],
  overrides: Partial<Record<SectionId, number>>,
  textLength: number,
): DetectedSection[] {
  const withStart = base.map((s) => {
    const override = overrides[s.id];
    if (override === undefined) return s;
    return { ...s, startChar: override, found: override >= 0 };
  });
  const foundSorted = withStart
    .filter((s) => s.found && s.startChar >= 0)
    .sort((a, b) => a.startChar - b.startChar);
  return withStart.map((s) => {
    if (!s.found) return { ...s, endChar: -1 };
    const idx = foundSorted.findIndex((f) => f.id === s.id);
    const end = idx >= 0 && idx + 1 < foundSorted.length ? foundSorted[idx + 1].startChar : textLength;
    return { ...s, endChar: end };
  });
}
