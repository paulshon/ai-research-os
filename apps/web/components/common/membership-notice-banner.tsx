"use client";

import { useState } from "react";
import { MEMBERSHIP_NOTICE } from "@/lib/membership";

const STORAGE_KEY = "airos-membership-notice-dismissed";

export default function MembershipNoticeBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) !== "1";
  });

  if (!visible) return null;

  return (
    <div
      role="status"
      className="bg-[#1a1e2a] border-b border-[#e8b84b]/25 text-center py-2.5 px-4 text-[12px] sm:text-[13px] text-[#e8eaf0]/80 relative z-[60]"
    >
      <span className="text-[#e8b84b] font-medium mr-1.5">공지</span>
      {MEMBERSHIP_NOTICE} 신규 회원가입은 운영자 승인 후 이용 가능합니다.
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "1");
          setVisible(false);
        }}
        className="ml-3 text-white/30 hover:text-white/60 text-[11px] underline-offset-2 hover:underline"
        aria-label="공지 닫기"
      >
        닫기
      </button>
    </div>
  );
}
