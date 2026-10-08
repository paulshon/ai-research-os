"use client";

import { createContext, useContext, useState } from "react";
import { NET_GUIDES, guideFor, type Guide } from "@/lib/literature/guides";
import type { Interp, InterpMap } from "@/lib/literature/interpret";

/** 대시보드가 영역별로 계산해 내려 주는 ‘이 결과에 맞춘’ 해석(카드 제목 → 해석) */
export const InterpContext = createContext<InterpMap>({});

type Mode = "easy" | "academic" | "paper";
const TABS: [Mode, string][] = [["easy", "쉬운 해석"], ["academic", "학술적 해석"], ["paper", "논문에 쓰기"]];
const NL = "\n";

/** ▸ 로 시작하는 줄은 소제목, 나머지는 본문 단락 */
function Rich({ text }: { text: string }) {
  return <div className="space-y-1">{text.split(NL).filter(Boolean).map((l, i) => l.startsWith("▸ ")
    ? <p key={i} className="text-[12px] font-semibold text-[#7fd0c6] mt-2 first:mt-0">{l.slice(2)}</p>
    : <p key={i} className="text-[12.5px] leading-relaxed text-white/72 break-words">{l}</p>)}</div>;
}

/** 분석 해설: 쉬운 해석 · 학술적 해석 · 논문에 쓰기 탭(접을 수 있음). dyn 은 이 결과의 숫자로 만든 해석, stat 은 일반 개념 설명. */
export function GuideBox({ dyn, stat, defaultOpen = false }: { dyn?: Interp | null; stat?: Guide | null; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen), [mode, setMode] = useState<Mode>("easy");
  const tabs = TABS.filter(([m]) => m !== "paper" || dyn?.paper);
  const body = (m: Mode): string => {
    const d = dyn?.[m] ?? "", s = m === "paper" ? "" : stat?.[m] ?? "";
    return [d, s ? `▸ 일반 개념 설명${NL}${s}` : ""].filter(Boolean).join(NL);
  };
  return (
    <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02]" data-guide>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-white/50 hover:text-white/80">
        <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>해석 도움말 <span className="text-white/25">{dyn ? "이 결과의 숫자로 푼 쉬운 해석 · 학술적 해석 · 논문 서술 예시" : "쉬운 해석 · 학술적 해석"}</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5">
          <div className="flex gap-1.5 mb-2">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setMode(id)} className={`px-2 py-0.5 rounded-md text-[12px] border ${mode === id ? "border-[#4fa89f]/60 bg-[#4fa89f]/15 text-[#7fd0c6]" : "border-white/[0.08] text-white/40 hover:text-white/70"}`}>{label}</button>
            ))}
          </div>
          <Rich text={body(mode)} />
          {mode === "paper" && <p className="text-[11px] text-white/30 mt-2">예시 문장은 이 화면의 계산 결과로 채워졌습니다. 논문에 옮길 때는 연구의 맥락에 맞게 고치고, 출처와 분석 조건(검색식·기간)을 함께 밝혀 주세요.</p>}
        </div>
      )}
    </div>
  );
}

export function CardGuide({ title }: { title: string }) {
  const dyn = useContext(InterpContext)[title] ?? null, stat = guideFor(title);
  return dyn || stat ? <GuideBox dyn={dyn} stat={stat} /> : null;
}

export function NetGuide({ tab }: { tab: string }) {
  const g = NET_GUIDES[tab];
  return g ? <GuideBox key={tab} stat={g} defaultOpen /> : null;
}
