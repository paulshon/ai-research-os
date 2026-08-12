"use client";
import { useTranslation } from "@/lib/i18n";

/* Client-side i18n header for the server-rendered RDOS admin page. */
export function RdosAdminHeader() {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="text-[22px] font-bold mb-2">{t("admin.rdos.title")}</h1>
      <p className="text-[13px] text-white/50 mb-6">{t("admin.rdos.subtitle")}</p>
    </>
  );
}

export function RdosAdminNoAccess() {
  const { t } = useTranslation();
  return <div className="p-8 text-[14px] text-white/60">{t("admin.rdos.noAccess")}</div>;
}
