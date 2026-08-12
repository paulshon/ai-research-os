import type { Locale } from "./types";

const LANG: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  zh: "简体中文",
};

export function aiResponseLanguage(locale: Locale): string {
  return LANG[locale] ?? LANG.ko;
}

export function structureSystemPrompt(locale: Locale, typeName: string): string {
  const lang = aiResponseLanguage(locale);
  if (locale === "ko") {
    return `당신은 ${typeName} 논문 구조 설계 전문가입니다. ${lang}로 답변하세요.`;
  }
  if (locale === "zh") {
    return `你是${typeName}论文结构设计专家。请用${lang}回答。`;
  }
  return `You are a thesis structure design expert for ${typeName} papers. Respond in ${lang}.`;
}

export function structureChapterPrompt(
  locale: Locale,
  typeName: string,
  ch: { title: string; question: string; macro: string }
): string {
  if (locale === "ko") {
    return `논문 유형: ${typeName}\n챕터: ${ch.title}\n핵심 질문: ${ch.question}\n거시 구조: ${ch.macro}\n\n이 챕터를 어떻게 작성해야 하는지 구체적으로 안내해 주세요.`;
  }
  if (locale === "zh") {
    return `论文类型：${typeName}\n章节：${ch.title}\n核心问题：${ch.question}\n宏观结构：${ch.macro}\n\n请具体说明如何撰写本章。`;
  }
  return `Thesis type: ${typeName}\nChapter: ${ch.title}\nCore question: ${ch.question}\nMacro structure: ${ch.macro}\n\nProvide concrete guidance on how to write this chapter.`;
}

export function editorSystemPrompt(
  locale: Locale,
  typeName: string,
  chapterTitle: string
): string {
  const lang = aiResponseLanguage(locale);
  if (locale === "ko") {
    return `당신은 ${typeName} 논문의 "${chapterTitle}" 챕터 작성 전문가입니다. 학술적 문체로 ${lang} 답변하세요.`;
  }
  if (locale === "zh") {
    return `你是${typeName}论文“${chapterTitle}”章节写作专家。请用学术文体以${lang}回答。`;
  }
  return `You are an expert writer for the "${chapterTitle}" chapter of a ${typeName} thesis. Respond in academic style in ${lang}.`;
}

export function editorUserPrompt(locale: Locale, sectionName: string): string {
  if (locale === "ko") {
    return `"${sectionName}" 부분의 내용을 학술적 문체로 작성해 주세요. 3-5문단으로 구성하고, 각 문단을 줄바꿈으로 구분하세요.`;
  }
  if (locale === "zh") {
    return `请用学术文体撰写“${sectionName}”部分，3-5段，段间换行分隔。`;
  }
  return `Write the "${sectionName}" section in academic style. Use 3-5 paragraphs separated by line breaks.`;
}

export function critiqueAnalyzeSystemPrompt(locale: Locale): string {
  if (locale === "ko") {
    return (
      `당신은 논문 크리틱 전문가입니다. 반드시 JSON 배열만 반환 (다른 텍스트 없음): ` +
      `[{"type":"logic|evidence|concept|style|structure","text":"원문 발췌(50자 이내)","note":"구체적 크리틱","page":페이지번호}]`
    );
  }
  if (locale === "zh") {
    return (
      `你是论文批评专家。仅返回 JSON 数组：` +
      `[{"type":"logic|evidence|concept|style|structure","text":"原文摘录(50字内)","note":"具体批评","page":页码}]`
    );
  }
  return (
    `You are a paper critique expert. Return ONLY a JSON array: ` +
    `[{"type":"logic|evidence|concept|style|structure","text":"excerpt (max 50 chars)","note":"specific critique","page":pageNumber}]`
  );
}

export function critiqueAnalyzeUserPrompt(locale: Locale, analysisText: string): string {
  if (locale === "ko") return `논문 분석 후 크리틱 카드 3~6개:\n\n${analysisText}`;
  if (locale === "zh") return `分析论文后生成3-6条批评卡片：\n\n${analysisText}`;
  return `After analyzing the paper, produce 3-6 critique cards:\n\n${analysisText}`;
}

export function advisorSystemPrompt(
  locale: Locale,
  advisor: { name: string; type: string; traits: string[] }
): string {
  const lang = aiResponseLanguage(locale);
  if (locale === "ko") {
    return `당신은 ${advisor.name}입니다. ${advisor.type} 전문가로서, ${advisor.traits.join(", ")}를 중시합니다. 엄격하지만 건설적인 피드백을 ${lang}로 제공합니다.`;
  }
  if (locale === "zh") {
    return `你是${advisor.name}，${advisor.type}专家，重视${advisor.traits.join("、")}。请用${lang}提供严格而建设性的反馈。`;
  }
  return `You are ${advisor.name}, a ${advisor.type} expert who values ${advisor.traits.join(", ")}. Give rigorous, constructive feedback in ${lang}.`;
}

export function apiKeyMissingMessage(locale: Locale): string {
  if (locale === "ko") return "⚠️ 설정에서 API 키를 입력하세요.";
  if (locale === "zh") return "⚠️ 请在设置中输入 API 密钥。";
  return "⚠️ Enter your API key in Settings.";
}

export function genericErrorMessage(locale: Locale): string {
  if (locale === "ko") return "오류 발생";
  if (locale === "zh") return "发生错误";
  return "An error occurred";
}
