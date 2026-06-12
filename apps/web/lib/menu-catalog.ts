/* ════════════════════════════════════════════════════════════
   v63: 메뉴 권한 카탈로그 (코드 기반 단일 진실원본)
   - 관리자 권한 패널 목록, 등급(plan) 기본 접근권한, 사이드바/라우트 게이팅이
     모두 이 파일을 기준으로 동작한다. DB permissions 시드 상태와 무관하게 항상 전체
     메뉴(상위 + 하위)가 표시된다.
   - permission code 규칙: 상위 = "engine.<route>", 하위 = "engine.<route>.<sub>"
═══════════════════════════════════════════════════════════════ */

export interface MenuNode {
  code: string; // 권한 코드 (overrides 키)
  label: string;
  href?: string; // 라우트(상위 메뉴) — 하위는 탭이라 href 없을 수 있음
  children?: MenuNode[];
}

// 대시보드는 항상 허용(차단 대상 아님) → 카탈로그/게이팅에서 제외
export const MENU_CATALOG: MenuNode[] = [
  { code: "engine.research", label: "연구 설계", href: "/research" },
  {
    code: "engine.literature", label: "문헌 연구", href: "/literature",
    children: [
      { code: "engine.literature.search", label: "논문 검색" },
      { code: "engine.literature.reading", label: "읽기 공간" },
      { code: "engine.literature.matrix", label: "문헌 매트릭스" },
      { code: "engine.literature.citation", label: "인용 관리" },
      { code: "engine.literature.gap", label: "갭 분석" },
      { code: "engine.literature.collection", label: "컬렉션" },
    ],
  },
  {
    code: "engine.writing", label: "논문 작성", href: "/writing",
    children: [
      { code: "engine.writing.quant", label: "양적 연구" },
      { code: "engine.writing.qual", label: "질적 연구" },
      { code: "engine.writing.others", label: "그 외 연구유형(혼합·실험·문헌검토·이론·응용·방법론·비교 등)" },
    ],
  },
  {
    code: "engine.validation", label: "검토·검증", href: "/validation",
    children: [
      { code: "engine.validation.apa", label: "논문 형식 검증" },
      { code: "engine.validation.ref", label: "참고문헌 정리" },
      { code: "engine.validation.abstract", label: "초록 작성" },
      { code: "engine.validation.caption", label: "그림/표 캡션" },
      { code: "engine.validation.plagiarism", label: "표절 검사" },
      { code: "engine.validation.spell", label: "맞춤법 검사" },
    ],
  },
  { code: "engine.schedule", label: "논문일정", href: "/schedule" },
  { code: "engine.structure", label: "논문구조엔진", href: "/structure" },
  { code: "engine.method", label: "연구방법", href: "/method" },
  {
    code: "engine.analyzer", label: "논문 분석", href: "/analyzer",
    children: [
      { code: "engine.analyzer.source", label: "원문" },
      { code: "engine.analyzer.overall", label: "전체 분석" },
      { code: "engine.analyzer.micro", label: "미시 분석" },
      { code: "engine.analyzer.sentence", label: "문장 분석" },
      { code: "engine.analyzer.suggestions", label: "개선 제안" },
    ],
  },
  {
    code: "engine.critique", label: "논문 크리틱", href: "/critique",
    children: [
      { code: "engine.critique.logic", label: "논리" },
      { code: "engine.critique.evidence", label: "근거" },
      { code: "engine.critique.concept", label: "개념" },
      { code: "engine.critique.style", label: "문체" },
      { code: "engine.critique.structure", label: "구조" },
    ],
  },
  { code: "engine.library", label: "문장 라이브러리", href: "/library" },
  {
    code: "engine.references", label: "참고문헌 정리", href: "/references",
    children: [
      { code: "engine.references.doi", label: "DOI" },
      { code: "engine.references.ris", label: "RIS" },
      { code: "engine.references.bibtex", label: "BibTeX" },
    ],
  },
];

/** 모든 권한 코드(상위 + 하위) 평탄화 */
export function allMenuCodes(): string[] {
  const out: string[] = [];
  for (const n of MENU_CATALOG) {
    out.push(n.code);
    (n.children ?? []).forEach((c) => out.push(c.code));
  }
  return out;
}

/** 상위 라우트(href) → 권한 코드 매핑 (라우트 가드용) */
export const ROUTE_TO_CODE: { prefix: string; code: string }[] = MENU_CATALOG
  .filter((n) => n.href)
  .map((n) => ({ prefix: n.href as string, code: n.code }));

/* ── 등급(plan)별 기본 접근권한 ──────────────────────────────
   free: 대시보드(항상) + 연구설계 + 문헌연구 + 논문작성(양적·질적만).
         그 외 메뉴/하위는 기본 차단(메뉴는 보이되 비활성).
   그 외 등급(scholar/pro/university/basic 등): 전체 허용.
─────────────────────────────────────────────────────────────── */
export const FREE_ALLOWED: string[] = [
  "engine.research",
  "engine.literature",
  ...["engine.literature.search", "engine.literature.reading", "engine.literature.matrix",
      "engine.literature.citation", "engine.literature.gap", "engine.literature.collection"],
  "engine.writing",
  "engine.writing.quant",
  "engine.writing.qual",
];

/** 등급 기본 허용 코드 집합 */
export function defaultAllowedFor(plan: string | null | undefined): Set<string> {
  if (plan === "free" || !plan) return new Set(FREE_ALLOWED);
  return new Set(allMenuCodes()); // 유료 등급은 전체 허용
}
