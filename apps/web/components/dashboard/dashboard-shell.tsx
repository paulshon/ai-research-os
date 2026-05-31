"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import DashboardSidebar, { RESEARCH_FLOW_ITEMS, ENGINE_ITEMS } from "@/components/dashboard/sidebar";
import TabletRail from "@/components/dashboard/tablet-rail";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";
import CitationButton from "@/components/citation/citation-button";
import CitationPanel from "@/components/citation/citation-panel";
import { ThemeToggleCompact } from "@/components/theme/theme-switcher";

// v30: 모바일 하단 탭 — Research Flow 주 탭 + AI Tools 슬라이드업 시트
const MOBILE_PRIMARY = RESEARCH_FLOW_ITEMS;
const MOBILE_ENGINE = ENGINE_ITEMS;

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileEngineOpen, setMobileEngineOpen] = useState(false);

  // 모바일 사이드바: 경로 변경 시 자동 닫힘
  useEffect(() => {
    setMobileOpen(false);
    setMobileEngineOpen(false);
  }, [pathname]);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setMobileEngineOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] flex">
      {/* Desktop Sidebar — lg 이상에서만 표시 */}
      <div className="hidden lg:block flex-shrink-0">
        <DashboardSidebar />
      </div>

      {/* Tablet Rail — md~lg 구간 아이콘 레일 (Tablet Adaptive) */}
      <TabletRail />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Desktop Top Tab Bar — 연구 흐름 탭 */}
        <div className="hidden md:flex h-10 bg-[#13161e] border-b border-white/[0.04] items-center px-2 gap-0.5 flex-shrink-0 overflow-x-auto">
          <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {RESEARCH_FLOW_ITEMS.map((tab) => {
              const isActive =
                pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? "bg-[#1e2230] text-white"
                      : "text-white/30 hover:bg-white/[0.03] hover:text-white/50"
                  }`}
                >
                  <span className="hidden sm:inline mr-1 align-[-2px]"><Icon name={tab.icon} size={13} /></span>
                  {t(tab.tabKey)}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            <Link
              href="/references"
              className={`px-2 py-1 rounded-md text-[11px] transition-all flex items-center gap-1 whitespace-nowrap ${
                pathname === "/references"
                  ? "bg-[#a78bfa]/15 text-[#a78bfa]"
                  : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
              }`}
            >
              <Icon name="citation" size={13} /> <span className="hidden lg:inline">{t("sidebar.references")}</span>
            </Link>
            <CitationButton />
            <ThemeToggleCompact />
            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>
            <Link
              href="/settings"
              className="ml-1 px-2 py-1 rounded-md text-[11px] text-white/30 hover:text-white/50 hover:bg-white/[0.03] transition-all flex items-center gap-1"
            >
              <span className="inline-flex items-center gap-1"><Icon name="settings" size={13} /> {t("common.settings")}</span>
            </Link>
          </div>
        </div>

        {/* v21: main — 모바일에서 스크롤 가능하도록 overflow-y-auto 적용 */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* 모바일에서 하단 탭바 높이만큼 패딩 */}
          <div className="lg:hidden h-0" aria-hidden />
          {children}
          {/* 모바일 하단 탭바 공간 확보 */}
          <div className="h-16 md:hidden" aria-hidden />
        </main>
      </div>

      {/* ── v30 모바일 하단 내비게이션 (AI Tools 통일, 슬라이드업 패널) ── */}
      <div className="fixed left-0 right-0 bottom-0 z-[7500] md:hidden bg-[#13161e]/95 backdrop-blur-xl border-t border-white/[0.06]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Research Flow 주 탭 */}
        <div className="h-14 flex items-center px-1 gap-0.5">
          {/* 햄버거 — 풀 사이드바 */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] text-[18px] flex-shrink-0"
            aria-label="메뉴 열기"
          >
            <Icon name="menu" size={18} />
          </button>

          {/* 연구 흐름 아이콘 탭 (Research Flow) */}
          <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {MOBILE_PRIMARY.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center min-w-[48px] px-1 py-1 rounded-lg text-center transition-all flex-shrink-0 ${
                    isActive
                      ? "bg-[#1e2230] text-white"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  <span className="leading-none"><Icon name={tab.icon} size={16} /></span>
                  <span className="text-[9px] mt-0.5 whitespace-nowrap">{t(tab.tabKey)}</span>
                </Link>
              );
            })}
          </div>

          {/* AI Tools 토글 버튼 */}
          <button
            type="button"
            onClick={() => setMobileEngineOpen((v) => !v)}
            className={`w-11 h-10 flex flex-col items-center justify-center rounded-lg text-[11px] flex-shrink-0 transition-colors ${
              mobileEngineOpen ? "bg-[#6c8cff]/15 text-[#6c8cff]" : "text-white/30 hover:text-white/50"
            }`}
            aria-label="AI Tools 메뉴"
            aria-expanded={mobileEngineOpen}
          >
            <span className="leading-none">
              <Icon name={mobileEngineOpen ? "chevronDown" : "engine"} size={15} />
            </span>
            <span className="text-[8px] mt-0.5 whitespace-nowrap">AI Tools</span>
          </button>

          {/* 설정 */}
          <Link
            href="/settings"
            className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg text-[11px] flex-shrink-0 transition-colors ${
              pathname === "/settings" ? "bg-[#1e2230] text-[#6c8cff]" : "text-white/30 hover:text-white/50"
            }`}
            aria-label="설정"
          >
            <span className="leading-none"><Icon name="settings" size={15} /></span>
            <span className="text-[8px] mt-0.5">{t("common.settings")}</span>
          </Link>
        </div>
      </div>

      {/* v30: AI Tools 슬라이드업 시트 (백드롭 + 하단 시트) */}
      {mobileEngineOpen && (
        <div
          className="fixed inset-0 z-[8000] md:hidden"
          onClick={() => setMobileEngineOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          <div
            className="absolute left-0 right-0 bottom-0 bg-[#13161e] border-t border-white/[0.08] rounded-t-[20px] shadow-2xl animate-slide-up px-4 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 그랩 핸들 */}
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3" />
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.16em] mb-3">AI Tools</p>
            <div className="grid grid-cols-3 gap-2">
              {MOBILE_ENGINE.map((tab) => {
                const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileEngineOpen(false)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-[14px] transition-all ${
                      isActive
                        ? "bg-[#6c8cff]/15 text-[#6c8cff] border border-[#6c8cff]/30"
                        : "bg-white/[0.03] text-white/55 border border-white/[0.04] hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="leading-none"><Icon name={tab.icon} size={19} /></span>
                    <span className="text-[11px] font-medium text-center leading-tight px-1">{t(tab.tabKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 모바일 사이드바 오버레이 ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[9000] lg:hidden flex"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMobile();
          }}
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeMobile}
          />
          <div className="relative z-10 h-full w-[240px] animate-slide-in-left">
            <DashboardSidebar onNavigate={closeMobile} />
          </div>
        </div>
      )}

      {/* Citation Floating Panel */}
      <CitationPanel />
    </div>
  );
}
