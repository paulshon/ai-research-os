"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/* ══════════════════════════════════════════════════════════════
   s-renew-12 · 리본 스테퍼
   연구 흐름 6단계를 상단에 얹고, 완료 단계는 연결선을 채워
   "내가 지금 어디쯤인가"를 항상 보이게 한다.
   모바일에서는 가로 스크롤되며 스냅된다.
   ══════════════════════════════════════════════════════════════ */

export interface RibbonStep {
  href: string;
  label: string;
  no: number;
  color: string;
  locked?: boolean;
}

export default function RibbonStepper({
  steps,
  activeHref,
  doneHrefs = [],
}: {
  steps: RibbonStep[];
  activeHref: string;
  doneHrefs?: string[];
}) {
  const done = new Set(doneHrefs);
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-3 md:px-5 h-[56px] flex-shrink-0 relative z-[3]">
      {steps.map((s, i) => {
        const isActive = activeHref === s.href || activeHref.startsWith(s.href + "/");
        const isDone = done.has(s.href) && !isActive;
        const cls = isActive
          ? "font-extrabold"
          : isDone
          ? "text-[var(--green,#5ebd7c)] font-semibold"
          : "text-white/35 font-semibold";

        const inner = (
          <>
            <span
              className="imm-rstep-dot w-[22px] h-[22px] rounded-full border-[1.5px] border-current flex items-center justify-center text-[11px] font-extrabold flex-shrink-0"
              style={
                isActive
                  ? { background: s.color, borderColor: s.color, color: "#07090f", boxShadow: `0 0 14px ${s.color}99` }
                  : isDone
                  ? { background: "var(--green,#5ebd7c)", borderColor: "var(--green,#5ebd7c)", color: "#07090f" }
                  : undefined
              }
            >
              {isDone ? <Icon name="check" size={12} /> : s.no}
            </span>
            <span className="whitespace-nowrap">{s.label}</span>
          </>
        );

        return (
          <div key={s.href} className="flex items-center gap-1 flex-shrink-0">
            {s.locked ? (
              <span
                aria-disabled
                title="접근 권한이 없습니다"
                className="imm-rstep flex items-center gap-2 px-3 py-2 rounded-xl text-[13.5px] text-white/20 cursor-not-allowed select-none"
              >
                {inner}
                <Icon name="lock" size={11} />
              </span>
            ) : (
              <Link
                href={s.href}
                className={`imm-rstep flex items-center gap-2 px-3 py-2 rounded-xl text-[13.5px] hover:bg-white/[0.05] ${cls}`}
                style={
                  isActive
                    ? {
                        color: s.color,
                        background: `color-mix(in srgb, ${s.color} 15%, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${s.color} 28%, transparent)`,
                      }
                    : undefined
                }
              >
                {inner}
              </Link>
            )}
            {i < steps.length - 1 && (
              <span className={`imm-rcon ${done.has(s.href) ? "imm-rcon-fill" : ""}`} aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
