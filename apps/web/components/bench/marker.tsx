"use client";

import { cn } from "@/lib/utils";

export type MarkerSeverity = "danger" | "warn" | "info" | "ok";

/**
 * 본문 위 지적 표시.
 * 색만으로 구분하지 않도록 위첨자 라벨을 반드시 붙인다.
 * 클릭 시 우측 패널의 해당 진단 카드로 스크롤 + 하이라이트(2초).
 */
export function Marker({
  severity,
  label,
  anchorId,
  children,
  onActivate,
}: {
  severity: MarkerSeverity;
  label: string;
  anchorId: string;
  children: React.ReactNode;
  onActivate?: (anchorId: string) => void;
}) {
  return (
    <button
      type="button"
      id={`mk-${anchorId}`}
      className={cn("mk", `mk-${severity}`)}
      data-anchor={anchorId}
      onClick={() => {
        onActivate?.(anchorId);
        const card = document.getElementById(`dx-${anchorId}`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("hl");
          window.setTimeout(() => card.classList.remove("hl"), 2000);
        }
      }}
    >
      {children}
      <sup>{label}</sup>
    </button>
  );
}

/** 진단 카드 → 원문 마커로 역방향 이동. */
export function scrollToMarker(anchorId: string) {
  const mk = document.getElementById(`mk-${anchorId}`);
  if (!mk) return;
  mk.scrollIntoView({ behavior: "smooth", block: "center" });
  mk.classList.add("on");
  window.setTimeout(() => mk.classList.remove("on"), 2000);
}

export function PageRail({
  pages,
  current,
  marked,
  onSelect,
}: {
  pages: number;
  current: number;
  marked?: Set<number>;
  onSelect: (page: number) => void;
}) {
  return (
    <div className="thumbs" role="listbox" aria-label="페이지">
      {Array.from({ length: pages }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            role="option"
            aria-selected={n === current}
            className={cn("thumb", n === current && "on")}
            onClick={() => onSelect(n)}
          >
            {n}
            {marked?.has(n) ? <span className="dotmk" aria-label="지적 있음" /> : null}
          </button>
        );
      })}
    </div>
  );
}
