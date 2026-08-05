"use client";

/* ════════════════════════════════════════════════════════════
   v27: 테마 시스템 — 3가지 다크 테마
   - midnight (퍼플-블랙) / charcoal (웜 차콜) / black (순수 블랙)
   - <html data-theme="..."> 속성으로 CSS 토큰 전환
   - localStorage 영속화
═══════════════════════════════════════════════════════════════ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "midnight" | "charcoal" | "black";

const THEME_KEY = "aros:theme";
const THEMES: Theme[] = ["midnight", "charcoal", "black"];
const DEFAULT_THEME: Theme = "midnight";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  // 세 테마 모두 다크 계열 → Tailwind 'dark' variant 유지
  root.classList.add("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  // 초기 로드: localStorage → 기본값
  useEffect(() => {
    let initial: Theme = DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored && THEMES.includes(stored)) initial = stored;
    } catch {
      /* ignore */
    }
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEMES.indexOf(prev);
      const next = THEMES[(idx + 1) % THEMES.length];
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: DEFAULT_THEME, setTheme: () => {}, cycleTheme: () => {} };
  }
  return ctx;
}

/** SSR 깜빡임 방지용 인라인 스크립트 (head에 삽입) */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('${THEME_KEY}');
    if (t !== 'midnight' && t !== 'charcoal' && t !== 'black') { t = '${DEFAULT_THEME}'; }
    var r = document.documentElement;
    r.setAttribute('data-theme', t);
    r.classList.add('dark');
  } catch(e){}
})();
`;
