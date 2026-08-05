import type { ReactNode, TableHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** 헤더는 --fs-cap/--t3, 행 hover 시 --glass-1. */
export function Table({ className, children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("tbl", className)} {...rest}>
      {children}
    </table>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** 반드시 다음 행동 버튼을 포함한다. */
  actions?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon ? <div className="em-ic">{icon}</div> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {actions ? <div className="acts">{actions}</div> : null}
    </div>
  );
}

/** 미니 막대. values 는 0–1. */
export function Sparkline({
  values,
  tone = "cool",
  label,
}: {
  values: readonly number[];
  tone?: "hot" | "warm" | "cool";
  label: string;
}) {
  const max = Math.max(...values, 0.0001);
  return (
    <div className="spark" role="img" aria-label={label}>
      {values.map((v, i) => (
        <i
          key={i}
          className={tone}
          style={{ height: `${Math.max(8, Math.round((v / max) * 100))}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function CheckRow({ label, value, ok }: { label: ReactNode; value: ReactNode; ok?: boolean }) {
  return (
    <div className="chk">
      <span className="lb">{label}</span>
      <span className="vl" style={ok === false ? { color: "var(--danger)" } : ok ? { color: "var(--ok)" } : undefined}>
        {value}
      </span>
    </div>
  );
}
