import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { isRdosAllowed } from "@/lib/rdos/state-server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getDisabledRdosMenuKeys } from "@/lib/rdos/menu-config-server";
import RdosShell from "@/components/rdos/rdos-shell";

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

function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic flex items-center justify-center px-6">
      <div className="max-w-[480px] text-center">
        <div className="w-14 h-14 rounded-[16px] bg-[#ff7066]/15 text-[#ff7066] flex items-center justify-center mx-auto mb-6 text-[22px] font-bold">!</div>
        <h1 className="text-[22px] font-bold mb-3">RDOS 접근 권한이 없습니다</h1>
        <p className="text-[14px] text-white/55 leading-relaxed mb-8">
          연구준비자(RDOS) 트랙은 연구준비자로 가입하고 <span className="text-white/80">관리자 승인</span>을 받은 회원만 이용할 수 있습니다.
          현재 계정은 RDOS 승인 회원이 아닙니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/rdos-signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] text-[14px] font-semibold bg-[#3ecfb2] text-[#070708] hover:-translate-y-[1px] transition-all">
            연구준비자로 가입하기
          </Link>
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] text-[14px] font-semibold border border-white/[0.12] text-white/75 hover:border-white/30 transition-all">
            AI-Research-OS로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function RdosLayout({ children }: { children: React.ReactNode }) {
  const { allowed, isSuperAdmin } = await resolveAccess();
  if (!allowed) return <AccessDenied />;
  const disabledKeys = await getDisabledRdosMenuKeys();
  return <RdosShell disabledKeys={disabledKeys} isSuperAdmin={isSuperAdmin}>{children}</RdosShell>;
}
