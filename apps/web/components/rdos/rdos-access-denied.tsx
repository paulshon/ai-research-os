"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

/* RDOS 접근 거부 화면 — layout.tsx(서버 컴포넌트)에서 렌더할 수 있도록
   분리된 클라이언트 컴포넌트. useTranslation()으로 i18n 처리. */
export default function RdosAccessDenied() {
  const { t } = useTranslation();
  const desc = t("rdos.accessDenied.desc");
  const approval = t("rdos.accessDenied.approvalHighlight");
  const [descBefore, descAfter] = desc.split("{approval}");
  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic flex items-center justify-center px-6">
      <div className="max-w-[480px] text-center">
        <div className="w-14 h-14 rounded-[16px] bg-[#ff7066]/15 text-[#ff7066] flex items-center justify-center mx-auto mb-6 text-[22px] font-bold">!</div>
        <h1 className="text-[22px] font-bold mb-3">{t("rdos.accessDenied.title")}</h1>
        <p className="text-[14px] text-white/55 leading-relaxed mb-8">
          {descBefore}
          <span className="text-white/80">{approval}</span>
          {descAfter}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/rdos-signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] text-[14px] font-semibold bg-[#3ecfb2] text-[#070708] hover:-translate-y-[1px] transition-all">
            {t("rdos.accessDenied.signup")}
          </Link>
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] text-[14px] font-semibold border border-white/[0.12] text-white/75 hover:border-white/30 transition-all">
            {t("rdos.accessDenied.goDashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
