import type { Chapter } from "@/lib/research-data";
import { THESIS_CATEGORIES } from "@/lib/research-data";
import type { Locale } from "./types";
import { getChapterOverride } from "./research-content";

const CAT_KEYS: Record<string, string> = {
  "🔵 실증 연구형": "research.catEmpirical",
  "🟩 문헌 검토형": "research.catLiterature",
  "🟣 이론 개발형": "research.catTheory",
  "🟡 응용·실천형": "research.catApplied",
  "🔴 방법론 개발형": "research.catMethods",
  "🌿 비교·역사형": "research.catComparative",
};

const TYPE_KEYS: Record<string, string> = {
  quant: "research.typeQuant",
  qual: "research.typeQual",
  mixed: "research.typeMixed",
  exp: "research.typeExp",
  sr: "research.typeSr",
  meta: "research.typeMeta",
  nr: "research.typeNr",
  scr: "research.typeScr",
  gt: "research.typeGt",
  dtt: "research.typeDtt",
  ct: "research.typeCt",
  ca: "research.typeCa",
  pa: "research.typePa",
  ar: "research.typeAr",
  er: "research.typeEr",
  cs: "research.typeCs",
  id: "research.typeId",
  sv: "research.typeSv",
  algo: "research.typeAlgo",
  fw: "research.typeFw",
  comp: "research.typeComp",
  hist: "research.typeHist",
  da: "research.typeDa",
  bio: "research.typeBio",
};

const CH_NUM_TITLE: Record<string, string> = {
  "CH.01": "structure.chIntro",
  "CH.02": "structure.chTheory",
  "CH.03": "structure.chMethod",
  "CH.04": "structure.chResults",
  "CH.05": "structure.chDiscussion",
  "CH.06": "structure.chConclusion",
  "CH.07": "structure.chConclusion",
};

function applyTitle(ch: Chapter, t: (k: string) => string): string {
  const key = CH_NUM_TITLE[ch.num];
  if (key) return t(key);
  return ch.title;
}

export function localizeCategories(t: (k: string) => string) {
  return THESIS_CATEGORIES.map((cat) => ({
    ...cat,
    cat: CAT_KEYS[cat.cat] ? t(CAT_KEYS[cat.cat]) : cat.cat,
    types: cat.types.map((ty) => ({
      ...ty,
      name: TYPE_KEYS[ty.id] ? t(TYPE_KEYS[ty.id]) : ty.name,
    })),
  }));
}

export function localizeChapter(
  ch: Chapter,
  thesisType: string,
  locale: Locale,
  t: (k: string) => string
): Chapter {
  const override = locale !== "ko" ? getChapterOverride(locale, thesisType, ch.num) : undefined;
  if (override) {
    return {
      ...ch,
      title: override.title ?? applyTitle(ch, t),
      desc: override.desc ?? ch.desc,
      question: override.question ?? ch.question,
      macro: override.macro ?? ch.macro,
      micro: override.micro ?? ch.micro,
      goodPatterns: override.goodPatterns ?? ch.goodPatterns,
      badPatterns: override.badPatterns ?? ch.badPatterns,
    };
  }
  const key = CH_NUM_TITLE[ch.num];
  if (!key) return ch;
  return { ...ch, title: t(key) };
}

export function localizeChapters(
  chapters: Chapter[],
  thesisType: string,
  locale: Locale,
  t: (k: string) => string
) {
  return chapters.map((ch) => localizeChapter(ch, thesisType, locale, t));
}
