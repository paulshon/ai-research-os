import type { ReactNode } from "react";
import { ProgressBar } from "@/components/ui/progress";
import { LinkButton } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icons";

/**
 * AI 출력의 근거를 표시하는 카드.
 * 근거 없는 AI 출력은 화면에 올리지 않는다(규칙 R7).
 */
export function EvidenceCard({
  title,
  body,
  source,
}: {
  title: ReactNode;
  body: ReactNode;
  source?: ReactNode;
}) {
  return (
    <div className="evid">
      <b>{title}</b>
      <p>{body}</p>
      {source ? <div className="src">{source}</div> : null}
    </div>
  );
}

/**
 * 신뢰도 게이지.
 *  value ≥ 70 → ok / 40–69 → warn / <40 → danger
 *  40 미만이면 "채택 비권장" 문구를 자동으로 렌더한다.
 */
export function ConfidenceMeter({
  value,
  reason,
}: {
  value: number;
  /** 신뢰도 계산 근거 — 반드시 설명한다. */
  reason: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const tone = pct >= 70 ? "ok" : pct >= 40 ? "warn" : "danger";
  return (
    <div>
      <div className="conf">
        <ProgressBar value={pct} tone={tone} label="신뢰도" />
        <span className="fs-cap mono" style={{ color: `var(--${tone})`, fontWeight: 700 }}>
          {pct}%
        </span>
      </div>
      <p className="hint mt2">{reason}</p>
      {pct < 40 ? (
        <p className="fs-cap mt2" style={{ color: "var(--danger)", fontWeight: 700 }}>
          채택 비권장 — 근거가 부족하거나 원문과 일치하지 않습니다.
        </p>
      ) : null}
    </div>
  );
}

export type NextStep = { href: string; label: string; icon?: IconName };

/** 다음 단계 링크 목록. 각 링크는 목적지가 있는 버튼이다. */
export function NextStepLinks({ items }: { items: readonly NextStep[] }) {
  if (!items.length) return null;
  return (
    <div className="col" style={{ gap: 8 }}>
      {items.map((it) => (
        <LinkButton key={it.href} href={it.href} size="sm" className="justify-start">
          {it.icon ? <Icon name={it.icon} size={14} /> : null}
          {it.label}
          <span className="sp" />
          <Icon name="arrow" size={13} />
        </LinkButton>
      ))}
    </div>
  );
}
