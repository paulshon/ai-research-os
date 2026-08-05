"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * 3분할 작업대 레이아웃.
 * 좌우 열은 각각 독립 스크롤하고, 드래그로 폭을 조절한다(비율 localStorage 저장).
 * <1100px 에서는 세로 스택으로 전환한다.
 */
export function Bench({
  left,
  right,
  storageKey = "aros:bench-ratio",
  catalog,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  storageKey?: string;
  /** true 면 좌측을 268px 고정 카탈로그로 쓴다 (논문유형구조). */
  catalog?: boolean;
  className?: string;
}) {
  const [ratio, setRatio] = useState(0.46);
  const dragging = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v) setRatio(Math.min(0.7, Math.max(0.3, Number(v))));
    } catch { /* ignore */ }
  }, [storageKey]);

  const onMove = useCallback(
    (clientX: number) => {
      if (!dragging.current || !root.current || catalog) return;
      const rect = root.current.getBoundingClientRect();
      const next = (clientX - rect.left) / rect.width;
      const clamped = Math.min(0.7, Math.max(0.3, next));
      setRatio(clamped);
      try { localStorage.setItem(storageKey, String(clamped)); } catch { /* ignore */ }
    },
    [catalog, storageKey],
  );

  useEffect(() => {
    function move(e: MouseEvent) { onMove(e.clientX); }
    function up() { dragging.current = false; }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [onMove]);

  return (
    <div
      ref={root}
      className={cn("bench", catalog && "bench-cat", className)}
      style={
        catalog
          ? undefined
          : ({
              gridTemplateColumns: `minmax(340px, ${ratio}fr) 1px minmax(420px, ${1.15 - ratio + 0.46}fr)`,
            } as React.CSSProperties)
      }
    >
      {left}
      {!catalog ? (
        <div
          className="bench-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="열 폭 조절"
          tabIndex={0}
          onMouseDown={() => { dragging.current = true; }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setRatio((r) => Math.max(0.3, r - 0.02));
            if (e.key === "ArrowRight") setRatio((r) => Math.min(0.7, r + 0.02));
          }}
        />
      ) : null}
      {right}
    </div>
  );
}

export function BenchPane({
  head,
  foot,
  children,
  className,
  bodyClassName,
}: {
  head?: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("bench-pane", className)}>
      {head ? <div className="bench-head">{head}</div> : null}
      <div className={cn("bench-body", bodyClassName)}>{children}</div>
      {foot ? <div className="bench-foot">{foot}</div> : null}
    </div>
  );
}
