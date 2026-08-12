/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 작업(메뉴) 카탈로그 — 단일 정본

   sidebar.tsx 에 흩어져 있던 목록을 여기로 모았다.
   중앙 전체메뉴 그리드 · 히스토리 레일 · 리본 스테퍼 · 라우트 가드 ·
   오브 인텐트 분류기가 모두 이 표 하나를 읽는다.
   새 작업을 추가하려면 이 배열에 한 줄을 더하면 된다.
   ══════════════════════════════════════════════════════════════════════ */

export interface TaskItem {
  href: string;
  icon: string;
  labelKey: string;
  tabKey: string;
  color: string;
  no: number;
  badge: string | null;
  perm: string;
  /** 중앙 전체메뉴 그리드에 노출할지 */
  showInGrid: boolean;
  /** 오브 발화·입력으로 이 작업을 부르는 말들 */
  triggers: string[];
}

/** 연구 흐름 8단계 — 중앙 전체메뉴 그리드에 그대로 노출된다 */
export const RESEARCH_FLOW_ITEMS: TaskItem[] = [
  {
    href: "/research", icon: "research", labelKey: "sidebar.research", tabKey: "sidebar.tabResearch",
    color: "#6c8cff", no: 1, badge: null, perm: "engine.research", showInGrid: true,
    triggers: [
      "연구설계메뉴", "연구 설계 메뉴", "연구설계", "연구 설계", "설계",
      "리서치 디자인", "연구 디자인", "연구계획", "실험설계", "research design", "design", "research menu",
    ],
  },
  {
    href: "/literature", icon: "literature", labelKey: "sidebar.literature", tabKey: "sidebar.tabLiterature",
    color: "#3ecfb2", no: 2, badge: null, perm: "engine.literature", showInGrid: true,
    triggers: [
      "문헌연구메뉴", "문헌 연구 메뉴", "문헌연구", "문헌 연구", "문헌", "문헌고찰",
      "선행연구", "논문 찾", "리터러처", "literature", "survey", "literature menu",
    ],
  },
  {
    href: "/method", icon: "method", labelKey: "sidebar.method", tabKey: "sidebar.tabMethod",
    color: "#22c1a8", no: 3, badge: null, perm: "engine.method", showInGrid: true,
    triggers: [
      "연구방법메뉴", "연구 방법 메뉴", "연구방법", "연구 방법", "방법론", "메소돌로지",
      "질적연구", "양적연구", "methodology", "method", "method menu",
    ],
  },
  {
    href: "/writing", icon: "writing", labelKey: "sidebar.writing", tabKey: "sidebar.tabWriting",
    color: "#a78bfa", no: 4, badge: null, perm: "engine.writing", showInGrid: true,
    triggers: [
      "논문작성메뉴", "논문 작성 메뉴", "논문작성", "논문 작성", "글쓰기", "집필",
      "초안", "원고", "서론", "writing", "draft", "writing menu",
    ],
  },
  {
    href: "/analyzer", icon: "analyzer", labelKey: "sidebar.analyzer", tabKey: "sidebar.tabAnalyzer",
    color: "#f59e0b", no: 5, badge: null, perm: "engine.analyzer", showInGrid: true,
    triggers: [
      "논문분석메뉴", "논문 분석 메뉴", "논문분석", "논문 분석", "분석", "구조 분석",
      "해부", "analysis", "analyze", "analysis menu",
    ],
  },
  {
    href: "/critique", icon: "critique", labelKey: "sidebar.critique", tabKey: "sidebar.tabCritique",
    color: "#f472b6", no: 6, badge: null, perm: "engine.critique", showInGrid: true,
    triggers: [
      "논문크리틱메뉴", "논문 크리틱 메뉴", "크리틱메뉴", "논문크리틱", "크리틱", "비평",
      "심사평", "피어리뷰", "리뷰어", "critique", "peer review", "critique menu",
    ],
  },
  {
    href: "/validation", icon: "review", labelKey: "sidebar.review", tabKey: "sidebar.tabReview",
    color: "#ff7066", no: 7, badge: null, perm: "engine.validation", showInGrid: true,
    triggers: [
      "검토검증메뉴", "검토 검증 메뉴", "검증메뉴", "검토메뉴", "검토", "검증", "검토검증",
      "팩트체크", "근거 확인", "교차검증", "validation", "verify", "validation menu",
    ],
  },
  {
    href: "/references", icon: "citation", labelKey: "sidebar.references", tabKey: "sidebar.tabReferences",
    color: "#34d399", no: 8, badge: null, perm: "engine.references", showInGrid: true,
    triggers: [
      "참고문헌메뉴", "참고문헌 정리 메뉴", "참고문헌", "참고문헌 정리", "서지", "레퍼런스",
      "인용", "각주", "bibtex", "reference", "citation", "reference menu",
    ],
  },
];

/** 그리드에 노출하지 않는 확장 작업 — "+ 더 보기" 또는 발화로 들어간다 */
export const ENGINE_ITEMS: TaskItem[] = [
  {
    href: "/structure", icon: "structure", labelKey: "sidebar.structure", tabKey: "sidebar.tabStructure",
    color: "#6c8cff", no: 9, badge: null, perm: "engine.structure", showInGrid: false,
    triggers: ["논문구조", "구조", "아웃라인", "목차", "structure", "outline"],
  },
  {
    href: "/literature-review", icon: "litReview", labelKey: "sidebar.litReview", tabKey: "sidebar.tabLitReview",
    color: "#3ecfb2", no: 10, badge: null, perm: "engine.literature", showInGrid: false,
    triggers: ["문헌 매트릭스", "리뷰 매트릭스", "문헌리뷰", "literature review"],
  },
  {
    href: "/schedule", icon: "calendar", labelKey: "sidebar.schedule", tabKey: "sidebar.tabSchedule",
    color: "#e8b84b", no: 11, badge: null, perm: "engine.schedule", showInGrid: false,
    triggers: ["논문일정", "일정", "스케줄", "마감", "schedule", "deadline"],
  },
  {
    href: "/library", icon: "library", labelKey: "sidebar.library", tabKey: "sidebar.tabLibrary",
    color: "#34d399", no: 12, badge: null, perm: "engine.library", showInGrid: false,
    triggers: ["문장 라이브러리", "라이브러리", "표현", "library"],
  },
];

export const FLAT_MENU_ITEMS: TaskItem[] = [...RESEARCH_FLOW_ITEMS, ...ENGINE_ITEMS];
export const LIBRARY_ITEMS = ENGINE_ITEMS.filter((e) => e.href === "/library");

/* ══════════════════════════════════════════════════════════════════════
   인텐트 분류기 — 발화·입력·카드 클릭이 모두 같은 경로를 탄다.
   ① 정규화 → ② 동의어 사전 정확/부분 매칭 → ③ 자모 유사도
   ══════════════════════════════════════════════════════════════════════ */

export interface IntentResult {
  item: TaskItem | null;
  confidence: number;
  /** 신뢰도가 애매할 때 되물을 후보 */
  candidates: TaskItem[];
}

function normalize(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[.,!?~"'`()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "연구설계메뉴" · "문헌 연구 메뉴" 처럼 끝에 메뉴가 붙으면 메뉴 이동 의로 본다 */
function stripMenuSuffix(text: string): { core: string; menuIntent: boolean } {
  const t = text.trim();
  const menuIntent = /메뉴\s*$/.test(t) || /\bmenu\s*$/i.test(t);
  const core = t
    .replace(/\s*메뉴\s*$/u, "")
    .replace(/\s*menu\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return { core: core || t, menuIntent };
}

/** 두 문자열의 문자 단위 겹침 비율 (0~1) */
function overlap(a: string, b: string): number {
  const A = a.replace(/\s/g, "");
  const B = b.replace(/\s/g, "");
  if (!A || !B) return 0;
  const set = new Set(B.split(""));
  let hit = 0;
  for (const ch of A) if (set.has(ch)) hit += 1;
  return hit / Math.max(A.length, B.length);
}

export function classifyIntent(raw: string, allowed?: (item: TaskItem) => boolean): IntentResult {
  const { core, menuIntent } = stripMenuSuffix(normalize(raw));
  const text = core;
  const pool = FLAT_MENU_ITEMS.filter((i) => (allowed ? allowed(i) : true));
  if (!text) return { item: null, confidence: 0, candidates: [] };

  const scored = pool.map((item) => {
    let best = 0;
    for (const trg of item.triggers) {
      const tr = normalize(trg).replace(/\s*메뉴\s*$/u, "").replace(/\s*menu\s*$/i, "").trim();
      if (!tr) continue;
      if (text === tr) best = Math.max(best, 0.99);
      else if (text.includes(tr)) best = Math.max(best, 0.95);
      else if (tr.includes(text) && text.length >= 2) best = Math.max(best, 0.88);
      else best = Math.max(best, overlap(text, tr) * 0.72);
    }
    /* ove-4: "~메뉴" 발화는 메뉴 이동 확정에 가깝게 본다 */
    if (menuIntent && best >= 0.55) best = Math.max(best, 0.92);
    return { item, score: best };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < 0.34) {
    return { item: null, confidence: top?.score ?? 0, candidates: [] };
  }
  /* 메뉴 접미가 있으면 애매해도 1위를 바로 연다 */
  const navigateAt = menuIntent ? 0.55 : 0.75;
  if (top.score >= navigateAt) return { item: top.item, confidence: top.score, candidates: [] };
  return {
    item: null,
    confidence: top.score,
    candidates: scored.slice(0, 3).map((s) => s.item),
  };
}
