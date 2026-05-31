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
