"use client";

/* ══════════════════════════════════════════════════════════════
   s-renew-12 · Atmosphere
   앰비언트 광원(blur orb) 3개 + 미세 그리드 + 그레인 텍스처.
   accent 가 바뀌면 세 광원의 색이 1.1s 에 걸쳐 함께 물든다.
   position:fixed / pointer-events:none 이라 레이아웃·클릭에 무해하다.
   ══════════════════════════════════════════════════════════════ */

export default function AmbientBackground({ accent }: { accent: string }) {
  const orb = (alpha: string) => ({
    background: `radial-gradient(circle, ${accent}${alpha}, transparent 70%)`,
  });
  return (
    <div className="imm-ambient" aria-hidden>
      <div className="imm-orb imm-orb-a" style={orb("cc")} />
      <div className="imm-orb imm-orb-b" style={orb("66")} />
      <div className="imm-orb imm-orb-c" style={orb("55")} />
      <div className="imm-grid" />
      <div className="imm-grain" />
    </div>
  );
}
