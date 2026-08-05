import { currentUser } from "@clerk/nextjs/server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import RdosAdminView from "@/components/rdos/rdos-admin-view";
import RdosAdminDenied from "@/components/rdos/rdos-admin-denied";

export const dynamic = "force-dynamic";

/* RDOS 관리자 페이지 — 슈퍼관리자 전용.
   회원가입 승인/거절·퇴출 + RDOS 메뉴 관리. */
export default async function RdosAdminPage() {
  const user = await currentUser().catch(() => null);
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isSuperAdminEmail(email)) {
    return <RdosAdminDenied />;
  }
  return <RdosAdminView />;
}
