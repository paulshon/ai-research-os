import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { isSuperAdminEmail } from "@/lib/admin-config";
import RdosAdminView from "@/components/rdos/rdos-admin-view";

export const dynamic = "force-dynamic";

/* RDOS 관리자 페이지 — 슈퍼관리자 전용.
   회원가입 승인/거절·퇴출 + RDOS 메뉴 관리. */
export default async function RdosAdminPage() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isSuperAdminEmail(email)) {
    return (
      <div className="max-w-[480px] mx-auto text-center py-20">
        <div className="w-14 h-14 rounded-[16px] bg-[#ff7066]/15 text-[#ff7066] flex items-center justify-center mx-auto mb-6 text-[22px] font-bold">!</div>
        <h1 className="text-[20px] font-bold mb-3">관리자 전용</h1>
        <p className="text-[14px] text-white/55 mb-6">RDOS 관리 페이지는 슈퍼관리자만 접근할 수 있습니다.</p>
        <Link href="/rdos" className="text-[13px] text-[#3ecfb2]">← RDOS 대시보드</Link>
      </div>
    );
  }
  return <RdosAdminView />;
}
