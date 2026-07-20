"use client";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";

export default function NotificationsPage() {
  const { t } = useTranslation();
  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[27px] font-bold font-nanum-myeongjo mb-2">{t("notifications.title")}</h1>
        <p className="text-[17px] text-white/35 mb-8">{t("notifications.subtitle")}</p>

        <div className="p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04] text-center py-16">
          <p className="text-[31px] mb-3 opacity-50"><Icon name="🔔" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
          <p className="text-[18px] text-white/40 font-medium mb-1">{t("notifications.empty")}</p>
          <p className="text-[16px] text-white/20">{t("notifications.emptyDesc")}</p>
        </div>
      </div>
    </div>
  );
}
