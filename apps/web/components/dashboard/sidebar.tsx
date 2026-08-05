"use client";
import { Icon } from "@/components/ui/icon";

import { BrandLogo } from "@/components/ui/brand-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useSafeUser } from "@/hooks/use-safe-clerk";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
import ProjectSavePanel from "@/components/save/project-save-panel";
import { useTranslation } from "@/lib/i18n";
import { usePermissions } from "@/hooks/use-permissions";
import { isSuperAdminEmail } from "@/lib/admin-config";

/* ─────────────────────────────────────────────
   v42: 사이드바 전면 재설계 (Aivora 참조 스타일)
   - 폭 224 → 256px, 메뉴 글자 12.5 → 15px / weight 500
   - 아이콘 14 → 18px, 행 높이 ~30 → ~44px
   - 활성 항목: 좌측 강조 바 + 틴트 배경
   - 섹션 라벨 가독성 향상, 로고 헤더 확대(+collapse 어포던스)
   IA(항목 구성) v62: 섹션 헤더/아코디언 없이 평면 메뉴 — 대시보드 + 11개 메뉴 + (관리자)
───────────────────────────────────────────── */

export const RESEARCH_FLOW_ITEMS = [
  { href: "/research",    icon: "research",    labelKey: "sidebar.research",   tabKey: "sidebar.tabResearch",   color: "#6c8cff", badge: null, perm: "engine.research" },
  { href: "/literature",  icon: "literature",  labelKey: "sidebar.literature", tabKey: "sidebar.tabLiterature", color: "#3ecfb2", badge: null, perm: "engine.literature" },
  { href: "/writing",     icon: "writing",     labelKey: "sidebar.writing",    tabKey: "sidebar.tabWriting",    color: "#a78bfa", badge: null, perm: "engine.writing" },
  { href: "/validation",  icon: "review",      labelKey: "sidebar.review",     tabKey: "sidebar.tabReview",     color: "#ff7066", badge: null, perm: "engine.validation" },
  { href: "/schedule",    icon: "calendar",    labelKey: "sidebar.schedule",   tabKey: "sidebar.tabSchedule",   color: "#e8b84b", badge: null, perm: "engine.schedule" },
];

export const ENGINE_ITEMS = [
  { href: "/structure",  icon: "structure",  labelKey: "sidebar.structure",  tabKey: "sidebar.tabStructure",  color: "#6c8cff", perm: "engine.structure" },
  { href: "/method",     icon: "method",     labelKey: "sidebar.method",     tabKey: "sidebar.tabMethod",     color: "#3ecfb2", perm: "engine.method" },
  { href: "/analyzer",   icon: "analyzer",   labelKey: "sidebar.analyzer",   tabKey: "sidebar.tabAnalyzer",   color: "#f59e0b", perm: "engine.analyzer" },
  { href: "/critique",   icon: "critique",   labelKey: "sidebar.critique",   tabKey: "sidebar.tabCritique",   color: "#f472b6", perm: "engine.critique" },
];

// v62: 라이브러리·참고문헌 (평면 메뉴에 함께 노출)
export const LIBRARY_ITEMS = [
  { href: "/library",    icon: "library",  labelKey: "sidebar.library",    color: "#34d399", perm: "engine.library" },
  { href: "/references", icon: "citation", labelKey: "sidebar.references", color: "#a78bfa", perm: "engine.references" },
];

// v62: 사이드바 평면 메뉴 (섹션 헤더/아코디언 없이 한 줄 목록으로 표시)
export const FLAT_MENU_ITEMS = [...RESEARCH_FLOW_ITEMS, ...ENGINE_ITEMS, ...LIBRARY_ITEMS];

const USER_BTN_APPEARANCE = {
  elements: {
    avatarBox: "w-9 h-9",
    userButtonPopoverCard:
      "bg-[#13161e] border border-white/[0.08] shadow-2xl rounded-[14px] !text-[#e8eaf0]",
    userButtonPopoverActionButton:
      "text-[#e8eaf0] hover:bg-white/[0.05] rounded-[8px] transition-colors",
    userButtonPopoverActionButtonText:
      "text-[#e8eaf0] text-[14px] font-medium",
    userButtonPopoverActionButtonIcon: "text-[#9ba3b8]",
    userButtonPopoverFooter: "hidden",
    userPreviewMainIdentifier: "text-[#e8eaf0] font-semibold text-[14px]",
    userPreviewSecondaryIdentifier: "text-[#9ba3b8] text-[12px]",
    userButtonPopoverActionsSeparator: "bg-white/[0.06]",
  },
};

function SidebarUserArea() {
  const { t } = useTranslation();
  const { user } = useSafeUser();
  const displayName = user?.fullName ?? user?.firstName ?? t("common.researcher");
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="px-3 py-3 border-t border-white/[0.05]">
      <div className="flex items-center gap-3 px-2 py-2 rounded-[12px] hover:bg-white/[0.04] transition-colors">
        <UserButton afterSignOutUrl="/" appearance={USER_BTN_APPEARANCE} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold truncate text-[#e8eaf0] leading-tight">
            {displayName}
          </p>
          {displayEmail && (
            <p className="text-[12px] truncate text-[#626880] leading-tight mt-0.5">
              {displayEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarLink({
  href, icon, label, color, isActive, badge, disabled,
}: {
  href: string; icon: string; label: string; color: string; isActive: boolean; badge?: string | null; disabled?: boolean;
}) {
  const vars = {
    "--ac": color,
    "--ac-bg": color + "22",
    "--ac-bg-on": color + "2b",
    "--ac-icon": color + "33",
  } as React.CSSProperties;

  // 비활성(차단) — 표시는 하되 클릭/이동 불가, 자물쇠 아이콘 표시
  if (disabled) {
    return (
      <div
        aria-disabled="true"
        title="접근 권한이 없습니다"
        className="group relative flex items-center gap-2.5 pl-2.5 pr-2 py-[7px] rounded-[9px] text-[15px] text-white/25 cursor-not-allowed select-none"
      >
        <div className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0 bg-white/[0.03] text-white/25">
          <Icon name={icon} size={16} />
        </div>
        <span className="flex-1 truncate">{label}</span>
        <Icon name="lock" size={13} className="text-white/20 flex-shrink-0" />
      </div>
    );
  }

  return (
    <Link
      href={href}
      style={vars}
      className={`group relative flex items-center gap-2.5 pl-2.5 pr-2 py-[7px] rounded-[9px] text-[15px] transition-all ${
        isActive
          ? "bg-[var(--ac-bg-on)] text-[var(--ac)] font-semibold"
          : "text-white/55 font-medium hover:bg-[var(--ac-bg)] hover:text-[var(--ac)] active:bg-[var(--ac-bg)] active:text-[var(--ac)]"
      }`}
    >
      {/* 활성 좌측 강조 바 */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all ${
          isActive ? "h-4 opacity-100" : "h-0 opacity-0"
        }`}
        style={{ backgroundColor: "var(--ac)" }}
        aria-hidden
      />
      <div
        className={`w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0 transition-colors ${
          isActive
            ? "bg-[var(--ac-icon)] text-[var(--ac)]"
            : "text-inherit group-hover:bg-[var(--ac-icon)] group-hover:text-[var(--ac)] group-active:bg-[var(--ac-icon)] group-active:text-[var(--ac)]"
        }`}
      >
        <Icon name={icon} size={16} />
      </div>
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#4a6cf7]/20 text-[#6c8cff] font-medium">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useSafeUser();
  const roleIsAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";
  const superAdmin = !!user?.emailAddresses?.some((e) => isSuperAdminEmail(e.emailAddress));
  const isAdmin = roleIsAdmin || superAdmin;
  const { can } = usePermissions();

  const handleClick = () => onNavigate?.();

  const isLiteratureActive =
    pathname === "/literature" ||
    pathname.startsWith("/literature/") ||
    pathname === "/literature-review";

  return (
    <aside className="w-64 border-r border-white/[0.05] bg-[#13161e] flex flex-col h-screen font-nanum-gothic">
      {/* Logo Header */}
      <div className="px-4 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={handleClick}>
          <BrandLogo size={36} radius={11} className="flex-shrink-0" />
          <span className="font-nanum-myeongjo text-[17px] font-semibold text-[#e8eaf0] truncate">
            AI Research <span className="text-[#e8b84b]">OS</span>
          </span>
        </Link>
        <Link
          href="/settings"
          onClick={handleClick}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors flex-shrink-0"
          aria-label={t("common.settings")}
        >
          <Icon name="settings" size={17} />
        </Link>
      </div>

      {/* ── 전체 메뉴 (평면·컴팩트, 섹션 헤더/아코디언 없음) ── */}
      <nav className="flex-1 overflow-y-auto min-h-0 px-2.5 py-2 space-y-[3px] scrollbar-none" onClick={handleClick}>
        <SidebarLink
          href="/dashboard"
          icon="dashboard"
          label={t("sidebar.dashboard")}
          color="#6c8cff"
          isActive={pathname === "/dashboard"}
        />
        {FLAT_MENU_ITEMS.map((e) => {
          const isActive =
            e.href === "/literature"
              ? isLiteratureActive
              : pathname === e.href || pathname.startsWith(e.href + "/");
          return (
            <SidebarLink
              key={e.href}
              href={e.href}
              icon={e.icon}
              label={t(e.labelKey)}
              color={e.color}
              isActive={isActive}
              disabled={!can(e.perm)}
            />
          );
        })}

        {isAdmin && (
          <SidebarLink
            href="/admin"
            icon="admin"
            label={t("sidebar.admin")}
            color="#e8b84b"
            isActive={pathname === "/admin"}
          />
        )}
      </nav>

      <ProjectSavePanel />

      {hasClerk ? (
        <SidebarUserArea />
      ) : (
        <div className="px-4 py-3 border-t border-white/[0.05]">
          <p className="text-[14px] text-white/40">{t("common.researcher")}</p>
        </div>
      )}
    </aside>
  );
}
