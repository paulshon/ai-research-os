// 성장모델 (Level System) — XP 기반 5단계 레벨 매핑
export interface GrowthLevel { code: string; ko: string; en: string; minXp: number; }
export const GROWTH_LEVELS: GrowthLevel[] = [
  { code: "L1", ko: "연구 입문자", en: "Research Novice", minXp: 0 },
  { code: "L2", ko: "연구 탐색자", en: "Research Explorer", minXp: 100 },
  { code: "L3", ko: "연구 설계자", en: "Research Designer", minXp: 300 },
  { code: "L4", ko: "연구 작성자", en: "Research Writer", minXp: 500 },
  { code: "L5", ko: "연구 준비자", en: "Research-Ready Scholar", minXp: 700 },
];
export function levelForXp(xp: number): GrowthLevel {
  return [...GROWTH_LEVELS].reverse().find(l => xp >= l.minXp) ?? GROWTH_LEVELS[0];
}
