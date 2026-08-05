"use client";

/* ════════════════════════════════════════════════════════════
   v62: AI Research OS — 인트로 스플래시 (임팩트 제거 버전)
   시퀀스:
   ① 로고와 그 아래 글자들이 "페이드인"으로 부드럽게 나타난다 (임팩트 없음).
   ② "로고만" glow 로 로고 전체가 scale + glow 를 동기화한 lub-dub 키프레임으로
      "심장처럼 천천히 3박" 박동한다.
   ③ 한 줄의 선이 origin-left + scaleX 0→1 로 "왼쪽 → 오른쪽" 그어진 뒤
      전체 페이드아웃 → 랜딩페이지로 전환.
   에셋: /images/logo.png (펜촉 로고). 반응형 + prefers-reduced-motion 지원.
═══════════════════════════════════════════════════════════════ */

import { motion, useAnimate, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

const ACCENT = "#8B5CF6";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;
    let done = false;
    const finish = () => {
      if (done || cancelled) return;
      done = true;
      onCompleteRef.current();
    };

    const run = async () => {
      try {
        const root = scope.current as HTMLElement | null;
        const logo = root?.querySelector(".logo-container") as HTMLElement | null;
        const text = root?.querySelector(".text-group") as HTMLElement | null;
        const line = root?.querySelector(".reveal-line") as HTMLElement | null;

        if (reduce) {
          if (logo) await animate(logo, { opacity: [0, 1], scale: [0.9, 1] }, { duration: 0.5 });
          if (text) await animate(text, { opacity: [0, 1] }, { duration: 0.4 });
          if (line) await animate(line, { opacity: 1, scaleX: [0, 1] }, { duration: 0.5 });
          await delay(700);
        } else {
          // ① 페이드인 — 로고와 텍스트가 부드럽게 나타난다 (임팩트 없음).
          await Promise.all([
            logo
              ? animate(
                  logo,
                  { opacity: [0, 1], scale: [0.92, 1], filter: ["blur(6px)", "blur(0px)"] },
                  { duration: 0.95, ease: "easeOut" }
                )
              : Promise.resolve(),
            text
              ? animate(text, { opacity: [0, 1], y: [12, 0] }, { duration: 1.05, delay: 0.18, ease: "easeOut" })
              : Promise.resolve(),
          ]);

          // ② 로고만 "심장 박동(heartbeat)" — scale + glow(boxShadow) 동기, lub-dub × 3박, 느리게.
          if (logo)
            await animate(
              logo,
              {
                scale: [1, 1.085, 1.0, 1.05, 1],
                boxShadow: [
                  `0 0 20px ${ACCENT}44`,
                  `0 0 64px ${ACCENT}ee`,
                  `0 0 28px ${ACCENT}77`,
                  `0 0 50px ${ACCENT}cc`,
                  `0 0 22px ${ACCENT}55`,
                ],
              },
              {
                duration: 1.3,
                ease: "easeInOut",
                repeat: 2, // 총 3박
                times: [0, 0.16, 0.4, 0.56, 1],
              }
            );

          // ③ 선이 왼쪽 → 오른쪽으로 그어진다 (origin-left + scaleX 0→1)
          if (line) {
            await animate(line, { opacity: 1 }, { duration: 0.2 });
            await animate(line, { scaleX: [0, 1] }, { duration: 0.95, ease: [0.22, 1, 0.36, 1] });
          }
          await delay(480);
        }

        if (cancelled) return;
        // 전체 페이드아웃 → 랜딩페이지 노출
        if (root) await animate(root, { opacity: 0 }, { duration: 0.8, ease: "easeInOut" });
      } catch {
        /* 애니메이션 실패 시에도 랜딩으로 진입 */
      } finally {
        finish();
      }
    };

    const startTimer = setTimeout(run, 250);
    // 안전장치: 어떤 이유로든 시퀀스가 끝나지 않아도 최대 9초 후 반드시 랜딩 진입
    const safety = setTimeout(finish, 9000);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      ref={scope}
      className="fixed inset-0 z-[60] bg-black overflow-hidden flex items-center justify-center"
      style={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 밤하늘 별 배경 */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] bg-[length:46px_46px]" />

      {/* ① 로고 + 텍스트 (페이드인) + ② 심장박동 + ③ 라인 */}
      <div className="relative z-10 flex flex-col items-center px-6">
        <div className="logo-container relative rounded-[26px] opacity-0" style={{ willChange: "transform, opacity, filter, box-shadow" }}>
          <div
            className="absolute inset-0 -z-10 rounded-[36px] blur-2xl opacity-70"
            style={{ background: "radial-gradient(circle, #8B5CF6aa, transparent 70%)" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="AI Research OS"
            className="relative w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.6)]"
            draggable={false}
          />
        </div>

        <div className="text-group mt-6 text-center opacity-0">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight font-nanum-myeongjo leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-[#9CA3AF]">AI Research </span>
            <span className="text-[#e8b84b]">OS</span>
          </h1>
          <p className="mt-3 text-[11px] md:text-[13px] tracking-[0.22em] uppercase text-white/35 font-mono">
            ai research operating system
          </p>
        </div>

        {/* ③ 왼쪽 → 오른쪽으로 그어지는 라인 */}
        <div
          className="reveal-line mt-7 h-[2px] w-[min(460px,74vw)] origin-left opacity-0"
          style={{
            transform: "scaleX(0)",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.7) 16%, rgba(232,184,75,0.95) 55%, rgba(255,255,255,0.9) 100%)",
            boxShadow: "0 0 14px rgba(139,92,246,0.5)",
          }}
        />
      </div>
    </motion.div>
  );
}

/** 스플래시 게이트 — 마운트 시 한 번 표시 후 onDone()으로 랜딩 노출 */
export function SplashGate({ show, onDone }: { show: boolean; onDone: () => void }) {
  return (
    <AnimatePresence>
      {show && <SplashScreen key="splash" onComplete={onDone} />}
    </AnimatePresence>
  );
}
