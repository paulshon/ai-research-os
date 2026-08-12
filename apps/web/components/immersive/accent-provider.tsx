"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/* ══════════════════════════════════════════════════════════════
   s-renew-12 · Accent Provider
   현재 화면(메뉴)의 강조색을 앱 전역에 흘려보낸다.
   - CSS 변수 --imm-ac 를 <html> 에 심어 Atmosphere·Hero·EXPERT·
     카드 광원 등 모든 몰입 레이어가 같은 색으로 동시에 물든다.
   - 전환 애니메이션은 globals.css 가 담당하므로 값만 바꾸면
     배경 색조 전체가 부드럽게 이어진다.
   ══════════════════════════════════════════════════════════════ */

interface AccentCtx {
  accent: string;
  setAccent: (c: string) => void;
}

const Ctx = createContext<AccentCtx>({ accent: "#6c8cff", setAccent: () => {} });

export function useAccent() {
  return useContext(Ctx);
}

export default function AccentProvider({
  children,
  initial = "#6c8cff",
}: {
  children: React.ReactNode;
  initial?: string;
}) {
  const [accent, setAccent] = useState(initial);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--imm-ac", accent);
  }, [accent]);

  const value = useMemo(() => ({ accent, setAccent }), [accent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
