"use client";
import { Icon } from "@/components/ui/icon";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
import ProjectSavePanel from "@/components/save/project-save-panel";
import { useTranslation } from "@/lib/i18n";

/* ─────────────────────────────────────────────
   v25: 사이드바 IA 개선 (Issue 4)
   - Literature + Literature Review 통합 → /literature (탭으로 분리)
   - Research Flow / AI Tools 경계 명확화
   - 총 항목 14개 → 10개로 축소 (인지 과부하 해소)
   - /review → /validation URL 불일치 수정 (review 항목이 /validation 직접 지정)
   - dashboard-shell(모바일 하단 네비)이 tabKey를 사용하므로 유지
───────────────────────────────────────────── */

/** 연구 흐름 — 논문 작성의 단계적 여정 */
export const RESEARCH_FLOW_ITEMS = [
  { href: "/research",    icon: "research",    labelKey: "sidebar.research",   tabKey: "sidebar.tabResearch",   color: "#6c8cff", badge: null },
  { href: "/literature",  icon: "literature",  labelKey: "sidebar.literature", tabKey: "sidebar.tabLiterature", color: "#3ecfb2", badge: null },
  { href: "/writing",     icon: "writing",     labelKey: "sidebar.writing",    tabKey: "sidebar.tabWriting",    color: "#a78bfa", badge: null },
  { href: "/validation",  icon: "review",      labelKey: "sidebar.review",     tabKey: "sidebar.tabReview",     color: "#ff7066", badge: null },
  { href: "/submission",  icon: "submission",  labelKey: "sidebar.submission", tabKey: "sidebar.tabSubmission", color: "#e8b84b", badge: null },
];

/** AI 도구 — 개별 분석·작업 도구 (Literature Review는 Literature 탭으로 통합됨) */
export const ENGINE_ITEMS = [
  { href: "/workflow",   icon: "workflow",   labelKey: "sidebar.workflow",   tabKey: "sidebar.tabWorkflow",   color: "#e8b84b" },
  { href: "/structure",  icon: "structure",  labelKey: "sidebar.structure",  tabKey: "sidebar.tabStructure",  color: "#6c8cff" },
  { href: "/analyzer",   icon: "analyzer",   labelKey: "sidebar.analyzer",   tabKey: "sidebar.tabAnalyzer",   color: "#f59e0b" },
  { href: "/advisor",    icon: "advisor",    labelKey: "sidebar.mentoring",  tabKey: "sidebar.tabMentoring",  color: "#ec4899" },
  { href: "/critique",   icon: "critique",   labelKey: "sidebar.critique",   tabKey: "sidebar.tabCritique",   color: "#f472b6" },
];

const USER_BTN_APPEARANCE = {
  elements: {
    avatarBox: "w-7 h-7",
    userButtonPopoverCard:
      "bg-[#13161e] border border-white/[0.08] shadow-2xl rounded-[14px] !text-[#e8eaf0]",
    userButtonPopoverActionButton:
      "text-[#e8eaf0] hover:bg-white/[0.05] rounded-[8px] transition-colors",
    userButtonPopoverActionButtonText:
      "text-[#e8eaf0] text-[13px] font-medium",
    userButtonPopoverActionButtonIcon: "text-[#9ba3b8]",
    userButtonPopoverFooter: "hidden",
    userPreviewMainIdentifier: "text-[#e8eaf0] font-semibold text-[13px]",
    userPreviewSecondaryIdentifier: "text-[#9ba3b8] text-[11px]",
    userButtonPopoverActionsSeparator: "bg-white/[0.06]",
  },
};

function SidebarUserArea() {
  const { t } = useTranslation();
  const { user } = useUser();
  const displayName = user?.fullName ?? user?.firstName ?? t("common.researcher");
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="px-3 py-3 border-t border-white/[0.04]">
      <div className="flex items-center gap-2.5">
        <UserButton afterSignOutUrl="/" appearance={USER_BTN_APPEARANCE} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium truncate text-[#e8eaf0] leading-tight">
            {displayName}
          </p>
          {displayEmail && (
            <p className="text-[10px] truncate text-[#626880] leading-tight mt-0.5">
              {displayEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarLink({
  href, icon, label, color, isActive, badge,
}: {
  href: string; icon: string; label: string; color: string; isActive: boolean; badge?: string | null;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-2.5 py-[7px] rounded-[7px] text-[12.5px] transition-all ${
        isActive
          ? "bg-[rgba(108,140,255,0.12)] text-[#6c8cff]"
          : "text-white/50 hover:bg-white/[0.03] hover:text-white/70"
      }`}
    >
      <div
        className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0"
        style={{
          background: isActive ? color + "20" : "transparent",
          color: isActive ? color : "inherit",
        }}
      >
        <Icon name={icon} size={14} />
      </div>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#4a6cf7]/20 text-[#6c8cff] font-medium">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useUser?.() ?? { user: null };
  const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  const handleClick = () => onNavigate?.();

  // literature-review 경로를 literature 활성 상태에 포함 (통합)
  const isLiteratureActive =
    pathname === "/literature" ||
    pathname.startsWith("/literature/") ||
    pathname === "/literature-review";

  return (
    <aside className="w-56 border-r border-white/[0.04] bg-[#13161e] flex flex-col h-screen font-nanum-gothic">
      {/* Logo Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={handleClick}>
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center text-white">
            <Icon name="logo" size={13} />
          </div>
          <span className="font-nanum-myeongjo text-[13px] font-semibold text-[#e8eaf0]">
            AI Research <span className="text-[#e8b84b]">OS</span>
          </span>
        </Link>
        <Link
          href="/settings"
          onClick={handleClick}
          className="flex items-center gap-1 text-white/25 hover:text-white/50 text-[12px] transition-colors"
        >
          <Icon name="settings" size={14} />
        </Link>
      </div>

      {/* Dashboard */}
      <div className="px-2.5 pt-2 pb-1" onClick={handleClick}>
        <SidebarLink
          href="/dashboard"
          icon="dashboard"
          label={t("sidebar.dashboard")}
          color="#6c8cff"
          isActive={pathname === "/dashboard"}
        />
      </div>

      {/* ── Research Flow ── */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.18em]">Research Flow</p>
      </div>
      <nav className="px-2.5 space-y-0.5" onClick={handleClick}>
        {RESEARCH_FLOW_ITEMS.map((e) => {
          const isActive = e.href === "/literature"
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
              badge={e.badge}
            />
          );
        })}
      </nav>

      {/* ── AI Tools ── */}
      <div className="px-3 pt-4 pb-1">
        <p className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.18em]">AI Tools</p>
      </div>
      <nav className="flex-1 px-2.5 py-1 space-y-0.5 overflow-y-auto min-h-0" onClick={handleClick}>
        {ENGINE_ITEMS.map((e) => {
          const isActive = pathname === e.href || pathname.startsWith(e.href + "/");
          return (
            <SidebarLink
              key={e.href}
              href={e.href}
              icon={e.icon}
              label={t(e.labelKey)}
              color={e.color}
              isActive={isActive}
            />
          );
        })}

        {/* Chat — 공통 도구 */}
        <SidebarLink
          href="/chat"
          icon="chat"
          label={t("sidebar.chat")}
          color="#3ecfb2"
          isActive={pathname === "/chat"}
        />
        {/* Library */}
        <SidebarLink
          href="/library"
          icon="library"
          label={t("sidebar.library")}
          color="#34d399"
          isActive={pathname === "/library"}
        />
        {/* References — 참고문헌 인용 리스트 정리 */}
        <SidebarLink
          href="/references"
          icon="citation"
          label={t("sidebar.references")}
          color="#a78bfa"
          isActive={pathname === "/references" || pathname.startsWith("/references/")}
        />

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
        <div className="px-3 py-3 border-t border-white/[0.04]">
          <p className="text-[12px] text-white/40">{t("common.researcher")}</p>
        </div>
      )}
    </aside>
  );
}
