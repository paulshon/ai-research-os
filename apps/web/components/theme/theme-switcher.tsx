"use client";

/* v27: 테마 전환 UI (Midnight / Charcoal / Black) */

import { useTheme, type Theme } from "@/components/theme/theme-provider";

const OPTIONS: { id: Theme; label: string; swatch: string }[] = [
  { id: "midnight", label: "미드나잇", swatch: "#01030c" },
  { id: "charcoal", label: "차콜", swatch: "#1f1f1d" },
  { id: "black", label: "블랙", swatch: "#000000" },
];

/** 풀 세그먼트 스위처 (설정 페이지용) — 색상 스와치 미리보기 포함 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => setTheme(o.id)}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] border transition-all ${
            theme === o.id
              ? "border-[#6c8cff] bg-[#6c8cff]/10"
              : "border-white/[0.08] hover:border-white/20"
          }`}
          aria-pressed={theme === o.id}
        >
          <span
            className="w-6 h-6 rounded-full border border-white/15 flex-shrink-0"
            style={{ backgroundColor: o.swatch }}
          />
          <span
            className={`text-[13px] font-medium ${
              theme === o.id ? "text-[#6c8cff]" : "text-white/60"
            }`}
          >
            {o.label}
          </span>
          {theme === o.id && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6c8cff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

/** 컴팩트 토글 버튼 (상단바용) — 클릭 시 순환, 현재 테마 스와치 표시 */
export function ThemeToggleCompact() {
  const { theme, cycleTheme } = useTheme();
  const current = OPTIONS.find((o) => o.id === theme) ?? OPTIONS[0];
  return (
    <button
      onClick={cycleTheme}
      title={`테마: ${current.label} (클릭하여 전환)`}
      className="w-7 h-7 rounded-full border border-white/15 hover:border-white/40 transition-all flex items-center justify-center flex-shrink-0"
      aria-label="테마 전환"
    >
      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: current.swatch }} />
    </button>
  );
}

export default ThemeSwitcher;
