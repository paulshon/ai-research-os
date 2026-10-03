"use client";

import { useEffect, useState } from "react";

interface Status {
  connected: boolean;
  slow?: boolean;
  servedRows: number;
  sourceRows: number;
  percent: number | null;
  loading: boolean;
  activeInserts: number;
  complete: boolean;
  error?: string;
}

const fmt = (n: number) => n.toLocaleString("ko-KR");

/** LLB 적재 진행 표시 — 적재 중에는 검색 결과가 일부만 보이고 느려질 수 있음을 알린다. */
export default function LlbLoadStatus() {
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      let next: Status | null = null;
      try {
        const r = await fetch("/api/scholar/llb-status", { cache: "no-store" });
        next = await r.json();
      } catch {
        next = null;
      }
      if (!alive) return;
      setS(next);
      // 적재 중이면 15초, 아니면 60초마다 갱신
      timer = setTimeout(tick, next?.loading ? 15000 : 60000);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  if (!s) return null;

  if (!s.connected) {
    return (
      <div className="mx-3 mb-2 px-3 py-2 rounded-lg border border-red-400/30 bg-red-400/[0.06]" role="status">
        <p className="text-[12px] text-red-300 font-medium">ClickHouse 연결 안 됨</p>
        <p className="text-[11px] text-white/35 mt-0.5">검색은 공개 API로 대체됩니다.</p>
      </div>
    );
  }

  if (s.percent === null) {
    // 진행률은 원본(papers_v2) 대비 비율이라, 원본이 없는 서버(E: 드라이브 DB)에서는 계산되지 않는다. 그건 지연이 아니라 정상 연결이다.
    if (s.servedRows > 0) {
      return (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg border border-[#3ecfb2]/30 bg-[#3ecfb2]/[0.06]" role="status">
          <p className="text-[12px] text-[#3ecfb2] font-medium">ClickHouse 연결됨</p>
          <p className="text-[11px] text-white/35 mt-0.5 tabular-nums">
            로컬 문헌 {fmt(s.servedRows)}건 검색 가능{s.slow ? " · 마지막 정상값" : ""}
          </p>
        </div>
      );
    }
    return (
      <div className="mx-3 mb-2 px-3 py-2 rounded-lg border border-[#e8b84b]/30 bg-[#e8b84b]/[0.06]" role="status">
        <p className="text-[12px] text-[#e8b84b] font-medium">ClickHouse 응답 지연</p>
        <p className="text-[11px] text-white/35 mt-0.5">서버가 바빠 적재 상태를 아직 못 읽었습니다. 잠시 후 다시 확인합니다.</p>
      </div>
    );
  }

  const pct = s.percent ?? 0;
  const tone = s.loading ? "border-[#e8b84b]/30 bg-[#e8b84b]/[0.06]" : "border-[#3ecfb2]/30 bg-[#3ecfb2]/[0.06]";
  return (
    <div className={`mx-3 mb-2 px-3 py-2 rounded-lg border ${tone}`} role="status">
      <div className="flex items-center justify-between">
        <p className={`text-[12px] font-medium ${s.loading ? "text-[#e8b84b]" : "text-[#3ecfb2]"}`}>
          {s.loading ? "적재 진행 중 — 결과 불완전" : s.complete ? "적재 완료" : "적재 중단됨 — 일부만 적재"}
        </p>
        <span className="text-[12px] text-white/60 tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
        <div className="h-full bg-current opacity-70" style={{ width: `${pct}%`, color: s.loading ? "#e8b84b" : "#3ecfb2" }} />
      </div>
      <p className="text-[11px] text-white/35 mt-1 tabular-nums">
        {fmt(s.servedRows)} / {fmt(s.sourceRows)}건{s.slow ? " · 마지막 정상값" : ""}
      </p>
      {s.loading && (
        <p className="text-[11px] text-white/35 mt-0.5">아직 적재 안 된 논문은 검색되지 않고, 응답이 느릴 수 있습니다.</p>
      )}
    </div>
  );
}
