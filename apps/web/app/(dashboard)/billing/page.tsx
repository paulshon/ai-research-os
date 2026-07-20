"use client";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";

export default function BillingPage() {
  const { t } = useTranslation();
  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[27px] font-bold font-nanum-myeongjo mb-2">{t("billing.title")}</h1>
        <p className="text-[17px] text-white/35 mb-8">{t("billing.subtitle")}</p>

        {/* Current Plan */}
        <div className="p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04] mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[19px] font-semibold">{t("billing.currentPlan")}</h2>
              <p className="text-[16px] text-white/30 mt-0.5">{t("billing.planFree")}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/[0.04] text-[15px] text-white/50 border border-white/[0.06]">{t("billing.badgeFree")}</span>
          </div>
          <div className="space-y-2 text-[16px] text-white/40 mb-5">
            <p>{t("billing.planFeatures")}</p>
          </div>
          <button className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-[10px] text-[16px] font-medium hover:bg-[#5d7dff] transition-colors">{t("billing.upgradeButton")}</button>
        </div>

        {/* Stripe Integration Notice */}
        <div className="p-6 rounded-[18px] bg-[#1a1e2a] border border-white/[0.04] text-center">
          <p className="text-[16px] text-white/30"><Icon name="💳" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("billing.stripeNotice")}</p>
        </div>
      </div>
    </div>
  );
}
