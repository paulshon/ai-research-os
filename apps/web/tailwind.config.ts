import type { Config } from "tailwindcss";

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
        bg: { DEFAULT: "#0d0f14", 2: "#13161e", 3: "#1a1e2a", 4: "#222637" },
        surface: "#1e2230",
        accent: { DEFAULT: "#6c8cff", 2: "#4a6cf7" },
        gold: "#e8b84b",
        teal: "#3ecfb2",
        coral: "#ff7066",
        research: {
          purple: "#a78bfa",
          green: "#5ebd7c",
          amber: "#f59e0b",
          blue: "#60a5fa",
          pink: "#f472b6",
        },
      },
      fontFamily: {
        "nanum-gothic": ["'NanumGothic'", "'IBM Plex Sans KR'", "sans-serif"],
        "nanum-myeongjo": ["'NanumMyeongjo'", "'Noto Serif KR'", "serif"],
        body: ["'NanumGothic'", "'IBM Plex Sans KR'", "sans-serif"],
        serif: ["'NanumMyeongjo'", "'Noto Serif KR'", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Clash Display'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "14px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.6s ease-out",
        "float": "float 6s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(108,140,255,0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(108,140,255,0.3)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
