/* ══════════════════════════════════════════════════════════════════════
   s-renew-14 · RDOS 학습 트리
   대시보드 「학습 메뉴」 카드와 사이드바 「학습 메뉴」 그룹이 같은 원본을
   보게 하여 두 곳을 완전히 연동한다. 레슨(하위메뉴)까지 펼쳐 바로 진입한다.

   [s-renew-14 수정]
   · 기존에는 RDOS_LESSON_CONTENT 에 항목이 있는 메뉴만 트리에 넣고,
     추가로 메뉴 활성화 설정(disabledKeys)까지 적용해서 걸렀다.
     그 결과 설정에 따라 사이드바 「학습 메뉴」 그룹이 통째로 비어 보이는데도
     대시보드에는 학습 메뉴 카드가 그대로 노출되어 두 화면이 어긋났다.
   · 이제 학습 메뉴 집합(LEARNING_KEYS)을 단일 진실원본으로 고정한다.
     대시보드 미션 카드와 사이드바 하위메뉴가 항상 같은 목록을 본다.
     레슨 콘텐츠가 아직 없는 메뉴는 하위 레슨 없이 노드만 렌더한다.

   진입 규약:  /rdos/<menuKey>?lesson=<lessonId>
   ══════════════════════════════════════════════════════════════════════ */

import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import { RDOS_MENUS } from "@/lib/rdos/menus";

/** 학습 메뉴 집합 — 대시보드 미션 카드와 동일한 순서·구성. */
export const LEARNING_KEYS = [
  "basics",
  "structure",
  "design",
  "method",
  "reading",
  "apa",
  "writing",
  "tutor",
] as const;

export type LearningKey = (typeof LEARNING_KEYS)[number];

export interface LearningLeaf {
  id: string;
  title: string;
  subtitle: string;
  index: number;
}

export interface LearningNode {
  key: string;
  label: string;
  route: string;
  icon: string;
  color: string;
  lessons: LearningLeaf[];
}

const LEARNING_SET: Set<string> = new Set(LEARNING_KEYS);

/**
 * 학습 트리를 만든다.
 * @param disabledKeys 관리자가 비활성화한 메뉴 키. 학습 메뉴 그룹은 대시보드와
 *   항상 일치해야 하므로 기본적으로는 적용하지 않고, 명시적으로 숨기고 싶을 때만
 *   `respectDisabled = true` 로 넘긴다.
 */
export function buildLearningTree(
  disabledKeys: Set<string> = new Set(),
  respectDisabled = false,
): LearningNode[] {
  return RDOS_MENUS.filter(
    (m) => LEARNING_SET.has(m.key) && (!respectDisabled || !disabledKeys.has(m.key)),
  ).map((m) => {
    const c = RDOS_LESSON_CONTENT[m.key];
    return {
      key: m.key,
      label: c?.label || m.label,
      route: m.route,
      icon: m.icon,
      color: m.color,
      lessons: (c?.lessons ?? []).map((l, i) => ({
        id: l.id,
        title: l.title,
        subtitle: l.subtitle,
        index: i,
      })),
    };
  });
}

/** 학습 트리에 포함된 메뉴 키 집합 (사이드바에서 중복 렌더를 피하기 위해 사용). */
export function learningMenuKeys(): Set<string> {
  return new Set(LEARNING_SET);
}
