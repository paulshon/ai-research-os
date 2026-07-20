/**
 * Generates apps/web/lib/rdos/lesson-body-i18n-data.ts from RDOS lesson content + translation maps.
 * Run: node scripts/generate-lesson-body-i18n.mjs
 */
import fs from "fs";
import vm from "vm";
import path from "path";
import { REJECTION_PATTERNS_EXTRA, DESC_SNIPPETS } from "./knowledge-i18n-phrases.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "apps/web/lib/rdos/lesson-body-i18n-data.ts");
const KNOWLEDGE_I18N = path.join(ROOT, "apps/web/lib/rdos/knowledge-content-i18n.ts");

function tsString(s) {
  return JSON.stringify(s);
}

function emitQuizArray(quiz) {
  const items = quiz.map((q) => {
    return `      { q: ${tsString(q.q)}, options: [${q.options.map(tsString).join(", ")}], answer: ${q.answer}, explanation: ${tsString(q.explanation)} }`;
  });
  return `[\n${items.join(",\n")}\n    ]`;
}

function extractJsonConst(src, constName) {
  const re = new RegExp(`const ${constName}[^=]*=\\s*`);
  const match = src.match(re);
  if (!match) throw new Error(`Missing const ${constName}`);
  let i = match.index + match[0].length;
  while (src[i] !== "{") i++;
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return JSON.parse(src.slice(start, i + 1));
    }
  }
  throw new Error(`Unclosed brace in ${constName}`);
}

function stripTs(src) {
  return src
    .replace(/^import[\s\S]*?;$/gm, "")
    .replace(/^export interface[\s\S]*?\n\}/gm, "")
    .replace(/export const/g, "const")
    .replace(/:\s*[A-Za-z_][\w<>\[\]|&,\s]*(?=\s*=)/g, "");
}

function loadAllLessons() {
  const caseSrc = stripTs(fs.readFileSync(path.join(ROOT, "apps/web/lib/rdos/case-papers.ts"), "utf8"));

  const lessonSrc = fs.readFileSync(path.join(ROOT, "apps/web/lib/rdos/lesson-content.ts"), "utf8");
  const stripped = stripTs(lessonSrc)
    .replace(/export const RDOS_LESSON_CONTENT/, "const RDOS_LESSON_CONTENT")
    .replace(/\/\/ v10:[\s\S]*$/m, "");

  const code = `
${caseSrc}
${stripped}
for (const [moduleKey, lessons] of Object.entries(CASE_PAPER_LESSONS)) {
  const target = RDOS_LESSON_CONTENT[moduleKey];
  if (target && Array.isArray(target.lessons)) {
    for (const l of lessons) {
      if (!target.lessons.some((x) => x.id === l.id)) target.lessons.push(l);
    }
  }
}
__result = [];
for (const mod of Object.values(RDOS_LESSON_CONTENT)) {
  for (const lesson of mod.lessons) __result.push(lesson);
}
`;
  const sandbox = { __result: null };
  vm.runInNewContext(code, sandbox, { filename: "lesson-content.ts" });
  return sandbox.__result;
}

function buildCoreTerms() {
  const coreSrc = fs.readFileSync(path.join(ROOT, "apps/web/lib/rdos/knowledge-core.ts"), "utf8");
  const terms = [];
  for (const m of coreSrc.matchAll(
    /"id": "(term-\d+)"[\s\S]*?"en": "([^"]+)"[\s\S]*?"ko": "([^"]+)"[\s\S]*?"definition": "([^"]+)"[\s\S]*?"analogy": "([^"]+)"[\s\S]*?"usage": "([^"]+)"/g
  )) {
    terms.push({ id: m[1], en: m[2], ko: m[3], definition: m[4], analogy: m[5], usage: m[6] });
  }
  const koDefToId = {};
  const koUsageToId = {};
  for (const t of terms) {
    koDefToId[t.definition] = t.id;
    koUsageToId[t.usage] = t.id;
  }
  return { terms, koDefToId, koUsageToId };
}

function buildCoreChapters() {
  const coreSrc = fs.readFileSync(path.join(ROOT, "apps/web/lib/rdos/knowledge-core.ts"), "utf8");
  const chapters = {};
  for (const m of coreSrc.matchAll(
    /"id": "(ch\d)"[\s\S]*?"ko": "([^"]+)"[\s\S]*?"role": "([^"]+)"[\s\S]*?"principle": "([^"]+)"[\s\S]*?"desc": "([^"]+)"/g
  )) {
    chapters[m[1]] = { ko: m[2], role: m[3], principle: m[4], desc: m[5] };
  }
  return chapters;
}

const knowledgeI18nSrc = fs.readFileSync(KNOWLEDGE_I18N, "utf8");
const TERMS_I18N = extractJsonConst(knowledgeI18nSrc, "TERMS_I18N");
const CHAPTERS_I18N = extractJsonConst(knowledgeI18nSrc, "CHAPTERS_I18N");
const { terms: CORE_TERMS, koDefToId, koUsageToId } = buildCoreTerms();
const CORE_CHAPTERS = buildCoreChapters();

const CHAPTER_KO_TO_EN = {
  "연구배경": "Research Background",
  "연구목적 및 연구문제": "Research Purpose & Questions",
  "연구목적": "Research Purpose",
  "이론적 배경": "Theoretical Background",
  "문헌연구": "Literature Review",
  "연구방법": "Research Methodology",
  "연구결과": "Research Results",
  "논의": "Discussion",
  "결론": "Conclusion",
};
const CHAPTER_KO_TO_ZH = {
  "연구배경": "研究背景",
  "연구목적 및 연구문제": "研究目的及研究问题",
  "연구목적": "研究目的",
  "이론적 배경": "理论背景",
  "문헌연구": "文献研究",
  "연구방법": "研究方法",
  "연구결과": "研究结果",
  "논의": "讨论",
  "결론": "结论",
};

const REJECTION_PATTERNS = {
  en: {
    ...REJECTION_PATTERNS_EXTRA.en,
    "학문적·사회적 필요성 혼용": "Mixing academic and social necessity",
    "연구 필요성 부재": "Absence of research necessity",
    "추상적 동기 서술": "Abstract motivation only",
    "단순 현황 나열": "Mere status listing",
    "연구공백(Research Gap) 불명확": "Unclear research gap",
    "기존 연구 비판 없이 인용": "Citation without critique of prior work",
    "연구 대상 범위 모호": "Ambiguous scope of research subject",
    "Macro-Micro 구조 역전": "Macro–micro structure reversal",
    "문헌연구와 연구배경 중복": "Overlap between literature review and background",
    "과장된 중요성 주장": "Exaggerated importance claims",
    "출처 없는 주장": "Claims without sources",
    "과도한 정보 나열": "Excessive information listing",
    "연구 필요성 이중 근거 패턴": "Dual-rationale for research necessity pattern",
    "RQ-목적 불일치": "RQ–purpose misalignment",
    "예/아니오형 RQ": "Yes/no type RQ",
    "RQ 간 중복": "Redundant RQs",
    "목적 과다": "Too many purposes",
    "이론 나열": "Theory listing",
    "개념 정의 부재": "Missing concept definitions",
    "이론-연구 연결 부재": "Missing theory–study connection",
    "분석 틀 미제시": "Analytical framework not presented",
    "선행 연구 나열": "Prior research listing",
    "연구 공백 미도출": "Research gap not derived",
    "시간·주제 축 혼란": "Confusion of time and theme axes",
    "방법-질문 불일치": "Method–question misalignment",
    "타당도 미언급": "Validity not mentioned",
    "윤리 미언급": "Ethics not mentioned",
    "재현성 부족": "Insufficient reproducibility",
    "결과에 해석 혼입": "Interpretation mixed into results",
    "통계 오류": "Statistical errors",
    "표·그림 부적절": "Inappropriate tables/figures",
    "선행 연구 출처 없는 비교": "Comparison without prior research sources",
    "과장된 기여 주장": "Exaggerated contribution claims",
    "실천적 함의 부재": "Absence of practical implications",
    "예상 외 결과 무시": "Ignoring unexpected results",
    "한계 회피": "Avoiding limitations",
    "새 정보 추가": "Adding new information",
    "서론-결론 불일치": "Introduction–conclusion inconsistency",
  },
  zh: {
    ...REJECTION_PATTERNS_EXTRA.zh,
    "학문적·사회적 필요성 혼용": "混用学术与社会必要性",
    "연구 필요성 부재": "缺少研究必要性",
    "추상적 동기 서술": "仅抽象动机叙述",
    "단순 현황 나열": "单纯现状罗列",
    "연구공백(Research Gap) 불명확": "研究空白不明确",
    "기존 연구 비판 없이 인용": "引用既有研究而无批判",
    "연구 대상 범위 모호": "研究对象范围模糊",
    "Macro-Micro 구조 역전": "宏观-微观结构颠倒",
    "문헌연구와 연구배경 중복": "文献研究与研究背景重复",
    "과장된 중요성 주장": "夸大重要性",
    "출처 없는 주장": "无出处的论断",
    "과도한 정보 나열": "信息罗列过多",
    "연구 필요성 이중 근거 패턴": "研究必要性双重依据模式",
    "RQ-목적 불일치": "RQ与目的不一致",
    "예/아니오형 RQ": "是/否型 RQ",
    "RQ 간 중복": "RQ 之间重复",
    "목적 과다": "目的过多",
    "이론 나열": "理论罗列",
    "개념 정의 부재": "缺少概念定义",
    "이론-연구 연결 부재": "缺少理论与研究的连接",
    "분석 틀 미제시": "未呈现分析框架",
    "선행 연구 나열": "先行研究罗列",
    "연구 공백 미도출": "未导出研究空白",
    "시간·주제 축 혼란": "时间轴与主题轴混淆",
    "방법-질문 불일치": "方法与问题不一致",
    "타당도 미언급": "未提及效度",
    "윤리 미언급": "未提及伦理",
    "재현성 부족": "可重复性不足",
    "결과에 해석 혼입": "结果中混入解释",
    "통계 오류": "统计错误",
    "표·그림 부적절": "表/图不当",
    "선행 연구 출처 없는 비교": "与先行研究比较却无出处",
    "과장된 기여 주장": "夸大贡献",
    "실천적 함의 부재": "缺少实践启示",
    "예상 외 결과 무시": "忽视意外结果",
    "한계 회피": "回避局限",
    "새 정보 추가": "添加新信息",
    "서론-결론 불일치": "引言与结论不一致",
  },
};

const GOOD_PATTERNS = {
  en: {
    "모델 제시 구조": "Model presentation structure",
    "분석-규명 구조": "Analysis–explanation structure",
    "탐색-도출 구조": "Exploration–derivation structure",
    "분석-해석 구조": "Analysis–interpretation structure",
    "시대적 맥락 제시 패턴": "Era-of-change context pattern",
    "통계 근거 활용 패턴": "Statistical evidence pattern",
    "연구 동향 계보화 패턴": "Research lineage pattern",
    "연구 필요성 이중 근거 패턴": "Dual-rationale for research necessity pattern",
  },
  zh: {
    "모델 제시 구조": "模型呈现结构",
    "분석-규명 구조": "分析-阐明结构",
    "탐색-도출 구조": "探索-导出结构",
    "분석-해석 구조": "分析-解读结构",
    "시대적 맥락 제시 패턴": "时代背景呈现模式",
    "통계 근거 활용 패턴": "统计依据运用模式",
    "연구 동향 계보화 패턴": "研究动向谱系化模式",
    "연구 필요성 이중 근거 패턴": "研究必要性双重依据模式",
  },
};

const EXTRA_PHRASES = {
  en: {
    "MDS 결과는 좌표 그래프로 표현되며, 거리가 가까울수록 인식이 유사하고 멀수록 대립적임을 의미한다.":
      "MDS results appear as coordinate plots; closer distance means more similar perception, farther means more opposing.",
    "순차적(질적→양적), 동시적(양적+질적), 변형적(이론 중심) 설계 중 하나를 선택하고 설계 유형을 명시한다.":
      "Choose and specify one design type: sequential (qual → quant), concurrent (quant + qual), or transformative (theory-centered).",
    "소수의 참가자(20~50명)로도 인식 유형을 도출할 수 있어 질적-양적 혼합 연구에 적합하다.":
      "Suitable for mixed qualitative–quantitative research; perception types can be derived with relatively few participants (20–50).",
    "Cohens Kappa ≥ .80이면 Almost Perfect Agreement로 높은 신뢰도로 인정된다.":
      "Cohen's kappa ≥ .80 is recognized as almost perfect agreement—high reliability.",
    "사전에 이론적 틀을 설정하지 않고 귀납적으로 이론을 구축하려는 연구에서 근거이론을 방법론으로 명시한다.":
      "Specify grounded theory when inductively building theory without a pre-set theoretical framework.",
    "질적 연구 방법론에서 연구자 위치성(Researcher Positionality) 절을 별도로 두어 서술하면 학술적 신뢰도가 높아진다.":
      "A separate Researcher Positionality section in qualitative methodology increases scholarly credibility.",
    "「연구 필요성 이중 근거 패턴」은(는) 권장되는 좋은 서술 패턴입니다.":
      "The dual-rationale for research necessity pattern is a recommended good narrative pattern.",
    "좋은 RQ는 예/아니오로 답하지 않고, 어떻게, 왜, 어떤 유형으로의 형식을 갖는다.":
      "Good RQs are not yes/no; they take the form of how, why, or what type.",
    "방법론에서 예비 연구를 통해 코딩 체계의 신뢰도를 사전 검증하였다고 서술하면 방법론의 엄밀성이 높아진다.":
      "Stating that coding reliability was pre-validated through a pilot study increases methodological rigor.",
    "방법론에서 IRB 승인 번호 2023-XXX를 취득하였다고 명시하면 연구 윤리 준수를 공식적으로 증명한다.":
      "Citing IRB approval number 2023-XXX in methodology officially demonstrates ethical compliance.",
  },
  zh: {
    "MDS 결과는 좌표 그래프로 표현되며, 거리가 가까울수록 인식이 유사하고 멀수록 대립적임을 의미한다.":
      "MDS 结果以坐标图呈现；距离越近感知越相似，越远越对立。",
    "순차적(질적→양적), 동시적(양적+질적), 변형적(이론 중심) 설계 중 하나를 선택하고 설계 유형을 명시한다.":
      "选择并明确一种设计：顺序（定性→定量）、同时（定量+定性）或变革（理论中心）。",
    "소수의 참가자(20~50명)로도 인식 유형을 도출할 수 있어 질적-양적 혼합 연구에 적합하다.":
      "适合定性-定量混合研究；较少参与者（20–50 人）亦可导出感知类型。",
    "Cohens Kappa ≥ .80이면 Almost Perfect Agreement로 높은 신뢰도로 인정된다.":
      "Cohen's kappa ≥ .80 被视为几乎完全一致，信度高。",
    "사전에 이론적 틀을 설정하지 않고 귀납적으로 이론을 구축하려는 연구에서 근거이론을 방법론으로 명시한다.":
      "不预设理论框架、归纳构建理论的研究中明确扎根理论为方法论。",
    "질적 연구 방법론에서 연구자 위치성(Researcher Positionality) 절을 별도로 두어 서술하면 학술적 신뢰도가 높아진다.":
      "定性方法论中单独设研究者位置性章节可提升学术可信度。",
    "「연구 필요성 이중 근거 패턴」은(는) 권장되는 좋은 서술 패턴입니다.":
      "「研究必要性双重依据模式」是推荐的好叙述模式。",
    "좋은 RQ는 예/아니오로 답하지 않고, 어떻게, 왜, 어떤 유형으로의 형식을 갖는다.":
      "好的 RQ 不以是/否作答，而采用如何·为何·何种类型的形式。",
    "방법론에서 예비 연구를 통해 코딩 체계의 신뢰도를 사전 검증하였다고 서술하면 방법론의 엄밀성이 높아진다.":
      "方法论中说明通过预试研究预先验证编码体系信度，可提升严谨性。",
    "방법론에서 IRB 승인 번호 2023-XXX를 취득하였다고 명시하면 연구 윤리 준수를 공식적으로 증명한다.":
      "方法论中注明取得 IRB 批准号 2023-XXX 可正式证明遵守研究伦理。",
  },
};

function translateKoText(text, locale) {
  if (!text || locale === "ko") return text;
  const pairs = [];
  for (const t of CORE_TERMS) {
    const tr = TERMS_I18N[locale]?.[t.id];
    if (!tr) continue;
    pairs.push([t.definition, tr.definition]);
    pairs.push([t.usage, tr.usage]);
    pairs.push([t.analogy.replace(/^비유: /, ""), tr.analogy.replace(/^(Analogy:|比喻：) /, "")]);
    pairs.push([t.analogy, tr.analogy]);
  }
  for (const [ko, tr] of Object.entries(EXTRA_PHRASES[locale] || {})) pairs.push([ko, tr]);
  for (const [ko, tr] of Object.entries(DESC_SNIPPETS[locale] || {})) pairs.push([ko, tr]);
  for (const [id, chTr] of Object.entries(CHAPTERS_I18N[locale] || {})) {
    const core = CORE_CHAPTERS[id];
    if (core) {
      pairs.push([core.role, chTr.role]);
      pairs.push([core.principle, chTr.principle]);
      pairs.push([core.desc, chTr.desc]);
    }
  }
  for (const [ko, tr] of Object.entries(REJECTION_PATTERNS[locale] || {})) pairs.push([ko, tr]);
  for (const [ko, tr] of Object.entries(GOOD_PATTERNS[locale] || {})) pairs.push([ko, tr]);
  pairs.sort((a, b) => b[0].length - a[0].length);
  let out = text;
  for (const [ko, tr] of pairs) {
    if (ko && out.includes(ko)) out = out.split(ko).join(tr);
  }
  return out;
}

function termOptionLabel(koLabel, locale) {
  for (const t of CORE_TERMS) {
    const tr = TERMS_I18N[locale]?.[t.id];
    if (!tr) continue;
    if (koLabel.startsWith(t.en) || koLabel.includes(`(${t.ko})`) || koLabel.includes(t.en)) {
      if (locale === "en") return t.en;
      return `${tr.ko} (${t.en})`;
    }
  }
  return koLabel;
}

function translateOption(ko, locale) {
  if (locale === "ko") return ko;
  if (ko === "참") return locale === "en" ? "True" : "正确";
  if (ko === "거짓") return locale === "en" ? "False" : "错误";
  const rp = REJECTION_PATTERNS[locale]?.[ko] || GOOD_PATTERNS[locale]?.[ko];
  if (rp) return rp;
  const termId = koDefToId[ko] || koUsageToId[ko];
  if (termId && TERMS_I18N[locale]?.[termId]) {
    const tr = TERMS_I18N[locale][termId];
    return koDefToId[ko] ? tr.definition : tr.usage;
  }
  if (/^[A-Za-z].*\(.+\)/.test(ko) || ko.includes("(")) {
    const labeled = termOptionLabel(ko, locale);
    if (labeled !== ko) return labeled;
  }
  return translateKoText(ko, locale);
}

function translateQuizItem(koQ, locale) {
  const en = locale === "en";
  let q = koQ.q;
  let explanation = koQ.explanation;

  const rejMatch = q.match(/다음은 「(.+?)」 장에서 지적되는 문제입니다\. 어떤 탈락 패턴인가요\?/);
  if (rejMatch) {
    const chKo = rejMatch[1];
    const chName = en ? CHAPTER_KO_TO_EN[chKo] || chKo : CHAPTER_KO_TO_ZH[chKo] || chKo;
    const tail = koQ.q.split("\n").slice(1).join("\n");
    q = en
      ? `The following is a problem noted in the 「${chName}」 section. Which rejection pattern is it?\n${translateKoText(tail, locale)}`
      : `以下是「${chName}」章节指出的问题。属于哪种失分模式？\n${translateKoText(tail, locale)}`;
  }

  const defMatch = q.match(/다음 설명에 해당하는 용어는\?\n"(.+?)"/);
  if (defMatch) {
    const def = defMatch[1];
    const termId = koDefToId[def];
    if (termId && TERMS_I18N[locale]?.[termId]) {
      const tr = TERMS_I18N[locale][termId];
      q = en
        ? `Which term matches the following description?\n"${tr.definition}"`
        : `下列说明对应哪个术语？\n"${tr.definition}"`;
    }
  }

  const termDefMatch = q.match(/「(.+?)」의 정의로 가장 적절한 것은\?/);
  if (termDefMatch) {
    const label = termDefMatch[1];
    q = en ? `Which is the best definition of 「${label}」?` : `「${label}」的最佳定义是？`;
  }

  const usageMatch = q.match(/「(.+?)」을\(를\) 논문에서 활용하는 방식으로 옳은 것은\?/);
  if (usageMatch) {
    const label = usageMatch[1];
    q = en ? `Which is the correct way to use 「${label}」 in a thesis?` : `在论文中正确使用「${label}」的方式是？`;
  }

  const analMatch = q.match(/다음 비유가 설명하는 개념은\?\n"(.+?)"/);
  if (analMatch) {
    const analTr = translateKoText(analMatch[1], locale);
    q = en
      ? `Which concept does the following analogy describe?\n"${analTr}"`
      : `下列比喻说明的概念是？\n"${analTr}"`;
  }

  const tfMatch = q.match(/\[참\/거짓\] 「(.+?)」의 정의는 "(.+?)" 이다\./);
  if (tfMatch) {
    const [, term, def] = tfMatch;
    const termId = koDefToId[def];
    const trDef = termId && TERMS_I18N[locale]?.[termId] ? TERMS_I18N[locale][termId].definition : def;
    q = en
      ? `[True/False] The definition of 「${term}」 is "${trDef}".`
      : `[对/错] 「${term}」的定义是「${trDef}」。`;
    if (explanation.includes("올바른 정의")) {
      explanation = en ? `The correct definition of 「${term}」: ${trDef}` : `「${term}」的正确定义：${trDef}`;
    } else if (explanation.startsWith("맞습니다")) {
      explanation = en ? `Correct. ${trDef}` : `正确。${trDef}`;
    }
  }

  const goodMatch = q.match(/「(.+?)」 장에서 '좋은 평가'를 받는 서술 패턴은\?/);
  if (goodMatch) {
    const chKo = goodMatch[1];
    const chName = en ? CHAPTER_KO_TO_EN[chKo] || chKo : CHAPTER_KO_TO_ZH[chKo] || chKo;
    q = en
      ? `Which narrative pattern receives a 'good evaluation' in the 「${chName}」 section?`
      : `在「${chName}」章节中，哪种叙述模式会获得「好评价」？`;
    if (explanation.includes("권장되는")) {
      const pat = explanation.match(/「(.+?)」/)?.[1];
      const patTr = pat
        ? GOOD_PATTERNS[locale]?.[pat] || REJECTION_PATTERNS[locale]?.[pat] || translateKoText(pat, locale)
        : "";
      explanation = en
        ? `「${patTr}」 is a recommended good narrative pattern.`
        : `「${patTr}」是推荐的好叙述模式。`;
    }
  }

  const options = koQ.options.map((o) => translateOption(o, locale));
  explanation = translateKoText(explanation, locale);
  q = translateKoText(q, locale);

  for (const t of CORE_TERMS) {
    const tr = TERMS_I18N[locale]?.[t.id];
    if (!tr) continue;
    if (explanation.includes(`${t.en} (${t.ko})`)) {
      explanation = explanation.replace(`${t.en} (${t.ko})`, locale === "en" ? t.en : `${tr.ko} (${t.en})`);
    }
    if (explanation.startsWith(`${t.en}:`)) {
      explanation = `${locale === "en" ? t.en : `${tr.ko} (${t.en})`}: ${tr.definition}`;
    }
  }

  return { q, options, answer: koQ.answer, explanation };
}

const CONTENT_HEADER_REPLACEMENTS = {
  en: [
    ["정확한 정의", "Precise definition"],
    ["🟢 비유로 이해하기", "🟢 Understand through analogy"],
    ["📝 논문에서 이렇게 씁니다", "📝 How to use this in a thesis"],
    ["✍️ 예시 문장", "✍️ Example sentence"],
    ["한 줄 요약", "One-line summary"],
    ["핵심 서술 원리(순서)", "Core narrative principle (sequence)"],
    ["서술 단계 따라가기", "Follow the narrative steps"],
    ["🟢 좋은 문장 예시", "🟢 Good sentence examples"],
    ["⚠️ 이런 실수는 피하세요 (탈락 패턴)", "⚠️ Avoid these mistakes (rejection patterns)"],
    ["✅ 셀프 체크", "✅ Self-check"],
    ["연구윤리 핵심", "Research ethics essentials"],
    ["<strong>예시</strong>", "<strong>Example</strong>"],
    ["처음 보는 용어라면 이름 자체보다 \"이게 왜 필요한가\"를 먼저 떠올리면 쉽습니다.", 'If a term is new, recall "why it is needed" before the name itself.'],
    [" 장은 독자(심사자)에게 '", " section persuades the reader (examiner) about '"],
    ["'을(를) 차근차근 설득하는 부분입니다. 각 문장이 \"왜 이런 순서로 오는가\"를 이해하면 글이 술술 써집니다.", "' step by step. When you understand why each sentence comes in this order, writing flows naturally."],
    ["예: ", "e.g. "],
  ],
  zh: [
    ["정확한 정의", "准确定义"],
    ["🟢 비유로 이해하기", "🟢 用比喻理解"],
    ["📝 논문에서 이렇게 씁니다", "📝 论文中这样写"],
    ["✍️ 예시 문장", "✍️ 示例句"],
    ["한 줄 요약", "一行摘要"],
    ["핵심 서술 원리(순서)", "核心叙述原理（顺序）"],
    ["서술 단계 따라가기", "按叙述步骤"],
    ["🟢 좋은 문장 예시", "🟢 好句示例"],
    ["⚠️ 이런 실수는 피하세요 (탈락 패턴)", "⚠️ 避免这些错误（失分模式）"],
    ["✅ 셀프 체크", "✅ 自检"],
    ["연구윤리 핵심", "研究伦理要点"],
    ["<strong>예시</strong>", "<strong>示例</strong>"],
    ["처음 보는 용어라면 이름 자체보다 \"이게 왜 필요한가\"를 먼저 떠올리면 쉽습니다.", "若是新术语，先想「为何需要它」，再想名称本身。"],
    [" 장은 독자(심사자)에게 '", " 章节向读者（评审）逐步说明「"],
    ["'을(를) 차근차근 설득하는 부분입니다. 각 문장이 \"왜 이런 순서로 오는가\"를 이해하면 글이 술술 써집니다.", "」。理解每句为何按此顺序出现，写作就会顺畅。"],
    ["예: ", "例："],
  ],
};

function translateContentHtml(koHtml, locale) {
  let body = koHtml;
  for (const [from, to] of CONTENT_HEADER_REPLACEMENTS[locale] || []) {
    body = body.split(from).join(to);
  }
  for (const t of CORE_TERMS) {
    const tr = TERMS_I18N[locale]?.[t.id];
    if (!tr) continue;
    body = body.split(t.definition).join(tr.definition);
    const analKo = t.analogy.replace(/^비유: /, "");
    const analTr = tr.analogy.replace(/^(Analogy:|比喻：) /, "");
    body = body.split(analKo).join(analTr);
    body = body.split(t.usage).join(tr.usage);
  }
  body = body.replace(/은\(는\) 한마디로 /g, locale === "en" ? " — in a nutshell: " : " — 简而言之：");
  body = body.replace(/본 연구는/g, locale === "en" ? "This study" : "本研究");
  body = body.replace(/처럼, 내 연구의/g, locale === "en" ? ". Identify where in your study" : "。请写出该概念在你研究中");
  body = body.replace(
    /어느 부분에 이 개념이 들어가는지 한 문장으로 적어 보세요/g,
    locale === "en" ? "this concept applies—in one sentence." : "运用于哪一部分。"
  );
  const chapterMap = locale === "en" ? CHAPTER_KO_TO_EN : CHAPTER_KO_TO_ZH;
  for (const [ko, name] of Object.entries(chapterMap)) {
    body = body.split(`「${ko}」`).join(`「${name}」`);
  }
  body = translateKoText(body, locale);
  return body;
}

// ── Generate output ──────────────────────────────────────────────────────────

const lessons = loadAllLessons();
console.log(`Loaded ${lessons.length} lessons from RDOS_LESSON_CONTENT`);

const bodyI18n = { en: {}, zh: {} };
for (const lesson of lessons) {
  for (const locale of ["en", "zh"]) {
    bodyI18n[locale][lesson.id] = {
      content: translateContentHtml(lesson.content, locale),
      quiz: lesson.quiz.map((q) => translateQuizItem(q, locale)),
    };
  }
}

let out = `/**
 * lesson-body-i18n-data.ts — Generated EN/ZH lesson bodies and quizzes
 *
 * Auto-generated by \`node scripts/generate-lesson-body-i18n.mjs\`.
 * Do not edit by hand; regenerate from \`lesson-content.ts\` when source changes.
 *
 * Title/subtitle live in \`rdos-content-i18n.ts\` (LESSON_META_I18N).
 * This file supplies \`content\` HTML and \`quiz\` items only.
 */
import type { Locale } from "@/lib/i18n/types";
import type { Lesson } from "@/lib/rdos/lesson-content";

export interface LessonBodyI18n {
  content?: string;
  quiz?: Lesson["quiz"];
}

export const LESSON_BODY_I18N_DATA: Partial<
  Record<Exclude<Locale, "ko">, Record<string, LessonBodyI18n>>
> = {
  en: {
`;

for (const lesson of lessons) {
  const data = bodyI18n.en[lesson.id];
  out += `    "${lesson.id}": {\n`;
  out += `      content: ${tsString(data.content)},\n`;
  out += `      quiz: ${emitQuizArray(data.quiz)},\n`;
  out += `    },\n`;
}

out += `  },\n  zh: {\n`;

for (const lesson of lessons) {
  const data = bodyI18n.zh[lesson.id];
  out += `    "${lesson.id}": {\n`;
  out += `      content: ${tsString(data.content)},\n`;
  out += `      quiz: ${emitQuizArray(data.quiz)},\n`;
  out += `    },\n`;
}

out += `  },\n};\n`;

fs.writeFileSync(OUT, out);
const stat = fs.statSync(OUT);
const lines = out.split("\n").length;
console.log(`Wrote ${OUT}`);
console.log(`  ${lines} lines, ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size} bytes)`);
console.log(`  ${lessons.length} lessons × 2 locales (en, zh)`);
