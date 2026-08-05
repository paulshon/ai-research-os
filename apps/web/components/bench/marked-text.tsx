import type { ReactNode } from "react";
import { Marker, type MarkerSeverity } from "./marker";

export interface TextMark {
  id: string;
  quote: string;
  severity: MarkerSeverity;
  /** 위첨자 라벨 — 크리틱은 숫자, 교정은 ㄱㄴㄷ… */
  label: string;
}

/**
 * 여러 텍스트 덩이(페이지·블록)에 걸친 원문에 마크를 1회씩만 배치한다.
 * 같은 인용구가 문서에 여러 번 나타나도 마커는 처음 찾은 자리에만 붙인다
 * (마커 id 중복 방지 + 사용자가 실제 지적 위치를 혼동하지 않도록).
 */
export function assignMarksToChunks(chunks: string[], marks: TextMark[]): TextMark[][] {
  const remaining = [...marks];
  return chunks.map((chunk) => {
    const hit: TextMark[] = [];
    for (let i = remaining.length - 1; i >= 0; i--) {
      const m = remaining[i];
      if (m.quote && chunk.includes(m.quote)) {
        hit.push(m);
        remaining.splice(i, 1);
      }
    }
    return hit;
  });
}

/** 한 덩이의 텍스트에 배치된 마크를 <Marker>로 감싸 렌더한다. */
export function MarkedParagraph({ text, marks }: { text: string; marks: TextMark[] }) {
  if (!marks.length) return <>{text}</>;

  const positioned = marks
    .map((m) => ({ ...m, index: text.indexOf(m.quote) }))
    .filter((m) => m.index >= 0)
    .sort((a, b) => a.index - b.index);

  const nonOverlap: typeof positioned = [];
  let cursor = 0;
  for (const m of positioned) {
    if (m.index < cursor) continue;
    nonOverlap.push(m);
    cursor = m.index + m.quote.length;
  }

  const nodes: ReactNode[] = [];
  let pos = 0;
  nonOverlap.forEach((m) => {
    if (m.index > pos) nodes.push(text.slice(pos, m.index));
    nodes.push(
      <Marker key={m.id} severity={m.severity} label={m.label} anchorId={m.id}>
        {m.quote}
      </Marker>,
    );
    pos = m.index + m.quote.length;
  });
  if (pos < text.length) nodes.push(text.slice(pos));
  return <>{nodes}</>;
}

/** 순번 → ㄱㄴㄷ… 라벨 (14자를 넘으면 ㄱ2, ㄴ2 처럼 순환한다). */
const HANGUL_CONSONANTS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
export function hangulLabel(index: number): string {
  const round = Math.floor(index / HANGUL_CONSONANTS.length) + 1;
  const letter = HANGUL_CONSONANTS[index % HANGUL_CONSONANTS.length];
  return round > 1 ? `${letter}${round}` : letter;
}
