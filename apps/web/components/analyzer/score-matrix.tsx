"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { SectionId } from "@/lib/analyzer/sections";
import { cellClass, sectionScore, type AxisScore } from "@/lib/analyzer/score";
import type { Axis } from "@/lib/analyzer/axes";

export interface MatrixRow {
  id: SectionId;
  label: string;
  found: boolean;
  axes: Axis[];
  axisScores: AxisScore[];
}

/**
 * 7섹션 × 4축 점수 매트릭스. role="grid" + 화살표 키 네비게이션.
 * 섹션마다 축의 의미가 달라 헤더는 "축1..축4"로 일반화하고,
 * 실제 축 이름은 각 셀의 title(tooltip)에 담는다.
 */
export function ScoreMatrix({
  rows,
  selectedId,
  onSelect,
}: {
  rows: MatrixRow[];
  selectedId: SectionId | null;
  onSelect: (id: SectionId) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);

  const move = (delta: number) => {
    if (!rows.length) return;
    const i = rows.findIndex((r) => r.id === selectedId);
    const next = rows[(Math.max(i, 0) + delta + rows.length) % rows.length];
    onSelect(next.id);
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-row="${next.id}"]`)?.focus();
    });
  };

  return (
    <div className="matrix" role="grid" aria-label="섹션별 진단축 점수 매트릭스" ref={gridRef}>
      <div className="mx-head" role="row">
        <span>섹션</span>
        <span>축1</span>
        <span>축2</span>
        <span>축3</span>
        <span>축4</span>
        <span>총점</span>
      </div>
      {rows.map((row) => {
        const total = row.found ? sectionScore(row.axisScores) : null;
        const on = row.id === selectedId;
        return (
          <button
            key={row.id}
            type="button"
            role="row"
            data-row={row.id}
            className={cn("mx-row", on && "on")}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(row.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
          >
            <span className="nm" role="gridcell">
              {row.label}
              {!row.found ? " · 미작성" : ""}
            </span>
            {[0, 1, 2, 3].map((i) => {
              const axis = row.axes[i];
              const score = row.found ? row.axisScores[i]?.score ?? null : null;
              return (
                <span
                  key={i}
                  role="gridcell"
                  className={cn("cell", cellClass(score))}
                  title={axis ? `${axis.label}: ${score ?? "미작성"}` : undefined}
                >
                  {score ?? "–"}
                </span>
              );
            })}
            <span className="tot" role="gridcell">
              {total ?? "미작성"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
