"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import AmbientBackground from "./ambient-background";
import PageHero, { type HeroMetric } from "./page-hero";
import { ExpertButton, BackChip } from "./expert-button";
import { useAccent } from "./accent-provider";
import type { PageMeta } from "@/lib/immersive/page-meta";
import { DEFAULT_ACCENT } from "@/lib/immersive/page-meta";
import { useTranslation } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════
   s-renew-13 · 몰입 프레임
   라우트 메타를 받아 Atmosphere 색조를 갱신하고 Hero 를 렌더한다.
   문구는 전부 i18n(`hero.<id>.*`)에서 오므로 KO/EN/ZH 전환에 따라간다.
   EXPERT 화면(meta.hero === false)은 큰 프레임 대신 얇은 복귀 바만 둔다.
   ══════════════════════════════════════════════════════════════ */

export function AmbientLayer({ meta }: { meta: PageMeta | null }) {
  const { accent, setAccent } = useAccent();
  const target = meta?.accent ?? DEFAULT_ACCENT;

  useEffect(() => {
    setAccent(target);
  }, [target, setAccent]);

  return <AmbientBackground accent={accent} />;
}

export function HeroLayer({
  meta,
  totalSteps = 8,
  compact = false,
}: {
  meta: PageMeta | null;
  totalSteps?: number;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (!meta) return null;

  /* s-renew-13: EXPERT 화면은 큰 프레임 설명 없이 얇은 복귀 바만 */
  if (!meta.hero) {
    if (!meta.backTo) return null;
    const label = t(`expert.${meta.backTo.key}.back`);
    const suffix = t("expert.backSuffix");
    return (
      <div key={pathname} className="imm-fade flex items-center gap-3 mb-3 md:mb-4">
        <BackChip href={meta.backTo.href} label={`${label}${suffix}`} />
        <span className="text-[13px] text-white/25 truncate">
          {t(`expert.${meta.backTo.key}.name`)}
        </span>
      </div>
    );
  }

  /* 히어로 메트릭 — 값이 비어 있으면 표시하지 않는다 */
  const metrics: HeroMetric[] = (["m1", "m2", "m3"] as const)
    .map((k) => ({
      value: t(`hero.${meta.id}.${k}v`),
      unit: t(`hero.${meta.id}.${k}u`),
      label: t(`hero.${meta.id}.${k}l`),
    }))
    .filter((m) => m.value && !m.value.startsWith("hero."));

  const right = meta.expert ? (
    <ExpertButton href={meta.expert.href} engineName={t(`expert.${meta.expert.key}.name`)} />
  ) : null;

  return (
    <PageHero
      key={pathname}
      icon={meta.icon}
      eyebrow={t(`hero.${meta.id}.eyebrow`)}
      step={meta.step ? `STEP ${meta.step} / ${totalSteps}` : undefined}
      title={t(`hero.${meta.id}.title`)}
      lead={t(`hero.${meta.id}.lead`)}
      metrics={metrics}
      right={right}
      compact={compact}
    />
  );
}
