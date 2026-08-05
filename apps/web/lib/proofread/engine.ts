import type { ProofCategory } from "./categories";
import { PROOF_RULES, TERM_VARIANT_GROUPS, type ProofRule } from "./rules";

export interface Correction {
  id: string;
  category: ProofCategory;
  subLabel: string;
  original: string;
  suggested: string;
  reason: string;
  autoApplicable: boolean;
  /** 문장 단위 컨텍스트 — 반드시 원문에 실재하는 부분 문자열이다. */
  quote: string;
  index: number;
  ruleId: string;
}

/** 직접 인용부(따옴표로 감싼 구간)의 [start,end) 범위 목록. */
function quotedSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  const re = /"[^"\n]*"|“[^”\n]*”|「[^」\n]*」|『[^』\n]*』/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function isInsideAnySpan(index: number, spans: [number, number][]): boolean {
  return spans.some(([s, e]) => index >= s && index < e);
}

/** 매치 지점을 포함하는 문장(마침표/느낌표/물음표/줄바꿈 경계) 추출. 원문의 정확한 부분 문자열이다. */
function sentenceAround(text: string, index: number, len: number): string {
  const boundary = /[.!?\n]/;
  let start = index;
  while (start > 0 && !boundary.test(text[start - 1])) start--;
  let end = index + len;
  while (end < text.length && !boundary.test(text[end])) end++;
  if (end < text.length) end++;
  return text.slice(start, end).trim();
}

/** 정규식 기반 확정 오류 규칙을 실행한다. 인용부 안의 매치는 건너뛴다. */
function runRules(text: string): Correction[] {
  const spans = quotedSpans(text);
  const out: Correction[] = [];
  for (const rule of PROOF_RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const original = m[0];
      if (!original) {
        re.lastIndex++;
        continue;
      }
      if (isInsideAnySpan(m.index, spans)) continue;
      const suggested = rule.fix(original);
      const quote = sentenceAround(text, m.index, original.length);
      if (!text.includes(quote)) continue; // 근거 원문 실재 확인
      out.push({
        id: `${rule.id}-${m.index}`,
        category: rule.category,
        subLabel: rule.subLabel,
        original,
        suggested,
        reason: rule.reason,
        autoApplicable: rule.autoApplicable,
        quote,
        index: m.index,
        ruleId: rule.id,
      });
    }
  }
  return out;
}

const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;
const MAX_SENTENCE_LEN = 80;

/** 문장 길이(readability) 점검 — 규범이 아니라 권고이므로 자동 적용하지 않는다. */
function runLengthCheck(text: string): Correction[] {
  const out: Correction[] = [];
  let cursor = 0;
  for (const raw of text.split(SENTENCE_SPLIT)) {
    const sentence = raw.trim();
    const idx = sentence ? text.indexOf(sentence, cursor) : -1;
    if (sentence) cursor = idx >= 0 ? idx + sentence.length : cursor;
    if (sentence.length > MAX_SENTENCE_LEN && idx >= 0) {
      out.push({
        id: `length-${idx}`,
        category: "readability",
        subLabel: "80자 초과 문장",
        original: sentence,
        suggested: "",
        reason: `한 문장이 ${sentence.length}자입니다. 국내 학위논문 권장치(45–55자)를 크게 넘습니다. 두세 문장으로 나누는 것을 검토하세요.`,
        autoApplicable: false,
        quote: sentence,
        index: idx,
        ruleId: "sentence-length",
      });
    }
  }
  return out;
}

/** 한 개념에 여러 표기가 섞였는지 검사 — 문서 전체에 2종 이상 나타날 때만 지적한다. */
function runTerminologyCheck(text: string): Correction[] {
  const out: Correction[] = [];
  for (const group of TERM_VARIANT_GROUPS) {
    const present = group.variants.filter((v) => text.includes(v));
    if (present.length < 2) continue;
    for (const variant of present) {
      if (variant === group.canonical) continue;
      let searchFrom = 0;
      while (true) {
        const idx = text.indexOf(variant, searchFrom);
        if (idx < 0) break;
        out.push({
          id: `term-${group.id}-${idx}`,
          category: "terminology",
          subLabel: "표기 통일",
          original: variant,
          suggested: group.canonical,
          reason: `한 개념(‘${group.canonical}’)에 ‘${present.join("’ · ‘")}’ 등 여러 표기가 섞여 있습니다. 문서 전체를 한 표기로 통일하세요.`,
          autoApplicable: false,
          quote: sentenceAround(text, idx, variant.length),
          index: idx,
          ruleId: `term-${group.id}`,
        });
        searchFrom = idx + variant.length;
      }
    }
  }
  return out;
}

export function proofreadDocument(text: string): Correction[] {
  if (!text.trim()) return [];
  const all = [...runRules(text), ...runLengthCheck(text), ...runTerminologyCheck(text)];
  return all.sort((a, b) => a.index - b.index);
}

export interface StyleMetrics {
  avgSentenceLength: number;
  passiveRatio: number;
  translationeseDensity: number;
  fillerCount: number;
  sentencesPerParagraph: number;
  perChapterCounts: number[];
}

const PASSIVE_MARKERS = /(되었|되며|되어|되는|받았다|받는다|당했다|지어졌다|되어진)/g;
const FILLER_MARKERS = /(다고\s?할\s?수\s?있|것으로\s?사료|본\s?바와\s?같이|앞서\s?언급한\s?바와\s?같이)/g;

export function computeStyleMetrics(text: string): StyleMetrics {
  const clean = text.trim();
  if (!clean) {
    return {
      avgSentenceLength: 0,
      passiveRatio: 0,
      translationeseDensity: 0,
      fillerCount: 0,
      sentencesPerParagraph: 0,
      perChapterCounts: [],
    };
  }
  const sentences = clean.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const avgSentenceLength = sentences.length
    ? Math.round(sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length)
    : 0;
  const passiveHits = (clean.match(PASSIVE_MARKERS) ?? []).length;
  const passiveRatio = sentences.length ? Math.round((passiveHits / sentences.length) * 100) : 0;
  const translationeseHits = (clean.match(/에\s?있어서/g) ?? []).length;
  const translationeseDensity = Math.round((translationeseHits / Math.max(1, clean.length / 1000)) * 10) / 10;
  const fillerCount = (clean.match(FILLER_MARKERS) ?? []).length;
  const sentencesPerParagraph = paragraphs.length
    ? Math.round((sentences.length / paragraphs.length) * 10) / 10
    : 0;

  const chapterSplits = clean.split(/(?=^\s*\d+\s*[.\-)]\s+\S)/m).filter((c) => c.trim());
  const perChapterCounts = (chapterSplits.length ? chapterSplits : [clean]).map(
    (chunk) => proofreadDocument(chunk).length,
  );

  return {
    avgSentenceLength,
    passiveRatio,
    translationeseDensity,
    fillerCount,
    sentencesPerParagraph,
    perChapterCounts,
  };
}
