"use client";

import { useSyncExternalStore } from "react";
import { aiProgress } from "@/lib/ai-progress";

/**
 * ════════════════════════════════════════════════════════════════
 *  GlobalAiProgress (v11) — 상단 메뉴바 AI 분석 진행 표시기
 * ----------------------------------------------------------------
 *  · 10개 동일 사이즈 세그먼트가 왼쪽 → 오른쪽으로 10%씩 점등.
 *  · 진행 퍼센트(정수)를 우측에 표시, 현재 점등 중인 세그먼트는 펄스.
 *  · 비활성 시 자리만 유지(레이아웃 안정), 활성 시 페이드 인.
 *  · 전역 aiProgress 버스를 구독 → 모든 메뉴의 AI 분석에 자동 연동.
 * ════════════════════════════════════════════════════════════════
 */

const SEGMENTS = 10;

function useAiProgress() {
  return useSyncExternalStore(
    aiProgress.subscribe,
    aiProgress.getSnapshot,
    aiProgress.getSnapshot
  );
}

export default function GlobalAiProgress({
  variant = "bar",
}: {
  /** "bar" = 상단 메뉴바(세그먼트형), "thin" = 모바일 헤더 하단(가는 줄) */
  variant?: "bar" | "thin";
}) {
  const { active, percent, label } = useAiProgress();

  if (variant === "thin") {
    return (
      <div
        aria-hidden={!active}
        className={`pointer-events-none h-[2px] w-full overflow-hidden transition-opacity duration-300 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{
            width: `${percent}%`,
            background:
              "linear-gradient(90deg,#6c8cff 0%,#a78bfa 50%,#3ecfb2 100%)",
            boxShadow: "0 0 6px rgba(108,140,255,0.7)",
          }}
        />
      </div>
    );
  }

  // 현재 점등되어야 할 세그먼트 수(0~10)
  const litExact = (percent / 100) * SEGMENTS;
  const fullyLit = Math.floor(litExact);
  const partialIdx = fullyLit; // 펄스(부분 점등) 대상 인덱스

  return (
    <div
      role="progressbar"
      aria-valuenow={active ? percent : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "AI 분석 진행률"}
      className={`flex items-center gap-2.5 select-none transition-all duration-300 ${
        active
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-1 pointer-events-none"
      }`}
      style={{ minWidth: active ? undefined : 0 }}
    >
      {/* 라벨 (md 이상에서만) */}
      <span className="hidden lg:inline-flex items-center gap-1.5 text-[12px] font-medium text-white/45 whitespace-nowrap">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#6c8cff] opacity-70 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6c8cff]" />
        </span>
        {label || "AI 분석 중"}
      </span>

      {/* 10단계 세그먼트 바 */}
      <div className="flex items-center gap-[3px] rounded-md bg-[#0a0c10]/60 border border-white/[0.06] px-1.5 py-1">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const isFull = i < fullyLit;
          const isPartial = i === partialIdx && litExact - fullyLit > 0.05;
          const on = isFull || isPartial;
          return (
            <span
              key={i}
              className={`h-[14px] w-[5px] rounded-[2px] transition-all duration-200 ${
                isPartial ? "animate-pulse" : ""
              }`}
              style={{
                background: on
                  ? "linear-gradient(180deg,#8aa4ff 0%,#6c8cff 100%)"
                  : "rgba(255,255,255,0.08)",
                boxShadow: on ? "0 0 6px rgba(108,140,255,0.65)" : "none",
                opacity: isPartial ? 0.85 : 1,
              }}
            />
          );
        })}
      </div>

      {/* 퍼센트 */}
      <span
        className="text-[12px] font-bold tabular-nums whitespace-nowrap"
        style={{ color: "#8aa4ff", minWidth: 34, textAlign: "right" }}
      >
        {percent}%
      </span>
    </div>
  );
}
