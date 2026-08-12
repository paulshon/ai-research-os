"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { BrandLogo, BrandWordmark } from "@/components/ui/brand-logo";
import { useSafeUser } from "@/hooks/use-safe-clerk";
import ProjectSavePanel from "@/components/save/project-save-panel";
import HistoryRail from "@/components/dashboard/history-rail";
import { useTranslation } from "@/lib/i18n";
import { usePermissions } from "@/hooks/use-permissions";
import { isSuperAdminEmail } from "@/lib/admin-config";
import PlanGauge from "@/components/immersive/plan-gauge";
import { useFlowProgress } from "@/hooks/use-flow-progress";
import { RESEARCH_FLOW_ITEMS } from "@/components/dashboard/sidebar-items";

/* 하위 호환 — 기존 import 경로를 그대로 유지한다 */
export {
  RESEARCH_FLOW_ITEMS,
  ENGINE_ITEMS,
  FLAT_MENU_ITEMS,
  LIBRARY_ITEMS,
} from "@/components/dashboard/sidebar-items";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 연구자 플랜 사이드바

   [변경]
   · 「대시보드」 항목 삭제 — 대시보드 기능 자체가 없어졌다.
   · 연구 흐름 8단계 메뉴를 화면 중앙(전체메뉴 그리드)으로 이관했다.
   · 비워진 자리를 작업 히스토리 레일이 채운다(제목 + 연·월·일·시각).
   · 우측 경계선을 끌어 폭을 200~480px 로 자유 조절한다(이 기기에 저장).
   [유지]
   · 플랜 게이지 · 운영/관리자 · 프로젝트 워크스페이스 · 사용자 프로필
   ══════════════════════════════════════════════════════════════════════ */

export const SIDEBAR_WIDTH_KEY = "ui.sidebarWidth";
export const SIDEBAR_COLLAPSED_KEY = "ui.sidebarCollapsed";
export const SIDEBAR_EVENT = "aros:sidebar-width";
export const SIDEBAR_DEFAULT = 280;
export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 480;
export const SIDEBAR_COLLAPSED = 64;

export function readSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT;
  if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") return SIDEBAR_COLLAPSED;
  const raw = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
  if (!raw || Number.isNaN(raw)) return SIDEBAR_DEFAULT;
  return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, raw));
}

const USER_BTN_APPEARANCE = {
  elements: {
    avatarBox: "w-9 h-9",
    userButtonPopoverCard:
      "bg-[#13161e] border border-white/[0.08] shadow-2xl rounded-[14px] !text-[#e8eaf0]",
    userButtonPopoverActionButton:
      "text-[#e8eaf0] hover:bg-white/[0.05] rounded-[8px] transition-colors",
    userButtonPopoverActionButtonText: "text-[#e8eaf0] text-[14px] font-medium",
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
    <div className="px-3 py-3 border-t border-white/[0.05] flex-shrink-0">
      <div className="flex items-center gap-3 px-2 py-2 rounded-[13px] hover:bg-white/[0.04] transition-colors">
        <UserButton afterSignOutUrl="/" appearance={USER_BTN_APPEARANCE} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate text-[#e8eaf0] leading-tight">{displayName}</p>
          {displayEmail && (
            <p className="text-[11.5px] truncate text-white/25 leading-tight mt-0.5">{displayEmail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardSidebar({
  onNavigate,
  /** 드로어 안에서는 리사이즈 손잡이를 감춘다 */
  resizable = false,
}: {
  onNavigate?: () => void;
  resizable?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useSafeUser();
  const roleIsAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";
  const superAdmin = !!user?.emailAddresses?.some((e) => isSuperAdminEmail(e.emailAddress));
  const isAdmin = roleIsAdmin || superAdmin;
  const { visited } = useFlowProgress();

  const [width, setWidth] = useState(SIDEBAR_DEFAULT);
  const asideRef = useRef<HTMLElement | null>(null);

  useEffect(() => setWidth(readSidebarWidth()), []);

  const publish = useCallback((w: number) => {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, w <= SIDEBAR_COLLAPSED ? "1" : "0");
    document.documentElement.style.setProperty("--sidebar-w", `${w}px`);
    window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: w }));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${width}px`);
  }, [width]);

  /* 경계선 드래그 — CSS 변수만 갱신하여 리플로우를 최소화한다 */
  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      const startX = e.clientX;
      const startW = asideRef.current?.getBoundingClientRect().width ?? width;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      if (asideRef.current) asideRef.current.style.transition = "none";
      let raf = 0;
      let next = startW;

      const move = (ev: PointerEvent) => {
        const raw = startW + (ev.clientX - startX);
        next = raw < 168 ? SIDEBAR_COLLAPSED : Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, raw));
        if (!raf)
          raf = requestAnimationFrame(() => {
            raf = 0;
            if (asideRef.current) asideRef.current.style.width = `${next}px`;
            document.documentElement.style.setProperty("--sidebar-w", `${next}px`);
          });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (raf) cancelAnimationFrame(raf);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        if (asideRef.current) asideRef.current.style.transition = "";
        setWidth(next);
        publish(next);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [width, publish],
  );

  const nudge = useCallback(
    (delta: number) => {
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, width + delta));
      setWidth(next);
      publish(next);
    },
    [width, publish],
  );

  const reset = useCallback(() => {
    setWidth(SIDEBAR_DEFAULT);
    publish(SIDEBAR_DEFAULT);
  }, [publish]);

  const collapsed = width <= SIDEBAR_COLLAPSED + 4;
  const handleClick = () => onNavigate?.();

  return (
    <aside
      ref={asideRef}
      style={resizable ? { width } : undefined}
      className={`${resizable ? "" : "w-[268px]"} max-w-full imm-glass-strong border-r border-white/[0.06]
                  flex flex-col h-screen font-nanum-gothic relative z-[2]`}
    >
      {/* 로고 */}
      <div className="px-4 py-4 border-b border-white/[0.05] flex items-center justify-between flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={handleClick}>
          <BrandLogo size={38} radius={12} className="flex-shrink-0" />
          {!collapsed && <BrandWordmark size={18} className="truncate" />}
        </Link>
        {!collapsed && (
          <Link
            href="/settings"
            onClick={handleClick}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] hover:rotate-[35deg] transition-all flex-shrink-0"
            aria-label={t("common.settings")}
          >
            <Icon name="settings" size={17} />
          </Link>
        )}
      </div>

      {/* 플랜 게이지 — 8단계 중 완료 수 */}
      {!collapsed && (
        <PlanGauge
          label={t("sidebar.planResearcher")}
          done={visited.length}
          total={RESEARCH_FLOW_ITEMS.length}
        />
      )}

      {/* 작업 히스토리 — 전체메뉴가 중앙으로 옮겨간 자리 */}
      {collapsed ? (
        <div className="flex-1 min-h-0 flex flex-col items-center gap-2 pt-3">
          <Icon name="folderOpen" size={17} className="text-white/25" />
        </div>
      ) : (
        <HistoryRail onNavigate={onNavigate} />
      )}

      {/* 운영 · 관리자 — 그대로 사이드바에 둔다 */}
      {isAdmin && !collapsed && (
        <div className="px-3 pb-1 flex-shrink-0">
          <p className="text-[10.5px] font-bold text-white/22 uppercase tracking-[.12em] px-2.5 pt-2 pb-1.5">
            {t("sidebar.sectionAdmin")}
          </p>
          <Link
            href="/admin"
            onClick={handleClick}
            className={`flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-[13px] text-[14.5px] transition-all ${
              pathname === "/admin" || pathname.startsWith("/admin/")
                ? "text-[#e8b84b] font-extrabold bg-[#e8b84b]/15"
                : "text-white/58 font-semibold hover:text-[#e8b84b] hover:bg-[#e8b84b]/[0.09]"
            }`}
          >
            <span
              className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{ background: "#e8b84b1f", color: "#e8b84b" }}
            >
              <Icon name="admin" size={16} />
            </span>
            <span className="flex-1 truncate">{t("sidebar.admin")}</span>
          </Link>
        </div>
      )}

      {/* 프로젝트 워크스페이스 — 구성·문구 그대로 유지 */}
      {!collapsed && <ProjectSavePanel />}

      {!collapsed &&
        (hasClerk ? (
          <SidebarUserArea />
        ) : (
          <div className="px-4 py-3 border-t border-white/[0.05]">
            <p className="text-[14px] text-white/40">{t("common.researcher")}</p>
          </div>
        ))}

      {/* 우측 경계선 = 리사이즈 손잡이 */}
      {resizable && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("sidebar.resize")}
          aria-valuemin={SIDEBAR_MIN}
          aria-valuemax={SIDEBAR_MAX}
          aria-valuenow={width}
          tabIndex={0}
          onPointerDown={startResize}
          onDoubleClick={reset}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") nudge(e.shiftKey ? -32 : -8);
            if (e.key === "ArrowRight") nudge(e.shiftKey ? 32 : 8);
          }}
          className="group absolute top-0 right-0 h-full w-[6px] translate-x-[3px] z-[5]
                     cursor-col-resize touch-none focus:outline-none"
        >
          <span className="absolute inset-y-0 left-[2px] w-[1.5px] rounded bg-[#6c8cff] opacity-0
                           group-hover:opacity-70 group-focus:opacity-90 transition-opacity duration-150" />
        </div>
      )}
    </aside>
  );
}
