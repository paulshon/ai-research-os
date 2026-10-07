"use client";

import { useState } from "react";
import { NET_GUIDES, guideFor, type Guide } from "@/lib/literature/guides";

/** 분석 해설: ‘쉬운 해석’과 ‘학술적 해석’을 탭으로 나눠 보여 준다(접을 수 있음). */
export function GuideBox({ guide, defaultOpen = false }: { guide: Guide; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen), [mode, setMode] = useState<"easy" | "academic">("easy");
  return (
    <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02]" data-guide>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-white/50 hover:text-white/80">
        <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>해석 도움말 <span className="text-white/25">쉬운 해석 · 학술적 해석</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5">
          <div className="flex gap-1.5 mb-1.5">
            {([["easy", "쉬운 해석"], ["academic", "학술적 해석"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setMode(id)} className={`px-2 py-0.5 rounded-md text-[12px] border ${mode === id ? "border-[#4fa89f]/60 bg-[#4fa89f]/15 text-[#7fd0c6]" : "border-white/[0.08] text-white/40 hover:text-white/70"}`}>{label}</button>
            ))}
          </div>
          <p className="text-[12.5px] leading-relaxed text-white/65">{guide[mode]}</p>
        </div>
      )}
    </div>
  );
}

export function CardGuide({ title }: { title: string }) {
  const g = guideFor(title);
  return g ? <GuideBox guide={g} /> : null;
}

export function NetGuide({ tab }: { tab: string }) {
  const g = NET_GUIDES[tab];
  return g ? <GuideBox key={tab} guide={g} defaultOpen /> : null;
}
