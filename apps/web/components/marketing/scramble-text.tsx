"use client";

/* ════════════════════════════════════════════════════════════════
   DesignMe 스타일 시그니처 — 문자 스크램블/셔플 텍스트 (v37 안정화)
   주의: 한글 등 비라틴 텍스트는 라틴 글리프로 치환하면 깨져 보이므로,
   원문 글자가 라틴/숫자가 아닐 경우 셔플 글리프도 동일 문자군에서 고른다.
   또한 항상 원문으로 수렴하도록 effect/타이머 생명주기를 엄격히 관리한다.
═══════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { ElementType } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const isLatin = (ch: string) => /[A-Za-z0-9]/.test(ch);

export function ScrambleText({
  text,
  className = "",
  trigger = "view",
  as: Tag = "span",
  speed = 32,
}: {
  text: string;
  className?: string;
  trigger?: "view" | "hover" | "mount";
  as?: ElementType;
  speed?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(text);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ranFor = useRef<string | null>(null);

  const clear = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const run = () => {
    clear();
    // 한글이 섞인 경우 셔플은 라틴 글자에만 적용하고 비라틴 원문은 그대로 둔다.
    if (reduce) {
      setDisplay(text);
      return;
    }
    const chars = Array.from(text);
    let revealed = 0;
    timer.current = setInterval(() => {
      revealed += 1;
      const out = chars
        .map((ch, i) => {
          if (ch === " " || !isLatin(ch)) return ch; // 공백/한글 등은 원문 유지
          if (i < revealed) return ch;
          return LATIN[Math.floor(Math.random() * LATIN.length)];
        })
        .join("");
      setDisplay(out);
      if (revealed >= chars.length) {
        setDisplay(text); // 항상 원문으로 수렴
        clear();
      }
    }, speed);
  };

  // 텍스트가 바뀌면(언어 전환 등) 즉시 원문으로 리셋하고 가드 해제
  useEffect(() => {
    setDisplay(text);
    ranFor.current = null;
    clear();
    if (trigger === "mount") {
      ranFor.current = text;
      run();
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (trigger === "view" && inView && ranFor.current !== text) {
      ranFor.current = text;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, inView, text]);

  const hoverProps =
    trigger === "hover" ? { onMouseEnter: () => run() } : {};

  return (
    <Tag ref={ref as never} className={className} {...hoverProps}>
      {display}
    </Tag>
  );
}
