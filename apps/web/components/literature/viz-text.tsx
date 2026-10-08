"use client";

import { useEffect, useRef, useState } from "react";

/** 컨테이너의 실제 폭(px)을 재서 돌려준다 — 차트를 그 폭 그대로 그려 글자가 늘거나 줄지 않게 한다 */
export function useBox(minW = 320, init = 640): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null), [w, setW] = useState(init);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const set = () => setW(Math.max(minW, Math.round(el.clientWidth) || init));
    set(); const ro = new ResizeObserver(set); ro.observe(el); return () => ro.disconnect();
  }, [minW, init]);
  return [ref, w];
}

/** 여러 줄 SVG 글자(줄 간격 lh). anchor: start | middle | end */
export function Lines({ x, y, lines, lh = 13, anchor = "start", fill = "#fff", opacity = 0.78, size = 11, weight }: { x: number; y: number; lines: string[]; lh?: number; anchor?: "start" | "middle" | "end"; fill?: string; opacity?: number; size?: number; weight?: number }) {
  const y0 = y - ((lines.length - 1) * lh) / 2;   // 세로 가운데 맞춤
  return <text x={x} y={y0} textAnchor={anchor} fontSize={size} fill={fill} fillOpacity={opacity} fontWeight={weight} dominantBaseline="central">{lines.map((l, i) => <tspan key={i} x={x} dy={i ? lh : 0}>{l}</tspan>)}</text>;
}
