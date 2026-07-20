"use client";

import { useEffect, useState } from "react";

/* 메뉴 접근권한 훅 (v63).
   - can(code): 해당 메뉴/하위메뉴를 "사용(클릭/실행) 가능"한지 여부.
     · 로딩 중 → true (깜빡임 방지; 메뉴는 어차피 항상 표시됨)
     · 관리자/all → true
     · 그 외 → 서버가 준 allowed 집합에 포함될 때만 true (free 등급은 제한적)
   - 메뉴는 항상 화면에 표시하고, can()=false 인 메뉴만 비활성(클릭 불가) 처리한다. */

interface PermState {
  loading: boolean;
  isAdmin: boolean;
  all: boolean;
  allowed: Set<string>;
}

export function usePermissions(): PermState & { can: (code?: string | null) => boolean } {
  const [state, setState] = useState<PermState>({
    loading: true,
    isAdmin: false,
    all: false,
    allowed: new Set(),
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/permissions/me", { credentials: "same-origin" });
        if (!res.ok) {
          if (alive) setState({ loading: false, isAdmin: false, all: true, allowed: new Set() });
          return;
        }
        const d = (await res.json()) as { isAdmin?: boolean; all?: boolean; allowed?: string[] };
        if (alive)
          setState({
            loading: false,
            isAdmin: !!d.isAdmin,
            all: d.all === true,
            allowed: new Set(d.allowed ?? []),
          });
      } catch {
        if (alive) setState({ loading: false, isAdmin: false, all: true, allowed: new Set() });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const can = (code?: string | null) => {
    if (!code) return true; // 권한 코드 없는 항목(대시보드/설정 등)은 항상 허용
    if (state.loading || state.all) return true;
    return state.allowed.has(code);
  };

  return { ...state, can };
}
