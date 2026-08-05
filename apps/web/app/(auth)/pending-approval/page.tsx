"use client";
import { Icon } from "@/components/ui/icon";

import { useEffect, useState } from "react";
import { useSafeUser, useSafeClerk } from "@/hooks/use-safe-clerk";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

interface MembershipStatus {
  approval_status: string;
  is_special_member: boolean;
  name: string;
}

export default function PendingApprovalPage() {
  const { t } = useTranslation();
  const { user, isLoaded } = useSafeUser();
  const { signOut } = useSafeClerk();
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/membership/status");
        if (res.ok) {
          const data = (await res.json()) as MembershipStatus;
          setStatus(data);
          if (data.approval_status === "approved") {
            window.location.href = "/onboarding";
          }
        }
      } finally {
        setChecking(false);
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [isLoaded, user]);

  const isSpecial = status?.is_special_member ?? false;
  const displayName = status?.name || user?.fullName || t("authPages.pendingApproval.defaultName");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6 font-nanum-gothic">
      <div className="w-full max-w-md">
        <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.06] shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#4a6cf7]/15 flex items-center justify-center text-2xl mb-5 mx-auto">
            {isSpecial ? <Icon name="star" size={22} /> : <Icon name="hourglass" size={22} />}
          </div>

          <h1 className="text-[22px] font-bold text-center text-[#e8eaf0] font-nanum-myeongjo mb-2">
            {isSpecial ? t("authPages.pendingApproval.specialTitle") : t("authPages.pendingApproval.pendingTitle")}
          </h1>

          <p className="text-[14px] text-[#9ba3b8] text-center mb-6 leading-relaxed">
            {checking
              ? t("authPages.pendingApproval.checking")
              : isSpecial
                ? t("common.specialMemberPendingMessage")
                : t("authPages.pendingApproval.pendingMessage").replace("{name}", displayName)}
          </p>

          <div className="p-4 rounded-[12px] bg-[#1a1e2a] border border-[#e8b84b]/20 mb-6">
            <p className="text-[11px] text-[#e8b84b] font-medium mb-1">{t("authPages.pendingApproval.noticeLabel")}</p>
            <p className="text-[13px] text-white/50 leading-relaxed">
              {t("common.membershipNotice")}
            </p>
            <p className="text-[12px] text-white/35 mt-2 leading-relaxed">
              {t("authPages.pendingApproval.noticeBody")}
            </p>
          </div>

          {isSpecial && (
            <p className="text-[12px] text-[#6c8cff]/80 text-center mb-4">
              {t("authPages.pendingApproval.specialThanks").replace("{name}", displayName)}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[14px] font-medium transition-all"
            >
              {t("authPages.pendingApproval.refreshButton")}
            </button>
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="w-full py-3 bg-white/[0.04] border border-white/[0.06] text-white/50 rounded-[12px] text-[13px] hover:text-white/70 transition-all"
            >
              {t("authPages.pendingApproval.logoutButton")}
            </button>
            <Link
              href="/"
              className="block text-center py-2 text-[12px] text-[#4a6cf7] hover:text-[#6c8cff]"
            >
              {t("authPages.pendingApproval.backHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
