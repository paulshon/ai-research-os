"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icons";
import { IconButton, LinkButton } from "@/components/ui/button";
import {
  RESEARCHER_NAV,
  RESEARCHER_TABBAR,
  RDOS_NAV,
  RDOS_TABBAR,
  findNavLabel,
  type NavGroup,
  type NavItem,
} from "@/lib/nav";
import { InspectorOutlet, InspectorProvider, useInspector } from "@/components/inspector";

export type Track = "researcher" | "rdos";

function isActive(href: string, pathname: string) {
  if (href === "/dashboard" || href === "/rdos") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function Sidebar({
  track,
  nav,
  open,
  onClose,
  disabledKeys,
  user,
}: {
  track: Track;
  nav: NavGroup[];
  open: boolean;
  onClose: () => void;
  disabledKeys?: Set<string>;
  user?: { name: string; email?: string };
}) {
  const pathname = usePathname() || "/";
  const other =
    track === "researcher"
      ? { href: "/rdos", label: "연구준비자 트랙 보기" }
      : { href: "/dashboard", label: "연구자 트랙 보기" };

  return (
    <>
      {open ? <button type="button" className="nav-scrim" aria-label="메뉴 닫기" onClick={onClose} /> : null}
      <aside className={cn("nav", open && "open")} aria-label="주 메뉴">
        <div className="nav-head">
          <Link href={track === "rdos" ? "/rdos" : "/dashboard"} className="brand" onClick={onClose}>
            <span className="brand-mark">{track === "rdos" ? "D" : "R"}</span>
            <span className="brand-name">
              {track === "rdos" ? (
                <>
                  Research <em>DOS</em>
                </>
              ) : (
                <>
                  AI Research <em>OS</em>
                </>
              )}
            </span>
          </Link>
          <span className="track-chip">{track === "rdos" ? "연구준비자 트랙 · RDOS" : "연구자 트랙"}</span>
        </div>

        <nav className="nav-body">
          {nav.map((g) => (
            <div key={g.label} className="nav-group">
              <div className="nav-label">{g.label}</div>
              {g.items.map((it) => {
                const locked =
                  it.locked ||
                  (disabledKeys && disabledKeys.has(it.href.replace(/^\/rdos\/?/, "") || "home")
                    ? "이전 단계를 모두 마치면 열립니다"
                    : undefined);
                const on = isActive(it.href, pathname);
                if (locked) {
                  return (
                    <span
                      key={it.href}
                      className="nav-item locked"
                      aria-disabled="true"
                      title={locked}
                    >
                      <span className="ico">
                        <Icon name={it.icon} size={17} />
                      </span>
                      <span className="lbl">{it.label}</span>
                      <Icon name="lock" size={13} />
                    </span>
                  );
                }
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn("nav-item", on && "on")}
                    aria-current={on ? "page" : undefined}
                    onClick={onClose}
                  >
                    <span className="ico">
                      <Icon name={it.icon} size={17} />
                    </span>
                    <span className="lbl">{it.label}</span>
                    {it.tail ? <span className="tail">{it.tail}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="nav-foot">
          <Link href={other.href} className="nav-item" style={{ marginBottom: 8 }} onClick={onClose}>
            <span className="ico">
              <Icon name="route" size={17} />
            </span>
            <span className="lbl">{other.label}</span>
            <Icon name="arrow" size={13} />
          </Link>
          <div className="usr">
            <span className="avatar">{(user?.name || "연").slice(0, 1)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="usr-n">{user?.name || (track === "rdos" ? "학습자" : "연구자")}</div>
              <div className="usr-e">{user?.email || " "}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  track,
  primaryAction,
}: {
  track: Track;
  primaryAction?: { href: string; label: string };
}) {
  const pathname = usePathname() || "/";
  const label = findNavLabel(pathname, track);
  const insp = useInspector();

  return (
    <header className="topbar">
      <IconButton
        label="메뉴 열기"
        className="md:hidden"
        onClick={() => {
          document.querySelector(".nav")?.classList.add("open");
          // 사이드바 open 상태는 AppShell 이 관리한다 — 이벤트 브리지
          window.dispatchEvent(new CustomEvent("aros:nav-open"));
        }}
      >
        <Icon name="list" size={16} />
      </IconButton>
      <div className="crumb">
        {track === "rdos" ? "연구준비자" : "연구자"}
        <span className="t3">/</span>
        <b>{label}</b>
      </div>
      <div className="sp" />
      <button type="button" className="search" aria-label="검색">
        <Icon name="search" size={15} />
        <span>무엇이든 검색</span>
        <kbd>Ctrl K</kbd>
      </button>
      {insp?.hasInspector ? (
        <IconButton label="인스펙터 열기" className="insp-toggle" onClick={() => insp.setOpen(true)}>
          <Icon name="grid" size={16} />
        </IconButton>
      ) : null}
      <IconButton label="알림" onClick={() => (window.location.href = "/notifications")}>
        <Icon name="bell" size={16} />
      </IconButton>
      <IconButton label="설정" onClick={() => (window.location.href = "/settings")}>
        <Icon name="gear" size={16} />
      </IconButton>
      {primaryAction ? (
        <LinkButton href={primaryAction.href} variant="primary" size="sm">
          {primaryAction.label}
        </LinkButton>
      ) : null}
    </header>
  );
}

function Tabbar({ items }: { items: NavItem[] }) {
  const pathname = usePathname() || "/";
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {items.map((it) => {
        const on = isActive(it.href, pathname);
        return (
          <Link key={it.href} href={it.href} className={cn(on && "on")} aria-current={on ? "page" : undefined}>
            <Icon name={it.icon} size={18} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * 두 트랙이 공유하는 앱 셸.
 * data-track 속성만 바꾸면 CSS 가 --accent 를 스왑한다. 컴포넌트는 트랙을 몰라도 된다.
 */
export function AppShell({
  track,
  children,
  inspector,
  primaryAction,
  disabledKeys,
  user,
}: {
  track: Track;
  children: ReactNode;
  inspector?: ReactNode;
  primaryAction?: { href: string; label: string };
  disabledKeys?: Set<string>;
  user?: { name: string; email?: string };
}) {
  const nav = track === "rdos" ? RDOS_NAV : RESEARCHER_NAV;
  const tabs = track === "rdos" ? RDOS_TABBAR : RESEARCHER_TABBAR;
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    function onOpen() { setNavOpen(true); }
    window.addEventListener("aros:nav-open", onOpen);
    return () => window.removeEventListener("aros:nav-open", onOpen);
  }, []);

  return (
    <InspectorProvider hasInspector={Boolean(inspector)}>
      <ShellBody
        track={track}
        nav={nav}
        tabs={tabs}
        navOpen={navOpen}
        onNavClose={() => setNavOpen(false)}
        disabledKeys={disabledKeys}
        user={user}
        primaryAction={primaryAction}
        inspector={inspector}
      >
        {children}
      </ShellBody>
    </InspectorProvider>
  );
}

/**
 * 인스펙터 컨텍스트를 소비해 with-insp 클래스와 포털 출구를 그리는 내부 셸.
 * `inspector` prop 으로 명시 전달된 콘텐츠와, 하위 페이지가
 * `usePageInspector`로 등록한 콘텐츠(InspectorOutlet) 둘 다 지원한다.
 */
function ShellBody({
  track,
  nav,
  tabs,
  navOpen,
  onNavClose,
  disabledKeys,
  user,
  primaryAction,
  inspector,
  children,
}: {
  track: Track;
  nav: NavGroup[];
  tabs: NavItem[];
  navOpen: boolean;
  onNavClose: () => void;
  disabledKeys?: Set<string>;
  user?: { name: string; email?: string };
  primaryAction?: { href: string; label: string };
  inspector?: ReactNode;
  children: ReactNode;
}) {
  const insp = useInspector();
  const hasInsp = insp?.hasInspector ?? Boolean(inspector);

  return (
    <div className="canvas" data-track={track === "rdos" ? "rdos" : "researcher"}>
      <div className={cn("shell", hasInsp && "with-insp")}>
        <Sidebar
          track={track}
          nav={nav}
          open={navOpen}
          onClose={onNavClose}
          disabledKeys={disabledKeys}
          user={user}
        />
        <div className="main">
          <Topbar track={track} primaryAction={primaryAction} />
          {children}
        </div>
        {inspector}
        <InspectorOutlet />
      </div>
      <Tabbar items={tabs} />
    </div>
  );
}

/** 페이지 래퍼 — .page + .phead 패턴. */
export function Page({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("page", className)}>
      {(title || description || eyebrow) && (
        <div className="phead">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          {title ? <h1>{title}</h1> : null}
          {description ? <p>{description}</p> : null}
        </div>
      )}
      {children}
    </main>
  );
}
