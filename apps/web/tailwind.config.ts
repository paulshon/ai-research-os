import type { Config } from "tailwindcss";

/**
 * 디자인 토큰 연결 — app/globals.css 의 CSS 변수가 유일한 정본이다.
 * 여기서는 그 변수를 Tailwind 이름으로 노출만 한다. 값을 새로 정의하지 않는다.
 *
 * 규칙:
 *  R1 색상 리터럴(#rrggbb)을 컴포넌트 코드에 쓰지 않는다 → 아래 토큰 클래스를 쓴다.
 *  R2 임의 폰트 크기(text-[13.5px])를 쓰지 않는다 → cap/sm/md/lg/xl/2xl 6단계만 쓴다.
 *  R3 폰트는 gothic / myeongjo 두 가지뿐이다. 폴백을 추가하지 않는다.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg0: "var(--bg-0)",
        bg1: "var(--bg-1)",
        bg2: "var(--bg-2)",
        glass1: "var(--glass-1)",
        glass2: "var(--glass-2)",
        glass3: "var(--glass-3)",
        stroke: { DEFAULT: "var(--stroke)", 2: "var(--stroke-2)" },
        hairline: "var(--hairline)",
        t1: "var(--t1)",
        t2: "var(--t2)",
        t3: "var(--t3)",
        accent: { DEFAULT: "var(--accent)", 2: "var(--accent-2)" },
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        info: "var(--info)",
        /* 레거시 이름 — 개편 범위 밖(마케팅·인증·관리자) 화면이 참조한다.
           전부 새 토큰을 가리키므로 색 종류는 늘어나지 않는다. */
        bg: { DEFAULT: "var(--bg-0)", 2: "var(--bg-1)", 3: "var(--bg-2)", 4: "var(--glass-2)" },
        surface: "var(--bg-1)",
        gold: "var(--warn)",
        teal: "var(--ok)",
        coral: "var(--danger)",
        research: {
          purple: "var(--track-r-2)",
          green: "var(--ok)",
          amber: "var(--warn)",
          blue: "var(--track-r)",
          pink: "var(--track-r-2)",
        },
      },
      fontSize: {
        cap: ["var(--fs-cap)", { lineHeight: "var(--lh-cap)" }],
        sm: ["var(--fs-sm)", { lineHeight: "var(--lh-sm)" }],
        md: ["var(--fs-md)", { lineHeight: "var(--lh-md)" }],
        lg: ["var(--fs-lg)", { lineHeight: "var(--lh-lg)" }],
        xl: ["var(--fs-xl)", { lineHeight: "var(--lh-xl)" }],
        "2xl": ["var(--fs-2xl)", { lineHeight: "var(--lh-2xl)" }],
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        full: "var(--r-full)",
      },
      spacing: {
        1: "var(--s1)",
        2: "var(--s2)",
        3: "var(--s3)",
        4: "var(--s4)",
        5: "var(--s5)",
        6: "var(--s6)",
        8: "var(--s8)",
        10: "var(--s10)",
      },
      fontFamily: {
        gothic: ["NanumGothic"],
        myeongjo: ["NanumMyeongjo"],
        /* 레거시 이름 — 개편 범위 밖 화면이 참조한다. 신규 코드에서는 쓰지 않는다. */
        "nanum-gothic": ["NanumGothic"],
        "nanum-myeongjo": ["NanumMyeongjo"],
        body: ["NanumGothic"],
        serif: ["NanumMyeongjo"],
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.28s cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
