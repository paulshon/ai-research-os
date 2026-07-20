"use client";
import { Icon } from "@/components/ui/icon";

import { BrandLogo } from "@/components/ui/brand-logo";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardSidebar, { RESEARCH_FLOW_ITEMS, ENGINE_ITEMS } from "@/components/dashboard/sidebar";
import TabletRail from "@/components/dashboard/tablet-rail";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";
import CitationButton from "@/components/citation/citation-button";
import CitationPanel from "@/components/citation/citation-panel";
import { ThemeToggleCompact } from "@/components/theme/theme-switcher";
import { usePermissions } from "@/hooks/use-permissions";
import GlobalAiProgress from "@/components/dashboard/global-ai-progress";

// v30: 모바일 하단 탭 — Research Flow 주 탭 + AI Tools 슬라이드업 시트
const MOBILE_PRIMARY = RESEARCH_FLOW_ITEMS;
const MOBILE_ENGINE = ENGINE_ITEMS;

// v60: 라우트(경로) → 필요한 권한 코드 매핑. 차단된 메뉴는 URL 직접 접근도 막는다.
const ROUTE_PERMISSIONS: { prefix: string; perm: string }[] = [
  ...RESEARCH_FLOW_ITEMS.map((e) => ({ prefix: e.href, perm: e.perm })),
  ...ENGINE_ITEMS.map((e) => ({ prefix: e.href, perm: e.perm })),
  { prefix: "/library", perm: "engine.library" },
  { prefix: "/references", perm: "engine.references" },
  { prefix: "/literature-review", perm: "engine.literature" },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const { can, loading: permLoading } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileEngineOpen, setMobileEngineOpen] = useState(false);

  // v60: 라우트 가드 — 권한 로드 후, 현재 경로가 차단된 메뉴면 대시보드로 돌려보낸다.
  useEffect(() => {
    if (permLoading) return;
    const matched = ROUTE_PERMISSIONS.find(
      (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
    );
    if (matched && !can(matched.perm)) {
      router.replace("/dashboard");
    }
  }, [pathname, permLoading, can, router]);

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
    <div className="min-h-screen min-h-[100dvh] bg-[#0d0f14] text-[#e8eaf0] flex">
      {/* Desktop Sidebar — lg 이상에서만 표시 */}
      <div className="hidden lg:block flex-shrink-0">
        <DashboardSidebar />
      </div>

      {/* Tablet Rail — md~lg 구간 아이콘 레일 (Tablet Adaptive) */}
      <TabletRail />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Desktop Top Tab Bar — 연구 흐름 탭 (v42: 확대 + 글로우 언더라인) */}
        <div className="hidden md:flex h-[52px] bg-[#13161e] border-b border-white/[0.05] items-stretch px-3 gap-1 flex-shrink-0 overflow-x-auto">
          <div className="flex items-stretch gap-1 min-w-0 overflow-x-auto scrollbar-none">
            {RESEARCH_FLOW_ITEMS.map((tab) => {
              const isActive =
                pathname === tab.href || pathname.startsWith(tab.href + "/");
              const locked = !can(tab.perm);
              if (locked) {
                return (
                  <span
                    key={tab.href}
                    title={t("common.noPermission")}
                    aria-disabled="true"
                    className="relative flex items-center px-3.5 text-[15px] font-medium whitespace-nowrap flex-shrink-0 text-white/20 cursor-not-allowed select-none"
                  >
                    <span className="hidden sm:inline mr-1.5 align-[-3px]"><Icon name={tab.icon} size={16} /></span>
                    {t(tab.tabKey)}
                    <Icon name="lock" size={12} className="ml-1 text-white/20" />
                  </span>
                );
              }
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{ "--ac": tab.color, "--ac-bg": tab.color + "1f", "--ac-glow": tab.color + "88" } as React.CSSProperties}
                  className={`group relative flex items-center px-3.5 text-[15px] font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? "text-[var(--ac)] bg-[var(--ac-bg)] rounded-t-lg"
                      : "text-white/35 font-medium hover:bg-[var(--ac-bg)] hover:text-[var(--ac)] rounded-lg active:bg-[var(--ac-bg)] active:text-[var(--ac)]"
                  }`}
                >
                  <span className="hidden sm:inline mr-1.5 align-[-3px]"><Icon name={tab.icon} size={16} /></span>
                  {t(tab.tabKey)}
                  {/* 글로우 언더라인 */}
                  <span
                    className={`absolute left-2.5 right-2.5 bottom-0 h-[2.5px] rounded-full transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}
                    style={{ backgroundColor: "var(--ac)", boxShadow: "0 0 8px var(--ac-glow), 0 0 3px var(--ac-glow)" }}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
          {/* v11: 전역 AI 분석 진행 표시기 — 상단 메뉴바 중앙(빈 공간)에 배치.
                모든 메뉴의 AI 분석에 자동 연동(10단계 상태바 + 퍼센트). */}
          <div className="flex-1 flex justify-center items-center min-w-0 px-2">
            <GlobalAiProgress variant="bar" />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            {can("engine.references") && (
            <Link
              href="/references"
              className={`px-2.5 py-1.5 rounded-lg text-[14px] transition-all flex items-center gap-1.5 whitespace-nowrap ${
                pathname === "/references"
                  ? "bg-[#a78bfa]/15 text-[#a78bfa]"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              <Icon name="citation" size={16} /> <span className="hidden lg:inline">{t("sidebar.references")}</span>
            </Link>
            )}
            <CitationButton />
            <ThemeToggleCompact />
            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>
            <Link
              href="/settings"
              className="ml-0.5 px-2.5 py-1.5 rounded-lg text-[14px] text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
            >
              <span className="inline-flex items-center gap-1.5"><Icon name="settings" size={16} /> <span className="hidden lg:inline">{t("common.settings")}</span></span>
            </Link>
          </div>
        </div>

        {/* v46: 모바일 상단 로고 헤더 — 본문 메뉴 위에 AI Research OS 로고 표시 (테마 배경 적용) */}
        {/* v49: iOS 노치(상단 세이프에어리어) 대응 — env(safe-area-inset-top) 만큼 상단 여백 확보 */}
        {/* v17(s17): 모바일 헤더에 언어 전환기 추가 — 상단 탭바(switcher 포함)가 md:flex 로 모바일에서 숨겨져
             모바일에서는 KO/EN/ZH 전환 UI가 전혀 없었음. 로고 우측에 compact 스위처를 노출한다. */}
        <div
          className="md:hidden flex items-center justify-between gap-2.5 px-4 bg-[#13161e] border-b border-white/[0.06] flex-shrink-0"
          style={{ height: "calc(3.5rem + env(safe-area-inset-top, 0px))", paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size={32} radius={10} />
            <span className="font-nanum-myeongjo text-[17px] font-semibold text-[#e8eaf0] whitespace-nowrap">
              AI Research <span className="text-[#e8b84b]">OS</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ThemeToggleCompact />
            <LanguageSwitcher compact />
          </div>
        </div>
        {/* v11: 모바일 — 헤더 하단 가는 AI 진행 줄 */}
        <div className="md:hidden flex-shrink-0">
          <GlobalAiProgress variant="thin" />
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
            {MOBILE_PRIMARY.filter((tab) => can(tab.perm)).map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{ "--ac": tab.color, "--ac-bg": tab.color + "26" } as React.CSSProperties}
                  className={`flex flex-col items-center justify-center min-w-[48px] px-1 py-1 rounded-lg text-center transition-all flex-shrink-0 ${
                    isActive
                      ? "bg-[#1e2230] text-white"
                      : "text-white/30 hover:text-[var(--ac)] active:bg-[var(--ac-bg)] active:text-[var(--ac)]"
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
              {MOBILE_ENGINE.filter((tab) => can(tab.perm)).map((tab) => {
                const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileEngineOpen(false)}
                    style={{ "--ac": tab.color, "--ac-bg": tab.color + "26", "--ac-bd": tab.color + "55" } as React.CSSProperties}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-[14px] transition-all border ${
                      isActive
                        ? "bg-[var(--ac-bg)] text-[var(--ac)] border-[var(--ac-bd)]"
                        : "bg-white/[0.03] text-white/55 border-white/[0.04] hover:bg-[var(--ac-bg)] hover:text-[var(--ac)] hover:border-[var(--ac-bd)] active:bg-[var(--ac-bg)] active:text-[var(--ac)]"
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
          <div className="relative z-10 h-full w-[264px] animate-slide-in-left">
            <DashboardSidebar onNavigate={closeMobile} />
          </div>
        </div>
      )}

      {/* Citation Floating Panel */}
      <CitationPanel />
    </div>
  );
}
