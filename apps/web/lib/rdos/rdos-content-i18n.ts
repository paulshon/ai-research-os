/**
 * rdos-content-i18n.ts — v17
 *
 * The RDOS curriculum in `lesson-content.ts` is authored in Korean. This module
 * supplies EN / ZH translations for every *navigational / structural* field the
 * learner sees before opening a lesson body:
 *   - module: label, provides, intro, objectives[], reward[]
 *   - lesson: title, subtitle
 *
 * `localizeLessonContent(content, locale, t)` merges these over the Korean source
 * so that the RDOS dashboard, sidebar, lesson list, progress headers and reward
 * chips fully respond to KO / EN / ZH on every device (desktop, tablet, mobile).
 *
 * Lesson *bodies* (`lesson.content` HTML) and *quiz* items are large prose
 * corpora (60 lessons × ~20 questions). Where a body/quiz translation is not yet
 * supplied, the loader keeps the Korean text but still swaps the chrome — no key
 * ever falls back to echoing a raw id. Body/quiz translations can be dropped into
 * `LESSON_BODY_I18N` incrementally without touching this file's shape.
 */
import type { Locale } from "@/lib/i18n/types";
import type { LessonContent, Lesson } from "@/lib/rdos/lesson-content";
import { LESSON_BODY_I18N_DATA } from "@/lib/rdos/lesson-body-i18n-data";

/* ── Module-level structural translations ── */
interface ModuleI18n {
  label: string;
  provides: string;
  intro: string;
  objectives: string[];
  reward: string[];
}

/* ── Per-lesson title/subtitle translations, keyed by lesson id ── */
interface LessonMeta {
  title: string;
  subtitle: string;
}

type ModuleKey =
  | "basics" | "structure" | "design" | "method"
  | "reading" | "apa" | "writing" | "tutor";

const MODULE_I18N: Record<Locale, Record<ModuleKey, ModuleI18n>> = {
  ko: {
    basics: {
      label: "Research Basics",
      provides: "연구 기초",
      intro: "연구가 무엇인지부터 핵심 용어·연구윤리까지, 쉬운 설명과 예시로 익히는 입문 모듈.",
      objectives: [
        "연구의 정의와 학술적 글의 성격을 설명할 수 있다",
        "연구문제–목적–질문의 위계를 구분한다",
        "좋은 연구문제의 조건을 평가한다",
        "조작적 정의·연구공백을 이해한다",
        "연구윤리(표절·IRB)를 설명한다",
      ],
      reward: ["researchLiteracy +6/레슨", "Knowledge: research-problem 노드 숙련"],
    },
    structure: {
      label: "논문 구조 학습",
      provides: "논문 구성 이해",
      intro: "서론부터 결론까지 8개 장의 서술구조·탈락패턴·좋은문장을 예시로 익힙니다.",
      objectives: [
        "IMRaD 각 장의 역할을 설명한다",
        "장 간 논리적 연결을 파악한다",
        "각 장의 핵심 서술원리를 적용한다",
        "장별 탈락 패턴을 식별·회피한다",
        "좋은 문장 패턴을 변형 적용한다",
        "초록 구성요소를 작성한다",
      ],
      reward: ["academicLiteracy +6/레슨", "Knowledge: paper-structure 노드 숙련"],
    },
    design: {
      label: "연구설계 기초",
      provides: "연구문제 작성",
      intro: "연구문제·RQ·가설·변수·표집·타당도를 쉬운 예시로 설계합니다.",
      objectives: [
        "연구문제를 구체화한다", "연구공백을 도출한다", "좋은 RQ를 작성한다",
        "변수를 구분한다", "표집을 선택한다", "타당도·신뢰도를 반영한다",
      ],
      reward: ["methodLiteracy +6/레슨", "Alignment: 방법론 체인 등록"],
    },
    method: {
      label: "연구방법론 기초",
      provides: "양적·질적 개요",
      intro: "양적·질적·혼합 방법과 패러다임을 쉬운 설명으로 개관합니다.",
      objectives: [
        "패러다임 전제를 비교한다", "양적 방법을 구분한다", "질적 방법을 구분한다",
        "혼합 설계를 구분한다", "RQ에 맞는 방법을 선택한다",
        "인식론·존재론과 방법의 정합성을 설명한다",
      ],
      reward: ["methodLiteracy +6/레슨", "Competency: 방법 리터러시 향상"],
    },
    reading: {
      label: "논문 읽기 훈련",
      provides: "논문 분석",
      intro: "논문을 비판적으로 읽고 약점·이론적 렌즈·연구공백을 찾는 훈련.",
      objectives: [
        "효율적 읽기 순서를 적용한다", "주장–근거를 평가한다",
        "탈락 패턴으로 약점을 찾는다", "문헌 종합 유형을 구분한다",
        "이론적 렌즈·공백을 파악한다",
      ],
      reward: ["thinkingLiteracy +6/레슨", "Alignment: 연구질문 체인 등록"],
    },
    apa: {
      label: "APA 학습",
      provides: "인용·참고문헌",
      intro: "APA 7판 본문 인용·참고문헌·DOI·표/그림 규칙을 예시로 익힙니다.",
      objectives: [
        "본문 인용 형식을 적용한다", "참고문헌 목록을 작성한다",
        "DOI·전자자료를 표기한다", "직접·간접 인용을 구분한다",
        "표·그림 규칙을 적용한다",
      ],
      reward: ["writingLiteracy +6/레슨", "Knowledge: apa-citation 노드 숙련"],
    },
    writing: {
      label: "학술 글쓰기 훈련",
      provides: "문단 작성",
      intro: "좋은 문장 패턴·연쇄 예비·결과/논의 작성 원리로 학술 문단을 훈련합니다.",
      objectives: [
        "주제문을 진술한다", "근거를 논리적으로 연결한다",
        "좋은 문장 패턴을 적용한다", "결과/논의를 구분해 쓴다",
        "연쇄 예비로 문단을 잇는다", "헤지·논증 표현을 쓴다",
      ],
      reward: ["writingLiteracy +6/레슨", "Quest: 글쓰기 미션 진행"],
    },
    tutor: {
      label: "AI 튜터",
      provides: "질의응답",
      intro: "연구 학습 중 궁금증을 묻고 소크라테스식 피드백으로 개념을 점검합니다.",
      objectives: [
        "개념 질문을 구체화한다", "피드백을 학습에 반영한다",
        "다음 학습을 계획한다", "핵심 용어를 자가 점검한다",
      ],
      reward: ["aiLiteracy +6/레슨", "Analytics: 학습 패턴 기록"],
    },
  },

  en: {
    basics: {
      label: "Research Basics",
      provides: "Research fundamentals",
      intro: "An entry module that teaches what research is, key terms, and research ethics through plain explanations and examples.",
      objectives: [
        "Explain the definition of research and the nature of academic writing",
        "Distinguish the hierarchy of research problem–purpose–question",
        "Evaluate the conditions of a good research question",
        "Understand operational definitions and research gaps",
        "Explain research ethics (plagiarism, IRB)",
      ],
      reward: ["researchLiteracy +6/lesson", "Knowledge: research-problem node mastery"],
    },
    structure: {
      label: "Paper Structure",
      provides: "Understanding paper composition",
      intro: "Learn the narrative structure, failure patterns, and strong sentences of 8 chapters from introduction to conclusion, with examples.",
      objectives: [
        "Explain the role of each IMRaD chapter",
        "Grasp the logical connections between chapters",
        "Apply each chapter's core narrative principles",
        "Identify and avoid per-chapter failure patterns",
        "Adapt and apply strong sentence patterns",
        "Write the components of an abstract",
      ],
      reward: ["academicLiteracy +6/lesson", "Knowledge: paper-structure node mastery"],
    },
    design: {
      label: "Research Design Basics",
      provides: "Writing research problems",
      intro: "Design research problems, RQs, hypotheses, variables, sampling, and validity through easy examples.",
      objectives: [
        "Concretize a research problem", "Derive a research gap", "Write a good RQ",
        "Distinguish variables", "Choose a sampling method", "Reflect validity and reliability",
      ],
      reward: ["methodLiteracy +6/lesson", "Alignment: methodology chain registered"],
    },
    method: {
      label: "Research Methodology Basics",
      provides: "Quantitative & qualitative overview",
      intro: "An overview of quantitative, qualitative, and mixed methods and their paradigms in plain terms.",
      objectives: [
        "Compare paradigm assumptions", "Distinguish quantitative methods",
        "Distinguish qualitative methods", "Distinguish mixed designs",
        "Select a method that fits the RQ",
        "Explain the coherence of epistemology/ontology and method",
      ],
      reward: ["methodLiteracy +6/lesson", "Competency: method literacy improved"],
    },
    reading: {
      label: "Paper Reading Training",
      provides: "Paper analysis",
      intro: "Training to read papers critically and find weaknesses, theoretical lenses, and research gaps.",
      objectives: [
        "Apply an efficient reading order", "Evaluate claim–evidence",
        "Find weaknesses via failure patterns", "Distinguish literature-synthesis types",
        "Identify theoretical lenses and gaps",
      ],
      reward: ["thinkingLiteracy +6/lesson", "Alignment: research-question chain registered"],
    },
    apa: {
      label: "APA Learning",
      provides: "Citations & references",
      intro: "Learn APA 7th in-text citations, references, DOIs, and table/figure rules through examples.",
      objectives: [
        "Apply in-text citation formats", "Write a reference list",
        "Cite DOIs and electronic sources", "Distinguish direct and indirect quotes",
        "Apply table/figure rules",
      ],
      reward: ["writingLiteracy +6/lesson", "Knowledge: apa-citation node mastery"],
    },
    writing: {
      label: "Academic Writing Training",
      provides: "Paragraph writing",
      intro: "Train academic paragraphs with strong sentence patterns, chained set-ups, and results/discussion principles.",
      objectives: [
        "State a topic sentence", "Connect evidence logically",
        "Apply strong sentence patterns", "Write results and discussion distinctly",
        "Chain paragraphs with set-ups", "Use hedging and argumentation phrasing",
      ],
      reward: ["writingLiteracy +6/lesson", "Quest: writing mission in progress"],
    },
    tutor: {
      label: "AI Tutor",
      provides: "Q&A",
      intro: "Ask questions during study and check concepts with Socratic feedback.",
      objectives: [
        "Concretize a conceptual question", "Reflect feedback into learning",
        "Plan the next study step", "Self-check key terms",
      ],
      reward: ["aiLiteracy +6/lesson", "Analytics: learning pattern recorded"],
    },
  },

  zh: {
    basics: {
      label: "研究基础",
      provides: "研究基础",
      intro: "从研究是什么到核心术语与研究伦理，通过通俗讲解和示例学习的入门模块。",
      objectives: [
        "能够说明研究的定义及学术写作的性质",
        "区分研究问题—目的—提问的层级",
        "评估好的研究问题的条件",
        "理解操作性定义与研究空白",
        "说明研究伦理（抄袭·IRB）",
      ],
      reward: ["researchLiteracy +6/课", "Knowledge：research-problem 节点精通"],
    },
    structure: {
      label: "论文结构学习",
      provides: "理解论文构成",
      intro: "从引言到结论，通过示例学习 8 个章节的叙述结构、失分模式与优秀句式。",
      objectives: [
        "说明 IMRaD 各章的作用",
        "把握章节之间的逻辑衔接",
        "应用各章的核心叙述原理",
        "识别并规避各章的失分模式",
        "变形应用优秀句式",
        "撰写摘要的构成要素",
      ],
      reward: ["academicLiteracy +6/课", "Knowledge：paper-structure 节点精通"],
    },
    design: {
      label: "研究设计基础",
      provides: "撰写研究问题",
      intro: "通过通俗示例设计研究问题、RQ、假设、变量、抽样与效度。",
      objectives: [
        "具体化研究问题", "得出研究空白", "撰写好的 RQ",
        "区分变量", "选择抽样方法", "体现效度与信度",
      ],
      reward: ["methodLiteracy +6/课", "Alignment：方法论链已登记"],
    },
    method: {
      label: "研究方法论基础",
      provides: "定量·定性概览",
      intro: "以通俗讲解概览定量、定性、混合方法及其范式。",
      objectives: [
        "比较范式前提", "区分定量方法", "区分定性方法",
        "区分混合设计", "选择契合 RQ 的方法",
        "说明认识论·本体论与方法的一致性",
      ],
      reward: ["methodLiteracy +6/课", "Competency：方法素养提升"],
    },
    reading: {
      label: "论文阅读训练",
      provides: "论文分析",
      intro: "批判性地阅读论文，寻找弱点、理论视角与研究空白的训练。",
      objectives: [
        "应用高效的阅读顺序", "评估主张—依据",
        "以失分模式寻找弱点", "区分文献综合的类型",
        "识别理论视角与空白",
      ],
      reward: ["thinkingLiteracy +6/课", "Alignment：研究问题链已登记"],
    },
    apa: {
      label: "APA 学习",
      provides: "引用·参考文献",
      intro: "通过示例学习 APA 第 7 版的正文引用、参考文献、DOI 与表/图规则。",
      objectives: [
        "应用正文引用格式", "撰写参考文献列表",
        "标注 DOI 与电子资料", "区分直接引用与间接引用",
        "应用表/图规则",
      ],
      reward: ["writingLiteracy +6/课", "Knowledge：apa-citation 节点精通"],
    },
    writing: {
      label: "学术写作训练",
      provides: "段落写作",
      intro: "以优秀句式、连锁铺垫、结果/讨论写作原理训练学术段落。",
      objectives: [
        "陈述主题句", "逻辑地衔接依据",
        "应用优秀句式", "区分撰写结果与讨论",
        "以铺垫连接段落", "使用弱化与论证表达",
      ],
      reward: ["writingLiteracy +6/课", "Quest：写作任务进行中"],
    },
    tutor: {
      label: "AI 导师",
      provides: "问答",
      intro: "在学习中提出疑问，以苏格拉底式反馈检查概念。",
      objectives: [
        "具体化概念性问题", "将反馈反映到学习中",
        "规划下一步学习", "自查核心术语",
      ],
      reward: ["aiLiteracy +6/课", "Analytics：学习模式已记录"],
    },
  },
};

/* ── Lesson title/subtitle translations by lesson id ── */
const LESSON_META_I18N: Record<Locale, Record<string, LessonMeta>> = {
  ko: {}, // Korean uses the source strings directly (identity)
  en: {
    b1: { title: "What Is Research", subtitle: "The essence of scholarly inquiry" },
    b2: { title: "Problem · Purpose · Question", subtitle: "The hierarchy of three" },
    b3: { title: "Operational Definition", subtitle: "Making abstract concepts measurable" },
    b4: { title: "Generalization of Research", subtitle: "From sample to population" },
    b5: { title: "Pilot Study", subtitle: "Checks before the main study" },
    b6: { title: "Research Ethics & IRB", subtitle: "The researcher's responsibility" },
    b7: { title: "Conditions of a Good Research Question", subtitle: "Originality · feasibility · value" },
    b8: { title: "Intro to Writing Research Background", subtitle: "Why this study is needed" },
    s1: { title: "Research Background — Narrative Structure", subtitle: "Chapter 1 · Research Background" },
    s2: { title: "Purpose & Questions — Narrative Structure", subtitle: "Chapter 2 · Research Purpose & Questions" },
    s3: { title: "Theoretical Background — Narrative Structure", subtitle: "Chapter 3 · Theoretical Background" },
    s4: { title: "Literature Review — Narrative Structure", subtitle: "Chapter 4 · Literature Review" },
    s5: { title: "Methodology — Narrative Structure", subtitle: "Chapter 5 · Research Methodology" },
    s6: { title: "Results — Narrative Structure", subtitle: "Chapter 6 · Research Results" },
    s7: { title: "Discussion — Narrative Structure", subtitle: "Chapter 7 · Discussion" },
    s8: { title: "Conclusion — Narrative Structure", subtitle: "Chapter 8 · Conclusion" },
    s9: { title: "The Whole IMRaD Structure", subtitle: "The skeleton of a paper" },
    s10: { title: "Writing the Abstract", subtitle: "Summarize in 250 words" },
    d1: { title: "Research Problem & Gap", subtitle: "What to solve" },
    d2: { title: "Writing Research Questions (RQ)", subtitle: "How · why · what type" },
    d3: { title: "Designing a Conceptual Framework", subtitle: "A map among concepts" },
    d4: { title: "Operational Definition", subtitle: "Make it measurable" },
    d5: { title: "Validity", subtitle: "Is the measurement correct" },
    d6: { title: "Reliability", subtitle: "Is the measurement consistent" },
    d7: { title: "Sampling", subtitle: "Whom to survey" },
    d8: { title: "Pilot & Coherence", subtitle: "Checking the design" },
    m1: { title: "Research Paradigms", subtitle: "The worldview behind methods" },
    m2: { title: "Epistemology & Ontology", subtitle: "Assumptions of knowing and being" },
    m3: { title: "Quantitative Research Overview", subtitle: "Measurement · statistics · causality" },
    m4: { title: "Qualitative Research Overview", subtitle: "Experience · meaning · process" },
    m5: { title: "Mixed Methods", subtitle: "Integrating quantitative + qualitative" },
    m6: { title: "Grounded Theory & Phenomenology", subtitle: "Representative qualitative methods" },
    m7: { title: "Triangulation & Abduction", subtitle: "Validity and inference" },
    m8: { title: "Justifying Method Choice", subtitle: "Why this method" },
    r1: { title: "Intro to Critical Reading", subtitle: "Through a reviewer's eyes" },
    r2: { title: "Finding Weaknesses ① Background·Purpose", subtitle: "Diagnosing failure patterns" },
    r3: { title: "Finding Weaknesses ② Literature·Lens", subtitle: "Theoretical lenses" },
    r4: { title: "Types of Literature Synthesis", subtitle: "Four ways to review" },
    r5: { title: "Reading Qualitative Analysis", subtitle: "Themes · discourse" },
    r6: { title: "Saturation & Reflexivity", subtitle: "Qualitative trustworthiness" },
    r7: { title: "Critiquing Results/Discussion", subtitle: "Separating interpretation" },
    a1: { title: "In-text Citation", subtitle: "Author-year" },
    a2: { title: "Reference List", subtitle: "References" },
    a3: { title: "DOI & Electronic Sources", subtitle: "Link notation" },
    a4: { title: "Direct & Indirect Quotes", subtitle: "Quotation marks and pages" },
    a5: { title: "Tables & Figures", subtitle: "Tables·Figures" },
    a6: { title: "Contribution & Implication Citations", subtitle: "Linking to discussion" },
    w1: { title: "Strong Sentences ① Background", subtitle: "Sentences of excellent papers" },
    w2: { title: "Strong Sentences ② Purpose·Problem", subtitle: "Sentences that call for the RQ" },
    w3: { title: "Results Are Facts Only", subtitle: "Excluding interpretation" },
    w4: { title: "Discussion: So What", subtitle: "Linking meaning to theory" },
    w5: { title: "Writing the Conclusion", subtitle: "Summary · contribution · follow-up" },
    w6: { title: "Chained Set-ups", subtitle: "A chain that links sentences" },
    w7: { title: "Thick Description & Reflexivity", subtitle: "Qualitative writing" },
    w8: { title: "Contribution & Implication Sentences", subtitle: "Theoretical/Practical" },
    t1: { title: "Asking Conceptual Questions", subtitle: "Instantly check unknown terms" },
    t2: { title: "Writing Feedback", subtitle: "Draft coaching" },
    t3: { title: "Next-study Recommendation", subtitle: "Weakness-based recommendation" },
    t4: { title: "Term Self-check", subtitle: "Reviewing key terms" },
    t5: { title: "Reliability Check", subtitle: "Kappa · agreement" },
    "case-basics": { title: "Research Structure through 3 Real Papers", subtitle: "Systematic method · empirical data · new knowledge" },
    "case-design": { title: "Research Design in 3 Real Papers", subtitle: "Problem · RQ · variables · sampling" },
    "case-method": { title: "Comparing Methods in 3 Real Papers", subtitle: "Quantitative · qualitative · mixed" },
    "case-reading": { title: "Reading 3 Papers by Structure", subtitle: "IMRaD-guided critical reading" },
  },
  zh: {
    b1: { title: "什么是研究", subtitle: "学术探究的本质" },
    b2: { title: "研究问题·目的·提问", subtitle: "三者的层级" },
    b3: { title: "操作性定义", subtitle: "让抽象概念可测量" },
    b4: { title: "研究的一般化", subtitle: "从样本到总体" },
    b5: { title: "预调查（Pilot）", subtitle: "正式调查前的检查" },
    b6: { title: "研究伦理与 IRB", subtitle: "研究者的责任" },
    b7: { title: "好的研究问题的条件", subtitle: "独创性·可行性·价值" },
    b8: { title: "撰写研究背景入门", subtitle: "为何需要这项研究" },
    s1: { title: "研究背景——叙述结构", subtitle: "第1章 · Research Background" },
    s2: { title: "研究目的与研究问题——叙述结构", subtitle: "第2章 · Research Purpose & Questions" },
    s3: { title: "理论背景——叙述结构", subtitle: "第3章 · Theoretical Background" },
    s4: { title: "文献研究——叙述结构", subtitle: "第4章 · Literature Review" },
    s5: { title: "研究方法——叙述结构", subtitle: "第5章 · Research Methodology" },
    s6: { title: "研究结果——叙述结构", subtitle: "第6章 · Research Results" },
    s7: { title: "讨论——叙述结构", subtitle: "第7章 · Discussion" },
    s8: { title: "结论——叙述结构", subtitle: "第8章 · Conclusion" },
    s9: { title: "IMRaD 整体结构", subtitle: "论文的骨架" },
    s10: { title: "撰写摘要", subtitle: "用 250 词概括" },
    d1: { title: "研究问题与研究空白", subtitle: "要解决什么" },
    d2: { title: "撰写研究问题（RQ）", subtitle: "如何·为何·何种类型" },
    d3: { title: "设计概念框架", subtitle: "概念之间的地图" },
    d4: { title: "操作性定义", subtitle: "使其可测量" },
    d5: { title: "效度", subtitle: "测量是否正确" },
    d6: { title: "信度", subtitle: "测量是否一致" },
    d7: { title: "抽样", subtitle: "调查谁" },
    d8: { title: "预调查·一致性", subtitle: "检查设计" },
    m1: { title: "研究范式", subtitle: "方法背后的世界观" },
    m2: { title: "认识论·本体论", subtitle: "关于知与在的假定" },
    m3: { title: "定量研究概览", subtitle: "测量·统计·因果" },
    m4: { title: "定性研究概览", subtitle: "经验·意义·过程" },
    m5: { title: "混合研究", subtitle: "定量+定性的整合" },
    m6: { title: "扎根理论·现象学", subtitle: "代表性定性方法" },
    m7: { title: "三角验证·溯因", subtitle: "效度与推论" },
    m8: { title: "方法选择的正当化", subtitle: "为何选此方法" },
    r1: { title: "批判性阅读入门", subtitle: "以审稿人的眼光" },
    r2: { title: "寻找弱点① 背景·目的", subtitle: "诊断失分模式" },
    r3: { title: "寻找弱点② 文献·视角", subtitle: "理论视角" },
    r4: { title: "文献综合的类型", subtitle: "综述的四种方式" },
    r5: { title: "阅读定性分析", subtitle: "主题·话语" },
    r6: { title: "饱和·反身性", subtitle: "定性可信度" },
    r7: { title: "批判结果/讨论", subtitle: "解释的分离" },
    a1: { title: "正文内引用", subtitle: "作者-年份" },
    a2: { title: "参考文献列表", subtitle: "References" },
    a3: { title: "DOI·电子资料", subtitle: "链接标注" },
    a4: { title: "直接·间接引用", subtitle: "引号与页码" },
    a5: { title: "表·图", subtitle: "Tables·Figures" },
    a6: { title: "贡献·含义的引用", subtitle: "衔接讨论" },
    w1: { title: "优秀句式① 背景", subtitle: "优秀论文的句子" },
    w2: { title: "优秀句式② 目的·问题", subtitle: "引出 RQ 的句子" },
    w3: { title: "结果只写事实", subtitle: "排除解释" },
    w4: { title: "讨论：So what", subtitle: "将意义与理论衔接" },
    w5: { title: "撰写结论", subtitle: "概括·贡献·后续" },
    w6: { title: "连锁铺垫", subtitle: "连接句子的链条" },
    w7: { title: "厚描述·反身性", subtitle: "定性写作" },
    w8: { title: "贡献·含义句", subtitle: "Theoretical/Practical" },
    t1: { title: "提出概念性问题", subtitle: "即时检查不懂的术语" },
    t2: { title: "写作反馈", subtitle: "初稿辅导" },
    t3: { title: "下一步学习推荐", subtitle: "基于弱点的推荐" },
    t4: { title: "术语自查", subtitle: "复习核心术语" },
    t5: { title: "信度检查", subtitle: "Kappa·一致" },
    "case-basics": { title: "通过3篇真实论文看研究结构", subtitle: "系统方法·实证数据·新知识" },
    "case-design": { title: "拆解3篇论文的研究设计", subtitle: "问题·RQ·变量·抽样" },
    "case-method": { title: "比较3篇论文的研究方法", subtitle: "定量·定性·混合" },
    "case-reading": { title: "按结构阅读3篇论文", subtitle: "IMRaD 导向的批判性阅读" },
  },
};

/**
 * Optional per-lesson body/quiz translation store. Empty by default; entries can
 * be added incrementally as `LESSON_BODY_I18N[locale][lessonId] = { content, quiz }`.
 * When absent, the Korean body/quiz is retained (chrome still localized).
 */
export const LESSON_BODY_I18N: Partial<
  Record<Locale, Record<string, { content?: string; quiz?: Lesson["quiz"] }>>
> = {
  en: { ...(LESSON_BODY_I18N_DATA.en ?? {}) },
  zh: { ...(LESSON_BODY_I18N_DATA.zh ?? {}) },
};

/**
 * Localize a mission/module `label` (and `provides`) coming from the RDOS kernel
 * (`deriveRdosState`), which returns Korean source strings. Matches by module key.
 */
export function localizeMissionLabel(
  key: string,
  field: "label" | "provides",
  fallback: string,
  locale: Locale
): string {
  if (locale === "ko") return fallback;
  const mod = MODULE_I18N[locale]?.[key as ModuleKey];
  if (!mod) return fallback;
  return field === "label" ? mod.label : mod.provides;
}

/** Merge EN/ZH structural translations over the Korean source LessonContent. */
export function localizeLessonContent(
  content: LessonContent,
  locale: Locale
): LessonContent {
  if (locale === "ko") return content;
  const modKey = content.key as ModuleKey;
  const mod = MODULE_I18N[locale]?.[modKey];
  const metaMap = LESSON_META_I18N[locale] ?? {};
  const bodyMap = LESSON_BODY_I18N[locale] ?? {};

  const lessons = content.lessons.map((lesson) => {
    const meta = metaMap[lesson.id];
    const body = bodyMap[lesson.id];
    return {
      ...lesson,
      title: meta?.title ?? lesson.title,
      subtitle: meta?.subtitle ?? lesson.subtitle,
      content: body?.content ?? lesson.content,
      quiz: body?.quiz ?? lesson.quiz,
    };
  });

  return {
    ...content,
    label: mod?.label ?? content.label,
    provides: mod?.provides ?? content.provides,
    intro: mod?.intro ?? content.intro,
    objectives: mod?.objectives ?? content.objectives,
    reward: mod?.reward ?? content.reward,
    lessons,
  };
}
