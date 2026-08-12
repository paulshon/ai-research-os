"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import MenuGrid from "@/components/dashboard/menu-grid";
import { RESEARCH_FLOW_ITEMS } from "@/components/dashboard/sidebar-items";
import { usePermissions } from "@/hooks/use-permissions";

/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 대기 화면 (S0)
   ove-7 · 모바일 — 전체메뉴 축소 + 오브(크기 유지)가 한 화면에 들어가도록 조정
   ove-9 · 모바일 — 슬롯을 세로로 늘려 캡션을 오브 아래에 두고 겹침을 없앰
   ══════════════════════════════════════════════════════════════════════ */

export default function HomeStandbyPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const hintLine = useMemo(
    () =>
      RESEARCH_FLOW_ITEMS.filter((e) => can(e.perm))
        .map((e) => t(e.labelKey))
        .join(" · "),
    [can, t],
  );

  return (
    <div className="w-full px-4 sm:px-6 pb-4 max-[767px]:px-2.5 max-[767px]:pb-0">
      <div
        className="mx-auto w-full max-w-[920px] flex flex-col items-center justify-center
          max-[767px]:justify-start max-[767px]:pt-0
          md:min-h-[calc(100dvh-300px)]"
      >
        <MenuGrid standbyMobile />

        <div className="mt-10 max-[767px]:mt-2.5 text-center px-2 max-w-[720px]">
          <p
            className={`text-[14px] sm:text-[15px] text-white/38 leading-relaxed transition-opacity duration-500 max-[767px]:text-[11px] max-[767px]:leading-snug max-[767px]:line-clamp-2 ${
              ready ? "opacity-100" : "opacity-0"
            }`}
            style={{ letterSpacing: "0.02em" }}
          >
            {hintLine}
          </p>
          <p className="mt-2 max-[767px]:mt-1 text-[19px] sm:text-[22px] max-[767px]:text-[15px] font-bold text-[#e8eaf0]">
            {t("home.hintQuestion")}
          </p>
        </div>

        <div className="mt-7 max-[767px]:mt-2 flex flex-col items-center w-full">
          <div
            data-orb-slot
            aria-hidden
            className="w-[176px] h-[176px] sm:w-[184px] sm:h-[184px] max-[767px]:w-[128px] max-[767px]:h-[176px]"
          />
          {/* ove-9 · 캡션은 슬롯 하단에 포함. 탭바만 피하면 됨 */}
          <div
            className="h-[44px] max-[767px]:h-[calc(var(--imm-tabbar,62px)+env(safe-area-inset-bottom,0px)+8px)]"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
