import type { TrackId } from "./tracks";
import type { ResearchType } from "./research-types";

/** 기능 키 — RDOS 메뉴와 AROS 기능을 합친 전체 권한 집합 */
export type FeatureKey =
  // 공통
  | "dashboard"
  // RDOS (교육)
  | "research-basics" | "paper-structure" | "design-basics" | "methodology-basics"
  | "paper-reading" | "apa-learning" | "academic-writing-drill" | "ai-tutor" | "growth-roadmap"
  // AROS (연구 수행)
  | "research-design" | "literature-review" | "paper-writing"
  | "review-verification" | "paper-schedule" | "paper-analysis" | "paper-critique"
  | "sentence-library" | "reference-manager" | "methodology-engine"
  // University 추가
  | "quant-education" | "qual-education" | "design-education"
  | "institution-license" | "lab-collaboration" | "professor-admin";

export type PlanId =
  | "rdos-free" | "rdos-premium"
  | "aros-free" | "aros-basic" | "aros-scholar" | "aros-university";

export interface Plan {
  id: PlanId;
  track: TrackId;
  label: string;
  tier: number;                 // 0 = Free
  features: FeatureKey[];
  researchTypes: ResearchType[]; // 논문작성 지원 유형
}

const ALL_TYPES: ResearchType[] = [
  "quantitative","qualitative","mixed","experimental",
  "systematic-review","meta-analysis","narrative-review","scoping-review",
];

const RDOS_FEATURES: FeatureKey[] = [
  "dashboard","research-basics","paper-structure","design-basics","methodology-basics",
  "paper-reading","apa-learning","academic-writing-drill","ai-tutor","growth-roadmap",
];

const AROS_FREE: FeatureKey[] = ["dashboard","research-design","literature-review","paper-writing"];
const AROS_BASIC: FeatureKey[] = [...AROS_FREE,"review-verification","paper-schedule","paper-analysis","paper-critique"];
const AROS_SCHOLAR: FeatureKey[] = [...AROS_BASIC,"sentence-library","reference-manager"];
const AROS_UNIVERSITY: FeatureKey[] = [...AROS_SCHOLAR,
  "methodology-engine","quant-education","qual-education","design-education",
  "institution-license","lab-collaboration","professor-admin"];

export const PLANS: Record<PlanId, Plan> = {
  // Track A — RDOS : Free → Premium
  "rdos-free":    { id:"rdos-free",    track:"rdos", label:"연구준비자 Free",    tier:0, features:RDOS_FEATURES.slice(0,6), researchTypes:[] },
  "rdos-premium": { id:"rdos-premium", track:"rdos", label:"연구준비자 Premium", tier:1, features:RDOS_FEATURES, researchTypes:[] },

  // Track B — AI-Research-OS : Free → Basic → Scholar → University
  "aros-free":       { id:"aros-free",       track:"aros", label:"Free",       tier:0, features:AROS_FREE,       researchTypes:["quantitative","qualitative"] },
  "aros-basic":      { id:"aros-basic",      track:"aros", label:"Basic",      tier:1, features:AROS_BASIC,      researchTypes:["quantitative","qualitative","mixed","experimental"] },
  "aros-scholar":    { id:"aros-scholar",    track:"aros", label:"Scholar",    tier:2, features:AROS_SCHOLAR,    researchTypes:ALL_TYPES },
  "aros-university": { id:"aros-university", track:"aros", label:"University", tier:3, features:AROS_UNIVERSITY, researchTypes:ALL_TYPES },
};

export const PLANS_BY_TRACK: Record<TrackId, Plan[]> = {
  rdos: [PLANS["rdos-free"], PLANS["rdos-premium"]],
  aros: [PLANS["aros-free"], PLANS["aros-basic"], PLANS["aros-scholar"], PLANS["aros-university"]],
};
