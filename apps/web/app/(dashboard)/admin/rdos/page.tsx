import { currentUser } from "@clerk/nextjs/server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getServiceSupabase } from "@/lib/supabase";
import RdosApprovalList from "@/components/admin/rdos-approval-list";
import { RdosAdminHeader, RdosAdminNoAccess } from "@/components/admin/rdos-admin-header";

export const dynamic = "force-dynamic";

/* 슈퍼관리자: 연구준비자(RDOS) 가입 승인 관리 */
export default async function AdminRdosPage() {
  const user = await currentUser().catch(() => null);
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isSuperAdminEmail(email)) {
    return <RdosAdminNoAccess />;
  }
  const supabase = getServiceSupabase();
  let enrollments: { user_id: string; email: string | null; status: string; profile: Record<string, unknown> | null; created_at: string }[] = [];
  if (supabase) {
    const { data } = await supabase.from("rdos_enrollment").select("user_id, email, status, profile, created_at").order("created_at", { ascending: false });
    enrollments = (data as typeof enrollments) ?? [];
  }
  return (
    <div className="p-8 max-w-[900px]">
      <RdosAdminHeader />
      <RdosApprovalList initial={enrollments} />
    </div>
  );
}
