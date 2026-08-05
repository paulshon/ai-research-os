"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

/** (rdos)/rdos/admin 서버 페이지의 접근 거부 화면 — 클라이언트에서 i18n 적용 */
export default function RdosAdminDenied() {
  const { t } = useTranslation();
  return (
    <div className="max-w-[480px] mx-auto text-center py-20">
      <div className="w-14 h-14 rounded-[16px] bg-[#ff7066]/15 text-[#ff7066] flex items-center justify-center mx-auto mb-6 text-[22px] font-bold">!</div>
      <h1 className="text-[20px] font-bold mb-3">{t("rdos.admin.adminOnlyTitle")}</h1>
      <p className="text-[14px] text-white/55 mb-6">{t("rdos.admin.adminOnlyDesc")}</p>
      <Link href="/rdos" className="text-[13px] text-[#3ecfb2]">{t("rdos.admin.backToRdosDashboard")}</Link>
    </div>
  );
}
