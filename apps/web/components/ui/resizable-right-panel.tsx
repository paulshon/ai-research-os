"use client";

// ════════════════════════════════════════════════════════════════════════
//  RDOS v13 — 우측 패널 리사이저
//  각 메뉴 페이지의 오른쪽 프레임(AI 패널 등)의 "왼쪽 경계"를 드래그하여
//  좌측으로 확장/축소할 수 있게 하는 재사용 래퍼. 데스크톱 전용(모바일은
//  기존 반응형 클래스 유지). 너비는 메뉴별로 localStorage에 저장된다.
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, type ReactNode } from "react";

export function ResizableRightPanel({
  storageKey,
  children,
  className = "",
  defaultWidth = 384,
  min = 300,
  max = 760,
  breakpoint = "md",
}: {
  storageKey: string;
  children: ReactNode;
  className?: string;
  defaultWidth?: number;
  min?: number;
  max?: number;
  breakpoint?: "md" | "lg";
}) {
  const [width, setWidth] = useState(defaultWidth);
  const [dragging, setDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const widthRef = useRef(width);
  widthRef.current = width;
  const key = "rdos_panelw_" + storageKey;

  // 초기화: 미디어쿼리 + 저장된 너비
  useEffect(() => {
    const mq = window.matchMedia(breakpoint === "lg" ? "(min-width: 1024px)" : "(min-width: 768px)");
    const upd = () => setIsDesktop(mq.matches);
    upd();
    mq.addEventListener?.("change", upd);
    try {
      const s = localStorage.getItem(key);
      if (s) setWidth(Math.min(max, Math.max(min, Number(s) || defaultWidth)));
    } catch {
      /* ignore */
    }
    return () => mq.removeEventListener?.("change", upd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 드래그 처리
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      // 왼쪽 경계를 잡고 왼쪽으로 끌면(=clientX 감소) 너비 증가
      const dx = startX.current - e.clientX;
      setWidth(Math.min(max, Math.max(min, startW.current + dx)));
    };
    const onUp = () => {
      setDragging(false);
      try {
        localStorage.setItem(key, String(Math.round(widthRef.current)));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragging, min, max, key]);

  const startDrag = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startW.current = width;
    setDragging(true);
  };
  const reset = () => {
    setWidth(defaultWidth);
    try {
      localStorage.setItem(key, String(defaultWidth));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`relative ${className}`} style={isDesktop ? { width, flexShrink: 0 } : undefined}>
      {/* 드래그 핸들 (데스크톱 전용, 왼쪽 경계) */}
      <div
        onPointerDown={startDrag}
        onDoubleClick={reset}
        role="separator"
        aria-orientation="vertical"
        title="드래그하여 패널 너비 조절 · 더블클릭 시 기본값"
        className={`${
          breakpoint === "lg" ? "hidden lg:flex" : "hidden md:flex"
        } absolute -left-1 top-0 h-full w-2 cursor-col-resize z-30 group items-stretch justify-center`}
      >
        <div
          className={`w-px h-full transition-colors ${
            dragging ? "bg-[#6c8cff]" : "bg-white/[0.06] group-hover:bg-[#6c8cff]/60"
          }`}
        />
      </div>
      {children}
    </div>
  );
}
