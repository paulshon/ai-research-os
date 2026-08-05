import { auth, currentUser } from "@clerk/nextjs/server";
import { isRdosAllowed } from "@/lib/rdos/state-server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getDisabledRdosMenuKeys } from "@/lib/rdos/menu-config-server";
import RdosShell from "@/components/rdos/rdos-shell";
import RdosAccessDenied from "@/components/rdos/rdos-access-denied";

export const dynamic = "force-dynamic";

/* ════════════════════════════════════════════════════════════
   RDOS(연구준비자) 접근 게이트 (v5)
   허용 조건:
     1) 슈퍼관리자 이메일(내장 기본: 마스킹됨), 또는
     2) 연구준비자 가입 후 관리자 승인(enrollment.status = approved/active)
   슈퍼관리자에게는 RDOS 관리자 메뉴를 노출하고, 전역 비활성 메뉴는 숨긴다.
═══════════════════════════════════════════════════════════════ */
async function resolveAccess() {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? user?.primaryEmailAddress?.emailAddress ?? null;
    const allowed = await isRdosAllowed({ email, userId: userId ?? null });
    return { allowed, isSuperAdmin: isSuperAdminEmail(email) };
  } catch {
    return { allowed: false, isSuperAdmin: false };
  }
}

export default async function RdosLayout({ children }: { children: React.ReactNode }) {
  const { allowed, isSuperAdmin } = await resolveAccess();
  if (!allowed) return <RdosAccessDenied />;
  const disabledKeys = await getDisabledRdosMenuKeys();
  return <RdosShell disabledKeys={disabledKeys} isSuperAdmin={isSuperAdmin}>{children}</RdosShell>;
}
