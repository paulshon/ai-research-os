"use client";

/* ════════════════════════════════════════════════════════════
   v50: 태블릿 적응형 내비게이션 (Issue: 아이콘만 보이던 문제 해결)
   - md(768px)~lg(1024px) 구간: 아이콘 + 메뉴명을 함께 표시하는 컴팩트 사이드바
   - 데스크탑 풀 사이드바(w-64)와 모바일 하단바 사이의 중간 계층
   - 기존 아이콘 전용 레일(w-16) → 라벨형 컴팩트 사이드바(w-[200px])로 변경
═══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useTranslation } from "@/lib/i18n";
import { RESEARCH_FLOW_ITEMS, ENGINE_ITEMS } from "@/components/dashboard/sidebar";
import { usePermissions } from "@/hooks/use-permissions";

function RailLink({
  href, icon, label, color, isActive,
}: { href: string; icon: string; label: string; color: string; isActive: boolean }) {
  // v50: hover/터치 시 해당 메뉴 강조색 틴트
  const vars = {
    "--ac": color,
    "--ac-bg": color + "22",
    "--ac-bg-on": color + "2b",
    "--ac-icon": color + "33",
  } as React.CSSProperties;
  return (
    <Link
      href={href}
      title={label}
      style={vars}
      className={`group relative flex items-center gap-2.5 pl-2.5 pr-2 py-2 rounded-[10px] text-[14px] transition-all whitespace-nowrap ${
        isActive
          ? "bg-[var(--ac-bg-on)] text-[var(--ac)] font-semibold"
          : "text-white/55 font-medium hover:bg-[var(--ac-bg)] hover:text-[var(--ac)] active:bg-[var(--ac-bg)] active:text-[var(--ac)]"
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all ${
          isActive ? "h-5 opacity-100" : "h-0 opacity-0"
        }`}
        style={{ backgroundColor: "var(--ac)" }}
        aria-hidden
      />
      <span
        className={`w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-colors ${
          isActive
            ? "bg-[var(--ac-icon)] text-[var(--ac)]"
            : "text-inherit group-hover:bg-[var(--ac-icon)] group-hover:text-[var(--ac)] group-active:bg-[var(--ac-icon)] group-active:text-[var(--ac)]"
        }`}
      >
        <Icon name={icon} size={17} />
      </span>
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold text-white/25 uppercase tracking-[0.14em]">
      {children}
    </p>
  );
}

export default function TabletRail() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { can } = usePermissions();

  return (
    <aside className="hidden md:flex lg:hidden flex-col w-[200px] flex-shrink-0 border-r border-white/[0.04] bg-[#13161e] h-screen py-3 px-2 gap-0.5 overflow-y-auto scrollbar-none">
      {/* 로고 */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-1.5 pb-3 mb-1 border-b border-white/[0.05]"
        title="AI Research OS"
      >
        <BrandLogo size={36} radius={10} className="flex-shrink-0" />
        <span className="font-nanum-myeongjo text-[15px] font-semibold text-[#e8eaf0] truncate">
          AI Research <span className="text-[#e8b84b]">OS</span>
        </span>
      </Link>

      {/* 대시보드 */}
      <RailLink href="/dashboard" icon="dashboard" label={t("sidebar.dashboard")} color="#6c8cff" isActive={pathname === "/dashboard"} />

      {/* Research Flow */}
      <SectionLabel>Research Flow</SectionLabel>
      {RESEARCH_FLOW_ITEMS.filter((e) => can(e.perm)).map((e) => {
        const isActive = e.href === "/literature"
          ? (pathname === "/literature" || pathname.startsWith("/literature/") || pathname === "/literature-review")
          : pathname === e.href || pathname.startsWith(e.href + "/");
        return (
          <RailLink key={e.href} href={e.href} icon={e.icon} label={t(e.labelKey)} color={e.color} isActive={isActive} />
        );
      })}

      {/* AI Tools */}
      <SectionLabel>AI Tools</SectionLabel>
      {ENGINE_ITEMS.filter((e) => can(e.perm)).map((e) => {
        const isActive = pathname === e.href || pathname.startsWith(e.href + "/");
        return (
          <RailLink key={e.href} href={e.href} icon={e.icon} label={t(e.labelKey)} color={e.color} isActive={isActive} />
        );
      })}
      {can("engine.library") && <RailLink href="/library" icon="library" label={t("sidebar.library")} color="#34d399" isActive={pathname === "/library"} />}
      {can("engine.references") && <RailLink href="/references" icon="citation" label={t("sidebar.references")} color="#a78bfa" isActive={pathname === "/references" || pathname.startsWith("/references/")} />}

      <div className="flex-1 min-h-[8px]" />

      {/* 설정 */}
      <div className="pt-2 border-t border-white/[0.05]">
        <RailLink href="/settings" icon="settings" label={t("common.settings")} color="#6c8cff" isActive={pathname === "/settings"} />
      </div>
    </aside>
  );
}
