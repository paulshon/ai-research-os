"use client";

import { useEffect, useState } from "react";

export interface LoadStep { label: string; state: "done" | "active" | "pending" }

/**
 * 검색 로딩 도넛. 가짜 퍼센트를 그리지 않고 "실제 단계"를 조각으로 나눈다:
 *  끝난 단계 = 채워진 조각, 진행 중 = 깜빡이는 조각 + 바깥 회전 호, 대기 = 빈 조각. 가운데는 경과 시간(초).
 * 가운데 숫자는 진행률(%): percent 를 주면 그 값(실제 완료 비율), 주지 않으면 끝난 단계 수와 경과 시간(예상 소요 expectedSec 에 점근, 완료 전에는 95% 까지만)으로 추정한다.
 * 움직임을 줄인 환경(prefers-reduced-motion)에서는 회전·깜빡임 없이 색으로만 상태를 나타낸다.
 */
export default function DonutLoader({ title, steps, hint, size = 92, compact = false, percent, expectedSec = 30 }: {
  title: string; steps: LoadStep[]; hint?: string; size?: number; compact?: boolean; percent?: number; expectedSec?: number;
}) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  const n = Math.max(1, steps.length);
  const R = 36, C = 2 * Math.PI * R;
  const gap = n > 1 ? 6 : 0;
  const seg = C / n - gap;
  const done = steps.filter((s) => s.state === "done").length;
  const stepPct = (steps.filter((s) => s.state === "done").length / n) * 100;
  const est = Math.min(95, 100 * (1 - Math.exp(-sec / Math.max(5, expectedSec))));
  const pct = Math.round(percent != null ? Math.min(100, Math.max(0, percent)) : done >= n ? 100 : Math.max(stepPct, est));
  const activeLabel = steps.find((s) => s.state === "active")?.label ?? title;

  return (
    <div role="status" aria-live="polite" aria-label={`${title} — ${activeLabel}, ${pct}% 진행`}
      className={`flex items-center gap-4 rounded-xl bg-[#13161e] border border-white/[0.05] ${compact ? "p-2.5" : "p-4"}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={50} cy={50} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
          {steps.map((s, i) => (
            <circle key={i} cx={50} cy={50} r={R} fill="none" strokeWidth={10}
              strokeDasharray={`${seg} ${C - seg}`} strokeDashoffset={-(i * (C / n))}
              stroke={s.state === "done" ? "#199e70" : s.state === "active" ? "#3987e5" : "transparent"}
              className={s.state === "active" ? "motion-safe:animate-pulse" : ""} />
          ))}
          <g className="motion-safe:animate-spin" style={{ transformOrigin: "50px 50px", animationDuration: "1.4s" }}>
            <circle cx={50} cy={50} r={47} fill="none" stroke="#3987e5" strokeWidth={2} strokeLinecap="round" strokeDasharray="22 274" opacity={0.8} />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className={`${size < 60 ? "text-[11px]" : "text-[17px]"} font-semibold text-white/90 tabular-nums`}>{pct}<span className="text-[10px] font-normal text-white/50">%</span></span>
          {size >= 60 && <span className="text-[9px] text-white/35 mt-0.5">진행</span>}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[14px] text-white/85 font-medium">{title}</p>
        <ul className="mt-1.5 space-y-0.5">
          {steps.map((s) => (
            <li key={s.label} className={`text-[12px] flex items-center gap-1.5 ${s.state === "pending" ? "text-white/30" : s.state === "active" ? "text-white/80" : "text-white/50"}`}>
              <span className="inline-block w-3 text-center" aria-hidden="true">{s.state === "done" ? "✓" : s.state === "active" ? "●" : "○"}</span>
              {s.label}
            </li>
          ))}
        </ul>
        {hint && done < n && <p className="text-[11px] text-white/30 mt-1.5">{hint}</p>}
      </div>
    </div>
  );
}
