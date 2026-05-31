"use client";

/* ════════════════════════════════════════════════════════════
   v26: 태블릿 적응형 내비게이션 레일 (Issue 2)
   - Desktop First + Tablet Adaptive + Mobile Responsive 의 중간 계층
   - md(768px)~lg(1024px) 구간: 아이콘 전용 컴팩트 레일
   - 데스크탑 풀 사이드바와 모바일 하단바 사이의 공백을 메움
═══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";
import { RESEARCH_FLOW_ITEMS, ENGINE_ITEMS } from "@/components/dashboard/sidebar";

function RailLink({
  href, icon, label, color, isActive,
}: { href: string; icon: string; label: string; color: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      className={`group relative w-11 h-11 flex items-center justify-center rounded-[10px] transition-all ${
        isActive ? "text-white" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
      }`}
      style={isActive ? { backgroundColor: color + "22", color } : {}}
    >
      <Icon name={icon} size={18} />
      {/* 호버 시 라벨 툴팁 */}
      <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-[#1e2230] border border-white/[0.08] text-[11px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </span>
    </Link>
  );
}

export default function TabletRail() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="hidden md:flex lg:hidden flex-col items-center w-16 flex-shrink-0 border-r border-white/[0.04] bg-[#13161e] h-screen py-3 gap-1 overflow-y-auto scrollbar-none">
      {/* 로고 */}
      <Link href="/dashboard" className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center text-white mb-2 flex-shrink-0" title="AI Research OS">
        <Icon name="logo" size={16} />
      </Link>

      {/* 대시보드 */}
      <RailLink href="/dashboard" icon="dashboard" label={t("sidebar.dashboard")} color="#6c8cff" isActive={pathname === "/dashboard"} />

      <div className="w-8 h-px bg-white/[0.06] my-1" />

      {/* Research Flow */}
      {RESEARCH_FLOW_ITEMS.map((e) => {
        const isActive = e.href === "/literature"
          ? (pathname === "/literature" || pathname.startsWith("/literature/") || pathname === "/literature-review")
          : pathname === e.href || pathname.startsWith(e.href + "/");
        return (
          <RailLink key={e.href} href={e.href} icon={e.icon} label={t(e.labelKey)} color={e.color} isActive={isActive} />
        );
      })}

      <div className="w-8 h-px bg-white/[0.06] my-1" />

      {/* AI Tools */}
      {ENGINE_ITEMS.map((e) => {
        const isActive = pathname === e.href || pathname.startsWith(e.href + "/");
        return (
          <RailLink key={e.href} href={e.href} icon={e.icon} label={t(e.labelKey)} color={e.color} isActive={isActive} />
        );
      })}
      <RailLink href="/chat" icon="chat" label={t("sidebar.chat")} color="#3ecfb2" isActive={pathname === "/chat"} />
      <RailLink href="/library" icon="library" label={t("sidebar.library")} color="#34d399" isActive={pathname === "/library"} />
      <RailLink href="/references" icon="citation" label={t("sidebar.references")} color="#a78bfa" isActive={pathname === "/references"} />

      <div className="flex-1" />

      {/* 설정 */}
      <RailLink href="/settings" icon="settings" label={t("common.settings")} color="#6c8cff" isActive={pathname === "/settings"} />
    </aside>
  );
}
