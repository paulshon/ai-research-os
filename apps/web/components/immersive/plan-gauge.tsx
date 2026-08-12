"use client";

import { Icon } from "@/components/ui/icon";

/* ══════════════════════════════════════════════════════════════
   s-renew-12 · 플랜 배지 게이지
   사이드바 상단에서 6단계 중 몇 개를 끝냈는지 실시간으로 차오른다.
   ══════════════════════════════════════════════════════════════ */

export default function PlanGauge({
  label,
  done,
  total,
  unit = "단계",
}: {
  label: string;
  done: number;
  total: number;
  unit?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div
      className="mx-4 mb-2.5 mt-1 px-3.5 py-3 rounded-2xl relative overflow-hidden"
      style={{
        background: "linear-gradient(120deg, rgba(108,140,255,.14), rgba(167,139,250,.10))",
        border: "1px solid rgba(108,140,255,.22)",
      }}
    >
      <div className="relative z-[1] flex items-center gap-2">
        <Icon name="star" size={14} className="text-[#a9baff] flex-shrink-0" />
        <b className="text-[13px] font-extrabold text-[#a9baff] truncate">{label}</b>
        <small className="text-[11px] text-white/35 ml-auto tabular-nums whitespace-nowrap">
          {done} / {total} {unit}
        </small>
      </div>
      <div className="relative z-[1] mt-2.5 h-1 rounded-full bg-white/10 overflow-hidden">
        <i
          className="block h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#6c8cff,#a78bfa)" }}
        />
      </div>
    </div>
  );
}
