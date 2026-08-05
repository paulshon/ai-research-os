import type { IconName } from "@/components/ui/icons";

/**
 * 두 트랙의 내비 정의.
 * 메뉴 항목에 개별 color 필드를 두지 않는다 — 색으로 메뉴를 구분하던 기존 방식을 폐기했다.
 * 강조색은 data-track 이 CSS 변수 --accent 를 스왑해 한 번에 바뀐다.
 */

export type NavItem = {
  href: string;
  icon: IconName;
  label: string;
  /** 꼬리 배지 — 숫자·상태. --fs-cap/--t3 로만 표시한다. */
  tail?: string;
  /** 잠긴 항목이면 열리는 조건을 문장으로 적는다. */
  locked?: string;
  /** 권한 키 (기존 usePermissions 와 호환). 없으면 항상 허용. */
  perm?: string;
};

export type NavGroup = { label: string; items: NavItem[] };

export const RESEARCHER_NAV: NavGroup[] = [
  {
    label: "현재 상황",
    items: [
      { href: "/dashboard", icon: "home", label: "연구 대시보드" },
      { href: "/schedule", icon: "cal", label: "논문 일정", perm: "engine.schedule" },
    ],
  },
  {
    label: "1 · 연구 설계",
    items: [
      { href: "/research", icon: "compass", label: "연구 설계", perm: "engine.research" },
      { href: "/method", icon: "beaker", label: "연구 방법", perm: "engine.method" },
      { href: "/structure", icon: "layers", label: "논문유형구조", tail: "34", perm: "engine.structure" },
    ],
  },
  {
    label: "2 · 자료 수집",
    items: [
      { href: "/literature", icon: "book", label: "문헌 연구", perm: "engine.literature" },
      { href: "/references", icon: "quote", label: "참고문헌", perm: "engine.references" },
      { href: "/library", icon: "tag", label: "문장 라이브러리", perm: "engine.library" },
    ],
  },
  {
    label: "3 · 집필",
    items: [{ href: "/writing", icon: "pen", label: "논문 작성", perm: "engine.writing" }],
  },
  {
    label: "4 · 검증",
    items: [
      { href: "/analyzer", icon: "chart", label: "논문 분석", perm: "engine.analyzer" },
      { href: "/validation", icon: "shield", label: "검토·검증", perm: "engine.validation" },
      { href: "/critique", icon: "spark", label: "논문 크리틱", perm: "engine.critique" },
    ],
  },
];

export const RDOS_NAV: NavGroup[] = [
  {
    label: "나의 학습",
    items: [
      { href: "/rdos", icon: "home", label: "학습 대시보드" },
      { href: "/rdos/roadmap", icon: "route", label: "성장 로드맵" },
    ],
  },
  {
    label: "1 · 기초 이해",
    items: [
      { href: "/rdos/basics", icon: "grad", label: "연구 기초" },
      { href: "/rdos/design", icon: "compass", label: "연구설계 기초" },
      { href: "/rdos/method", icon: "beaker", label: "연구방법론 기초" },
    ],
  },
  {
    label: "2 · 실습 훈련",
    items: [
      { href: "/rdos/reading", icon: "book", label: "논문 읽기 훈련" },
      { href: "/rdos/structure", icon: "layers", label: "논문 구조 학습" },
      { href: "/rdos/writing", icon: "pen", label: "학술 글쓰기 훈련" },
      { href: "/rdos/apa", icon: "quote", label: "APA 학습" },
    ],
  },
  {
    label: "3 · 상시 지원",
    items: [
      { href: "/rdos/tutor", icon: "chat", label: "AI 튜터" },
      { href: "/rdos/knowledge", icon: "brain", label: "지식 코어" },
    ],
  },
  {
    label: "4 · 인증",
    items: [
      {
        href: "/rdos/scholar",
        icon: "medal",
        label: "연구 준비자 인증",
        locked: "기초 이해·실습 훈련 요건 6개를 채우면 열립니다",
      },
    ],
  },
];

/** 하단 탭(모바일) — 각 그룹의 대표 항목 5개. */
export const RESEARCHER_TABBAR: NavItem[] = [
  { href: "/dashboard", icon: "home", label: "현황" },
  { href: "/research", icon: "compass", label: "설계" },
  { href: "/literature", icon: "book", label: "자료" },
  { href: "/writing", icon: "pen", label: "집필" },
  { href: "/analyzer", icon: "chart", label: "검증" },
];

export const RDOS_TABBAR: NavItem[] = [
  { href: "/rdos", icon: "home", label: "현황" },
  { href: "/rdos/basics", icon: "grad", label: "기초" },
  { href: "/rdos/reading", icon: "book", label: "실습" },
  { href: "/rdos/tutor", icon: "chat", label: "지원" },
  { href: "/rdos/scholar", icon: "medal", label: "인증" },
];

export function findNavLabel(href: string, track: "researcher" | "rdos"): string {
  const nav = track === "rdos" ? RDOS_NAV : RESEARCHER_NAV;
  for (const g of nav) {
    for (const it of g.items) {
      if (href === it.href || href.startsWith(it.href + "/")) return it.label;
    }
  }
  return track === "rdos" ? "연구준비자" : "연구자";
}
