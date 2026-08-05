import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("list", className)}>{children}</div>;
}

/** 좌 배지 + 본문(제목/부제) + 우 액션. */
export function DataItem({
  lead,
  title,
  sub,
  action,
  className,
}: {
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("li", className)}>
      {lead}
      <div className="t">
        <b>{title}</b>
        {sub ? <span>{sub}</span> : null}
      </div>
      {action}
    </div>
  );
}
