"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Icon } from "@/components/ui/icon";
import { RDOS_MENUS } from "@/lib/rdos/menus";
import RdosSidebarUser from "@/components/rdos/rdos-sidebar-user";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";

/* ════════════════════════════════════════════════════════════
   RDOS (연구준비자) 셸 — 반응형 (v8)
   AI-Research-OS 대시보드와 동일한 적응형 구조:
     · 데스크탑(lg+): 풀 사이드바
     · 태블릿(md~lg): 아이콘+라벨 컴팩트 레일
     · 모바일(<md): 상단 로고 헤더 + 하단 내비게이션 + 전체메뉴 시트 + iOS 세이프에어리어
   props: disabledKeys(전역 비활성 메뉴), isSuperAdmin(관리자 링크 노출)
═══════════════════════════════════════════════════════════════ */

const ADMIN = { key: "admin", route: "/rdos/admin", color: "#e8b84b" };

/* RDOS_MENUS 의 key → rdos.shell.* 번역 키 매핑 (menus.ts 는 다른 소유자 파일이라 직접 수정하지 않음) */
const MENU_LABEL_KEY: Record<string, string> = {
  dashboard: "rdos.shell.menuDashboard",
  basics: "rdos.shell.menuBasics",
  structure: "rdos.shell.menuStructure",
  design: "rdos.shell.menuDesign",
  method: "rdos.shell.menuMethod",
  reading: "rdos.shell.menuReading",
  apa: "rdos.shell.menuApa",
  writing: "rdos.shell.menuWriting",
  tutor: "rdos.shell.menuTutor",
  knowledge: "rdos.shell.menuKnowledge",
  roadmap: "rdos.shell.menuRoadmap",
  scholar: "rdos.shell.menuScholar",
};

function badge(label: string) { return label.slice(0, 1); }

export default function RdosShell({
  children, disabledKeys = [], isSuperAdmin = false,
}: {
  children: React.ReactNode; disabledKeys?: string[]; isSuperAdmin?: boolean;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const disabled = new Set(disabledKeys);
  const menus = RDOS_MENUS.filter((m) => m.key === "dashboard" || !disabled.has(m.key)).map((m) => ({
    ...m, label: t(MENU_LABEL_KEY[m.key] ?? m.label) || m.label,
  }));
  const adminLabel = t("rdos.shell.adminLabel");

  const [mobileOpen, setMobileOpen] = useState(false);   // 풀 사이드바 오버레이
  const [sheetOpen, setSheetOpen] = useState(false);     // 전체메뉴 시트

  useEffect(() => { setMobileOpen(false); setSheetOpen(false); }, [pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setMobileOpen(false); setSheetOpen(false); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const isActive = useCallback((route: string) => pathname === route, [pathname]);

  // 모바일 하단바 주 탭(대시보드 + 앞쪽 메뉴 3개) + 전체메뉴 시트
  const primary = menus.slice(0, 4);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic flex">
      {/* ── 데스크탑 사이드바 (lg+) ── */}
      <aside className="hidden lg:flex flex-col w-[256px] flex-shrink-0 border-r border-white/[0.06] bg-[#0a0c10]">
        <SidebarBody menus={menus} isActive={isActive} isSuperAdmin={isSuperAdmin} adminLabel={adminLabel} />
      </aside>

      {/* ── 태블릿 레일 (md~lg) ── */}
      <aside className="hidden md:flex lg:hidden flex-col w-[210px] flex-shrink-0 border-r border-white/[0.06] bg-[#0a0c10]">
        <SidebarBody menus={menus} isActive={isActive} isSuperAdmin={isSuperAdmin} adminLabel={adminLabel} compact />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* ── 모바일 상단 헤더 (iOS 세이프에어리어) ── */}
        <header
          className="md:hidden flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0a0c10] flex-shrink-0"
          style={{ height: "calc(3.25rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <Link href="/rdos" className="flex items-center gap-2">
            <BrandLogo size={26} radius={7} />
            <div className="leading-tight">
              <div className="text-[14px] font-bold">RDOS</div>
              <div className="text-[8px] text-[#3ecfb2] font-mono">Researcher Development OS</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <button onClick={() => setMobileOpen(true)} aria-label={t("rdos.shell.openMenu")}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]">
              <Icon name="menu" size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="max-w-[1080px] mx-auto px-5 md:px-6 py-7 md:py-10">{children}</div>
          <div className="h-16 md:hidden" aria-hidden />
        </div>
      </main>

      {/* ── 모바일 하단 내비게이션 ── */}
      <nav className="fixed left-0 right-0 bottom-0 z-[7500] md:hidden bg-[#0a0c10]/95 backdrop-blur-xl border-t border-white/[0.07]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="h-14 flex items-center px-1 gap-0.5">
          <button onClick={() => setMobileOpen(true)} aria-label={t("rdos.shell.fullMenu")}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] flex-shrink-0">
            <Icon name="menu" size={18} />
          </button>
          <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {primary.map((m) => {
              const active = isActive(m.route);
              return (
                <Link key={m.key} href={m.route}
                  className={`flex flex-col items-center justify-center min-w-[52px] px-1 py-1 rounded-lg flex-shrink-0 transition-all ${active ? "bg-[#1e2230] text-white" : "text-white/35 active:bg-white/[0.05]"}`}>
                  <span className="w-6 h-6 rounded-[7px] flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${m.color}22`, color: m.color }}>{badge(m.label)}</span>
                  <span className="text-[8.5px] mt-0.5 truncate max-w-[52px]">{m.label}</span>
                </Link>
              );
            })}
          </div>
          <button onClick={() => setSheetOpen((v) => !v)} aria-label={t("rdos.shell.fullMenu")}
            className={`w-11 h-10 flex flex-col items-center justify-center rounded-lg flex-shrink-0 transition-colors ${sheetOpen ? "bg-[#3ecfb2]/15 text-[#3ecfb2]" : "text-white/35"}`}>
            <Icon name={sheetOpen ? "chevronDown" : "engine"} size={15} />
            <span className="text-[8px] mt-0.5">{t("rdos.shell.fullMenuShort")}</span>
          </button>
        </div>
      </nav>

      {/* ── 전체메뉴 슬라이드업 시트 ── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[8000] md:hidden" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          <div className="absolute left-0 right-0 bottom-0 bg-[#0d0f14] border-t border-white/[0.08] rounded-t-[20px] shadow-2xl animate-slide-up px-4 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3" />
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.16em] mb-3">{t("rdos.shell.fullMenu")}</p>
            <div className="grid grid-cols-3 gap-2">
              {menus.map((m) => {
                const active = isActive(m.route);
                return (
                  <Link key={m.key} href={m.route} onClick={() => setSheetOpen(false)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-[14px] border transition-all ${active ? "border-white/20 bg-white/[0.06] text-white" : "bg-white/[0.03] text-white/55 border-white/[0.05] active:bg-white/[0.06]"}`}>
                    <span className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[12px] font-bold"
                      style={{ background: `${m.color}22`, color: m.color }}>{badge(m.label)}</span>
                    <span className="text-[10.5px] text-center leading-tight px-1">{m.label}</span>
                  </Link>
                );
              })}
              {isSuperAdmin && (
                <Link href={ADMIN.route} onClick={() => setSheetOpen(false)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-[14px] border transition-all ${isActive(ADMIN.route) ? "border-[#e8b84b]/40 bg-[#e8b84b]/10 text-[#e8b84b]" : "bg-white/[0.03] text-white/55 border-white/[0.05]"}`}>
                  <span className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[14px] bg-[#e8b84b]/15 text-[#e8b84b]">👑</span>
                  <span className="text-[10.5px] text-center leading-tight px-1">{adminLabel}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 모바일/태블릿 풀 사이드바 오버레이 (햄버거) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[9000] lg:hidden flex" onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full w-[264px] bg-[#0a0c10] border-r border-white/[0.06] animate-slide-in-left overflow-y-auto">
            <SidebarBody menus={menus} isActive={isActive} isSuperAdmin={isSuperAdmin} adminLabel={adminLabel} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* 사이드바 본문 — 데스크탑/태블릿/오버레이 공용 */
function SidebarBody({
  menus, isActive, isSuperAdmin, adminLabel, compact = false, onNavigate,
}: {
  menus: typeof RDOS_MENUS; isActive: (r: string) => boolean; isSuperAdmin: boolean; adminLabel: string;
  compact?: boolean; onNavigate?: () => void;
}) {
  return (
    <>
      <div className="px-4 h-[76px] flex items-center justify-between gap-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size={30} radius={8} />
          <div className="leading-tight">
            <div className="text-[15px] font-bold">RDOS</div>
            <div className="text-[9px] text-[#3ecfb2] font-mono leading-tight">Researcher Development<br />Operating System</div>
          </div>
        </div>
        {!compact && <LanguageSwitcher compact />}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menus.map((m) => {
          const active = isActive(m.route);
          return (
            <Link key={m.key} href={m.route} onClick={onNavigate} title={m.label}
              className={`group flex items-center gap-2.5 pl-2.5 pr-2 py-[8px] rounded-[9px] text-[15px] transition-colors ${active ? "bg-white/[0.06] text-white" : "text-white/55 hover:text-white hover:bg-white/[0.03]"}`}>
              <span className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                style={{ background: `${m.color}22`, color: m.color }}>{badge(m.label)}</span>
              <span className="flex-1 truncate">{m.label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />}
            </Link>
          );
        })}
        {isSuperAdmin && (
          <Link href={ADMIN.route} onClick={onNavigate}
            className={`group flex items-center gap-2.5 pl-2.5 pr-2 py-[8px] rounded-[9px] text-[15px] transition-colors mt-2 border-t border-white/[0.05] pt-3 ${isActive(ADMIN.route) ? "bg-white/[0.06] text-white" : "text-white/55 hover:text-white hover:bg-white/[0.03]"}`}>
            <span className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0 text-[12px] font-bold bg-[#e8b84b]/15 text-[#e8b84b]">👑</span>
            <span className="flex-1 truncate">{adminLabel}</span>
            {isActive(ADMIN.route) && <span className="w-1.5 h-1.5 rounded-full bg-[#e8b84b]" />}
          </Link>
        )}
      </nav>
      <RdosSidebarUser compact={compact} />
    </>
  );
}
