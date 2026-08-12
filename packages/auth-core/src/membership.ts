/**
 * 회원가입 승인 · 특별회원 정책
 */

export type ApprovalStatus = "pending" | "approved" | "rejected";

/** 운영자 승인 대기 중 특별 안내 대상 (성명 일치) */
export const SPECIAL_MEMBER_NAMES = [
  "이지수",
  "김현석",
  "오동우",
  "정혜욱",
  "박재은",
] as const;

export const MEMBERSHIP_NOTICE =
  "회원제로 운영되는 사이트이므로 이점 양해바랍니다.";

export const SPECIAL_MEMBER_PENDING_MESSAGE =
  "특별회원으로 공지합니다. 운영자의 승인을 잠깐 기다려주시면 곧 처리하겠습니다.";

export function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").trim();
}

export function isSpecialMemberName(name: string): boolean {
  const normalized = normalizeName(name);
  return SPECIAL_MEMBER_NAMES.some(
    (special) => normalized.includes(special) || name.includes(special)
  );
}

export function isApproved(status: ApprovalStatus | string | null | undefined): boolean {
  return status === "approved";
}
