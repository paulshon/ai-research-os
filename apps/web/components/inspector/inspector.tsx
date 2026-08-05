"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

type InspectorCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  hasInspector: boolean;
  /** 현재 페이지가 포털로 밀어 넣은 인스펙터 트리(완성된 <Inspector> 엘리먼트). */
  slot: ReactNode | null;
  setSlot: (n: ReactNode | null) => void;
};

const Ctx = createContext<InspectorCtx | null>(null);

export function useInspector() {
  return useContext(Ctx);
}

/**
 * 셸이 인스펙터 유무와 토글 상태를 공유하기 위한 프로바이더.
 * 페이지는 `usePageInspector`로 자신의 인스펙터 트리를 등록하고,
 * 셸은 `InspectorOutlet`으로 그것을 렌더한다 — 레이아웃(shell)이
 * 각 페이지의 인스펙터 내용을 미리 알 필요가 없다.
 */
export function InspectorProvider({
  hasInspector,
  children,
}: {
  hasInspector?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<ReactNode | null>(null);
  const resolvedHasInspector = Boolean(hasInspector) || slot !== null;
  useEffect(() => {
    if (!resolvedHasInspector) setOpen(false);
  }, [resolvedHasInspector]);
  return (
    <Ctx.Provider value={{ open, setOpen, hasInspector: resolvedHasInspector, slot, setSlot }}>
      {children}
    </Ctx.Provider>
  );
}

/**
 * 페이지 전용 인스펙터 등록 훅.
 * node 에는 완성된 `<Inspector title=…>…</Inspector>` 트리를 넘긴다.
 * 언마운트되거나 node 가 null 이 되면 자동으로 비워진다.
 */
export function usePageInspector(node: ReactNode | null) {
  const ctx = useInspector();
  useEffect(() => {
    ctx?.setSlot(node);
    return () => {
      ctx?.setSlot(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}

/** 셸(AppShell)이 렌더하는 포털 출구 — 현재 페이지가 등록한 인스펙터를 그린다. */
export function InspectorOutlet() {
  const ctx = useInspector();
  if (!ctx?.slot) return null;
  return <>{ctx.slot}</>;
}

/**
 * 우측 인스펙터 패널 (296px).
 * ≥1400px 에서는 상시 노출, 그 미만에서는 토글 시 우측 드로어로 열린다.
 * ESC 로 닫히고, 모바일에서는 하단 시트처럼 쓸 수 있다.
 */
export function Inspector({
  title,
  badge,
  children,
  className,
}: {
  title: ReactNode;
  badge?: { label: ReactNode; variant?: BadgeVariant };
  children: ReactNode;
  className?: string;
}) {
  const ctx = useInspector();
  const open = ctx?.open ?? true;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") ctx?.setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, ctx]);

  return (
    <>
      {open && ctx && typeof window !== "undefined" && window.matchMedia("(max-width:1399px)").matches ? (
        <button type="button" className="insp-scrim" aria-label="인스펙터 닫기" onClick={() => ctx.setOpen(false)} />
      ) : null}
      <aside
        className={cn("insp", open && "open", className)}
        aria-label={typeof title === "string" ? title : "인스펙터"}
      >
        <div className="insp-h">
          <b>{title}</b>
          {badge ? <Badge variant={badge.variant ?? "info"}>{badge.label}</Badge> : null}
          <div className="sp" />
          <IconButton
            label="인스펙터 닫기"
            className="insp-toggle"
            onClick={() => ctx?.setOpen(false)}
          >
            <Icon name="close" size={14} />
          </IconButton>
        </div>
        {children}
      </aside>
    </>
  );
}

export function InspectorSection({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sect">
      <h4>
        {title}
        <span className="sp" />
        {action}
      </h4>
      {children}
    </section>
  );
}

export function PropertyRow({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="prop">
      <label>{label}</label>
      <div className="ctl">{children}</div>
    </div>
  );
}
