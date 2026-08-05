"use client";

import { AppShell } from "@/components/shell/app-shell";
import type { ReactNode } from "react";

/**
 * 연구준비자(RDOS) 트랙 셸.
 * 강조색은 data-track="rdos" 가 CSS 변수 --accent 를 청록으로 스왑한다.
 */
export default function RdosShell({
  children,
  disabledKeys = [],
}: {
  children: ReactNode;
  disabledKeys?: string[];
  isSuperAdmin?: boolean;
}) {
  return (
    <AppShell
      track="rdos"
      disabledKeys={new Set(disabledKeys)}
      primaryAction={{ href: "/rdos/roadmap", label: "이어서 학습" }}
    >
      {children}
    </AppShell>
  );
}
