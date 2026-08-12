"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";
import { type MethodType } from "@/lib/method/registry";
import { localizeMethodCategories } from "@/lib/i18n/method-labels";

/* ══════════════════════════════════════════════════════════════
   s-renew-14 · 연구방법 카탈로그
   골격만 있던 주제분석·근거이론을 걷어내고 실제 엔진 2종만 남겼다.
   카드가 2장뿐이므로 작은 타일을 나열하는 대신, 각 엔진의 전체
   워크플로우를 펼쳐 보여주는 큰 카드 2장 구성으로 바꿨다.
   ══════════════════════════════════════════════════════════════ */

function EngineCard({ type, index }: { type: MethodType; index: number }) {
  const { t } = useTranslation();

  return (
    <Link
      href={`/method/${type.id}`}
      /* s-renew-17: 두 카드 높이를 맞추기 위해 세로 플렉스로 만들고 CTA 를 아래에 고정한다 */
      className="group relative flex h-full flex-col rounded-2xl border border-white/[0.07] bg-[#12151d]
                 p-5 md:p-6 transition-all hover:border-white/[0.16] hover:-translate-y-0.5
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.04), inset 0 0 0 1px ${type.color}12` }}
    >
      {/* 상단 광원 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl opacity-70"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, ${type.color}1f, transparent 70%)` }}
      />

      <div className="relative flex items-start gap-3.5 mb-3">
        <span
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: type.color + "22", color: type.color }}
        >
          <Icon name="method" size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[17px] md:text-[18px] font-extrabold text-[#e9ecf3] leading-tight">
              {type.name}
            </h3>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-bold tracking-[.04em]"
              style={{ color: type.color, background: type.color + "1f" }}
            >
              {t("pages.method.available")}
            </span>
          </span>
          {type.en && (
            <span className="block text-[12.5px] text-white/32 mt-0.5 truncate">{type.en}</span>
          )}
        </span>
        <span
          className="hidden md:flex text-[11px] font-bold tabular-nums text-white/25 tracking-[.1em] pt-1"
          aria-hidden
        >
          0{index + 1}
        </span>
      </div>

      <p className="relative text-[14px] text-white/48 leading-[1.75] mb-4">{type.summary}</p>

      {/* 워크플로우 — 전 단계 노출 (남는 높이를 흡수해 두 카드 바닥을 맞춘다) */}
      <div className="relative mb-4 flex-1">
        <p className="text-[11.5px] font-bold tracking-[.12em] uppercase text-white/25 mb-2">
          {type.steps.length} STEP
        </p>
        <ol className="flex flex-wrap gap-1.5">
          {type.steps.map((s, i) => (
            <li
              key={s.key}
              className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-lg
                         bg-white/[0.035] text-white/45 border border-white/[0.05]"
              title={s.desc}
            >
              <span className="tabular-nums text-white/25">{i + 1}</span>
              <Icon name={s.icon} size={11} />
              <span className="whitespace-nowrap">{s.label.replace(/^\d+\.\s*/, "")}</span>
            </li>
          ))}
        </ol>
      </div>

      <span
        className="relative mt-auto inline-flex w-fit items-center gap-1.5 h-9 px-4 rounded-xl text-[13.5px] font-bold
                   transition-transform group-hover:translate-x-0.5"
        style={{ color: type.color, background: type.color + "18", border: `1px solid ${type.color}2e` }}
      >
        {t("pages.method.open")} <Icon name="arrowRight" size={14} />
      </span>
    </Link>
  );
}

export default function MethodLandingPage() {
  const { t } = useTranslation();
  const categories = useMemo(() => localizeMethodCategories(t), [t]);

  /* 카테고리를 평탄화해 실행 가능한 엔진만 모은다. */
  const engines = useMemo(
    () =>
      categories.flatMap((c) =>
        c.types.filter((ty) => ty.status === "available").map((ty) => ({ ty, cat: c.cat })),
      ),
    [categories],
  );

  return (
    <div className="flex flex-col font-nanum-gothic h-full overflow-y-auto">
      {/* s-renew-17: 자체 max-w-5xl + mx-auto 를 걷어내 위쪽 히어로와 좌측을 앞맞춤한다.
          좌우 패딩도 셸(px-4 sm:px-5 md:px-6)과 같은 값을 쓴다. */}
      <div className="w-full px-4 sm:px-5 md:px-6 py-4 md:py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-[15px] text-white/30">
          <Icon name="method" size={15} className="text-[#3ecfb2]" />
          <span>AI Tools</span>
          <span className="text-white/10">|</span>
          <span>{t("pages.method.catalog")}</span>
        </div>

        <div className="mb-5">
          <h2 className="text-[16px] font-extrabold font-nanum-myeongjo mb-1 flex items-center gap-2">
            <Link
              href="/admin"
              className="hover:opacity-70 transition-opacity"
              title={t("methodPage.adminPage")}
            >
              <Icon name="method" className="inline-flex align-[-0.125em]" size={18} />
            </Link>
            {t("pages.method.title")}
          </h2>
          <p className="text-[14px] text-white/30">{t("pages.method.desc")}</p>
        </div>

        {/* 확장 안내 */}
        <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-[#3ecfb2]/[0.06] border border-[#3ecfb2]/15">
          <Icon name="idea" size={16} className="text-[#3ecfb2] mt-0.5 flex-shrink-0" />
          <p className="text-[14px] text-white/50 leading-relaxed">{t("pages.method.addHint")}</p>
        </div>

        {/* 엔진 2종 — 큰 카드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {engines.map(({ ty, cat }, i) => (
            <div key={ty.id} className="flex h-full flex-col gap-2">
              <p className="text-[13px] text-white/28">{cat}</p>
              <EngineCard type={ty} index={i} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
