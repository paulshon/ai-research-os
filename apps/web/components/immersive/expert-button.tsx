"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/* ══════════════════════════════════════════════════════════════
   s-renew-12 · EXPERT 버튼
   타이틀 옆 자리를 유지하되 강조색 그라디언트 + 은은한 광택(sheen).
   목적지 엔진 이름을 캡슐로 붙여 "어디로 가는지" 예측 가능하게 한다.
   ══════════════════════════════════════════════════════════════ */

export function ExpertButton({ href, engineName }: { href: string; engineName?: string }) {
  /* s-renew-14: 목적지 엔진명 캡슐 제거 — EXPERT 한 단어만 남긴다.
     engineName 은 접근성/툴팁 용도로만 유지한다. */
  return (
    <Link
      href={href}
      className="imm-expert imm-touch inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-extrabold tracking-[.05em] flex-shrink-0"
      title={engineName ? `EXPERT — ${engineName}` : "EXPERT"}
      aria-label={engineName ? `EXPERT — ${engineName}` : "EXPERT"}
    >
      <Icon name="bolt" size={15} />
      <span>EXPERT</span>
    </Link>
  );
}

/** EXPERT 화면에서 간편 화면으로 되돌아가는 칩. */
export function BackChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="imm-touch inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13.5px] font-bold text-white/65
                 bg-white/[0.06] border border-white/[0.13] hover:bg-white/[0.13] hover:text-white
                 transition-all hover:-translate-x-0.5 flex-shrink-0"
    >
      <Icon name="arrowLeft" size={15} />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}
