"use client";

import Link from "next/link";

interface Level { code: string; ko: string; en: string; minXp: number }

export default function RdosRoadmapView({ levels, xp, currentCode }: { levels: Level[]; xp: number; currentCode: string }) {
  return (
    <div>
      <Link href="/rdos" className="text-[12px] text-white/40 hover:text-white/80 transition">← Dashboard</Link>
      <h1 className="text-[24px] font-bold tracking-tight mt-4 mb-1">성장 로드맵</h1>
      <p className="text-[14px] text-white/55 mb-8">연구자 성장 단계 — 학습으로 XP를 쌓아 Research-Ready Scholar(L9)에 도달합니다. (현재 {xp} XP)</p>

      <div className="relative pl-6">
        <div className="absolute left-[10px] top-2 bottom-2 w-px bg-white/[0.1]" />
        <div className="space-y-3">
          {levels.map((lv) => {
            const reached = xp >= lv.minXp;
            const current = lv.code === currentCode;
            return (
              <div key={lv.code} className="relative flex items-center gap-4">
                <span className="absolute -left-6 w-[14px] h-[14px] rounded-full border-2"
                  style={{ background: reached ? "#ff7a00" : "#0d0f14", borderColor: reached ? "#ff7a00" : "rgba(255,255,255,0.2)" }} />
                <div className={`flex-1 p-4 rounded-[14px] border ${current ? "bg-[#1a1109] border-[#ff7a00]/50" : reached ? "bg-[#161009] border-[#ff7a00]/25" : "bg-[#10131a] border-white/[0.07]"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold">{lv.code} · {lv.ko} {current && <span className="text-[11px] text-[#ff7a00] ml-1">현재</span>}</span>
                    <span className="text-[11px] font-mono text-white/40">{lv.minXp} XP</span>
                  </div>
                  <p className="text-[12px] text-white/45 font-mono mt-0.5">{lv.en}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
