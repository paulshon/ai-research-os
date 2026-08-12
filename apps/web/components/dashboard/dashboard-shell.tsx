"use client";

import { Icon } from "@/components/ui/icon";
import { BrandLogo, BrandWordmark } from "@/components/ui/brand-logo";
import ResearchAssistant from "@/components/assistant/research-assistant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardSidebar, { SIDEBAR_EVENT, readSidebarWidth } from "@/components/dashboard/sidebar";
import { RESEARCH_FLOW_ITEMS, ENGINE_ITEMS } from "@/components/dashboard/sidebar-items";
import TabletRail from "@/components/dashboard/tablet-rail";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";
import CitationButton from "@/components/citation/citation-button";
import CitationPanel from "@/components/citation/citation-panel";
import { ThemeToggleCompact } from "@/components/theme/theme-switcher";
import { usePermissions } from "@/hooks/use-permissions";
import GlobalAiProgress from "@/components/dashboard/global-ai-progress";
import AccentProvider from "@/components/immersive/accent-provider";
import { AmbientLayer, HeroLayer } from "@/components/immersive/immersive-page-frame";
import RibbonStepper from "@/components/immersive/ribbon-stepper";
import { useFlowProgress } from "@/hooks/use-flow-progress";
import { ALL_DASHBOARD_META, resolveMeta } from "@/lib/immersive/page-meta";

/* ════════════════════════════════════════════════════════════════════
   연구자 플랜 셸 — ove-1

   [ove-1 변경]
     · 우측 상단의 「논문일정」·「참고문헌 정리」 진입 버튼을 삭제했다.
       두 기능은 중앙 전체메뉴("+ 더 보기")와 오브 발화로만 들어간다.
     · 사이드바 폭을 사용자가 조절하므로, 그 값을 오브 중앙 정렬에 넘긴다.
     · /dashboard 는 대시보드가 아니라 대기 화면(S0)이다. 이때 오브는
       전체메뉴 그리드 아래 중앙에 놓이고, 다른 화면에서는 우하단에 도킹한다.

   (이전) 연구자 플랜 셸 — s-renew-12
   [수정2] 전체 몰입형 적용. 기존 라우트·권한·엔진 기능은 100% 보존.
     · Atmosphere    : 라우트별 강조색으로 물드는 앰비언트 광원 + 그리드 + 그레인
     · Hero 진입     : 명조체 대형 카피 + 핵심 수치 (page-meta 단일 표에서 구동)
     · EXPERT 버튼   : Hero 우측에서 상세 엔진으로 (sheen 그라디언트)
     · 리본 스테퍼   : 완료 단계를 연결선으로 채움
     · 모바일        : 앱바 + 하단 탭바 + AI Tools 시트 + 드로어 (safe-area 대응)
═══════════════════════════════════════════════════════════════════════ */

const MOBILE_PRIMARY = RESEARCH_FLOW_ITEMS;
const MOBILE_ENGINE = ENGINE_ITEMS;

/* 라우트 → 필요한 권한 코드. 차단된 메뉴는 URL 직접 접근도 막는다. */
const ROUTE_PERMISSIONS: { prefix: string; perm: string }[] = [
  ...RESEARCH_FLOW_ITEMS.map((e) => ({ prefix: e.href, perm: e.perm })),
  ...ENGINE_ITEMS.map((e) => ({ prefix: e.href, perm: e.perm })),
  { prefix: "/library", perm: "engine.library" },
  { prefix: "/references", perm: "engine.references" },
  { prefix: "/literature-review", perm: "engine.literature" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AccentProvider initial="#6c8cff">
      <DashboardShellInner>{children}</DashboardShellInner>
    </AccentProvider>
  );
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const { can, loading: permLoading } = usePermissions();
  const { visited } = useFlowProgress();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileEngineOpen, setMobileEngineOpen] = useState(false);
  /* 사이드바 폭 — 오브·대화창의 중앙 정렬 기준이 된다 */
  const [sidebarW, setSidebarW] = useState(280);
  /* /dashboard 는 대기 화면(S0). 이때만 오브가 중앙(전체메뉴 아래)에 선다. */
  const isStandby = pathname === "/dashboard";

  const meta = useMemo(() => resolveMeta(pathname, ALL_DASHBOARD_META), [pathname]);

  useEffect(() => {
    const sync = () => setSidebarW(window.innerWidth >= 1024 ? readSidebarWidth() : 0);
    sync();
    window.addEventListener(SIDEBAR_EVENT, sync as EventListener);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener(SIDEBAR_EVENT, sync as EventListener);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const ribbonSteps = useMemo(
    () =>
      RESEARCH_FLOW_ITEMS.map((e) => ({
        href: e.href,
        label: t(e.tabKey),
        no: e.no,
        color: e.color,
        locked: !can(e.perm),
      })),
    [t, can]
  );

  /* 라우트 가드 — 권한 로드 후 차단된 메뉴면 대시보드로 되돌린다. */
  useEffect(() => {
    if (permLoading) return;
    const matched = ROUTE_PERMISSIONS.find(
      (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
    );
    if (matched && !can(matched.perm)) router.replace("/dashboard");
  }, [pathname, permLoading, can, router]);

  useEffect(() => {
    setMobileOpen(false);
    setMobileEngineOpen(false);
  }, [pathname]);

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

  /* 오버레이 동안 배경 스크롤 잠금 */
  useEffect(() => {
    const lock = mobileOpen || mobileEngineOpen;
    document.body.style.overflow = lock ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, mobileEngineOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="relative min-h-screen min-h-[100dvh] bg-[var(--bg,#0d0f14)] text-[#e8eaf0] flex">
      {/* ── Atmosphere ── */}
      <AmbientLayer meta={meta} />

      {/* 데스크탑 사이드바 (lg+) */}
      <div className="hidden lg:block flex-shrink-0 relative z-[2]">
        <DashboardSidebar resizable />
      </div>

      {/* 태블릿 레일 (md~lg) */}
      <TabletRail />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-[1]">
        {/* ── 데스크탑 상단 리본 스테퍼 ── */}
        <div className="hidden md:flex items-stretch imm-glass-strong border-b border-white/[0.05] flex-shrink-0 min-w-0">
          <div className="flex-1 min-w-0">
            <RibbonStepper steps={ribbonSteps} activeHref={pathname} doneHrefs={visited} />
          </div>

          <div className="flex items-center justify-center min-w-0 px-2 flex-shrink">
            <GlobalAiProgress variant="bar" />
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5">
            {/* ove-1: 「논문일정」·「참고문헌 정리」 버튼은 우측 상단에서 삭제되었다.
                 (기능 자체는 살아 있으며 중앙 전체메뉴 · 오브 발화로 진입한다) */}
            <CitationButton />
            <ThemeToggleCompact />
            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>
            <Link
              href="/settings"
              className="px-2.5 py-2 rounded-lg text-[14px] text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
            >
              <Icon name="settings" size={16} />
              <span className="hidden xl:inline">{t("common.settings")}</span>
            </Link>
          </div>
        </div>

        {/* ── 모바일 상단 앱바 ── */}
        <header className="md:hidden imm-h-appbar imm-pt-safe flex items-center justify-between gap-2 px-3 imm-glass-strong border-b border-white/[0.06] flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 flex-1">
            <BrandLogo size={32} radius={10} />
            <BrandWordmark size={17} className="truncate" />
          </Link>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <ThemeToggleCompact />
            <LanguageSwitcher compact />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="imm-touch flex items-center justify-center rounded-xl text-white/55 active:bg-white/[0.08]"
              aria-label={t("rdos.shell.openMenu")}
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </header>

        {/* 모바일 — 앱바 하단 가는 AI 진행 줄 */}
        <div className="md:hidden flex-shrink-0">
          <GlobalAiProgress variant="thin" />
        </div>

        {/* ── 모바일 리본 스테퍼 (가로 스크롤) ── */}
        <div className="md:hidden flex-shrink-0 border-b border-white/[0.05] imm-glass">
          <RibbonStepper steps={ribbonSteps} activeHref={pathname} doneHrefs={visited} />
        </div>

        {/* ── 본문 ──
             s-renew-16: 히어로가 있는 일반 메뉴 페이지는 화면 끝까지 늘어나 좌우가 너무 넓었다.
             중앙 정렬 + 최대 폭(1180px)으로 읽기 좋은 단폭으로 줄인다.
             EXPERT 작업공간(hero:false)은 작업 면적이 커야 하므로 폭을 제한하지 않는다.
             RDOS 셸이 이미 쓰는 max-w-[1080px] 규칙과 같은 방식이다. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <div
            /* s-renew-17: mx-auto(중앙 정렬)를 걷어내고 사이드바 바로 옆부터 시작한다.
               가운데 정렬이면 좌측에 큰 빈 띠가 생겨 본문이 오른쪽으로 밀려 보였다. */
            className={`w-full px-4 sm:px-5 md:px-6 pt-4 md:pt-6 ${
              meta?.hero ? "max-w-[1180px]" : "max-w-full"
            }`}
          >
            {!isStandby && <HeroLayer meta={meta} />}
          </div>
          <div
            className={`w-full min-w-0 imm-pb-tabbar md:pb-10 ${
              meta?.hero ? "max-w-[1180px]" : "max-w-full"
            }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ── 모바일 하단 탭바 ── */}
      <nav
        className="fixed left-0 right-0 bottom-0 z-[7500] md:hidden imm-glass-strong border-t border-white/[0.06] imm-tabbar imm-px-safe"
        aria-label={t("sidebar.sectionFlow")}
      >
        <div className="h-[62px] flex items-stretch px-1">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="imm-touch w-[54px] flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl text-white/40 active:bg-white/[0.06]"
            aria-label={t("rdos.shell.openMenu")}
          >
            <Icon name="menu" size={18} />
            <span className="text-[9.5px] leading-none">{t("rdos.shell.fullMenuShort")}</span>
          </button>

          <div className="flex-1 min-w-0 flex items-stretch">
            {MOBILE_PRIMARY.filter((tab) => can(tab.perm))
              .slice(0, 4)
              .map((tab) => {
                const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className="imm-touch flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-xl active:bg-white/[0.06] transition-colors"
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span
                      className="w-[26px] h-[26px] rounded-lg flex items-center justify-center transition-all"
                      style={{
                        background: isActive ? `${tab.color}2e` : "transparent",
                        color: isActive ? tab.color : "rgba(255,255,255,.38)",
                        boxShadow: isActive ? `0 4px 14px ${tab.color}40` : undefined,
                      }}
                    >
                      <Icon name={tab.icon} size={17} />
                    </span>
                    <span
                      className="text-[9.5px] leading-none truncate max-w-full px-0.5"
                      style={{ color: isActive ? tab.color : "rgba(255,255,255,.4)" }}
                    >
                      {t(tab.tabKey)}
                    </span>
                  </Link>
                );
              })}
          </div>

          <button
            type="button"
            onClick={() => setMobileEngineOpen((v) => !v)}
            className="imm-touch w-[54px] flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl active:bg-white/[0.06] transition-colors"
            aria-label="AI Tools"
            aria-expanded={mobileEngineOpen}
          >
            <span
              className="w-[26px] h-[26px] rounded-lg flex items-center justify-center transition-all"
              style={{
                background: mobileEngineOpen ? "rgba(108,140,255,.2)" : "transparent",
                color: mobileEngineOpen ? "#6c8cff" : "rgba(255,255,255,.38)",
              }}
            >
              <Icon name={mobileEngineOpen ? "chevronDown" : "layers"} size={17} />
            </span>
            <span
              className="text-[9.5px] leading-none"
              style={{ color: mobileEngineOpen ? "#6c8cff" : "rgba(255,255,255,.4)" }}
            >
              Tools
            </span>
          </button>
        </div>
      </nav>

      {/* ── AI Tools 슬라이드업 시트 (전문 엔진 전체) ── */}
      {mobileEngineOpen && (
        <div className="fixed inset-0 z-[8000] md:hidden" onClick={() => setMobileEngineOpen(false)}>
          <div className="absolute inset-0 bg-black/55 animate-fade-in" />
          <div
            className="absolute left-0 right-0 bottom-0 imm-glass-strong border-t border-white/[0.09] rounded-t-[22px] shadow-2xl animate-slide-up px-4 pt-3 imm-px-safe max-h-[76vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 78px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3.5" />
            <p className="text-[10.5px] font-bold text-white/35 uppercase tracking-[0.16em] mb-3">
              {t("sidebar.sectionFlow")}
            </p>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {MOBILE_PRIMARY.filter((tab) => can(tab.perm)).map((tab) => {
                const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileEngineOpen(false)}
                    className="relative flex flex-col items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all active:scale-[.97]"
                    style={{
                      background: isActive ? `${tab.color}18` : "rgba(255,255,255,.03)",
                      borderColor: isActive ? `${tab.color}55` : "rgba(255,255,255,.06)",
                      color: isActive ? tab.color : "rgba(255,255,255,.62)",
                    }}
                  >
                    <span
                      className="absolute top-2 right-2.5 text-[10px] font-extrabold tabular-nums"
                      style={{ color: isActive ? tab.color : "rgba(255,255,255,.22)" }}
                    >
                      {tab.no}
                    </span>
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${tab.color}22`, color: tab.color }}
                    >
                      <Icon name={tab.icon} size={18} />
                    </span>
                    <span className="text-[10.5px] font-medium text-center leading-tight px-1 line-clamp-2">
                      {t(tab.labelKey)}
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="text-[10.5px] font-bold text-white/35 uppercase tracking-[0.16em] mb-3">
              {t("sidebar.sectionEngines")}
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {MOBILE_ENGINE.filter((tab) => can(tab.perm)).map((tab) => {
                const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileEngineOpen(false)}
                    className="flex flex-col items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all active:scale-[.97]"
                    style={{
                      background: isActive ? `${tab.color}18` : "rgba(255,255,255,.03)",
                      borderColor: isActive ? `${tab.color}55` : "rgba(255,255,255,.06)",
                      color: isActive ? tab.color : "rgba(255,255,255,.62)",
                    }}
                  >
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${tab.color}22`, color: tab.color }}
                    >
                      <Icon name={tab.icon} size={18} />
                    </span>
                    <span className="text-[10.5px] font-medium text-center leading-tight px-1 line-clamp-2">
                      {t(tab.labelKey)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 모바일 좌측 드로어 ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[9000] lg:hidden flex"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMobile();
          }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={closeMobile} />
          <div className="imm-drawer relative z-10 h-full w-[268px] max-w-[86vw] overflow-y-auto animate-slide-in-left imm-pt-safe">
            <DashboardSidebar onNavigate={closeMobile} />
          </div>
        </div>
      )}

      <CitationPanel />

      {/* ove-1 · 오브 + 대화창.
           대기 화면에서는 전체메뉴 그리드 아래 중앙에, 작업 화면에서는 우하단에 놓인다. */}
      <ResearchAssistant
        sidebarWidth={sidebarW}
        contentMaxWidth={meta?.hero && !isStandby ? 1180 : 0}
        centered={isStandby}
      />
    </div>
  );
}
