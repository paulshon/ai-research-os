"use client";
import { Icon } from "@/components/ui/icon";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import {
  MEMBERSHIP_NOTICE,
  SPECIAL_MEMBER_PENDING_MESSAGE,
} from "@/lib/membership";

interface MembershipStatus {
  approval_status: string;
  is_special_member: boolean;
  name: string;
}

export default function PendingApprovalPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
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
  const displayName = status?.name || user?.fullName || "회원";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6 font-nanum-gothic">
      <div className="w-full max-w-md">
        <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.06] shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#4a6cf7]/15 flex items-center justify-center text-2xl mb-5 mx-auto">
            {isSpecial ? <Icon name="star" size={22} /> : <Icon name="hourglass" size={22} />}
          </div>

          <h1 className="text-[22px] font-bold text-center text-[#e8eaf0] font-nanum-myeongjo mb-2">
            {isSpecial ? "특별회원 안내" : "가입 승인 대기"}
          </h1>

          <p className="text-[14px] text-[#9ba3b8] text-center mb-6 leading-relaxed">
            {checking
              ? "승인 상태를 확인하고 있습니다…"
              : isSpecial
                ? SPECIAL_MEMBER_PENDING_MESSAGE
                : `${displayName}님, 운영자의 승인을 기다리고 있습니다. 승인이 완료되면 자동으로 안내해 드립니다.`}
          </p>

          <div className="p-4 rounded-[12px] bg-[#1a1e2a] border border-[#e8b84b]/20 mb-6">
            <p className="text-[11px] text-[#e8b84b] font-medium mb-1">공지</p>
            <p className="text-[13px] text-white/50 leading-relaxed">
              {MEMBERSHIP_NOTICE}
            </p>
            <p className="text-[12px] text-white/35 mt-2 leading-relaxed">
              본 사이트는 운영자 승인 후 회원가입이 완료됩니다. 신규 가입
              신청은 순차적으로 검토합니다.
            </p>
          </div>

          {isSpecial && (
            <p className="text-[12px] text-[#6c8cff]/80 text-center mb-4">
              특별회원 {displayName}님께 감사드립니다.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[14px] font-medium transition-all"
            >
              승인 상태 새로고침
            </button>
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="w-full py-3 bg-white/[0.04] border border-white/[0.06] text-white/50 rounded-[12px] text-[13px] hover:text-white/70 transition-all"
            >
              로그아웃
            </button>
            <Link
              href="/"
              className="block text-center py-2 text-[12px] text-[#4a6cf7] hover:text-[#6c8cff]"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
