"use client";

import Link from "next/link";
import type { RdosLearnerState } from "@ai-research-os/rdos-core";

/* RDOS 시각 상황판 — 커널에서 도출된 상태(props)를 렌더 */
export default function RdosDashboardView({ data }: { data: RdosLearnerState }) {
  const { level, nextLevel, levelPct, xp, summary, missions, competency, alignment, growthCurve, badges, streakDays } = data;
  const maxXp = Math.max(...growthCurve, 1);
  const pts = growthCurve.map((v, i) => `${(i / Math.max(growthCurve.length - 1, 1)) * 100},${40 - (v / maxXp) * 36}`).join(" ");
  const activeMission = missions.find((m) => m.status === "active") ?? null;

  return (
    <div>
      <p className="text-[12px] uppercase tracking-[0.2em] text-white/35 mb-2 font-mono">researcher development os</p>
      <h1 className="text-[26px] font-bold tracking-tight mb-1">학습 현황</h1>
      <p className="text-[14px] text-white/50 mb-8">연구준비자 트랙 · 커널 연동 실시간 학습 상황판.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <Label>현재 레벨</Label>
          <p className="text-[19px] font-bold">{level.code} · {level.ko}</p>
          <Bar pct={levelPct} color="#7c93ff" />
          <p className="text-[11px] text-white/35 mt-1">{nextLevel ? `다음: ${nextLevel.ko} (${nextLevel.minXp} XP)` : "최고 단계"}</p>
        </Card>
        <Card>
          <Label>누적 XP</Label>
          <p className="text-[19px] font-bold text-[#ff7a00]">{xp} XP</p>
          <p className="text-[11px] text-white/35 mt-2">연속 학습 {streakDays}일 🔥</p>
        </Card>
        <Card>
          <Label>전체 학습 진행</Label>
          <p className="text-[19px] font-bold text-[#3ecfb2]">{summary.overallPct}%</p>
          <Bar pct={summary.overallPct} color="#3ecfb2" />
          <p className="text-[11px] text-white/35 mt-1">{summary.doneLessons}/{summary.totalLessons} 레슨</p>
        </Card>
        <Card>
          <Label>미션 현황</Label>
          <p className="text-[19px] font-bold">{summary.missionsDone}<span className="text-white/30 text-[14px]"> / {missions.length}</span></p>
          <p className="text-[11px] text-white/35 mt-2">완료 {summary.missionsDone} · 진행 {summary.missionsActive} · 잠금 {summary.missionsLocked}</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 p-5 rounded-[16px] bg-[#10131a] border border-white/[0.07]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-white/85">미션 현황 (학습 연동)</h2>
            {activeMission && <Link href={activeMission.route} className="text-[12px] text-[#3ecfb2] hover:underline">현재 미션 이어가기 →</Link>}
          </div>
          <div className="space-y-2.5">
            {missions.map((m) => (
              <div key={m.key} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: `${m.color}22`, color: m.color }}>{m.title.slice(0, 1)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] text-white/75 truncate">{m.title}</span>
                    <span className="text-[11px] font-mono flex-shrink-0 ml-2" style={{ color: m.status === "done" ? "#3ecfb2" : m.status === "active" ? m.color : "rgba(255,255,255,0.3)" }}>
                      {m.status === "locked" ? "🔒 잠금" : `${m.done}/${m.total} · ${m.pct}%`}
                    </span>
                  </div>
                  <Bar pct={m.status === "locked" ? 0 : m.pct} color={m.color} thin />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-[16px] bg-[#10131a] border border-white/[0.07]">
            <Label>성장 곡선 (학습 누적 XP)</Label>
            <svg viewBox="0 0 100 44" className="w-full h-[64px] mt-2" preserveAspectRatio="none">
              <polyline points={pts} fill="none" stroke="#ff7a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <polyline points={`0,40 ${pts} 100,40`} fill="#ff7a00" opacity="0.08" stroke="none" />
            </svg>
          </div>
          <div className="p-5 rounded-[16px] bg-[#10131a] border border-white/[0.07]">
            <Label>획득 배지</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {badges.length === 0 && <span className="text-[12px] text-white/35">아직 없음 — 학습을 시작하세요</span>}
              {badges.map((b) => <span key={b} className="px-2.5 py-1 rounded-full text-[11px] bg-[#e8b84b]/12 text-[#e8b84b] border border-[#e8b84b]/20">🏅 {b}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-10">
        <div className="p-5 rounded-[16px] bg-[#10131a] border border-white/[0.07]">
          <h2 className="text-[15px] font-bold text-white/85 mb-4">역량 리터러시 (Competency Kernel)</h2>
          <div className="space-y-3">
            {competency.map((c) => (
              <div key={c.key}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-white/65">{c.label}</span>
                  <span className="font-mono" style={{ color: c.color }}>{c.score}</span>
                </div>
                <Bar pct={c.score} color={c.color} thin />
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 rounded-[16px] bg-[#10131a] border border-white/[0.07]">
          <h2 className="text-[15px] font-bold text-white/85 mb-4">연구 정합성 (Alignment Kernel)</h2>
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {alignment.chain.map((c, i) => (
              <div key={c.step} className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1.5 rounded-[8px] text-[11.5px] border ${c.ok ? "bg-[#3ecfb2]/10 border-[#3ecfb2]/25 text-[#3ecfb2]" : "bg-white/[0.03] border-white/[0.08] text-white/30"}`}>{c.step}</span>
                {i < alignment.chain.length - 1 && <span className="text-white/20 text-[11px]">→</span>}
              </div>
            ))}
          </div>
          {alignment.conflicts.length === 0
            ? <div className="p-3 rounded-[10px] bg-[#3ecfb2]/10 border border-[#3ecfb2]/20 text-[12px] text-[#3ecfb2]">✓ 정합성 충돌 없음</div>
            : alignment.conflicts.map((c) => <div key={c} className="p-3 rounded-[10px] bg-[#ff7066]/10 border border-[#ff7066]/20 text-[12px] text-[#ff9a92]">⚠ {c}</div>)}
        </div>
      </div>

      <h2 className="text-[15px] font-bold mb-4 text-white/80">학습 메뉴</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {missions.map((m) => (
          <Link key={m.key} href={m.route} className="group p-5 rounded-[16px] bg-[#10131a] border border-white/[0.07] hover:border-white/[0.18] transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-[40px] h-[40px] rounded-[11px] flex items-center justify-center text-[15px] font-bold" style={{ background: `${m.color}1f`, color: m.color }}>{m.title.slice(0, 1)}</div>
              <span className="text-[11px] font-mono" style={{ color: m.status === "done" ? "#3ecfb2" : "rgba(255,255,255,0.4)" }}>{m.status === "done" ? "완료" : `${m.pct}%`}</span>
            </div>
            <h3 className="text-[15px] font-bold mb-1 tracking-tight">{m.title}</h3>
            <p className="text-[12.5px] text-white/50 mb-3">{m.provides}</p>
            <Bar pct={m.pct} color={m.color} thin />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="p-5 rounded-[16px] bg-[#10131a] border border-white/[0.07]">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-white/40 font-mono mb-1">{children}</p>;
}
function Bar({ pct, color, thin }: { pct: number; color: string; thin?: boolean }) {
  return (
    <div className={`w-full rounded-full bg-white/[0.06] overflow-hidden mt-2 ${thin ? "h-1.5" : "h-2"}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}
