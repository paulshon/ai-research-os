"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentedItem<T extends string> = { value: T; label: ReactNode; tail?: ReactNode };

/**
 * 탭형 세그먼트 컨트롤. WAI-ARIA tabs 패턴을 따른다.
 * 좌우 화살표로 이동하고 Home/End 로 양끝으로 간다.
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: readonly SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 이 세그먼트가 무엇을 고르는지 (aria-label) */
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function move(delta: number) {
    const i = items.findIndex((it) => it.value === value);
    const next = items[(i + delta + items.length) % items.length];
    onChange(next.value);
    requestAnimationFrame(() => {
      const buttons = ref.current?.querySelectorAll<HTMLButtonElement>("button");
      buttons?.[items.indexOf(next)]?.focus();
    });
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={label}
      className={cn("seg", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (e.key === "Home") { e.preventDefault(); onChange(items[0].value); }
        else if (e.key === "End") { e.preventDefault(); onChange(items[items.length - 1].value); }
      }}
    >
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={cn(on && "on")}
            onClick={() => onChange(it.value)}
          >
            {it.label}
            {it.tail ? <span className="ml-2 text-cap text-t3">{it.tail}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
