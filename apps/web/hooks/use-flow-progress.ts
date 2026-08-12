"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/* ══════════════════════════════════════════════════════════════
   s-renew-12 · 연구 흐름 진행 추적
   사용자가 실제로 들어간 흐름 단계를 기억해, 사이드바 플랜 게이지와
   리본 스테퍼의 "완료" 표시를 채운다.
   - 브라우저 세션 스토리지에만 저장(서버 부담 없음, 로그아웃 시 정리)
   - SSR 안전: 최초 렌더는 빈 배열, 마운트 후 복원
   ══════════════════════════════════════════════════════════════ */

const KEY = "aros_flow_visited";

/* s-renew-13: 연구 흐름 8단계 */
const FLOW_HREFS = [
  "/research",
  "/literature",
  "/method",
  "/writing",
  "/analyzer",
  "/critique",
  "/validation",
  "/references",
];

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr.filter((h) => FLOW_HREFS.includes(h)) : [];
  } catch {
    return [];
  }
}

export function useFlowProgress() {
  const pathname = usePathname();
  const [visited, setVisited] = useState<string[]>([]);

  /* 마운트 후 복원 (hydration mismatch 방지) */
  useEffect(() => {
    setVisited(read());
  }, []);

  /* 흐름 단계에 진입하면 기록 */
  useEffect(() => {
    const hit = FLOW_HREFS.find((h) => pathname === h || pathname.startsWith(h + "/"));
    if (!hit) return;
    setVisited((prev) => {
      if (prev.includes(hit)) return prev;
      const next = [...prev, hit];
      try {
        window.sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* 저장 실패는 무시 — 표시용 상태일 뿐이다 */
      }
      return next;
    });
  }, [pathname]);

  const reset = useCallback(() => {
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
    setVisited([]);
  }, []);

  return { visited, reset, total: FLOW_HREFS.length };
}
