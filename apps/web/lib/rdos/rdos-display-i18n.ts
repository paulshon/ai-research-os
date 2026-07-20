/**
 * Localize RDOS kernel-derived display strings (levels, badges, alignment)
 * that are authored in Korean inside rdos-core/derive.ts.
 */
import type { Locale } from "@/lib/i18n/types";

export interface GrowthLevelLike {
  code: string;
  ko: string;
  en: string;
}

const LEVEL_ZH: Record<string, string> = {
  L1: "研究入门者",
  L2: "研究探索者",
  L3: "研究设计者",
  L4: "研究写作者",
  L5: "研究准备者",
};

export function localizeGrowthLevel(level: GrowthLevelLike, locale: Locale): string {
  if (locale === "ko") return level.ko;
  if (locale === "zh") return LEVEL_ZH[level.code] ?? level.en;
  return level.en;
}

const BADGE_KEYS: Record<string, string> = {
  "첫 학습": "rdos.dashboard.badgeFirstLesson",
  "연구 기초 완료": "rdos.dashboard.badgeBasicsDone",
};

export function localizeBadge(badge: string, t: (k: string) => string): string {
  const key = BADGE_KEYS[badge];
  if (key) {
    const v = t(key);
    if (!v.startsWith("rdos.")) return v;
  }
  const streak = badge.match(/^(\d+)일 연속$/);
  if (streak) {
    const v = t("rdos.dashboard.badgeStreak").replace("{days}", streak[1]);
    if (!v.startsWith("rdos.")) return v;
  }
  return badge;
}

const ALIGNMENT_STEP_KEYS = ["problem", "purpose", "question", "method", "conclusion"] as const;

export function localizeAlignmentStep(step: string, index: number, t: (k: string) => string): string {
  const key = ALIGNMENT_STEP_KEYS[index];
  if (key) {
    const v = t(`rdos.dashboard.alignmentSteps.${key}`);
    if (!v.startsWith("rdos.")) return v;
  }
  return step;
}

const CONFLICT_KEYS: Record<string, string> = {
  "연구질문과 방법론 불일치": "rdos.dashboard.conflictQuestionMethod",
  "연구목적이 연구문제와 연결되지 않음": "rdos.dashboard.conflictPurposeProblem",
  "연구주제와 방법론 불일치": "rdos.dashboard.conflictTopicMethod",
};

export function localizeAlignmentConflict(conflict: string, t: (k: string) => string): string {
  const key = CONFLICT_KEYS[conflict];
  if (key) {
    const v = t(key);
    if (!v.startsWith("rdos.")) return v;
  }
  return conflict;
}
