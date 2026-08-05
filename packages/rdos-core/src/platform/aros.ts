import type { FeatureKey } from "../membership/plans";

export interface FeatureItem { feature: FeatureKey; label: string; engine: string | null; agent: string | null; route: string; }

/** AI-Research-OS (연구자) 기능 — 엔진/에이전트에 연결 */
export const AROS_FEATURES: FeatureItem[] = [
  { feature:"dashboard",          label:"Dashboard",      engine:null,                     agent:null,          route:"/aros" },
  { feature:"research-design",    label:"연구설계",       engine:"research-design-studio", agent:"methodology", route:"/aros/design" },
  { feature:"literature-review",  label:"문헌연구",       engine:"academic-thinking",      agent:"professor",   route:"/aros/literature" },
  { feature:"paper-writing",      label:"논문작성",       engine:"academic-writing",       agent:"writing",     route:"/aros/writing" },
  { feature:"review-verification",label:"검토·검증",      engine:"research-alignment",     agent:"reviewer",    route:"/aros/review" },
  { feature:"paper-schedule",     label:"논문일정",       engine:null,                     agent:"quest",       route:"/aros/schedule" },
  { feature:"paper-analysis",     label:"논문분석",       engine:null,                     agent:"statistics",  route:"/aros/analysis" },
  { feature:"paper-critique",     label:"논문크리틱",     engine:"research-alignment",     agent:"reviewer",    route:"/aros/critique" },
  { feature:"sentence-library",   label:"문장라이브러리", engine:"academic-writing",       agent:null,          route:"/aros/sentences" },
  { feature:"reference-manager",  label:"참고문헌정리",   engine:"academic-writing",       agent:null,          route:"/aros/references" },
  { feature:"methodology-engine", label:"연구방법 엔진",  engine:"research-design-studio", agent:"methodology", route:"/aros/methodology" },
  { feature:"quant-education",    label:"양적 연구방법 교육", engine:"research-tutor",     agent:"methodology", route:"/aros/edu/quant" },
  { feature:"qual-education",     label:"질적 연구방법 교육", engine:"research-tutor",     agent:"methodology", route:"/aros/edu/qual" },
  { feature:"design-education",   label:"연구설계 교육",  engine:"research-tutor",         agent:"methodology", route:"/aros/edu/design" },
  { feature:"institution-license",label:"기관 라이선스",  engine:null,                     agent:null,          route:"/aros/institution" },
  { feature:"lab-collaboration",  label:"연구실 협업",    engine:null,                     agent:null,          route:"/aros/lab" },
  { feature:"professor-admin",    label:"교수 관리도구",  engine:null,                     agent:null,          route:"/aros/admin" },
];
