// RDOS (연구준비자) 메뉴 — 사양서 6절 기준. 자립형(외부 의존 없음).
export interface RdosMenuItem {
  key: string;
  label: string;       // 메뉴명
  provides: string;    // 제공 내용
  engine: string | null; // 연결 엔진(AI-Research-OS 코어)
  route: string;
  icon: string;        // components/ui/icon 의 name
  color: string;
}

export const RDOS_MENUS: RdosMenuItem[] = [
  { key: "dashboard",  label: "Dashboard",       provides: "학습 현황",        engine: null,                     route: "/rdos",           icon: "dashboard",  color: "#6c8cff" },
  { key: "basics",     label: "Research Basics", provides: "연구 기초",        engine: "research-foundation",    route: "/rdos/basics",    icon: "research",   color: "#3ecfb2" },
  { key: "structure",  label: "논문 구조 학습",  provides: "논문 구성 이해",   engine: "academic-writing",       route: "/rdos/structure", icon: "structure",  color: "#a78bfa" },
  { key: "design",     label: "연구설계 기초",   provides: "연구문제 작성",    engine: "research-design-studio", route: "/rdos/design",    icon: "method",     color: "#e8b84b" },
  { key: "method",     label: "연구방법론 기초", provides: "양적·질적 개요",   engine: "research-foundation",    route: "/rdos/method",    icon: "analyzer",   color: "#f59e0b" },
  { key: "reading",    label: "논문 읽기 훈련",  provides: "논문 분석",        engine: "academic-thinking",      route: "/rdos/reading",   icon: "literature", color: "#34d399" },
  { key: "apa",        label: "APA 학습",        provides: "인용·참고문헌",    engine: "academic-writing",       route: "/rdos/apa",       icon: "citation",   color: "#a78bfa" },
  { key: "writing",    label: "학술 글쓰기 훈련",provides: "문단 작성",        engine: "academic-writing",       route: "/rdos/writing",   icon: "writing",    color: "#7c93ff" },
  { key: "tutor",      label: "AI 튜터",         provides: "질의응답",         engine: "research-tutor",         route: "/rdos/tutor",     icon: "chat",       color: "#3ecfb2" },
  { key: "knowledge",  label: "지식 코어",       provides: "논문가이드·용어",  engine: "knowledge-kernel",       route: "/rdos/knowledge", icon: "literature", color: "#3ecfb2" },
  { key: "roadmap",    label: "성장 로드맵",     provides: "연구자 성장 단계", engine: null,                     route: "/rdos/roadmap",   icon: "workflow",   color: "#ff7a00" },
  { key: "scholar",    label: "연구 준비자 인증",provides: "Research-Ready",   engine: "defense",                route: "/rdos/scholar",   icon: "workflow",   color: "#ff7a00" },
];

export function rdosMenuByKey(key: string) {
  return RDOS_MENUS.find((m) => m.key === key) ?? null;
}
