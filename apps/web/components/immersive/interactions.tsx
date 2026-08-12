"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

/* ══════════════════════════════════════════════════════════════
   s-renew-12 · 미시 인터랙션 프리미티브
   카드 hover 시 강조색 광원이 번지고, 선택 시 체크 배지가 튀어나오고,
   점수는 도넛 링 게이지로 표시된다. 실행 버튼은 스피너 → 결과 펼침.
   ══════════════════════════════════════════════════════════════ */

/** 강조색 광원이 번지는 유리 카드. */
export function GlassCard({
  children,
  className = "",
  active = false,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  as?: "div" | "section" | "article";
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Tag
      className={`imm-glass imm-lift relative overflow-hidden rounded-2xl ${active ? "imm-on" : ""} ${className}`}
      {...rest}
    >
      <span className="imm-cardglow" aria-hidden />
      <div className="relative z-[1]">{children}</div>
    </Tag>
  );
}

/** 선택형 카드 — 선택 시 체크 배지가 스케일 인 된다. */
export function PickCard({
  title,
  desc,
  selected,
  onSelect,
  disabled,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`imm-lift ${selected ? "imm-on" : ""} relative overflow-hidden text-left rounded-2xl p-4
                  bg-black/25 border transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
      style={
        selected
          ? {
              borderColor: "var(--imm-ac)",
              boxShadow:
                "inset 0 0 0 1px var(--imm-ac), 0 10px 30px color-mix(in srgb, var(--imm-ac) 22%, transparent)",
            }
          : { borderColor: "rgba(255,255,255,.13)" }
      }
    >
      <span className="imm-cardglow" aria-hidden />
      <span
        className="absolute top-3.5 right-3.5 z-[2] w-5 h-5 rounded-full flex items-center justify-center transition-all"
        style={{
          background: "var(--imm-ac)",
          color: "#07090f",
          opacity: selected ? 1 : 0,
          transform: selected ? "scale(1)" : "scale(.5)",
        }}
        aria-hidden
      >
        <Icon name="check" size={12} />
      </span>
      <span className="relative z-[1] block text-[15.5px] font-extrabold mb-1 pr-7">{title}</span>
      <span className="relative z-[1] block text-[13px] text-white/40 leading-[1.55]">{desc}</span>
    </button>
  );
}

/** 실행 버튼 — 로딩 시 스피너로 전환. */
export function RunButton({
  label,
  loading,
  onClick,
  disabled,
}: {
  label: string;
  loading?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="imm-touch inline-flex items-center gap-2.5 h-[52px] px-7 rounded-2xl text-[15.5px] font-extrabold
                 transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-60"
      style={{
        background:
          "linear-gradient(120deg, var(--imm-ac), color-mix(in srgb, var(--imm-ac) 62%, #fff))",
        color: "#07090f",
        boxShadow: "0 10px 34px color-mix(in srgb, var(--imm-ac) 34%, transparent)",
      }}
    >
      {loading ? (
        <span
          className="imm-spin w-[17px] h-[17px] rounded-full border-[2.4px] border-black/25"
          style={{ borderTopColor: "#07090f" }}
          aria-hidden
        />
      ) : (
        <Icon name="spark" size={16} />
      )}
      <span>{label}</span>
    </button>
  );
}

/** 결과 패널 — show 가 켜지면 아래로 펼쳐진다. */
export function ResultPanel({
  show,
  title = "결과",
  savedLabel = "자동 저장됨",
  children,
}: {
  show: boolean;
  title?: string;
  savedLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`imm-glass rounded-2xl overflow-hidden imm-reveal ${show ? "imm-reveal-on mt-3" : ""}`}>
      <div
        className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.07]"
        style={{
          background: "linear-gradient(120deg, color-mix(in srgb, var(--imm-ac) 12%, transparent), transparent)",
        }}
      >
        <span
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--imm-ac) 20%, transparent)", color: "var(--imm-ac)" }}
        >
          <Icon name="spark" size={15} />
        </span>
        <b className="text-[15px] font-extrabold">{title}</b>
        <span className="ml-auto text-[12.5px] text-[var(--green,#5ebd7c)] flex items-center gap-1.5">
          <Icon name="dot" size={9} /> {savedLabel}
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** 점수 도넛 링 게이지. */
export function DonutScore({
  value,
  label,
  color,
  max = 100,
}: {
  value: number;
  label: string;
  color: string;
  max?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="rounded-2xl p-4 text-center bg-black/25 border border-white/[0.07]">
      <div
        className="w-14 h-14 mx-auto mb-2 rounded-full flex items-center justify-center"
        style={{ background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,.07) 0)` }}
      >
        <span
          className="w-11 h-11 rounded-full flex items-center justify-center font-nanum-myeongjo text-[16px] font-extrabold"
          style={{ background: "var(--bg,#0b0e16)", color }}
        >
          {value}
        </span>
      </div>
      <div className="text-[12.5px] text-white/40 font-semibold">{label}</div>
    </div>
  );
}

/** 결과 뱃지(좋음/나쁨/중립). */
export function ResultBadge({ tone = "n", children }: { tone?: "g" | "r" | "n"; children: React.ReactNode }) {
  const map = {
    g: "bg-[rgba(94,203,134,.14)] text-[#8fe0aa]",
    r: "bg-[rgba(255,112,102,.14)] text-[#ff9a93]",
    n: "bg-white/[0.05] text-white/40",
  } as const;
  return <span className={`text-[12px] px-2.5 py-1 rounded-lg font-semibold ${map[tone]}`}>{children}</span>;
}

/** 사용 예시용 로컬 상태 훅 — 실행 → 결과 펼침. */
export function useRun(delay = 950) {
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);
  const run = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setShown(true);
    }, delay);
  };
  return { loading, shown, run, reset: () => setShown(false) };
}
