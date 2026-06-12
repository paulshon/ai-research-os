import { currentUser } from "@clerk/nextjs/server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getServiceSupabase } from "@/lib/supabase";
import RdosApprovalList from "@/components/admin/rdos-approval-list";

export const dynamic = "force-dynamic";

/* 슈퍼관리자: 연구준비자(RDOS) 가입 승인 관리 */
export default async function AdminRdosPage() {
  const user = await currentUser().catch(() => null);
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isSuperAdminEmail(email)) {
    return <div className="p-8 text-[14px] text-white/60">접근 권한이 없습니다 (슈퍼관리자 전용).</div>;
  }
  const supabase = getServiceSupabase();
  let enrollments: { user_id: string; email: string | null; status: string; profile: Record<string, unknown> | null; created_at: string }[] = [];
  if (supabase) {
    const { data } = await supabase.from("rdos_enrollment").select("user_id, email, status, profile, created_at").order("created_at", { ascending: false });
    enrollments = (data as typeof enrollments) ?? [];
  }
  return (
    <div className="p-8 max-w-[900px]">
      <h1 className="text-[22px] font-bold mb-2">RDOS 가입 승인</h1>
      <p className="text-[13px] text-white/50 mb-6">연구준비자 가입 신청을 승인하면 해당 회원이 RDOS에 진입할 수 있습니다.</p>
      <RdosApprovalList initial={enrollments} />
    </div>
  );
}
