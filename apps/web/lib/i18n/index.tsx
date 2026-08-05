"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ko } from "./locales/ko";
import { en } from "./locales/en";
import { zh } from "./locales/zh";
import { koPages } from "./locales/ko-pages";
import { enPages } from "./locales/en-pages";
import { zhPages } from "./locales/zh-pages";
import { koRdos } from "./locales/ko-rdos";
import { enRdos } from "./locales/en-rdos";
import { zhRdos } from "./locales/zh-rdos";
import { koDash2 } from "./locales/ko-dash2";
import { enDash2 } from "./locales/en-dash2";
import { zhDash2 } from "./locales/zh-dash2";
import { koAuth } from "./locales/ko-auth";
import { enAuth } from "./locales/en-auth";
import { zhAuth } from "./locales/zh-auth";
import { koDash3 } from "./locales/ko-dash3";
import { enDash3 } from "./locales/en-dash3";
import { zhDash3 } from "./locales/zh-dash3";
import { koMarketing2 } from "./locales/ko-marketing2";
import { enMarketing2 } from "./locales/en-marketing2";
import { zhMarketing2 } from "./locales/zh-marketing2";
import type { Locale, TranslationDict } from "./types";

const LOCALE_KEY = "aros:locale";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Shallow merge at root; deep-merge nested plain objects (e.g. landing, plans). */
function mergeLocale<T extends object, P extends object>(base: T, pages: P): T & P {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(pages) as (keyof P)[]) {
    const baseVal = result[key as string];
    const pageVal = pages[key];
    if (isPlainObject(baseVal) && isPlainObject(pageVal)) {
      result[key as string] = { ...baseVal, ...pageVal };
    } else {
      result[key as string] = pageVal;
    }
  }
  return result as T & P;
}

/** Fold multiple dicts left-to-right with mergeLocale (each pass deep-merges nested objects). */
function mergeAll(base: object, ...rest: object[]): object {
  return rest.reduce((acc, d) => mergeLocale(acc, d), base);
}

const LOCALES: Record<Locale, TranslationDict> = {
  ko: mergeAll(ko, koPages, koRdos, koDash2, koAuth, koDash3, koMarketing2) as TranslationDict,
  en: mergeAll(en, enPages, enRdos, enDash2, enAuth, enDash3, enMarketing2) as TranslationDict,
  zh: mergeAll(zh, zhPages, zhRdos, zhDash2, zhAuth, zhDash3, zhMarketing2) as TranslationDict,
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dict: TranslationDict;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getNested(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (stored && LOCALES[stored]) setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
    document.documentElement.lang = l === "zh" ? "zh-CN" : l;
  }, []);

  const dict = LOCALES[locale];
  const t = useCallback(
    (key: string) => getNested(dict as unknown as Record<string, unknown>, key),
    [dict]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "ko" as Locale,
      setLocale: () => {},
      t: (key: string) => getNested(ko as unknown as Record<string, unknown>, key),
      dict: ko,
    };
  }
  return ctx;
}

export { type Locale };
