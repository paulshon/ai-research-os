import { PLANS, type PlanId, type FeatureKey } from "./plans";
import type { ResearchType } from "./research-types";

export interface Account { id: string; planId: PlanId; status: AccountStatus; }
export type AccountStatus = "pending" | "email_verified" | "approved" | "active" | "rejected";

/** 기능 접근 가능 여부 — 승인/활성 상태 + 플랜 권한 모두 충족해야 한다. */
export function can(account: Account, feature: FeatureKey): boolean {
  if (account.status !== "active" && account.status !== "approved") return false;
  return PLANS[account.planId].features.includes(feature);
}

/** 특정 연구유형으로 논문작성 가능 여부 */
export function canUseResearchType(account: Account, type: ResearchType): boolean {
  if (!can(account, "paper-writing")) return false;
  return PLANS[account.planId].researchTypes.includes(type);
}

/** 업그레이드 제안: 요청 기능을 제공하는 가장 저렴한 동일 트랙 플랜 */
export function upgradeFor(account: Account, feature: FeatureKey): PlanId | null {
  const track = PLANS[account.planId].track;
  const candidate = Object.values(PLANS)
    .filter(p => p.track === track && p.features.includes(feature))
    .sort((a, b) => a.tier - b.tier)[0];
  return candidate ? candidate.id : null;
}
