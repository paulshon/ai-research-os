import type { FeatureKey } from "../membership/plans";

export interface MenuItem { feature: FeatureKey; label: string; engine: string | null; route: string; }

/** RDOS (연구준비자) 메뉴 — 기존 엔진에 연결 */
export const RDOS_MENUS: MenuItem[] = [
  { feature:"dashboard",              label:"Dashboard",       engine:null,                      route:"/rdos" },
  { feature:"research-basics",        label:"Research Basics", engine:"research-foundation",     route:"/rdos/basics" },
  { feature:"paper-structure",        label:"논문 구조 학습",  engine:"academic-writing",        route:"/rdos/structure" },
  { feature:"design-basics",          label:"연구설계 기초",   engine:"research-design-studio",  route:"/rdos/design" },
  { feature:"methodology-basics",     label:"연구방법론 기초", engine:"research-foundation",     route:"/rdos/method" },
  { feature:"paper-reading",          label:"논문 읽기 훈련",  engine:"academic-thinking",       route:"/rdos/reading" },
  { feature:"apa-learning",           label:"APA 학습",        engine:"academic-writing",        route:"/rdos/apa" },
  { feature:"academic-writing-drill", label:"학술 글쓰기 훈련",engine:"academic-writing",        route:"/rdos/writing" },
  { feature:"ai-tutor",               label:"AI 튜터",         engine:"research-tutor",          route:"/rdos/tutor" },
  { feature:"growth-roadmap",         label:"성장 로드맵",     engine:null,                      route:"/rdos/roadmap" },
];
