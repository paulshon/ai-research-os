"use client";

import { AppShell } from "@/components/shell/app-shell";
import type { ReactNode } from "react";

/**
 * 연구자 트랙 셸.
 * 이전 dashboard-shell 의 상단 탭바·TabletRail·모바일 시트 3중 구현을
 * AppShell 하나로 통합했다. 메뉴별 고유색도 제거했다.
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AppShell track="researcher" primaryAction={{ href: "/writing", label: "이어 쓰기" }}>
      {children}
    </AppShell>
  );
}
