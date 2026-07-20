/**
 * APA CKG taxonomy labels (KO / EN / ZH) — source labels in apa-engine are Korean.
 */
import type { Locale } from "@/lib/i18n/types";
import { FAMILIES, type RefFamily, type RefType } from "@/lib/citation/apa-engine";

const FAMILY: Record<Locale, Record<string, string>> = {
  ko: {
    periodical: "정기간행물", book: "단행본", chapter: "도서 챕터", conference: "학술대회",
    thesis: "학위논문", report: "보고서", dataset: "데이터셋", software: "소프트웨어",
    web: "웹", social: "소셜미디어", video: "영상", audio: "오디오", legal: "법률",
    ai: "AI 생성물", personal: "개인교신",
  },
  en: {
    periodical: "Periodicals", book: "Books", chapter: "Book Chapters", conference: "Conferences",
    thesis: "Theses & Dissertations", report: "Reports", dataset: "Datasets", software: "Software",
    web: "Web", social: "Social Media", video: "Video", audio: "Audio", legal: "Legal",
    ai: "AI-Generated", personal: "Personal Communication",
  },
  zh: {
    periodical: "期刊", book: "图书", chapter: "图书章节", conference: "学术会议",
    thesis: "学位论文", report: "报告", dataset: "数据集", software: "软件",
    web: "网页", social: "社交媒体", video: "视频", audio: "音频", legal: "法律文献",
    ai: "AI生成内容", personal: "个人通讯",
  },
};

const TYPE: Record<Locale, Record<string, string>> = {
  ko: {
    "journal-article": "학술지 논문", "review-article": "리뷰 논문", editorial: "사설/논평",
    preprint: "프리프린트", "magazine-article": "잡지 기사", "newspaper-article": "신문 기사",
    book: "단행본", "edited-book": "편저(편집본)", ebook: "전자책", "translated-book": "번역서",
    "book-chapter": "편집본 챕터", "conference-paper": "학회 발표", "conference-proceeding": "학회 프로시딩",
    dissertation: "박사 학위논문", "masters-thesis": "석사 학위논문", report: "보고서", "gov-report": "정부 보고서",
    dataset: "데이터셋", software: "소프트웨어", "mobile-app": "모바일 앱", webpage: "웹페이지", "blog-post": "블로그 글",
    tweet: "X(트위터)", instagram: "인스타그램", facebook: "페이스북", linkedin: "링크드인",
    youtube: "유튜브", ted: "TED", film: "영화", podcast: "팟캐스트", music: "음원",
    statute: "법령/Act", case: "판례", constitution: "헌법", treaty: "조약/규정",
    "ai-generated": "생성형 AI", "personal-communication": "개인교신(이메일/인터뷰)",
  },
  en: {
    "journal-article": "Journal article", "review-article": "Review article", editorial: "Editorial",
    preprint: "Preprint", "magazine-article": "Magazine article", "newspaper-article": "Newspaper article",
    book: "Book", "edited-book": "Edited book", ebook: "E-book", "translated-book": "Translated book",
    "book-chapter": "Book chapter", "conference-paper": "Conference paper", "conference-proceeding": "Conference proceeding",
    dissertation: "Doctoral dissertation", "masters-thesis": "Master's thesis", report: "Report", "gov-report": "Government report",
    dataset: "Dataset", software: "Software", "mobile-app": "Mobile app", webpage: "Webpage", "blog-post": "Blog post",
    tweet: "X (Twitter)", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
    youtube: "YouTube", ted: "TED", film: "Film", podcast: "Podcast", music: "Song",
    statute: "Statute/Act", case: "Legal case", constitution: "Constitution", treaty: "Treaty/Regulation",
    "ai-generated": "Generative AI", "personal-communication": "Personal communication",
  },
  zh: {
    "journal-article": "期刊论文", "review-article": "综述论文", editorial: "社论/评论",
    preprint: "预印本", "magazine-article": "杂志文章", "newspaper-article": "报纸文章",
    book: "图书", "edited-book": "编著", ebook: "电子书", "translated-book": "译著",
    "book-chapter": "图书章节", "conference-paper": "会议论文", "conference-proceeding": "会议论文集",
    dissertation: "博士论文", "masters-thesis": "硕士论文", report: "报告", "gov-report": "政府报告",
    dataset: "数据集", software: "软件", "mobile-app": "移动应用", webpage: "网页", "blog-post": "博客文章",
    tweet: "X(推特)", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
    youtube: "YouTube", ted: "TED", film: "电影", podcast: "播客", music: "音乐",
    statute: "法规", case: "判例", constitution: "宪法", treaty: "条约/规章",
    "ai-generated": "生成式AI", "personal-communication": "个人通讯",
  },
};

function locFamilyLabel(key: string, locale: Locale, fallback: string): string {
  return FAMILY[locale][key] ?? fallback;
}

function locTypeLabel(code: string, locale: Locale, fallback: string): string {
  return TYPE[locale][code] ?? fallback;
}

export function localizeRefType(type: RefType, locale: Locale): RefType {
  return { ...type, label: locTypeLabel(type.code, locale, type.label) };
}

export function localizeRefFamily(family: RefFamily, locale: Locale): RefFamily {
  return {
    ...family,
    label: locFamilyLabel(family.key, locale, family.label),
    types: family.types.map((ty) => localizeRefType(ty, locale)),
  };
}

export function localizeFamilies(locale: Locale): RefFamily[] {
  return FAMILIES.map((f) => localizeRefFamily(f, locale));
}

export function localizedTypeLabel(code: string, locale: Locale): string {
  const raw = FAMILIES.flatMap((f) => f.types).find((ty) => ty.code === code);
  return raw ? locTypeLabel(code, locale, raw.label) : code;
}
