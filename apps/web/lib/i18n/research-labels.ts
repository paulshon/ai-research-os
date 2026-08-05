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
  // v16: 추가 카테고리 3종 — 디지털/철학/학제간
  "🔷 디지털·계산 연구형": "research.catDigital",
  "🟠 철학·해석형": "research.catPhilosophy",
  "⚫ 학제간·미래형": "research.catInterdisciplinary",
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
  // v16: 추가 유형 10종
  dh: "research.typeDh",
  ds: "research.typeDs",
  na: "research.typeNa",
  sim: "research.typeSim",
  phil: "research.typePhil",
  herm: "research.typeHerm",
  phen: "research.typePhen",
  conv: "research.typeConv",
  fut: "research.typeFut",
  dbr: "research.typeDbr",
};

// v48: 챕터 번호가 아니라 "정규 섹션 제목"으로 현지화한다.
// (ca/pa/ar/er 등 7장 구조 유형이 CH.06/CH.07을 모두 '결론'으로 잘못 덮어써
//  결론이 2번 표시되던 문제 해결 — 번호 기반 매핑 제거)
const KO_TITLE_TO_KEY: Record<string, string> = {
  "서론": "structure.chIntro",
  "이론적 배경": "structure.chTheory",
  "연구방법": "structure.chMethod",
  "연구 방법": "structure.chMethod",
  "연구결과": "structure.chResults",
  "연구 결과": "structure.chResults",
  "논의": "structure.chDiscussion",
  "결론": "structure.chConclusion",
};

function koHead(title: string): string {
  // "서론 (Introduction)" → "서론"
  return title.split(" (")[0].trim();
}

function applyTitle(ch: Chapter, t: (k: string) => string): string {
  const key = KO_TITLE_TO_KEY[koHead(ch.title)];
  if (key) return t(key);
  return ch.title; // 정규 섹션이 아니면 작성된 제목(고유 구조)을 그대로 유지
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
  // 한국어: 작성된 제목이 정본 → 번호/제목 덮어쓰기 없이 그대로 사용
  if (locale === "ko") return ch;

  const override = getChapterOverride(locale, thesisType, ch.num);
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
  // 오버라이드가 없으면 정규 섹션만 번역, 고유 제목은 유지
  return { ...ch, title: applyTitle(ch, t) };
}

export function localizeChapters(
  chapters: Chapter[],
  thesisType: string,
  locale: Locale,
  t: (k: string) => string
) {
  return chapters.map((ch) => localizeChapter(ch, thesisType, locale, t));
}
