// 성장모델 (Level System) — XP 기반 레벨이 매핑된다.
export interface GrowthLevel { code: string; ko: string; en: string; minXp: number; }
export const GROWTH_LEVELS: GrowthLevel[] = [
  { code: "L0", ko: "연구 입문자", en: "Research Novice", minXp: 0 },
  { code: "L1", ko: "연구 탐색자", en: "Research Explorer", minXp: 100 },
  { code: "L2", ko: "연구 학습자", en: "Research Learner", minXp: 200 },
  { code: "L3", ko: "연구 사고자", en: "Research Thinker", minXp: 300 },
  { code: "L4", ko: "연구 수련자", en: "Research Apprentice", minXp: 400 },
  { code: "L5", ko: "연구 설계자", en: "Research Designer", minXp: 500 },
  { code: "L6", ko: "연구 기획자", en: "Research Planner", minXp: 600 },
  { code: "L7", ko: "연구 작성자", en: "Research Writer", minXp: 700 },
  { code: "L8", ko: "연구 실행자", en: "Research Executor", minXp: 800 },
  { code: "L9", ko: "연구 준비자", en: "Research-Ready Scholar", minXp: 900 },
];
export function levelForXp(xp: number): GrowthLevel {
  return [...GROWTH_LEVELS].reverse().find(l => xp >= l.minXp) ?? GROWTH_LEVELS[0];
}
