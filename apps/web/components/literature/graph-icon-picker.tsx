"use client";

/**
 * Material Symbols 아이콘 피커 (Apache License 2.0)
 * Pictogram / Isotype / Infographic 스타일에서 네트워크·차트 노드에 적용할 아이콘 선택
 */

import { useMemo, useState } from "react";
import { MaterialSymbol } from "@/components/literature/material-symbol";

export const GRAPH_ICON_CATALOG: { name: string; label: string; category: string }[] = [
  { name: "person", label: "사람", category: "people" },
  { name: "group", label: "그룹", category: "people" },
  { name: "groups", label: "다수", category: "people" },
  { name: "school", label: "교육", category: "people" },
  { name: "science", label: "과학", category: "research" },
  { name: "biotech", label: "연구", category: "research" },
  { name: "article", label: "논문", category: "research" },
  { name: "menu_book", label: "도서", category: "research" },
  { name: "hub", label: "허브", category: "network" },
  { name: "share", label: "연결", category: "network" },
  { name: "account_tree", label: "트리", category: "network" },
  { name: "device_hub", label: "디바이스허브", category: "network" },
  { name: "bar_chart", label: "막대", category: "chart" },
  { name: "show_chart", label: "선", category: "chart" },
  { name: "pie_chart", label: "파이", category: "chart" },
  { name: "donut_large", label: "도넛", category: "chart" },
  { name: "scatter_plot", label: "산점", category: "chart" },
  { name: "bubble_chart", label: "버블", category: "chart" },
  { name: "timeline", label: "타임라인", category: "chart" },
  { name: "insights", label: "인사이트", category: "chart" },
  { name: "category", label: "범주", category: "chart" },
  { name: "hexagon", label: "육각", category: "shape" },
  { name: "circle", label: "원", category: "shape" },
  { name: "square", label: "사각", category: "shape" },
  { name: "change_history", label: "삼각", category: "shape" },
  { name: "star", label: "별", category: "shape" },
  { name: "favorite", label: "하트", category: "shape" },
  { name: "location_on", label: "위치", category: "misc" },
  { name: "work", label: "업무", category: "misc" },
  { name: "home", label: "홈", category: "misc" },
  { name: "public", label: "지구", category: "misc" },
  { name: "bolt", label: "번개", category: "misc" },
];

const CATS = [
  { id: "all", label: "전체" },
  { id: "people", label: "사람" },
  { id: "research", label: "연구" },
  { id: "network", label: "네트워크" },
  { id: "chart", label: "차트" },
  { id: "shape", label: "도형" },
  { id: "misc", label: "기타" },
];

export default function GraphIconPicker({
  value,
  onChange,
  open,
  onClose,
}: {
  value: string;
  onChange: (icon: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const filtered = useMemo(() => {
    return GRAPH_ICON_CATALOG.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return i.name.includes(s) || i.label.includes(q);
    });
  }, [q, cat]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-[#13161e] border border-white/[0.1] shadow-2xl flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[16px] font-semibold text-white/90">Material Symbols 아이콘 선택</h3>
            <button type="button" onClick={onClose} className="text-white/40 hover:text-white/70 text-[20px] leading-none">×</button>
          </div>
          <p className="text-[12px] text-white/30 mb-2">Apache License 2.0 · Google Material Symbols</p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="아이콘 검색…"
            className="w-full px-3 py-2 rounded-lg bg-[#0d0f14] border border-white/[0.08] text-[14px] text-white/80"
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`px-2 py-0.5 rounded text-[12px] border ${
                  cat === c.id ? "border-[#6c8cff]/50 text-[#8ba5ff] bg-[#6c8cff]/10" : "border-white/[0.06] text-white/35"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto p-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
          {filtered.map((i) => (
            <button
              key={i.name}
              type="button"
              onClick={() => {
                onChange(i.name);
                onClose();
              }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                value === i.name
                  ? "border-[#6c8cff]/50 bg-[#6c8cff]/15"
                  : "border-white/[0.05] hover:border-white/[0.12] bg-white/[0.02]"
              }`}
            >
              <MaterialSymbol name={i.name} size={28} className="text-[#a8b0c0]" />
              <span className="text-[11px] text-white/45 truncate w-full text-center">{i.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
