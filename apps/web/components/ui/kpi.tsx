import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 수치 타일. value 는 명조체 + tabular-nums (학술 문서의 톤). */
export function Kpi({
  label,
  value,
  unit,
  delta,
  tone,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  delta?: ReactNode;
  tone?: "up" | "down" | "flat" | "warn" | "danger";
  className?: string;
}) {
  const valueStyle =
    tone === "warn" ? { color: "var(--warn)" } : tone === "danger" ? { color: "var(--danger)" } : undefined;
  return (
    <div className={cn("glass kpi", className)}>
      <div className="k">{label}</div>
      <div className="v" style={valueStyle}>
        {value}
        {unit ? <span className="ml-1 text-md text-t3">{unit}</span> : null}
      </div>
      {delta ? <div className={cn("d", tone === "up" && "up", tone === "down" && "down", tone === "flat" && "flat")}>{delta}</div> : null}
    </div>
  );
}
