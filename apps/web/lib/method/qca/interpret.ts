/**
 * interpret.ts — result interpretation + paper-writing engine.
 * Faithful port of core/interpret.py. Offline templates always run; an optional
 * AI refiner (Gemini/etc.) may polish the same data-grounded draft. Sections:
 * methodology, results, discussion, conclusion.
 */
import type { QcaProject } from "./project";
import * as cat from "./category";
import * as net from "./network";
import * as freq from "./frequency";

function facts(project: QcaProject) {
  return {
    summary: freq.summary(project),
    categories: project.categories(),
    metas: cat.metaCategorySummary(project),
    themes: project.themes(),
    top_words: freq.wordFrequency(project, 10),
    kmetrics: net.metrics(project, "keyword"),
    cmetrics: net.metrics(project, "code"),
  };
}

export function methodologyText(project: QcaProject): string {
  const name = project.get_meta("name", "본 연구");
  const rq = project.get_meta("research_question", "");
  const nDoc = project.documents().length;
  const nSent = project.sentence_count();
  const nCode = project.codes().length;
  const rqLine = rq ? ` 연구문제는 다음과 같다: ${rq}` : "";
  return (
    `본 연구는 질적 내용분석(Qualitative Content Analysis)을 적용하여 ` +
    `'${name}' 관련 텍스트를 분석하였다.${rqLine} 자료는 총 ${nDoc}개 문서, ` +
    `${nSent}개 분석단위(문장)로 구성되었다. 분석은 Krippendorff(2018) 및 ` +
    `Schreier(2012)의 절차에 따라 코드북(Codebook)을 구성하고, 각 코드에 대해 ` +
    `조작적 정의·지표 키워드·포함/제외 기준·판정규칙을 명시하였다. 코드북은 총 ` +
    `${nCode}개 코드로 구성되었으며, 코딩은 (1) 지표 키워드에 기반한 규칙기반 코딩과 ` +
    `(2) 문장-코드 의미 유사도에 기반한 의미기반 코딩을 결합한 하이브리드 방식으로 ` +
    `수행하였다. 각 배정에는 신뢰도 점수를 부여하였고, 모호 사례는 연구자 검토 ` +
    `단계(Human Review)를 거쳐 승인·거부·재코딩하였다.`
  );
}

export function resultsText(project: QcaProject): string {
  const f = facts(project);
  const s = f.summary;
  const lines: string[] = [];
  lines.push(
    `분석 대상 말뭉치는 ${s.sentences}개 문장, 총 ${s.tokens}개 토큰, ` +
      `고유어휘 ${s.vocabulary}개로 구성되었다(문장당 평균 ` +
      `${s.avg_tokens_per_sentence}개 토큰).`
  );
  if (f.top_words.length) {
    const tw = f.top_words.slice(0, 8).map(([w, n]) => `${w}(${n})`).join(", ");
    lines.push(`빈도분석 결과 상위 출현어는 ${tw} 순으로 나타났다.`);
  }
  if (f.categories.length) {
    const top = f.categories[0];
    const ranked = f.categories.slice(0, 6).map((c) => `${c.name}(${c.freq}건)`).join(", ");
    lines.push(
      `코드북 기반 자동코딩 결과, 범주별 빈도는 ${ranked} 순이었으며, ` +
        `'${top.name}' 범주가 가장 높은 빈도를 보였다.`
    );
  }
  if (f.metas.length) {
    const metaLine = f.metas.map((m) => `${m.meta}(${m.freq}건)`).join(", ");
    lines.push(`이를 상위범주로 집계하면 ${metaLine}로 조직되었다.`);
  }
  if (f.themes.length) {
    const tnames = f.themes.map((t) => t.name).join(", ");
    lines.push(`범주 간 관계를 검토하여 ${tnames}의 상위 주제(담론)를 도출하였다.`);
  }
  const km = f.kmetrics;
  if (km.nodes) {
    const deg = km.degree.slice(0, 5).map(([n]) => n).join(", ");
    const modline =
      km.modularity !== null
        ? ` 모듈성(modularity)은 ${km.modularity}로 ${km.communities}개 커뮤니티가 식별되었다.`
        : "";
    lines.push(
      `키워드 네트워크는 ${km.nodes}개 노드와 ${km.edges}개 링크로 구성되었으며, ` +
        `연결중심성이 높은 핵심어는 ${deg} 등으로 나타났다.${modline}`
    );
  }
  return lines.join(" ");
}

export function discussionText(project: QcaProject): string {
  const f = facts(project);
  const themes = f.themes.map((t) => t.name);
  const themeLine = themes.length ? themes.join(", ") : "도출된 주제들";
  return (
    `분석 결과는 대상 담론이 ${themeLine}을 중심으로 구조화됨을 보여준다. ` +
    `이는 텍스트가 단일 차원이 아니라 기술·문화·공간의 복합적 층위에서 의미를 ` +
    `형성하고 있음을 시사한다. 특히 범주 간 동시출현과 네트워크 구조는 각 담론이 ` +
    `독립적으로 존재하기보다 상호 연결된 의미망을 형성함을 보여준다. 이러한 결과는 ` +
    `코드북 기반 질적 내용분석이 양적 빈도분석과 네트워크분석을 결합할 때, 텍스트의 ` +
    `의미 구조를 다층적으로 해석할 수 있음을 보여준다.`
  );
}

export function conclusionText(project: QcaProject): string {
  const name = project.get_meta("name", "본 연구");
  const f = facts(project);
  const themes = f.themes.map((t) => t.name);
  const themeLine = themes.length ? themes.join(", ") : "주요 담론";
  return (
    `본 연구는 '${name}'를 대상으로 코드북 기반 질적·양적 통합 내용분석을 수행하였다. ` +
    `분석 결과 ${themeLine}의 상위 담론이 도출되었으며, 이는 대상 텍스트의 의미 구조를 ` +
    `체계적으로 설명한다. 본 연구의 의의는 조작적 정의와 판정규칙을 명시한 투명한 ` +
    `코딩 절차를 통해 질적 분석의 신뢰성과 재현가능성을 높였다는 데 있다. 후속 연구에서는 ` +
    `말뭉치 규모를 확대하고 다중 코더 간 신뢰도(Cohen's κ, Krippendorff's α)를 적용하여 ` +
    `일반화 가능성을 검증할 필요가 있다.`
  );
}

export type SectionKey = "methodology" | "results" | "discussion" | "conclusion";

export const SECTION_TITLES: Record<SectionKey, string> = {
  methodology: "연구방법",
  results: "결과",
  discussion: "논의",
  conclusion: "결론",
};

const SECTION_FNS: Record<SectionKey, (p: QcaProject) => string> = {
  methodology: methodologyText,
  results: resultsText,
  discussion: discussionText,
  conclusion: conclusionText,
};

/** Generate one section. If `refine` is supplied, it polishes the local draft. */
export async function generateSection(
  project: QcaProject,
  section: SectionKey,
  refine?: (title: string, draft: string) => Promise<string>
): Promise<string> {
  const title = SECTION_TITLES[section];
  let base = SECTION_FNS[section](project);
  if (refine) {
    try {
      const refined = await refine(title, base);
      if (refined && refined.trim()) base = refined.trim();
    } catch {
      /* keep local draft on refiner failure */
    }
  }
  project.save_interpretation(section, base);
  return base;
}

export async function generateAll(
  project: QcaProject,
  refine?: (title: string, draft: string) => Promise<string>
): Promise<Record<SectionKey, string>> {
  const out = {} as Record<SectionKey, string>;
  for (const sec of Object.keys(SECTION_TITLES) as SectionKey[]) {
    out[sec] = await generateSection(project, sec, refine);
  }
  return out;
}
