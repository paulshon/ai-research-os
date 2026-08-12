"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";
import ResearchAssistant from "@/components/assistant/research-assistant";
import { Icon } from "@/components/ui/icon";
import { RDOS_MENUS } from "@/lib/rdos/menus";
import RdosSidebarUser from "@/components/rdos/rdos-sidebar-user";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";
import AccentProvider from "@/components/immersive/accent-provider";
import { AmbientLayer, HeroLayer } from "@/components/immersive/immersive-page-frame";
import { resolveRdosMeta } from "@/lib/immersive/page-meta";
import { buildLearningTree, learningMenuKeys, type LearningNode } from "@/lib/rdos/learning-tree";

/* ════════════════════════════════════════════════════════════════════
   RDOS (연구준비자) 셸 — s-renew-12
   [수정1] 메뉴 구성·관리자·전체 기능은 원본 그대로 유지하고,
           몰입 레이어 중 다음 두 가지만 얹는다.
             · Atmosphere : 강조색 앰비언트 광원 3개 + 그리드 + 그레인 + 유리질 패널
             · Hero 진입  : 명조체 대형 카피 + 핵심 수치
           (EXPERT 버튼 / 리본 스테퍼 / 도넛 게이지는 연구자 플랜 전용)

   반응형 구조
     · 데스크탑(lg+)   : 풀 사이드바
     · 태블릿(md~lg)   : 컴팩트 레일
     · 모바일(<md)     : 상단 앱바 + 하단 탭바 + 전체메뉴 시트 + 드로어
                         (iOS 노치·홈 인디케이터 / 안드로이드 제스처바 세이프에어리어)
═══════════════════════════════════════════════════════════════════════ */

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

export default function RdosShell(props: {
  children: React.ReactNode;
  disabledKeys?: string[];
  isSuperAdmin?: boolean;
}) {
  return (
    <AccentProvider initial="#6c8cff">
      <RdosShellInner {...props} />
    </AccentProvider>
  );
}

function RdosShellInner({
  children,
  disabledKeys = [],
  isSuperAdmin = false,
}: {
  children: React.ReactNode;
  disabledKeys?: string[];
  isSuperAdmin?: boolean;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const disabled = useMemo(() => new Set(disabledKeys), [disabledKeys]);

  const menus = useMemo(
    () =>
      RDOS_MENUS.filter((m) => m.key === "dashboard" || !disabled.has(m.key)).map((m) => ({
        ...m,
        label: t(MENU_LABEL_KEY[m.key] ?? m.label) || m.label,
      })),
    [disabled, t]
  );
  const adminLabel = t("rdos.shell.adminLabel");
  const meta = useMemo(() => resolveRdosMeta(pathname), [pathname]);

  const [mobileOpen, setMobileOpen] = useState(false); // 좌측 드로어
  const [sheetOpen, setSheetOpen] = useState(false); // 전체메뉴 시트

  useEffect(() => {
    setMobileOpen(false);
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setSheetOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* 시트/드로어 열림 동안 배경 스크롤 잠금 (모바일 필수) */
  useEffect(() => {
    const lock = mobileOpen || sheetOpen;
    document.body.style.overflow = lock ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, sheetOpen]);

  const isActive = useCallback((route: string) => pathname === route, [pathname]);

  /* 모바일 하단 탭: 대시보드 + 앞쪽 메뉴 3개 (나머지는 전체메뉴 시트) */
  const primary = menus.slice(0, 4);

  /* 전체메뉴 시트도 사이드바와 같은 학습 트리를 본다 (s-renew-13) */
  /* s-renew-14: 학습 트리는 대시보드 미션 목록과 항상 동일해야 하므로
     메뉴 활성화 설정으로 걸러내지 않는다. */
  const sheetTree = useMemo(() => buildLearningTree(), []);
  const sheetLearnKeys = useMemo(() => learningMenuKeys(), []);
  const sheetTail = useMemo(
    () => menus.filter((m) => m.key !== "dashboard" && !sheetLearnKeys.has(m.key)),
    [menus, sheetLearnKeys]
  );

  return (
    <div className="relative min-h-screen min-h-[100dvh] bg-[var(--bg,#0d0f14)] text-[#e8eaf0] font-nanum-gothic flex">
      {/* ── Atmosphere ── */}
      <AmbientLayer meta={meta} />

      {/* ── 데스크탑 사이드바 (lg+) ── */}
      <aside className="hidden lg:flex flex-col w-[262px] flex-shrink-0 relative z-[2] imm-glass-strong border-r border-white/[0.06]">
        <SidebarBody
          menus={menus}
          isActive={isActive}
          isSuperAdmin={isSuperAdmin}
          adminLabel={adminLabel}
        />
      </aside>

      {/* ── 태블릿 레일 (md~lg) ── */}
      <aside className="hidden md:flex lg:hidden flex-col w-[212px] flex-shrink-0 relative z-[2] imm-glass-strong border-r border-white/[0.06]">
        <SidebarBody
          menus={menus}
          isActive={isActive}
          isSuperAdmin={isSuperAdmin}
          adminLabel={adminLabel}
          compact
        />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col relative z-[1]">
        {/* ── 모바일 상단 앱바 ── */}
        <header className="md:hidden imm-h-appbar imm-pt-safe flex items-center justify-between gap-2 px-3 imm-glass-strong border-b border-white/[0.06] flex-shrink-0 sticky top-0 z-[60]">
          <Link href="/rdos" className="flex items-center gap-2.5 min-w-0 flex-1">
            <BrandLogo size={30} radius={9} />
            <span className="min-w-0">
              <span className="block text-[15px] font-extrabold leading-tight">RDOS</span>
              <span className="block text-[9px] text-[#3ecfb2] leading-tight truncate">
                Researcher Development OS
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1 flex-shrink-0">
            <LanguageSwitcher compact />
            <button
              onClick={() => setMobileOpen(true)}
              aria-label={t("rdos.shell.openMenu")}
              className="imm-touch flex items-center justify-center rounded-xl text-white/55 active:bg-white/[0.08]"
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </header>

        {/* ── 본문 ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* s-renew-17: 중앙 정렬 해제 — 사이드바 바로 옆부터 본문이 시작된다 */}
          <div className="w-full max-w-[1080px] px-4 sm:px-5 md:px-7 pt-5 md:pt-8 imm-pb-tabbar md:pb-14">
            {/* Hero 진입 */}
            <HeroLayer meta={meta} />
            {children}
          </div>
        </div>
      </main>

      {/* ── 모바일 하단 탭바 ── */}
      <nav
        className="fixed left-0 right-0 bottom-0 z-[7500] md:hidden imm-glass-strong border-t border-white/[0.07] imm-tabbar imm-px-safe"
        aria-label={t("rdos.shell.fullMenu")}
      >
        <div className="h-[62px] flex items-stretch px-1">
          {primary.map((m) => {
            const active = isActive(m.route);
            return (
              <Link
                key={m.key}
                href={m.route}
                className="imm-touch flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-xl active:bg-white/[0.06] transition-colors"
                aria-current={active ? "page" : undefined}
              >
                <span
                  className="w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: active ? `${m.color}2e` : "transparent",
                    color: active ? m.color : "rgba(255,255,255,.38)",
                    boxShadow: active ? `0 4px 14px ${m.color}40` : undefined,
                  }}
                >
                  <Icon name={m.icon} size={17} />
                </span>
                <span
                  className="text-[9.5px] leading-none truncate max-w-full px-0.5"
                  style={{ color: active ? m.color : "rgba(255,255,255,.4)" }}
                >
                  {m.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSheetOpen((v) => !v)}
            aria-label={t("rdos.shell.fullMenu")}
            aria-expanded={sheetOpen}
            className="imm-touch flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-xl active:bg-white/[0.06] transition-colors"
          >
            <span
              className="w-[26px] h-[26px] rounded-lg flex items-center justify-center transition-all"
              style={{
                background: sheetOpen ? "rgba(62,207,178,.18)" : "transparent",
                color: sheetOpen ? "#3ecfb2" : "rgba(255,255,255,.38)",
              }}
            >
              <Icon name={sheetOpen ? "chevronDown" : "layers"} size={17} />
            </span>
            <span
              className="text-[9.5px] leading-none"
              style={{ color: sheetOpen ? "#3ecfb2" : "rgba(255,255,255,.4)" }}
            >
              {t("rdos.shell.fullMenuShort")}
            </span>
          </button>
        </div>
      </nav>

      {/* ── 전체메뉴 슬라이드업 시트 ── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[8000] md:hidden" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/55 animate-fade-in" />
          <div
            className="absolute left-0 right-0 bottom-0 imm-glass-strong border-t border-white/[0.09] rounded-t-[22px] shadow-2xl animate-slide-up px-4 pt-3 imm-px-safe max-h-[76vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 78px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3.5" />
            <p className="text-[10.5px] font-bold text-white/35 uppercase tracking-[0.16em] mb-3">
              {t("rdos.shell.learningGroup")}
            </p>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {sheetTree.map((n) => {
                const active = isActive(n.route);
                return (
                  <Link
                    key={n.key}
                    href={n.route}
                    onClick={() => setSheetOpen(false)}
                    className="relative flex flex-col items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all active:scale-[.97]"
                    style={{
                      background: active ? `${n.color}18` : "rgba(255,255,255,.03)",
                      borderColor: active ? `${n.color}55` : "rgba(255,255,255,.06)",
                      color: active ? n.color : "rgba(255,255,255,.62)",
                    }}
                  >
                    <span
                      className="absolute top-2 right-2.5 text-[9.5px] font-extrabold tabular-nums"
                      style={{ color: active ? n.color : "rgba(255,255,255,.22)" }}
                    >
                      {n.lessons.length}
                    </span>
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${n.color}22`, color: n.color }}
                    >
                      <Icon name={n.icon} size={18} />
                    </span>
                    <span className="text-[10.5px] text-center leading-tight px-1 line-clamp-2">{n.label}</span>
                  </Link>
                );
              })}
            </div>
            <p className="text-[10.5px] font-bold text-white/35 uppercase tracking-[0.16em] mb-3">
              {t("rdos.shell.certifyGroup")}
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {sheetTail.map((m) => {
                const active = isActive(m.route);
                return (
                  <Link
                    key={m.key}
                    href={m.route}
                    onClick={() => setSheetOpen(false)}
                    className="flex flex-col items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all active:scale-[.97]"
                    style={{
                      background: active ? `${m.color}18` : "rgba(255,255,255,.03)",
                      borderColor: active ? `${m.color}55` : "rgba(255,255,255,.06)",
                      color: active ? m.color : "rgba(255,255,255,.62)",
                    }}
                  >
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${m.color}22`, color: m.color }}
                    >
                      <Icon name={m.icon} size={18} />
                    </span>
                    <span className="text-[10.5px] text-center leading-tight px-1 line-clamp-2">
                      {m.label}
                    </span>
                  </Link>
                );
              })}
              {isSuperAdmin && (
                <Link
                  href={ADMIN.route}
                  onClick={() => setSheetOpen(false)}
                  className="flex flex-col items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all active:scale-[.97]"
                  style={{
                    background: isActive(ADMIN.route) ? "rgba(232,184,75,.14)" : "rgba(255,255,255,.03)",
                    borderColor: isActive(ADMIN.route) ? "rgba(232,184,75,.45)" : "rgba(255,255,255,.06)",
                    color: isActive(ADMIN.route) ? "#e8b84b" : "rgba(255,255,255,.62)",
                  }}
                >
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#e8b84b]/15 text-[#e8b84b]">
                    <Icon name="admin" size={18} />
                  </span>
                  <span className="text-[10.5px] text-center leading-tight px-1">{adminLabel}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 좌측 드로어 (모바일/태블릿) ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[9000] lg:hidden flex"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full imm-drawer w-[268px] max-w-[86vw] imm-glass-strong border-r border-white/[0.06] animate-slide-in-left overflow-y-auto imm-pt-safe imm-pb-safe">
            <SidebarBody
              menus={menus}
              isActive={isActive}
              isSuperAdmin={isSuperAdmin}
              adminLabel={adminLabel}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* s-renew-14 · 연구 어시스턴트 (음성/텍스트 → Gemini 2.5 Flash → RDOS 지식) */}
      <ResearchAssistant sidebarWidth={262} contentMaxWidth={1080} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   사이드바 본문 — 데스크탑/태블릿/드로어 공용
   s-renew-13: 「학습 메뉴」 그룹을 대시보드와 연구 준비자 인증 사이에
   삽입하고, 각 학습 메뉴 아래로 레슨(하위메뉴)까지 펼쳐 연동한다.
   ══════════════════════════════════════════════════════════════ */
function SidebarBody({
  menus,
  isActive,
  isSuperAdmin,
  adminLabel,
  compact = false,
  onNavigate,
}: {
  menus: (typeof RDOS_MENUS)[number][];
  isActive: (r: string) => boolean;
  isSuperAdmin: boolean;
  adminLabel: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const search = useSearchParams();
  const activeLesson = search?.get("lesson") ?? null;

  /* s-renew-14: 대시보드 「학습 메뉴」 카드와 사이드바 하위메뉴를 하나의 원본으로 묶는다.
     (예전에는 메뉴 활성화 설정 때문에 그룹이 통째로 비어 보였다) */
  const tree = useMemo(() => buildLearningTree(), []);
  const learnKeys = useMemo(() => learningMenuKeys(), []);

  /* 대시보드와 같은 커널 상태를 읽어 진행률을 하위메뉴에 표시한다 */
  const [progress, setProgress] = useState<Record<string, { pct: number; done: number; total: number }>>({});
  useEffect(() => {
    let alive = true;
    fetch("/api/rdos/progress")
      .then((r) => (r.ok ? r.json() : { progress: {} }))
      .then((d) => { if (alive) setProgress(d?.progress ?? {}); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /* 학습 메뉴 외 항목: 대시보드 / 지식코어·로드맵·인증 등 */
  const dashboardItem = menus.find((m) => m.key === "dashboard");
  const tailItems = menus.filter((m) => m.key !== "dashboard" && !learnKeys.has(m.key));

  /* 현재 경로에 해당하는 학습 메뉴는 자동으로 펼친다 */
  const currentKey = tree.find((n) => pathname === n.route)?.key ?? null;
  const [openKeys, setOpenKeys] = useState<string[]>(currentKey ? [currentKey] : []);
  useEffect(() => {
    if (currentKey) setOpenKeys((prev) => (prev.includes(currentKey) ? prev : [...prev, currentKey]));
  }, [currentKey]);

  const toggle = (k: string) =>
    setOpenKeys((prev) => (prev.includes(k) ? prev.filter((v) => v !== k) : [...prev, k]));

  return (
    <>
      <div className="px-4 h-[78px] flex items-center justify-between gap-2.5 border-b border-white/[0.06] flex-shrink-0">
        <Link href="/rdos" onClick={onNavigate} className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size={32} radius={10} />
          <span className="leading-tight min-w-0">
            <span className="block text-[15px] font-extrabold">RDOS</span>
            <span className="block text-[9px] text-[#3ecfb2] leading-tight">
              Researcher Development
              <br />
              Operating System
            </span>
          </span>
        </Link>
        {!compact && <LanguageSwitcher compact />}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1 scrollbar-none">
        {/* ① 대시보드 */}
        {dashboardItem && (
          <MenuLink item={dashboardItem} active={isActive(dashboardItem.route)} onNavigate={onNavigate} />
        )}

        {/* ② 학습 메뉴 — 하위 레슨까지 (s-renew-13) */}
        <p className="text-[10.5px] font-bold text-white/22 uppercase tracking-[.12em] px-2.5 pt-3.5 pb-1.5">
          {t("rdos.shell.learningGroup")}
        </p>
        {tree.map((node) => {
          const nodeActive = pathname === node.route;
          const open = openKeys.includes(node.key);
          return (
            <div key={node.key}>
              <div
                className={`group relative flex items-center gap-2 pl-3 pr-1.5 py-2.5 rounded-[13px] text-[14.5px] overflow-hidden transition-all duration-200 ${
                  nodeActive
                    ? "font-extrabold bg-[color-mix(in_srgb,var(--ac)_15%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ac)_30%,transparent)]"
                    : "text-white/58 font-semibold hover:text-[var(--ac)]"
                }`}
                style={{ "--ac": node.color, color: nodeActive ? node.color : undefined } as React.CSSProperties}
              >
                {nodeActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-5 rounded-r"
                    style={{ background: node.color, boxShadow: `0 0 12px ${node.color}` }}
                    aria-hidden
                  />
                )}
                <Link
                  href={node.route}
                  onClick={onNavigate}
                  title={node.label}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <span
                    className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: nodeActive ? `${node.color}42` : `${node.color}1f`,
                      color: node.color,
                      boxShadow: nodeActive ? `0 4px 14px ${node.color}4d` : undefined,
                    }}
                  >
                    <Icon name={node.icon} size={16} />
                  </span>
                  <span className="flex-1 truncate">{node.label}</span>
                  {progress[node.key] && (
                    <span
                      className="text-[10.5px] font-bold tabular-nums flex-shrink-0"
                      style={{ color: progress[node.key].pct >= 100 ? "#3ecfb2" : "rgba(255,255,255,.34)" }}
                      title={`${progress[node.key].done}/${progress[node.key].total}`}
                    >
                      {progress[node.key].pct}%
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(node.key)}
                  aria-expanded={open}
                  aria-label={node.label}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] flex-shrink-0 transition-colors"
                >
                  <Icon name={open ? "chevronDown" : "chevronRight"} size={13} />
                </button>
              </div>

              {/* 하위 레슨 */}
              {open && (
                <div className="relative ml-[27px] pl-3 my-1 space-y-0.5 border-l border-white/[0.08]">
                  {node.lessons.map((l) => {
                    const on = nodeActive && activeLesson === l.id;
                    return (
                      <Link
                        key={l.id}
                        href={`${node.route}?lesson=${l.id}`}
                        onClick={onNavigate}
                        title={l.subtitle}
                        className={`flex items-center gap-2 pl-2.5 pr-2 py-[7px] rounded-[9px] text-[13px] transition-all ${
                          on
                            ? "font-bold bg-[color-mix(in_srgb,var(--ac)_14%,transparent)]"
                            : "text-white/42 hover:text-white/80 hover:bg-white/[0.04]"
                        }`}
                        style={{ "--ac": node.color, color: on ? node.color : undefined } as React.CSSProperties}
                      >
                        <span
                          className="w-[18px] h-[18px] rounded-md flex items-center justify-center text-[9.5px] font-extrabold flex-shrink-0 tabular-nums"
                          style={{
                            background: on ? `${node.color}33` : "rgba(255,255,255,.05)",
                            color: on ? node.color : "rgba(255,255,255,.35)",
                          }}
                        >
                          {l.index + 1}
                        </span>
                        <span className="flex-1 truncate">{l.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* ③ 지식 코어 · 성장 로드맵 · 연구 준비자 인증 */}
        {tailItems.length > 0 && (
          <p className="text-[10.5px] font-bold text-white/22 uppercase tracking-[.12em] px-2.5 pt-4 pb-1.5">
            {t("rdos.shell.certifyGroup")}
          </p>
        )}
        {tailItems.map((m) => (
          <MenuLink key={m.key} item={m} active={isActive(m.route)} onNavigate={onNavigate} />
        ))}

        {isSuperAdmin && (
          <Link
            href={ADMIN.route}
            onClick={onNavigate}
            className={`group flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-[13px] text-[14.5px] mt-2 border-t border-white/[0.05] pt-3.5 transition-colors ${
              isActive(ADMIN.route)
                ? "bg-[#E0A73E]/12 text-[#E0A73E] font-extrabold"
                : "text-white/58 font-semibold hover:text-white"
            }`}
          >
            <span className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0 bg-[#E0A73E]/18 text-[#E0A73E]">
              <Icon name="admin" size={16} />
            </span>
            <span className="flex-1 truncate">{adminLabel}</span>
          </Link>
        )}
        <div className="h-2" />
      </nav>

      <RdosSidebarUser compact={compact} />
    </>
  );
}

/** 단일 메뉴 링크 (대시보드 · 인증 그룹 공용) */
function MenuLink({
  item,
  active,
  onNavigate,
}: {
  item: (typeof RDOS_MENUS)[number];
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.route}
      onClick={onNavigate}
      title={item.label}
      style={{ "--ac": item.color } as React.CSSProperties}
      className={`group relative flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-[13px] text-[14.5px] overflow-hidden transition-all duration-200 ${
        active
          ? "text-[var(--ac)] font-extrabold bg-[color-mix(in_srgb,var(--ac)_15%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ac)_30%,transparent)]"
          : "text-white/58 font-semibold hover:text-[var(--ac)] hover:translate-x-0.5"
      }`}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-5 rounded-r"
          style={{ background: item.color, boxShadow: `0 0 12px ${item.color}` }}
          aria-hidden
        />
      )}
      <span
        className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: active ? `${item.color}42` : `${item.color}1f`,
          color: item.color,
          boxShadow: active ? `0 4px 14px ${item.color}4d` : undefined,
        }}
      >
        <Icon name={item.icon} size={16} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}
