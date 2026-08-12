"use client";

// ════════════════════════════════════════════════════════════════════════
//  우측 패널 리사이저 — s-renew-12
//  각 메뉴 페이지 오른쪽 프레임(AI 패널 등)의 왼쪽 경계를 드래그해 너비를
//  조절한다. 너비는 메뉴별로 localStorage 에 저장된다.
//
//  [s-renew-12 수정] 모바일/태블릿 레이아웃 붕괴 해결
//   기존: (min-width:768px) 부터 저장된 고정 px 너비를 그대로 적용 →
//         태블릿(768~1024)에서 레일(204px) + 패널(최대 760px)이 화면을 다 먹어
//         좌측 본문이 0에 가깝게 눌리며 글자가 세로로 쪼개졌다.
//   변경: ① 리사이즈 활성 기준을 lg(1024px) 이상으로 올리고
//         ② 활성 구간에서도 뷰포트 대비 최대 비율(기본 46%)로 실시간 클램프하며
//         ③ 좌측 본문에 항상 최소 폭이 남도록 보장한다.
// ════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";

/** 좌측 본문에 최소한 남겨둘 폭 */
const MIN_CONTENT = 420;

export function ResizableRightPanel({
  storageKey,
  children,
  className = "",
  defaultWidth = 384,
  min = 300,
  max = 760,
  /** 리사이즈가 활성화되는 기준 — 기본 lg(1024px) */
  breakpoint = "lg",
  /** 뷰포트 대비 패널이 차지할 수 있는 최대 비율 */
  maxViewportRatio = 0.46,
}: {
  storageKey: string;
  children: ReactNode;
  className?: string;
  defaultWidth?: number;
  min?: number;
  max?: number;
  breakpoint?: "md" | "lg";
  maxViewportRatio?: number;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const [dragging, setDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [vw, setVw] = useState(1440);
  const startX = useRef(0);
  const startW = useRef(0);
  const widthRef = useRef(width);
  widthRef.current = width;
  const key = "rdos_panelw_" + storageKey;

  /** 뷰포트를 고려한 실제 상한 — 좌측 본문 폭을 반드시 남긴다. */
  const effectiveMax = useCallback(
    (viewport: number) => {
      const byRatio = Math.floor(viewport * maxViewportRatio);
      const byContent = viewport - MIN_CONTENT;
      return Math.max(min, Math.min(max, byRatio, byContent));
    },
    [max, min, maxViewportRatio]
  );

  const clamp = useCallback(
    (w: number, viewport: number) => Math.min(effectiveMax(viewport), Math.max(min, w)),
    [effectiveMax, min]
  );

  /* 초기화 + 뷰포트 변화 추적 */
  useEffect(() => {
    const query = breakpoint === "md" ? "(min-width: 768px)" : "(min-width: 1024px)";
    const mq = window.matchMedia(query);

    const sync = () => {
      const viewport = window.innerWidth;
      setVw(viewport);
      setIsDesktop(mq.matches);
      setWidth((w) => clamp(w, viewport));
    };

    let stored = defaultWidth;
    try {
      const s = localStorage.getItem(key);
      if (s) stored = Number(s) || defaultWidth;
    } catch {
      /* ignore */
    }
    setWidth(clamp(stored, window.innerWidth));
    sync();

    mq.addEventListener?.("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      mq.removeEventListener?.("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 드래그 */
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const dx = startX.current - e.clientX; // 왼쪽으로 끌면 너비 증가
      setWidth(clamp(startW.current + dx, window.innerWidth));
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
  }, [dragging, clamp, key]);

  const startDrag = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startW.current = width;
    setDragging(true);
  };
  const reset = () => {
    const w = clamp(defaultWidth, window.innerWidth);
    setWidth(w);
    try {
      localStorage.setItem(key, String(w));
    } catch {
      /* ignore */
    }
  };

  /* 활성 구간이 아니면 인라인 폭을 주지 않는다 → 모바일/태블릿은 순수 반응형 */
  const style = isDesktop ? { width: clamp(width, vw), flexShrink: 0 } : undefined;

  return (
    <div className={`relative min-w-0 ${className}`} style={style}>
      <div
        onPointerDown={startDrag}
        onDoubleClick={reset}
        role="separator"
        aria-orientation="vertical"
        title="드래그하여 패널 너비 조절 · 더블클릭 시 기본값"
        className={`${
          breakpoint === "md" ? "hidden md:flex" : "hidden lg:flex"
        } absolute -left-1 top-0 h-full w-2 cursor-col-resize z-30 group items-stretch justify-center`}
      >
        <div
          className={`w-px h-full transition-colors ${
            dragging ? "bg-[var(--imm-ac,#6c8cff)]" : "bg-white/[0.06] group-hover:bg-[var(--imm-ac,#6c8cff)]"
          }`}
        />
      </div>
      {children}
    </div>
  );
}
