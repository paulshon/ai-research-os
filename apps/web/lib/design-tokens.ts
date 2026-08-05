/**
 * 디자인 토큰의 원시값.
 *
 * 색을 글자 그대로 적어도 되는 곳은 두 곳뿐이다:
 *   1) app/globals.css 의 :root 블록
 *   2) 이 파일 — CSS 를 읽지 못하는 외부 SDK(Clerk 등)에 값을 넘겨야 할 때
 * 컴포넌트 코드(app/, components/)에서는 var(--…) 또는 토큰 클래스만 쓴다.
 *
 * 두 곳의 값은 반드시 같아야 한다. scripts/verify-tokens.ts 가 이를 검사한다.
 */
export const TOKENS = {
  bg0: "#04060e",
  bg1: "#080c18",
  bg2: "#0d1324",
  t1: "#eef1f8",
  t2: "#aab4ca",
  t3: "#7f8aa3",
  trackR: "#6d8dff",
  trackR2: "#a78bfa",
  trackD: "#3ecfb2",
  trackD2: "#4fd1c5",
  ok: "#3ecfb2",
  warn: "#e8b84b",
  danger: "#ff7066",
  info: "#6d8dff",
  white: "#ffffff",
} as const;

/** 배경 #04060e 기준 실측 대비 (WCAG 2.1 상대휘도). scripts/verify-contrast.ts 가 재계산한다. */
export const CONTRAST_ON_BG0 = {
  t1: 17.9,
  t2: 9.73,
  t3: 5.85,
  accent: 6.65,
  ok: 10.38,
  warn: 10.98,
  danger: 7.48,
} as const;
