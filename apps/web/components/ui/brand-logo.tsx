/* ══════════════════════════════════════════════════════════════════════
   brand-logo.tsx — Studium R (s-renew-12)
   브랜드 심볼 = 브라스 라운드 스퀘어 위의 세리프 R.
   · 심볼   : <BrandLogo />            — 사이드바·앱바·아바타 자리
   · 워드마크: <BrandWordmark />        — "Studium R" 로고타입
   · 락업   : <BrandLockup />          — 심볼 + 워드마크
   에셋: /brand/appicon_brass.svg · /brand/logo_wordmark_{dark,light}.svg
   규정: R 은 반드시 브라스(#E0A73E), 가로 늘이기·그림자·외곽선 금지.
   ══════════════════════════════════════════════════════════════════════ */

export const BRAND = {
  name: "Studium R",
  stem: "Studium",
  mark: "R",
  tagline: "학술연구 운영체제",
  taglineEn: "Academic Research OS",
  midnight: "#0E1626",
  charcoal: "#1B1E23",
  black: "#0A0A0B",
  paper: "#F4F1EA",
  brass: "#E0A73E",
  brassDeep: "#B8842A",
  mute: "#7C8698",
} as const;

export function BrandLogo({
  size = 36,
  radius,
  tile = true,
  className = "",
}: {
  size?: number;
  radius?: number;
  tile?: boolean;
  className?: string;
}) {
  const r = radius ?? Math.round(size * 0.235); // 브랜드 규정 곡률
  if (!tile) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src="/brand/appicon_brass.svg"
        alt={BRAND.name}
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain", display: "block", borderRadius: r }}
      />
    );
  }
  return (
    <span
      className={className}
      aria-label={BRAND.name}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: `linear-gradient(145deg, ${BRAND.brass}, ${BRAND.brassDeep})`,
        boxShadow: `0 4px 14px rgba(224,167,62,.34)`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        overflow: "hidden",
        color: BRAND.midnight,
        fontFamily: "'NanumMyeongjo', Palatino, 'Times New Roman', serif",
        fontWeight: 700,
        fontSize: size * 0.58,
        lineHeight: 1,
        letterSpacing: 0,
        userSelect: "none",
      }}
    >
      {BRAND.mark}
    </span>
  );
}

/** "Studium R" 로고타입 — R 만 브라스 액센트. */
export function BrandWordmark({
  size = 17,
  className = "",
  tone = "paper",
}: {
  size?: number;
  className?: string;
  tone?: "paper" | "ink" | "mono";
}) {
  const ink = tone === "ink" ? BRAND.midnight : tone === "mono" ? "currentColor" : BRAND.paper;
  const accent = tone === "mono" ? "currentColor" : BRAND.brass;
  return (
    <span
      className={className}
      aria-label={BRAND.name}
      style={{
        fontFamily: "'NanumMyeongjo', Palatino, 'Times New Roman', serif",
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.15,
        letterSpacing: ".014em",
        color: ink,
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {BRAND.stem}
      <span style={{ color: accent, marginLeft: ".15em" }}>{BRAND.mark}</span>
    </span>
  );
}

/** 심볼 + 워드마크 락업. */
export function BrandLockup({
  size = 34,
  wordSize = 17,
  className = "",
  showTagline = false,
}: {
  size?: number;
  wordSize?: number;
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      <BrandLogo size={size} />
      <span className="min-w-0 leading-tight">
        <BrandWordmark size={wordSize} />
        {showTagline && (
          <span
            className="block truncate"
            style={{ fontSize: wordSize * 0.5, color: BRAND.mute, letterSpacing: ".02em" }}
          >
            {BRAND.tagline} · {BRAND.taglineEn}
          </span>
        )}
      </span>
    </span>
  );
}
