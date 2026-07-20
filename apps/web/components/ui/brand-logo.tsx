/* brand-logo.tsx (v54)
 * 브랜드 로고 마크 — 펜촉(R) 로고를 보라 그라데이션 타일 위에 표시.
 * 데스크탑/태블릿/모바일/마케팅 전 영역에서 동일한 브랜드 마크로 사용한다.
 * 에셋: /images/logo.png (흰색 펜촉, 투명 배경). 앱 아이콘(favicon/apple/PWA)은
 * app/icon.png · app/apple-icon.png · manifest 아이콘으로 별도 제공된다. */
export function BrandLogo({
  size = 36,
  radius = 11,
  tile = true,
  className = "",
}: {
  size?: number;
  radius?: number;
  tile?: boolean;
  className?: string;
}) {
  if (!tile) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src="/images/logo.png"
        alt="AI Research OS"
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain", display: "block" }}
      />
    );
  }
  return (
    <span
      className={className}
      aria-label="AI Research OS"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "linear-gradient(135deg,#6c8cff,#a78bfa)",
        boxShadow: "0 4px 14px rgba(108,140,255,0.35)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt=""
        style={{ width: "68%", height: "68%", objectFit: "contain", display: "block" }}
      />
    </span>
  );
}
