"use client";

/* ════════════════════════════════════════════════════════════════
   v35: DesignMe 스타일 라이브 클럭 메타
   designme.agency 헤더/푸터의 "Gdansk | 9:27 AM GMT+2 · NYC | 9:27 AM EDT"
   처럼 모노스페이스로 실시간 시각을 보여주는 메타 라벨.
═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";

function fmt(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(new Date());
  } catch {
    return "--:--";
  }
}

export function LiveClock({ className = "" }: { className?: string }) {
  const [, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((n) => n + 1), 1000 * 20);
    return () => clearInterval(id);
  }, []);

  // SSR/CSR 불일치 방지: 마운트 전엔 자리표시자
  const seoul = mounted ? fmt("Asia/Seoul") : "--:--";
  const nyc = mounted ? fmt("America/New_York") : "--:--";

  return (
    <div className={`flex items-center gap-3 font-mono text-[10px] text-white/35 tabular-nums ${className}`}>
      <span className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-[#ff7a00]" />
        SEL <span className="text-white/55">{seoul}</span>
      </span>
      <span className="w-px h-3 bg-white/10" />
      <span className="flex items-center gap-1.5">
        NYC <span className="text-white/55">{nyc}</span>
      </span>
    </div>
  );
}
