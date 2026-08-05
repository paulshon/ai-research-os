export type ScoreBand = "hi" | "mid" | "low" | "bad" | "na";

/** 75+/60-74/45-59/45미만 4단계 밴드. null(미작성)은 "na". */
export function scoreBand(score: number | null): ScoreBand {
  if (score === null) return "na";
  if (score >= 75) return "hi";
  if (score >= 60) return "mid";
  if (score >= 45) return "low";
  return "bad";
}

export const BAND_LABEL: Record<ScoreBand, string> = {
  hi: "우수",
  mid: "양호",
  low: "보완 필요",
  bad: "위험",
  na: "미작성",
};

/** ScoreMatrix 셀에 붙일 CSS 클래스 — globals.css 의 .c-hi/.c-mid/.c-low/.c-bad/.c-na 를 그대로 쓴다. */
export function cellClass(score: number | null): string {
  return `c-${scoreBand(score)}`;
}

export interface AxisScore {
  axisId: string;
  score: number | null;
  weight: number;
}

/** 가중 평균 — 채점된 축이 하나도 없으면 null("미작성")을 반환한다. */
export function sectionScore(axes: AxisScore[]): number | null {
  const scored = axes.filter((a) => a.score !== null);
  if (scored.length === 0) return null;
  const totalWeight = scored.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight === 0) return null;
  const weighted = scored.reduce((sum, a) => sum + (a.score as number) * a.weight, 0);
  return Math.round(weighted / totalWeight);
}

export function overallScore(sectionScores: (number | null)[]): number | null {
  const scored = sectionScores.filter((s): s is number => s !== null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
}
