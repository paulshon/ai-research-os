import type { TrackId } from "../membership/tracks";
import type { PlanId } from "../membership/plans";
import type { Account, AccountStatus } from "../membership/entitlements";
import { validateSignup } from "../membership/signup";

/** 인증 프로세스 7단계 */
export type OnboardingStep =
  | "plan_select"     // Step 1 플랜 선택
  | "info"            // Step 2 가입 정보 입력
  | "credentials"     // Step 3 논문 링크/학위 정보
  | "email_verify"    // Step 4 이메일 인증
  | "login"           // Step 5 Google/GitHub/Email 로그인
  | "admin_approval"  // Step 6 관리자 승인
  | "enter";          // Step 7 서비스 진입

export const STEP_ORDER: OnboardingStep[] = [
  "plan_select","info","credentials","email_verify","login","admin_approval","enter",
];

export interface OnboardingState {
  step: OnboardingStep;
  track?: TrackId;
  planId?: PlanId;
  profile: Record<string, unknown>;
  status: AccountStatus;
  errors: string[];
}

export function startOnboarding(): OnboardingState {
  return { step: "plan_select", profile: {}, status: "pending", errors: [] };
}

/**
 * Onboarding 상태 기계. 각 액션이 다음 단계로 전이한다.
 * 검증 실패 시 같은 단계에 머문다.
 */
export class OnboardingMachine {
  constructor(public state: OnboardingState = startOnboarding()) {}

  selectPlan(track: TrackId, planId: PlanId) {
    this.state.track = track; this.state.planId = planId;
    this.state.step = "info"; return this.state;
  }
  submitInfo(profile: Record<string, unknown>) {
    Object.assign(this.state.profile, profile);
    this.state.step = "credentials"; return this.state;
  }
  /** Step 3: 트랙별 가입 조건 검증 (RDOS 석사여부 / AROS 논문 링크) */
  submitCredentials(profile: Record<string, unknown>) {
    Object.assign(this.state.profile, profile);
    const v = validateSignup(this.state.track!, this.state.profile);
    this.state.errors = v.errors;
    if (v.ok) this.state.step = "email_verify";
    return this.state;
  }
  verifyEmail() { this.state.status = "email_verified"; this.state.step = "login"; return this.state; }
  login(_provider: "google" | "github" | "email") { this.state.step = "admin_approval"; return this.state; }
  /** Step 6: 관리자 승인/거절 */
  adminDecision(approved: boolean) {
    this.state.status = approved ? "approved" : "rejected";
    this.state.step = approved ? "enter" : "admin_approval";
    return this.state;
  }
  /** Step 7: 활성화된 계정 생성 → 트랙에 따라 플랫폼 분기 */
  finalize(accountId: string): Account {
    this.state.status = "active";
    return { id: accountId, planId: this.state.planId!, status: "active" };
  }
}
