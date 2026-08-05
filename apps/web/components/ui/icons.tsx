import type { SVGProps } from "react";

/**
 * 인라인 SVG 아이콘 세트.
 * 24px 그리드 · stroke-width 1.6 · linecap/linejoin round.
 *
 * 이모지를 아이콘으로 쓰지 않는다(규칙 R5). 이모지는 OS·브라우저마다
 * 모양과 크기가 달라 정렬이 무너지고 학술 도구의 톤과도 맞지 않는다.
 */
const PATHS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5h6a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H4z" />
      <path d="M20 4.5h-6a3 3 0 0 0-3 3V20a2.5 2.5 0 0 1 2.5-2.5H20z" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 3 7.5l9 4.5 9-4.5z" />
      <path d="M3 12.5 12 17l9-4.5" />
      <path d="M3 17 12 21.5 21 17" />
    </>
  ),
  beaker: (
    <>
      <path d="M9 3v6.5L4.5 18A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-3L15 9.5V3" />
      <path d="M8 3h8" />
      <path d="M6.8 14.5h10.4" />
    </>
  ),
  pen: (
    <>
      <path d="M15.5 4.5 19.5 8.5 8 20H4v-4z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v6c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.6 5.6 2.9 2.9" />
      <path d="m15.5 15.5 2.9 2.9" />
      <path d="m18.4 5.6-2.9 2.9" />
      <path d="m8.5 15.5-2.9 2.9" />
    </>
  ),
  quote: (
    <>
      <path d="M4 15V9.5A2.5 2.5 0 0 1 6.5 7H9v5.5A4.5 4.5 0 0 1 4.5 17" />
      <path d="M14 15V9.5A2.5 2.5 0 0 1 16.5 7H19v5.5A4.5 4.5 0 0 1 14.5 17" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12.5V4.5h8l9.5 9.5a1.8 1.8 0 0 1 0 2.5l-5.5 5.5a1.8 1.8 0 0 1-2.5 0z" />
      <circle cx="7.5" cy="8.5" r="1.4" />
    </>
  ),
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  grad: (
    <>
      <path d="M2.5 8.5 12 4l9.5 4.5L12 13z" />
      <path d="M6.5 10.7V16c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-5.3" />
      <path d="M21.5 8.5v5.5" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 5h11l-1.8 3.5L16 12H5z" />
    </>
  ),
  chat: <path d="M20.5 12.5c0 4-3.8 7-8.5 7-1.2 0-2.4-.2-3.4-.6L3.5 20.5l1.6-4A6.7 6.7 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7.5z" />,
  brain: (
    <>
      <path d="M9.5 4A3 3 0 0 0 6.6 7.6 3 3 0 0 0 5.2 12a3 3 0 0 0 1.4 4.4A3 3 0 0 0 9.5 20h2.5V4z" />
      <path d="M14.5 4a3 3 0 0 1 2.9 3.6A3 3 0 0 1 18.8 12a3 3 0 0 1-1.4 4.4A3 3 0 0 1 14.5 20H12" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H14a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8h5.5" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="m8.5 10.5-3-7.5h13l-3 7.5" />
      <path d="m12 13 .9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.1 15.2l2-.3z" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  arrow: (
    <>
      <path d="M5 12h13" />
      <path d="m12.5 5.5 6.5 6.5-6.5 6.5" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H6" />
      <path d="m11.5 5.5-6.5 6.5 6.5 6.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 22 20.5H2z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.6" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  caret: <path d="m6 9.5 6 6 6-6" />,
  list: (
    <>
      <path d="M8.5 6h12M8.5 12h12M8.5 18h12" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 16v3.5h16V16" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12" />
      <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
      <path d="M4 16v3.5h16V16" />
    </>
  ),
  undo: (
    <>
      <path d="M4 9h11a5 5 0 0 1 0 10h-4" />
      <path d="m8 5-4 4 4 4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </>
  ),
  filter: <path d="M3.5 5.5h17l-6.5 7.5v6l-4 2v-8z" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-13.7-4.6L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 13.7 4.6L20 15.5" />
      <path d="M20 20v-4.5h-4.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 17,
  label,
  ...rest
}: { name: IconName; size?: number; label?: string } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];
