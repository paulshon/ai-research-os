import type { Locale } from "../types";
import {
  researchChapterContent as enContent,
  type ChapterContentOverride,
} from "./en";
import { researchChapterContent as zhContent } from "./zh";

export type { ChapterContentOverride };

const CONTENT_BY_LOCALE: Partial<Record<Locale, Record<string, ChapterContentOverride>>> = {
  en: enContent,
  zh: zhContent,
};

export function getChapterOverride(
  locale: Locale | string,
  thesisType: string,
  num: string
): ChapterContentOverride | undefined {
  const key = `${thesisType}.${num}`;
  const map = CONTENT_BY_LOCALE[locale as Locale];
  return map?.[key];
}
