"use client";

import { useMemo, useState } from "react";
import { MaterialSymbol } from "@/components/literature/material-symbol";
import GraphIconPicker from "@/components/literature/graph-icon-picker";

export type GraphVisualStyle = "default" | "pictogram" | "isotype" | "infographic";

export interface AnalyticsPaper {
  year: number;
  journal: string;
  citations: number;
  keywords: string[];
  source: string;
}

const STYLE_OPTIONS: { id: GraphVisualStyle; label: string; icon: string }[] = [
  { id: "default", label: "기본", icon: "bar_chart" },
  { id: "pictogram", label: "Pictogram", icon: "category" },
  { id: "isotype", label: "Isotype", icon: "account_tree" },
  { id: "infographic", label: "Infographic", icon: "insights" },
];

type ChartKind = "bar" | "line" | "donut" | "lollipop";

const CHART_GUIDE: { kind: ChartKind; label: string; purpose: string }[] = [
  { kind: "bar", label: "막대", purpose: "명목형 빈도·순위" },
  { kind: "lollipop", label: "Lollipop", purpose: "서열형 순위" },
  { kind: "line", label: "선/영역", purpose: "시계열 추세" },
  { kind: "donut", label: "도넛", purpose: "구성비" },
];

function pictogramCell(color: string, style: GraphVisualStyle, iconName: string) {
  if (style === "pictogram") {
    return (
      <span className="inline-flex" style={{ color, opacity: 0.9 }}>
        <MaterialSymbol name={iconName} size={14} filled />
      </span>
    );
  }
  if (style === "isotype") {
    return (
      <span className="inline-flex items-center gap-0.5">
        <MaterialSymbol name={iconName} size={12} className="text-white/50" />
        <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: color, opacity: 0.9 }} />
      </span>
    );
  }
  if (style === "infographic") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/20" style={{ color }}>
        <MaterialSymbol name={iconName} size={12} />
      </span>
    );
  }
  return null;
}

export default function LiteratureAnalyticsPanel({
  papers,
  visualStyle,
  onVisualStyleChange,
  chartIcon = "bar_chart",
  onChartIconChange,
}: {
  papers: AnalyticsPaper[];
  visualStyle: GraphVisualStyle;
  onVisualStyleChange: (s: GraphVisualStyle) => void;
  chartIcon?: string;
  onChartIconChange?: (icon: string) => void;
}) {
  const [chartKind, setChartKind] = useState<ChartKind>("bar");
  const [pickerOpen, setPickerOpen] = useState(false);

  const yearBuckets = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of papers) {
      const y = p.year > 0 ? p.year : 0;
      if (!y) continue;
      m.set(y, (m.get(y) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).slice(-12);
  }, [papers]);

  const journalTop = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of papers) {
      const j = (p.journal || "—").trim();
      if (!j) continue;
      m.set(j, (m.get(j) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [papers]);

  const sourceMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of papers) {
      m.set(p.source, (m.get(p.source) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [papers]);

  const maxYear = Math.max(1, ...yearBuckets.map(([, c]) => c));
  const maxJournal = Math.max(1, ...journalTop.map(([, c]) => c));
  const totalSources = sourceMix.reduce((s, [, c]) => s + c, 0) || 1;
  const colors = ["#6c8cff", "#3ecfb2", "#a78bfa", "#e8b84b", "#f472b6", "#34d399"];

  if (papers.length === 0) {
    return (
      <div className="text-center py-16 text-white/20 text-[15px]">
        검색 결과가 있으면 연도·저널·데이터소스 분포 차트가 표시됩니다.
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <MaterialSymbol name="bar_chart" size={22} className="text-[#6c8cff]" />
        <h3 className="text-[18px] font-semibold">문헌 메타데이터 분석</h3>
        <span className="text-[14px] text-white/25">{papers.length}편</span>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onVisualStyleChange(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] border transition-all ${
              visualStyle === opt.id
                ? "border-[#6c8cff]/50 bg-[#6c8cff]/15 text-[#8ba5ff]"
                : "border-white/[0.06] text-white/40 hover:text-white/65"
            }`}
          >
            <MaterialSymbol name={opt.icon} size={16} />
            {opt.label}
          </button>
        ))}
        {onChartIconChange && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] border border-[#3ecfb2]/35 text-[#3ecfb2] bg-[#3ecfb2]/10"
          >
            <MaterialSymbol name={chartIcon} size={16} />
            아이콘 선택
          </button>
        )}
        <span className="text-[12px] text-white/20">Material Symbols (Apache-2.0)</span>
      </div>
      <GraphIconPicker
        open={pickerOpen}
        value={chartIcon}
        onChange={(ic) => onChartIconChange?.(ic)}
        onClose={() => setPickerOpen(false)}
      />

      <div className="flex flex-wrap gap-1.5">
        {CHART_GUIDE.map((c) => (
          <button
            key={c.kind}
            type="button"
            onClick={() => setChartKind(c.kind)}
            title={c.purpose}
            className={`px-2.5 py-1 rounded-md text-[13px] ${
              chartKind === c.kind ? "bg-white/10 text-white" : "text-white/35 hover:text-white/55"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#13161e] border border-white/[0.04]">
          <p className="text-[14px] font-medium text-white/60 mb-3 flex items-center gap-1">
            <MaterialSymbol name="timeline" size={16} /> 연도별 분포
          </p>
          <div className="space-y-2 min-h-[180px]">
            {yearBuckets.map(([year, count], i) => {
              const color = colors[i % colors.length];
              const w = (count / maxYear) * 100;
              if (chartKind === "line") {
                return (
                  <div key={year} className="flex items-center gap-2 text-[13px]">
                    <span className="w-10 text-white/35 tabular-nums">{year}</span>
                    <div className="flex-1 h-8 relative border-b border-white/10">
                      <div
                        className="absolute bottom-0 w-2 rounded-t"
                        style={{
                          left: `${Math.min(92, w)}%`,
                          height: `${Math.max(12, (count / maxYear) * 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="w-6 text-right text-white/40">{count}</span>
                  </div>
                );
              }
              if (chartKind === "lollipop") {
                return (
                  <div key={year} className="flex items-center gap-2 text-[13px]">
                    <span className="w-10 text-white/35">{year}</span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="h-px flex-1 bg-white/10" style={{ maxWidth: `${w}%` }} />
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <span className="w-6 text-right text-white/40">{count}</span>
                  </div>
                );
              }
              return (
                <div key={year} className="flex items-center gap-2 text-[13px]">
                  {pictogramCell(color, visualStyle, chartIcon)}
                  <span className="w-10 text-white/35 tabular-nums">{year}</span>
                  <div className="flex-1 h-5 bg-white/[0.04] rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${w}%`, backgroundColor: color, opacity: visualStyle === "infographic" ? 0.75 : 1 }}
                    />
                  </div>
                  <span className="w-6 text-right text-white/40">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#13161e] border border-white/[0.04]">
          <p className="text-[14px] font-medium text-white/60 mb-3 flex items-center gap-1">
            <MaterialSymbol name="library_books" size={16} /> 상위 저널
          </p>
          {chartKind === "donut" ? (
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 100 100" className="w-28 h-28 flex-shrink-0">
                {(() => {
                  let acc = 0;
                  return journalTop.map(([, count], i) => {
                    const frac = count / (journalTop.reduce((s, [, c]) => s + c, 0) || 1);
                    const start = acc * 360;
                    acc += frac;
                    const end = acc * 360;
                    const large = end - start > 180 ? 1 : 0;
                    const r = 40;
                    const cx = 50;
                    const cy = 50;
                    const rad = (deg: number) => (deg * Math.PI) / 180;
                    const x1 = cx + r * Math.cos(rad(start - 90));
                    const y1 = cy + r * Math.sin(rad(start - 90));
                    const x2 = cx + r * Math.cos(rad(end - 90));
                    const y2 = cy + r * Math.sin(rad(end - 90));
                    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                    return <path key={i} d={d} fill={colors[i % colors.length]} fillOpacity={0.85} />;
                  });
                })()}
                <circle cx="50" cy="50" r="22" fill="#13161e" />
              </svg>
              <ul className="text-[12px] text-white/45 space-y-1 flex-1 min-w-0">
                {journalTop.map(([name, count], i) => (
                  <li key={name} className="truncate flex gap-2">
                    <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                    {name} ({count})
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-2">
              {journalTop.map(([name, count], i) => {
                const color = colors[i % colors.length];
                const w = (count / maxJournal) * 100;
                return (
                  <div key={name} className="flex items-center gap-2 text-[13px]">
                    {pictogramCell(color, visualStyle, chartIcon)}
                    <span className="flex-1 truncate text-white/55" title={name}>
                      {name}
                    </span>
                    <div className="w-24 h-2 bg-white/[0.04] rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${w}%`, backgroundColor: color }} />
                    </div>
                    <span className="w-5 text-right text-white/35">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#13161e] border border-white/[0.04]">
        <p className="text-[14px] font-medium text-white/60 mb-2 flex items-center gap-1">
          <MaterialSymbol name="hub" size={16} /> 통합 데이터 소스
        </p>
        <div className="flex flex-wrap gap-2">
          {sourceMix.map(([src, count], i) => (
            <span
              key={src}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] border border-white/[0.06] bg-white/[0.02]"
            >
              <MaterialSymbol name="link" size={14} className="text-[#3ecfb2]" />
              {src}
              <span className="text-white/30">
                {((count / totalSources) * 100).toFixed(0)}%
              </span>
            </span>
          ))}
        </div>
        <p className="text-[12px] text-white/20 mt-3">
          Google Material Symbols (Apache License 2.0) · Force Graph는 네트워크분석 탭
        </p>
      </div>
    </div>
  );
}
