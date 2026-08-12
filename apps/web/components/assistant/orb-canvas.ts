"use client";

/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 오브 캔버스 렌더러
   research-assistant.tsx 에서 분리했다. 그림 로직은 그대로 유지한다.
   ══════════════════════════════════════════════════════════════════════ */

export type OrbState = "idle" | "listening" | "typing" | "answering";

/* ══════════════════ 캔버스 : 오브(3D 픽셀 별자리) ══════════════════ */
export function mountOrb(
  cv: HTMLCanvasElement | null,
  stateRef: { current: OrbState },
  levelRef?: { current: number },
) {
  if (!cv) return;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const DPR = window.devicePixelRatio || 1;
  const N = 15;
  const P: { x: number; y: number; z: number; ph: number }[] = [];
  for (let i = 0; i < N; i++) {
    const k = i + 0.5;
    const phi = Math.acos(1 - (2 * k) / N);
    const th = Math.PI * (1 + Math.sqrt(5)) * k;
    P.push({ x: Math.cos(th) * Math.sin(phi), y: Math.sin(th) * Math.sin(phi), z: Math.cos(phi), ph: Math.random() * 6.28 });
  }
  const pairs: [number, number][] = [];
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++)
      if (Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y, P[i].z - P[j].z) < 0.95) pairs.push([i, j]);
  const RING: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    RING.push({ x: Math.cos(a), y: -Math.sin(a) * Math.sin(0.46), z: Math.sin(a) * Math.cos(0.46) });
  }
  let W = 176, H = 176, raf = 0, t = 0, yaw = 0, smoothLvl = 0;
  const size = () => {
    const b = cv.getBoundingClientRect();
    W = b.width || 176;
    H = b.height || 176;
    cv.width = W * DPR;
    cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  size();
  window.addEventListener("resize", size);
  const snap = (v: number) => Math.round(v * DPR) / DPR;
  const U = 1 / DPR;

  const frame = () => {
    t += 0.016;
    const listen = stateRef.current === "listening";
    const rawLvl = Math.max(0, Math.min(1, levelRef?.current ?? 0));
    smoothLvl += (rawLvl - smoothLvl) * 0.22;
    yaw += listen ? 0.02 : 0.0058;
    const pit = -0.26 + Math.sin(t * 0.5) * 0.05;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = W * 0.32, F = 3.2;

    /* ove-4: 점선 경계 링 — 음성 레벨 펄스의 상한 */
    const boundR = W * 0.46;
    ctx.save();
    ctx.setLineDash([Math.max(2, U * 3), Math.max(3, U * 5)]);
    ctx.lineWidth = Math.max(1, U * 1.2);
    ctx.strokeStyle = listen
      ? `rgba(180,210,255,${0.55 + 0.35 * smoothLvl})`
      : "rgba(150,180,230,.28)";
    ctx.beginPath();
    ctx.arc(cx, cy, boundR, 0, 6.29);
    ctx.stroke();
    ctx.restore();

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.5);
    core.addColorStop(0, "rgba(130,165,255,.38)");
    core.addColorStop(0.5, "rgba(108,140,255,.14)");
    core.addColorStop(1, "rgba(108,140,255,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, W * 0.5, 0, 6.29);
    ctx.fill();
    const br = listen ? 1.06 + 0.05 * Math.sin(t * 7) : 1 + 0.02 * Math.sin(t * 1.5);
    const cyy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
    const pj = (px: number, py: number, pz: number, sc: number) => {
      const x = px * cyy - pz * sy;
      let z = px * sy + pz * cyy;
      const y = py * cp - z * sp;
      z = py * sp + z * cp;
      const s = (F / (F - z)) * sc;
      return { X: cx + x * R * s, Y: cy + y * R * s, z };
    };
    const ring = (back: boolean) => {
      ctx.lineWidth = Math.max(U * 1.4, 1);
      const spin = t * 0.12;
      for (let i = 0; i < RING.length - 1; i++) {
        const A = RING[i], B = RING[i + 1];
        const a = pj(A.x * Math.cos(spin) - A.z * Math.sin(spin), A.y, A.x * Math.sin(spin) + A.z * Math.cos(spin), br);
        const b = pj(B.x * Math.cos(spin) - B.z * Math.sin(spin), B.y, B.x * Math.sin(spin) + B.z * Math.cos(spin), br);
        const dep = (a.z + b.z) / 2;
        if (back ? dep >= 0 : dep < 0) continue;
        ctx.strokeStyle = `rgba(200,220,255,${0.78 * (back ? 0.45 : 1)})`;
        ctx.beginPath();
        ctx.moveTo(a.X, a.Y);
        ctx.lineTo(b.X, b.Y);
        ctx.stroke();
      }
    };
    ring(true);
    const pr = P.map((p) => pj(p.x, p.y, p.z, br * (listen ? 1 + 0.09 * Math.sin(t * 8 + p.ph) : 1)));
    ctx.lineWidth = U * 2.2;
    for (const [i, j] of pairs) {
      const dep = (pr[i].z + pr[j].z) / 2;
      ctx.strokeStyle = `rgba(200,222,255,${1 * (0.35 + 0.65 * ((dep + 1) / 2))})`;
      ctx.beginPath();
      ctx.moveTo(snap(pr[i].X), snap(pr[i].Y));
      ctx.lineTo(snap(pr[j].X), snap(pr[j].Y));
      ctx.stroke();
    }
    [...pr].sort((a, b) => a.z - b.z).forEach((p) => {
      const d = (p.z + 1) / 2;
      const s = (d > 0.62 ? 3.4 : d > 0.3 ? 2.3 : 1.3) * Math.max(1, U);
      ctx.fillStyle = `rgba(236,244,255,${0.5 + 0.5 * Math.pow(d, 1.2)})`;
      ctx.fillRect(snap(p.X - s / 2), snap(p.Y - s / 2), s, s);
    });
    ring(false);

    /* ove-5: 중심점 — 인식 활성(listening) 또는 웨이크 청취 레벨에 따라 점선 경계까지 */
    const active = listen || smoothLvl > 0.04;
    const basePulse = active ? 3.4 + Math.sin(t * 8) * 0.7 : 2.2 + Math.sin(t * 1.6) * 0.45;
    const maxPulse = boundR * 0.98;
    const pulse = Math.min(maxPulse, Math.max(basePulse, basePulse + smoothLvl * (maxPulse - basePulse)));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse);
    g.addColorStop(0, `rgba(236,244,255,${0.95})`);
    g.addColorStop(0.4, `rgba(160,190,255,${0.4 + 0.45 * smoothLvl})`);
    g.addColorStop(1, "rgba(188,208,255,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, 6.29);
    ctx.fillStyle = g;
    ctx.fill();
    const coreR = 2.4 + smoothLvl * (boundR * 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(coreR, boundR * 0.35), 0, 6.29);
    ctx.fillStyle = `rgba(255,255,255,${0.88 + 0.12 * smoothLvl})`;
    ctx.fill();
    /* 빨간 가이드 점 (첨부 그림의 중심 표시) */
    if (active && smoothLvl > 0.02) {
      ctx.beginPath();
      ctx.arc(cx, cy, 1.6 + smoothLvl * 2.2, 0, 6.29);
      ctx.fillStyle = `rgba(255,90,90,${0.55 + 0.4 * smoothLvl})`;
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  };
  frame();
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", size);
  };
}

/* ══════ 캔버스 : 패널 배경(성좌 → 모니터로 수렴하며 소멸) ══════ */
export function mountField(
  cv: HTMLCanvasElement | null,
  monRef: { current: HTMLDivElement | null },
  stateRef: { current: OrbState },
) {
  if (!cv) return;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const DPR = window.devicePixelRatio || 1;
  const N = 34;
  const pts = Array.from({ length: N }, (_, i) => ({
    a: (i / N) * Math.PI * 2 + Math.random() * 0.4,
    base: 22 + Math.random() * 66,
    sp: (Math.random() - 0.5) * 0.0065,
    sz: 0.85 + Math.random() * 1.5,
    ox: (Math.random() - 0.5) * 22,
    oy: (Math.random() - 0.5) * 16,
    r: 0, x: 0, y: 0, tx: 0, ty: 0,
  }));
  pts.forEach((p) => (p.r = p.base));
  let W = 340, H = 452, raf = 0, t = 0, m = 0;
  const size = () => {
    const b = cv.getBoundingClientRect();
    W = b.width || 340;
    H = b.height || 452;
    cv.width = W * DPR;
    cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  size();
  window.addEventListener("resize", size);
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  const frame = () => {
    t += 0.016;
    const st = stateRef.current;
    const termMode = st === "typing" || st === "answering";
    m += ((termMode ? 1 : 0) - m) * 0.055;
    const e = ease(Math.max(0, Math.min(1, m)));
    const cx = W / 2, cy = H / 2 - 4;
    const listen = st === "listening", think = st === "answering";
    const speed = think ? 3.4 : listen ? 2.1 : 1;

    let mx = cx, my = cy;
    const el = monRef.current;
    if (el) {
      const cb = cv.getBoundingClientRect(), eb = el.getBoundingClientRect();
      if (eb.width > 4) {
        mx = eb.left - cb.left + eb.width / 2;
        my = eb.top - cb.top + eb.height * 0.42;
      }
    }
    pts.forEach((p) => {
      p.tx = mx + p.ox;
      p.ty = my + p.oy;
    });

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8);
    g.addColorStop(0, "rgb(16,24,42)");
    g.addColorStop(1, "rgb(7,10,17)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    pts.forEach((p, i) => {
      let tg = p.base;
      if (listen) tg = p.base * (1.55 + 0.34 * Math.sin(t * 6 + i));
      if (think) tg = p.base * (0.46 + 0.06 * Math.sin(t * 3 + i * 0.5));
      p.r += (tg - p.r) * 0.07;
      p.a += p.sp * speed;
      const ox = cx + Math.cos(p.a) * p.r, oy = cy + Math.sin(p.a) * p.r * 0.72;
      p.x = ox + (p.tx - ox) * e;
      p.y = oy + (p.ty - oy) * e;
    });

    const fade = Math.pow(1 - e, 1.6);
    if (fade > 0.02) {
      ctx.lineWidth = 0.75;
      for (let i = 0; i < N; i++)
        for (let j = i + 1; j < N; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 56) {
            ctx.strokeStyle = `rgba(125,160,235,${0.3 * (1 - d / 56) * fade})`;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.sz * (0.4 + 0.6 * fade), 0, 6.29);
        ctx.fillStyle = `rgba(188,208,255,${fade})`;
        ctx.fill();
      });
    }
    raf = requestAnimationFrame(frame);
  };
  frame();
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", size);
  };
}
