import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";

export type StepState = "done" | "now" | "todo";

export type StepItem = { title: ReactNode; detail?: ReactNode; state: StepState };

/** 수평 단계 표시. 완료 단계는 체크 아이콘, 나머지는 순번을 보여준다. */
export function Steps({ items, className }: { items: readonly StepItem[]; className?: string }) {
  return (
    <ol className={cn("steps", className)}>
      {items.map((s, i) => (
        <li key={i} className={cn("step", s.state === "done" && "done", s.state === "now" && "now")}>
          <i aria-hidden="true">{s.state === "done" ? <Icon name="check" size={11} /> : i + 1}</i>
          <div className="st">{s.title}</div>
          {s.detail ? <div className="sd">{s.detail}</div> : null}
          <span className="sr">
            {s.state === "done" ? "완료" : s.state === "now" ? "진행 중" : "예정"}
          </span>
        </li>
      ))}
    </ol>
  );
}
