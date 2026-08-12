"use client";

import { Icon } from "@/components/ui/icon";

/* ══════════════════════════════════════════════════════════════
   s-renew-12 · Hero 진입
   각 메뉴가 큰 명조체 카피 + 핵심 수치로 시작해, 도구가 아니라
   하나의 장면으로 들어오는 느낌을 만든다.
   - title 의 "\n" 은 줄바꿈으로 렌더된다.
   - right 슬롯에 EXPERT 버튼 / BackChip 을 꽂는다.
   ══════════════════════════════════════════════════════════════ */

export interface HeroMetric {
  /** 큰 수치 — 예: "34" */
  value: string;
  /** 수치 뒤 단위 — 예: "종" (없으면 생략) */
  unit?: string;
  /** 아래 라벨 — 예: "연구 유형" */
  label: string;
}

export default function PageHero({
  icon,
  eyebrow,
  step,
  title,
  lead,
  metrics = [],
  right,
  compact = false,
}: {
  icon: string;
  eyebrow: string;
  step?: string;
  title: string;
  lead: string;
  metrics?: HeroMetric[];
  right?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      /* s-renew-16: 모바일에서 여백·글자가 커서 카드가 화면을 꽉 채웠다. 한 단계씩 줄인다. */
      className={`imm-hero imm-glass imm-fade ${
        compact ? "px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-7" : "px-4 py-5 sm:px-5 sm:py-7 md:px-8 md:py-9"
      } mb-4 sm:mb-5 md:mb-7`}
    >
      <div className="imm-hero-glow" />
      <div className="imm-hero-edge" />

      {/* 상단 — 배지 + EXPERT/Back */}
      <div className="relative z-[1] flex items-start justify-between gap-3 mb-4 md:mb-5 flex-wrap">
        <div
          className="inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--imm-ac) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--imm-ac) 30%, transparent)",
          }}
        >
          <span
            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "color-mix(in srgb, var(--imm-ac) 26%, transparent)",
              color: "var(--imm-ac)",
            }}
          >
            <Icon name={icon} size={15} />
          </span>
          <span
            className="text-[12.5px] font-extrabold tracking-[.02em] whitespace-nowrap"
            style={{ color: "var(--imm-ac)" }}
          >
            {eyebrow}
          </span>
          {step && (
            <span className="text-[11.5px] text-white/35 tabular-nums whitespace-nowrap">{step}</span>
          )}
        </div>
        {right}
      </div>

      {/* 카피 */}
      <h1
        className={`relative z-[1] font-nanum-myeongjo font-extrabold tracking-[-.02em] leading-[1.18] mb-3 ${
          compact
            ? "text-[22px] sm:text-[24px] md:text-[28px]"
            : "text-[23px] sm:text-[26px] md:text-[36px]"
        }`}
      >
        {title.split("\n").map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </h1>
      <p className="relative z-[1] text-[14.5px] sm:text-[15px] md:text-[16.5px] text-white/60 leading-[1.65] sm:leading-[1.7] max-w-[600px]">
        {lead}
      </p>

      {/* 핵심 수치 */}
      {metrics.length > 0 && (
        <div className="relative z-[1] flex flex-wrap gap-x-5 sm:gap-x-7 gap-y-2.5 sm:gap-y-3 mt-4 sm:mt-5 md:mt-6">
          {metrics.map((m, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="font-nanum-myeongjo text-[18px] sm:text-[19px] md:text-[21px] font-extrabold leading-none">
                {m.value}
                {m.unit && <span className="text-[12px] font-normal text-white/40"> {m.unit}</span>}
              </div>
              <div className="text-[11.5px] sm:text-[12px] text-white/40">{m.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
