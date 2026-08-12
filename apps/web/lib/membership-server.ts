import { getServiceSupabase } from "@/lib/supabase";
import type { ApprovalStatus } from "@/lib/membership";

export interface MembershipProfile {
  approval_status: ApprovalStatus;
  is_special_member: boolean;
  name: string;
}

/** 서버 전용 — 미들웨어·API에서 승인 상태 조회 */
export async function getMembershipProfile(
  userId: string
): Promise<MembershipProfile | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("approval_status, is_special_member, name")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as MembershipProfile;
}

export async function isUserApproved(userId: string): Promise<boolean> {
  const profile = await getMembershipProfile(userId);
  if (!profile) return false;
  return profile.approval_status === "approved";
}

/**
 * Clerk 사용자를 Supabase profiles 에 보장(idempotent).
 *
 * v57: 웹훅(user.created)에만 의존하면, 웹훅이 미설정/실패했거나 웹훅 도입 이전에
 *      가입한 "기존 Clerk 회원"의 데이터가 Supabase 로 영영 연동되지 않는다.
 *      → 인증된 모든 사용자가 거치는 대시보드 레이아웃에서 이 함수를 호출하여,
 *        프로필이 없으면 생성하고(승인 대기), 있으면 기본정보를 동기화한다.
 *        신규/기존 가입 구분 없이 "최초 접속 시 1회" 자동 연동된다.
 *
 * 반환: 동기화 후의 approval_status (없거나 실패 시 null).
 */
export async function ensureMembershipProfile(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}): Promise<ApprovalStatus | null> {
  const { userId } = input;
  if (!userId) return null;
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, approval_status, email, name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    // 신규/미연동 사용자 → 프로필 생성(기본 free·student·승인 대기)
    const row: Record<string, unknown> = {
      id: userId,
      email: input.email ?? null,
      name: input.name || "연구자",
      avatar_url: input.avatarUrl ?? null,
      role: "student",
      plan: "free",
      gemini_model: "gemini-2.5-flash",
      language: "ko",
      theme: "dark",
      approval_status: "pending",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[ensureMembershipProfile] insert failed:", error.message);
      return null;
    }
    return "pending";
  }

  // 기존 프로필 → 비어있는 기본정보만 보강(승인상태/플랜/역할은 건드리지 않음)
  const patch: Record<string, unknown> = {};
  if (input.email && input.email !== existing.email) patch.email = input.email;
  if (input.name && input.name !== existing.name) patch.name = input.name;
  if (input.avatarUrl && input.avatarUrl !== existing.avatar_url)
    patch.avatar_url = input.avatarUrl;
  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date().toISOString();
    await supabase.from("profiles").update(patch).eq("id", userId);
  }
  return (existing.approval_status as ApprovalStatus) ?? null;
}
