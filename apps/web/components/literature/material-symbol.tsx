"use client";

/**
 * Google Material Symbols (Apache License 2.0)
 * https://fonts.google.com/icons — 문헌연구 엔진 차트·그래프 시각 스타일용
 */

import type { CSSProperties } from "react";

export type MaterialSymbolName =
  | "bar_chart"
  | "show_chart"
  | "pie_chart"
  | "hub"
  | "account_tree"
  | "scatter_plot"
  | "timeline"
  | "radar"
  | "donut_large"
  | "bubble_chart"
  | "article"
  | "science"
  | "groups"
  | "auto_awesome"
  | "compare"
  | "fact_check"
  | "library_books"
  | "person"
  | "category"
  | "link"
  | "insights";

const DEFAULT_CLASS = "material-symbols-outlined";

export function MaterialSymbol({
  name,
  size = 20,
  filled = false,
  className = "",
  style,
  title,
}: {
  name: MaterialSymbolName | string;
  size?: number;
  filled?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <span
      className={`${DEFAULT_CLASS} select-none leading-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: filled ? '"FILL" 1' : '"FILL" 0',
        ...style,
      }}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      {name}
    </span>
  );
}
