import { cn } from "@/lib/utils";

/* 그라디언트 정의는 모든 게이지가 동일하므로 문서 전체에서 하나만 있으면 된다. */
const GRAD_ID = "gauge-grad";

/**
 * SVG 원형 게이지.
 * 수치를 문장으로 읽어 주기 위해 role="img" + aria-label 을 붙인다.
 */
export function Gauge({
  value,
  size = 112,
  stroke = 9,
  label,
  unit = "%",
  className,
}: {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  unit?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const gid = GRAD_ID;
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div
      className={cn("gauge", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} ${pct}${unit === "%" ? "퍼센트" : unit}`}
    >
      <svg width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={`url(#${gid})`}
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="gv" aria-hidden="true">
        <b>
          {pct}
          <span style={{ fontSize: "var(--fs-md)" }}>{unit}</span>
        </b>
        <span>{label}</span>
      </div>
    </div>
  );
}
