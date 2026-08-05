import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "default" | "ok" | "warn" | "danger";

export function ProgressBar({
  value,
  tone = "default",
  label,
  className,
}: {
  /** 0–100 */
  value: number;
  tone?: Tone;
  /** 수치를 문장으로 읽어 주는 설명. 막대만 있는 경우 반드시 지정한다. */
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("bar", tone !== "default" && tone, className)}
      role={label ? "img" : undefined}
      aria-label={label ? `${label} ${pct}퍼센트` : undefined}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 96px 라벨 + 막대 + 48px 퍼센트 3열. */
export function ProgressRow({
  label,
  value,
  tone = "default",
  suffix = "%",
}: {
  label: ReactNode;
  value: number;
  tone?: Tone;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="prow">
      <span className="n">{label}</span>
      <ProgressBar value={pct} tone={tone} />
      <span className="p">
        {pct}
        {suffix}
      </span>
    </div>
  );
}
