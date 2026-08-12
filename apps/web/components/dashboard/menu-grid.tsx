"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";
import { usePermissions } from "@/hooks/use-permissions";
import { useFlowProgress } from "@/hooks/use-flow-progress";
import { ENGINE_ITEMS, RESEARCH_FLOW_ITEMS, type TaskItem } from "@/components/dashboard/sidebar-items";
import { touchSession } from "@/lib/workspace/history-store";

/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 중앙 전체메뉴 그리드

   사이드바에 있던 8단계 메뉴를 화면 중앙으로 옮긴 것이다.
   오브는 이 그리드 "아래"에 놓이고, 카드를 누르거나 오브에게 말하면
   같은 인텐트 경로를 타고 해당 작업 화면이 열린다.
   ══════════════════════════════════════════════════════════════════════ */

export function useOpenTask() {
  const router = useRouter();
  const { t } = useTranslation();
  return useCallback(
    (item: TaskItem) => {
      void touchSession({
        href: item.href,
        taskId: item.href.replace(/^\//, ""),
        title: t(item.labelKey),
      });
      router.push(item.href);
    },
    [router, t],
  );
}

export default function MenuGrid({
  compact = false,
  /** ove-7 · 모바일 대기 화면 — 8메뉴+오브가 한 화면에 들어가도록 축소 */
  standbyMobile = false,
}: {
  compact?: boolean;
  standbyMobile?: boolean;
}) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { visited } = useFlowProgress();
  const openTask = useOpenTask();
  const [more, setMore] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);

  const primary = useMemo(() => RESEARCH_FLOW_ITEMS.filter((e) => can(e.perm)), [can]);
  const extra = useMemo(() => ENGINE_ITEMS.filter((e) => can(e.perm)), [can]);

  const go = useCallback(
    (item: TaskItem) => {
      setPressed(item.href);
      /* 선택 카드만 먼저 펄스한 뒤 이동해 인과를 전달한다 */
      window.setTimeout(() => openTask(item), 180);
    },
    [openTask],
  );

  return (
    <div className="w-full">
      <div
        role="grid"
        aria-label={t("home.menuTitle")}
        className={`grid gap-3 sm:gap-4 justify-center ${
          compact
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
        }${standbyMobile ? " max-[767px]:gap-1.5" : ""}`}
      >
        {primary.map((item, i) => {
          const done = visited.includes(item.href);
          const isPressed = pressed === item.href;
          return (
            <button
              key={item.href}
              type="button"
              role="gridcell"
              onClick={() => go(item)}
              style={
                {
                  "--ac": item.color,
                  animationDelay: `${i * 30}ms`,
                } as React.CSSProperties
              }
              className={`menu-card group relative flex flex-col items-center justify-center gap-2
                          w-full min-h-[112px] sm:min-h-[132px] px-3 py-4 rounded-[14px]
                          border border-white/[0.07] bg-white/[0.035]
                          hover:border-[var(--ac)]/55 hover:bg-[var(--ac)]/[0.09] hover:-translate-y-[3px]
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ac)]
                          transition-all duration-200 ${isPressed ? "menu-card-pressed" : ""}${
                            standbyMobile
                              ? " max-[767px]:min-h-[68px] max-[767px]:py-2 max-[767px]:px-2 max-[767px]:gap-1 max-[767px]:rounded-[11px]"
                              : ""
                          }`}
            >
              <span
                className="absolute top-2.5 right-3 text-[11px] font-extrabold tabular-nums"
                style={{ color: done ? item.color : "rgba(255,255,255,.22)" }}
              >
                {done ? <Icon name="check" size={13} /> : item.no}
              </span>
              <span
                className={`w-10 h-10 rounded-[12px] flex items-center justify-center transition-all${
                  standbyMobile ? " max-[767px]:w-8 max-[767px]:h-8 max-[767px]:rounded-[9px]" : ""
                }`}
                style={{ background: `${item.color}22`, color: item.color }}
              >
                <Icon name={item.icon} size={20} />
              </span>
              <span
                className={`text-[14px] font-semibold text-white/78 text-center leading-tight${
                  standbyMobile ? " max-[767px]:text-[11.5px] max-[767px]:leading-snug" : ""
                }`}
              >
                {t(item.labelKey)}
              </span>
              <span
                className={`text-[11px] text-white/32 text-center leading-tight line-clamp-1 px-1${
                  standbyMobile ? " max-[767px]:hidden" : ""
                }`}
              >
                {t(`home.desc.${item.href.replace(/^\//, "")}`)}
              </span>
            </button>
          );
        })}
      </div>

      {extra.length > 0 && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="text-[12.5px] text-white/35 hover:text-white/65 transition-colors flex items-center gap-1"
            aria-expanded={more}
          >
            <Icon name={more ? "chevronUp" : "plus"} size={13} />
            {t("home.more")}
          </button>
        </div>
      )}

      {more && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {extra.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => go(item)}
              style={{ "--ac": item.color } as React.CSSProperties}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] border border-white/[0.06]
                         bg-white/[0.025] hover:border-[var(--ac)]/45 hover:bg-[var(--ac)]/[0.07] transition-all"
            >
              <span
                className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}22`, color: item.color }}
              >
                <Icon name={item.icon} size={14} />
              </span>
              <span className="text-[12.5px] text-white/62 truncate">{t(item.labelKey)}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .menu-card{animation:mg-in .26s ease-out both}
        @keyframes mg-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .menu-card-pressed{animation:mg-press .18s ease-out}
        @keyframes mg-press{0%{transform:scale(1)}55%{transform:scale(1.06)}100%{transform:scale(.98)}}
        @media (prefers-reduced-motion: reduce){
          .menu-card,.menu-card-pressed{animation:none}
        }
      `}</style>
    </div>
  );
}
