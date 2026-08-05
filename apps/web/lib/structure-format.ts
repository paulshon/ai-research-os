/**
 * research-data.ts 의 원문자(①-㉞) 표기를 화면용 숫자 배지로 변환한다.
 * 나눔 폰트에는 ㉛-㉞(31-34) 글리프가 없어 그대로 쓰면 깨지므로,
 * 코드포인트에서 서수만 뽑아내고 원문자 자체는 표시에서 제거한다.
 * research-data.ts 파일 내용 자체는 건드리지 않는다.
 */
const CIRCLED_1_START = 0x2460; // ①
const CIRCLED_1_END = 0x2473; // ⑳ (20)
const CIRCLED_2_START = 0x3251; // ㉑ (21)
const CIRCLED_2_END = 0x325f; // ㉟ (35)

export function splitCircledName(name: string): { num: number | null; name: string } {
  const cp = name.codePointAt(0);
  if (cp === undefined) return { num: null, name };
  let num: number | null = null;
  if (cp >= CIRCLED_1_START && cp <= CIRCLED_1_END) num = cp - CIRCLED_1_START + 1;
  else if (cp >= CIRCLED_2_START && cp <= CIRCLED_2_END) num = cp - CIRCLED_2_START + 21;
  if (num === null) return { num: null, name };
  const rest = name.slice(String.fromCodePoint(cp).length).replace(/^\s+/, "");
  return { num, name: rest };
}

/** 카테고리 라벨 앞의 색상 이모지(🔵🟩…)를 제거한다 — 이모지는 아이콘으로 쓰지 않는다. */
export function stripLeadingEmoji(s: string): string {
  return s.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, "");
}

/** "거시 배경 → 학문적 공백 → 연구 목적" 형태를 단계 배열로 나눈다. */
export function splitMacroFlow(macro: string): string[] {
  return macro
    .split("→")
    .map((s) => s.trim())
    .filter(Boolean);
}
