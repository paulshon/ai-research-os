/* ══════════════════════════════════════════════════════════════════════
   s-renew-13 · 몰입 레이어 페이지 메타 (구조 전용 · 단일 진실원본)
   라우트 → { 강조색 · 아이콘 · 순번 · 히어로 표시여부 · EXPERT 링크 }
   ─ 문구는 전부 i18n(`hero.<id>.*`, `expert.<id>.*`)에서 온다.
     KO/EN/ZH 전환 시 히어로 카피도 함께 바뀐다.
   ─ 셸이 이 표만 읽어 Atmosphere 색조와 Hero 를 렌더하므로,
     개별 페이지의 기능 코드는 손대지 않고 전 메뉴에 몰입 레이어가 적용된다.
   ══════════════════════════════════════════════════════════════════════ */

export interface PageMeta {
  /** 라우트 prefix (정확 일치 → 긴 prefix 우선으로 해석) */
  href: string;
  /** i18n 키 네임스페이스 — hero.<id>.title 등 */
  id: string;
  /** 강조색 — Atmosphere/Hero/EXPERT/카드 광원이 모두 이 색으로 물든다 */
  accent: string;
  /** components/ui/icon 의 name */
  icon: string;
  /** 연구 흐름 8단계 중 순번 (해당 없으면 undefined) */
  step?: number;
  /** 히어로(큰 프레임 설명) 표시 여부. EXPERT 화면은 false. */
  hero: boolean;
  /** EXPERT 버튼이 가리킬 상세 엔진 — expert.<key>.name 으로 라벨 조회 */
  expert?: { href: string; key: string };
  /** EXPERT 화면일 때 되돌아갈 간편 화면 — expert.<key>.back 으로 라벨 조회 */
  backTo?: { href: string; key: string };
}

/* ── 연구자 플랜 · 연구 흐름 8단계 ────────────────────────────
   설계 → 문헌 → 방법 → 집필 → 분석 → 크리틱 → 검토·검증 → 참고문헌
   (s-renew-13: 연구방법·검토검증을 흐름에 편입해 6단계 → 8단계)
   ──────────────────────────────────────────────────────────── */
export const FLOW_META: PageMeta[] = [
  { href: "/research",   id: "research",   accent: "#6c8cff", icon: "research",   step: 1, hero: true,
    expert: { href: "/structure", key: "structure" } },
  { href: "/literature", id: "literature", accent: "#3ecfb2", icon: "literature", step: 2, hero: true,
    expert: { href: "/literature-review", key: "literatureReview" } },
  /* s-renew-15: 연구방법은 EXPERT 버튼을 두지 않는다.
     기본통계 엔진은 아래 카탈로그 카드에서 바로 진입한다. */
  { href: "/method",     id: "method",     accent: "#22c1a8", icon: "method",     step: 3, hero: true },
  /* s-renew-14: 집필·분석·크리틱은 EXPERT 모드가 없으므로 히어로를 두지 않고
     본문을 화면 상단부터 채운다. (사용자 지시 · 스크린샷 4~6) */
  { href: "/writing",    id: "writing",    accent: "#a78bfa", icon: "writing",    step: 4, hero: false },
  { href: "/analyzer",   id: "analyzer",   accent: "#f59e0b", icon: "analyzer",   step: 5, hero: false },
  { href: "/critique",   id: "critique",   accent: "#f472b6", icon: "critique",   step: 6, hero: false },
  { href: "/validation", id: "validation", accent: "#ff7066", icon: "review",     step: 7, hero: true },
  { href: "/references", id: "references", accent: "#34d399", icon: "citation",   step: 8, hero: true },
];

/* ── EXPERT 목적지 ─────────────────────────────────────────────
   s-renew-13: EXPERT 화면에서는 큰 프레임(히어로) 설명을 노출하지 않는다.
   대신 상단에 얇은 복귀 바만 두어 작업 공간을 최대한 넓게 쓴다.
   ──────────────────────────────────────────────────────────── */
export const EXPERT_META: PageMeta[] = [
  { href: "/structure",         id: "structure",        accent: "#6c8cff", icon: "structure", hero: false,
    backTo: { href: "/research",   key: "structure" } },
  { href: "/literature-review", id: "literatureReview", accent: "#3ecfb2", icon: "litReview", hero: false,
    backTo: { href: "/literature", key: "literatureReview" } },
  { href: "/method/basic-stats",id: "basicStats",       accent: "#6c8cff", icon: "chart",     hero: false,
    backTo: { href: "/method",     key: "basicStats" } },
  { href: "/editor",            id: "editor",           accent: "#a78bfa", icon: "edit",      hero: false,
    backTo: { href: "/writing",    key: "editor" } },
  { href: "/library",           id: "library",          accent: "#34d399", icon: "library",   hero: false,
    backTo: { href: "/critique",   key: "library" } },
];

/* ── 그 외 화면 (히어로 유지) ─────────────────────────────── */
export const OTHER_META: PageMeta[] = [
  { href: "/dashboard",     id: "dashboard",     accent: "#6c8cff", icon: "dashboard", hero: true },
  { href: "/schedule",      id: "schedule",      accent: "#e8b84b", icon: "calendar",  hero: true },
  { href: "/workspace-hub", id: "workspaceHub",  accent: "#6c8cff", icon: "folder",    hero: true },
  { href: "/team",          id: "team",          accent: "#60a5fa", icon: "school",    hero: true },
  { href: "/settings",      id: "settings",      accent: "#9ba3b8", icon: "settings",  hero: true },
  { href: "/notifications", id: "notifications", accent: "#e8b84b", icon: "bell",      hero: true },
  { href: "/billing",       id: "billing",       accent: "#E0A73E", icon: "card",      hero: true },
  { href: "/admin",         id: "admin",         accent: "#E0A73E", icon: "admin",     hero: true },
];

export const ALL_DASHBOARD_META: PageMeta[] = [...FLOW_META, ...EXPERT_META, ...OTHER_META];

/* ── 연구준비자(RDOS) 플랜 ─────────────────────────────────────
   수정1: 메뉴·기능·관리자 구조는 원본 그대로, Atmosphere + Hero 만 적용.
   ──────────────────────────────────────────────────────────── */
export const RDOS_META: Record<string, PageMeta> = {
  "/rdos":           { href: "/rdos",           id: "rdosDashboard", accent: "#6c8cff", icon: "dashboard",  hero: true },
  "/rdos/basics":    { href: "/rdos/basics",    id: "rdosBasics",    accent: "#3ecfb2", icon: "research",   hero: true },
  "/rdos/structure": { href: "/rdos/structure", id: "rdosStructure", accent: "#a78bfa", icon: "structure",  hero: true },
  "/rdos/design":    { href: "/rdos/design",    id: "rdosDesign",    accent: "#e8b84b", icon: "method",     hero: true },
  "/rdos/method":    { href: "/rdos/method",    id: "rdosMethod",    accent: "#f59e0b", icon: "analyzer",   hero: true },
  "/rdos/reading":   { href: "/rdos/reading",   id: "rdosReading",   accent: "#34d399", icon: "literature", hero: true },
  "/rdos/apa":       { href: "/rdos/apa",       id: "rdosApa",       accent: "#a78bfa", icon: "citation",   hero: true },
  "/rdos/writing":   { href: "/rdos/writing",   id: "rdosWriting",   accent: "#7c93ff", icon: "writing",    hero: true },
  "/rdos/tutor":     { href: "/rdos/tutor",     id: "rdosTutor",     accent: "#3ecfb2", icon: "chat",       hero: true },
  "/rdos/knowledge": { href: "/rdos/knowledge", id: "rdosKnowledge", accent: "#3ecfb2", icon: "literature", hero: true },
  "/rdos/roadmap":   { href: "/rdos/roadmap",   id: "rdosRoadmap",   accent: "#ff7a00", icon: "workflow",   hero: true },
  "/rdos/scholar":   { href: "/rdos/scholar",   id: "rdosScholar",   accent: "#ff7a00", icon: "workflow",   hero: true },
  "/rdos/admin":     { href: "/rdos/admin",     id: "rdosAdmin",     accent: "#E0A73E", icon: "admin",      hero: true },
};

/* ── 해석기 ───────────────────────────────────────────────── */

/** 라우트에 해당하는 메타를 찾는다 (정확 일치 우선, 그다음 긴 prefix 우선). */
export function resolveMeta(pathname: string, table: PageMeta[]): PageMeta | null {
  const exact = table.find((m) => m.href === pathname);
  if (exact) return exact;
  const prefixed = table
    .filter((m) => pathname.startsWith(m.href + "/"))
    .sort((a, b) => b.href.length - a.href.length);
  return prefixed[0] ?? null;
}

export function resolveRdosMeta(pathname: string): PageMeta | null {
  if (RDOS_META[pathname]) return RDOS_META[pathname];
  const keys = Object.keys(RDOS_META)
    .filter((k) => k !== "/rdos" && pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length);
  return keys[0] ? RDOS_META[keys[0]] : null;
}

/** 기본 강조색 (메타가 없는 라우트) */
export const DEFAULT_ACCENT = "#6c8cff";
