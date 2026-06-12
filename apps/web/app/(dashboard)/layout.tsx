import DashboardShell from "@/components/dashboard/dashboard-shell";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { ensureMembershipProfile } from "@/lib/membership-server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// v4(감사 Medium): 매 네비게이션마다 currentUser()+Supabase 동기화를 수행하던 것을
// 세션당 1회로 제한한다. 동기화 완료 시 짧은 수명의 쿠키를 심어 이후 이동에서는
// Clerk API/DB 왕복을 건너뛴다(차단/강등은 미들웨어 승인 캐시가 담당).
const SYNC_COOKIE = "aros_synced";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const { userId } = await auth();
    if (userId) {
      const jar = await cookies();
      const alreadySynced = jar.get(SYNC_COOKIE)?.value === userId;
      if (!alreadySynced) {
        const user = await currentUser();
        const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
        await ensureMembershipProfile({
          userId,
          email,
          name:
            [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
            user?.username ||
            null,
          avatarUrl: user?.imageUrl ?? null,
        });

        // 슈퍼관리자 이메일은 Supabase 에서도 role=admin·승인으로 승격(영구 일관성).
        if (isSuperAdminEmail(email)) {
          const supabase = getServiceSupabase();
          if (supabase) {
            await supabase
              .from("profiles")
              .update({ role: "admin", approval_status: "approved", updated_at: new Date().toISOString() })
              .eq("id", userId);
          }
        }
        // 세션당 1회 동기화 표식 (10분).
        jar.set(SYNC_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
      }
    }
  } catch {
    /* 동기화 실패가 페이지 렌더를 막지 않도록 무시 */
  }

  return <DashboardShell>{children}</DashboardShell>;
}
