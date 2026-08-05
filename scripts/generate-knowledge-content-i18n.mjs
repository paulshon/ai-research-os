/**
 * Generates apps/web/lib/rdos/knowledge-content-i18n.ts from source data + translation maps.
 * Run: node scripts/generate-knowledge-content-i18n.mjs
 */
import fs from "fs";
import vm from "vm";
import path from "path";
import { REJECTION_PATTERNS_EXTRA, DESC_SNIPPETS } from "./knowledge-i18n-phrases.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "apps/web/lib/rdos/knowledge-content-i18n.ts");

function loadLessons() {
  const src = fs.readFileSync(path.join(ROOT, "apps/web/lib/rdos/knowledge-lessons.ts"), "utf8");
  const stripped = src.replace(/^import.*$/m, "").replace(/export const KNOWLEDGE_LESSONS: Lesson\[\]/, "const KNOWLEDGE_LESSONS");
  const sandbox = { result: null };
  vm.runInNewContext(stripped + "\n;result = KNOWLEDGE_LESSONS;", sandbox);
  return sandbox.result;
}

function tsString(s) {
  return JSON.stringify(s);
}

function emitQuizArray(quiz) {
  const items = quiz.map((q) => {
    return `      { q: ${tsString(q.q)}, options: [${q.options.map(tsString).join(", ")}], answer: ${q.answer}, explanation: ${tsString(q.explanation)} }`;
  });
  return `[\n${items.join(",\n")}\n    ]`;
}

// ── Static translation data ────────────────────────────────────────────────

const OBJECTIVES_I18N = {
  en: [
    "Explain which question each of the eight thesis chapters answers",
    "Understand 31 core research terms at the level of definition, example, and application",
    "Map the knowledge terrain from research fundamentals through language, thinking, problem, literature, theory, method, design, measurement, analysis, writing, and defense",
    "Connect key concepts in each domain to engines, quests, and lessons",
    "Acquire the academic language system needed to speak about research",
  ],
  zh: [
    "能说明论文八个章节各自回答什么问题",
    "在定义、示例、应用层面理解31个核心研究术语",
    "掌握从研究入门→语言→思维→问题→文献→理论→方法→设计→测量→分析→写作→答辩的知识地形",
    "能将各领域的核心概念与引擎、任务、课程相连接",
    "具备讨论研究所需的学术语言体系",
  ],
};

const MODULES_I18N = {
  en: {
    "L0-1": { domain: "Research Fundamentals", items: ["Definition, purpose, characteristics, and types of research", "The role of the researcher", "Scholarship, knowledge, theory, science, and practice", "Research ethics: plagiarism, duplicate publication, misconduct, IRB", "Graduate research: master's, doctoral, journals, conferences"] },
    "L0-2": { domain: "Research Language", items: ["Research problem, purpose, and questions", "Hypothesis, variables, concepts, constructs, and scales", "Reliability and validity", "Population, sample, mean, variance, SD, correlation, significance", "Qualitative terms: coding, categorization, thematic analysis, triangulation, saturation"] },
    "L0-3": { domain: "Research Thinking", items: ["Critical thinking: assumptions, evidence, logic, fallacies, bias", "Academic thinking: conceptualization, categorization, comparison, analysis, synthesis", "Argumentation: claim, evidence, counterargument, rebuttal", "Systems thinking: causality, feedback, complexity"] },
    "L0-4": { domain: "Research Problem", items: ["Definition and types of problems", "Good vs. poor research problems", "Research gaps: theoretical, methodological, contextual, practical", "Problem statement: background, status, gap, necessity"] },
    "L0-5": { domain: "Literature Review", items: ["Literature search: Scholar, Scopus, WoS, OpenAlex, Crossref", "Literature selection: inclusion/exclusion criteria, PRISMA", "Literature analysis: topic, year, method, findings", "Literature synthesis: narrative, scoping, systematic, meta"] },
    "L0-6": { domain: "Theory", items: ["Theory, model, framework, propositions", "Theory building: concepts, relations, propositions, models", "Theory comparison: strengths, weaknesses, scope of application"] },
    "L0-7": { domain: "Methodology", items: ["Quantitative: experiment, survey, correlation, causation", "Qualitative: phenomenology, grounded theory, case study, narrative, ethnography", "Mixed methods: explanatory, exploratory, convergent", "Specialized: Q methodology, DBR, meta-analysis, content analysis"] },
    "L0-8": { domain: "Research Design", items: ["Research purpose: exploratory, descriptive, explanatory, evaluative", "Research questions: main and sub-questions", "Hypotheses: null, alternative, mediating, moderating", "Sampling: probability and non-probability"] },
    "L0-9": { domain: "Measurement", items: ["Questionnaires: item writing, scale design, piloting", "Interviews: semi-structured, in-depth, focus groups", "Observation: participant and non-participant"] },
    "L0-10": { domain: "Data Analysis", items: ["Descriptive statistics: frequency, mean, standard deviation", "Inferential statistics: t-test, ANOVA, regression, chi-square", "Advanced statistics: SEM, PLS-SEM, HLM, latent growth", "Qualitative analysis: open, axial, selective coding, thematic analysis"] },
    "L0-11": { domain: "Academic Writing", items: ["Introduction: background, problem statement, purpose, questions", "Literature review: theory, prior work, gap", "Methods: participants, instruments, procedure, analysis", "Results and discussion: reporting, interpretation, implications, limitations"] },
    "L0-12": { domain: "Defense", items: ["Examination questions: theory, method, analysis, results", "Presentation: slides, storyline, technique", "Response: counterargument, answer, persuasion"] },
  },
  zh: {
    "L0-1": { domain: "研究入门", items: ["研究的定义·目的·特征·类型", "研究者的角色", "学术·知识·理论·科学·实践", "研究伦理：剽窃·重复发表·研究不端·IRB", "研究生研究：硕士·博士·学术期刊·学术会议"] },
    "L0-2": { domain: "研究语言", items: ["研究问题·研究目的·研究问题", "假设·变量·概念·构念·量表", "信度·效度", "总体·样本·均值·方差·标准差·相关·显著性", "定性术语：编码·范畴化·主题分析·三角验证·饱和"] },
    "L0-3": { domain: "研究思维", items: ["批判性思维：假设·证据·逻辑·谬误·偏见", "学术思维：概念化·范畴化·比较·分析·综合", "论证：主张·证据·反论·再反驳", "系统思维：因果·反馈·复杂性"] },
    "L0-4": { domain: "研究问题", items: ["问题的定义·类型", "好问题 vs 差问题", "研究空白：理论·方法·情境·实践", "问题陈述：背景·现状·空白·必要性"] },
    "L0-5": { domain: "文献研究", items: ["文献检索：Scholar·Scopus·WoS·OpenAlex·Crossref", "文献筛选：纳入·排除标准·PRISMA", "文献分析：主题·年份·方法·结果", "文献综合：叙述性·范围·系统·元分析"] },
    "L0-6": { domain: "理论", items: ["理论·模型·概念框架·命题", "理论构建：概念·关系·命题·模型", "理论比较：优势·弱点·适用范围"] },
    "L0-7": { domain: "研究方法", items: ["定量：实验·调查·相关·因果", "定性：现象学·扎根理论·案例·叙事·民族志", "混合：解释型·探索型·汇聚型", "特殊：Q方法论·设计型研究·元分析·内容分析"] },
    "L0-8": { domain: "研究设计", items: ["研究目的：探索·描述·解释·评估", "研究问题：主问题·子问题", "假设：零假设·备择·中介·调节", "抽样：概率·非概率"] },
    "L0-9": { domain: "测量工具", items: ["问卷：题项编写·量表设计·预试", "访谈：半结构化·深度·焦点小组", "观察：参与·非参与"] },
    "L0-10": { domain: "资料分析", items: ["基础统计：频数·均值·标准差", "推断统计：t检验·ANOVA·回归·卡方", "高级统计：SEM·PLS-SEM·HLM·潜变量增长", "定性分析：开放·轴心·选择性编码·主题分析"] },
    "L0-11": { domain: "论文写作", items: ["引言：背景·问题提出·目的·问题", "文献综述：理论·先行研究·空白", "研究方法：对象·工具·程序·分析", "结果·讨论：描述·解释·启示·局限"] },
    "L0-12": { domain: "论文答辩", items: ["答辩问题：理论·方法·分析·结果", "发表：幻灯片·叙事线·技巧", "应对：反驳·回答·说服"] },
  },
};

const CHAPTERS_I18N = {
  en: {
    ch1: { ko: "Research Background", role: "Why? (why)", principle: "Era of change → prior research trends → research limitations → research gap → research necessity → research purpose", desc: "A funnel structure that moves from macro social and technological change to a concrete research gap. Designed so readers naturally accept why this study is needed." },
    ch2: { ko: "Research Purpose & Questions", role: "What? (what)", principle: "One core purpose + 3–4 sub-purposes + 2–4 RQs arranged hierarchically", desc: "Research purpose is the compass for the entire thesis; research questions (RQs) break purpose into operational inquiries. Good RQs ask how, why, or what type—not yes/no." },
    ch3: { ko: "Theoretical Background", role: "With what lens? (with what lens)", principle: "Raise conceptual problem → define concepts → organize theoretical system → research trends → compare and critique theories → integrate concepts → derive analytical framework", desc: "Not a list of theories but an argument for which theoretical lens views the phenomenon. A seven-step process yields the theoretical framework." },
    ch4: { ko: "Literature Review", role: "What was done? (what was done)", principle: "Early research → developmental lineage → recent trends → limitations of prior work → explicit derivation of research gap", desc: "Cross time (history) and theme (perspective) to map the prior-research terrain and derive the gap. If theoretical background is the lens, literature review is the landscape." },
    ch5: { ko: "Research Methodology", role: "How? (how)", principle: "Research paradigm → research design (RQ–method alignment) → data collection → analysis methods and procedures → validity → research ethics", desc: "Goes beyond what was done to justify why this method. Examiners look for rationale for method choice, reproducibility, and validity handling." },
    ch6: { ko: "Research Results", role: "What was found? (what was found)", principle: "Analysis overview → data characteristics → primary analysis → secondary analysis → key findings → summary of results", desc: "Present only what the data show, deferring interpretation and discussion. Mixing interpretation into results loses marks." },
    ch7: { ko: "Discussion", role: "Why so, and so what? (why and so what)", principle: "Interpret key findings → compare with prior research → state theoretical contribution → practical implications → limitations → directions for future research", desc: "Connect findings to theory and establish scholarly contribution. Must answer the examiner's one question—So what?—at the paragraph level." },
    ch8: { ko: "Conclusion", role: "What legacy? (legacy)", principle: "Research summary → emphasize key findings → theoretical contribution → practical implications → limitations → future research", desc: "Compress the whole thesis to leave scholarly legacy. Four principles: no new information; consistency between introduction purpose and conclusion contribution; balance; a strong closing sentence." },
  },
  zh: {
    ch1: { ko: "研究背景", role: "为什么？（why）", principle: "时代变化 → 既有研究动向 → 研究局限 → 研究空白 → 研究必要性 → 研究目的", desc: "从宏观社会·技术变化出发、逐步收窄至具体研究空白的漏斗结构。让读者自然接受「为何需要这项研究」。" },
    ch2: { ko: "研究目的及研究问题", role: "做什么？（what）", principle: "核心目的（1个）+ 细分目的（3–4个）+ 研究问题 2–4 个，按层级排列", desc: "研究目的是全篇设计的指南针；研究问题（RQ）将目的分解为可操作的问题。好的 RQ 问如何·为何·何种类型，而非是/否。" },
    ch3: { ko: "理论背景", role: "用什么框架？（with what lens）", principle: "提出概念问题 → 概念定义 → 理论体系整理 → 研究动向 → 理论比较·批判 → 概念整合 → 导出分析框架", desc: "不是罗列理论，而是论证「以何种理论透镜看待现象」。七步过程导出理论框架（Theoretical Framework）。" },
    ch4: { ko: "文献研究", role: "既往如何？（what was done）", principle: "早期研究 → 发展脉络 → 近期动向 → 既有研究局限 → 明确导出研究空白", desc: "交叉时间轴（历史）与主题轴（视角）绘制先行研究地形图并导出空白。理论背景是「透镜」，文献研究是「地形（landscape）」。" },
    ch5: { ko: "研究方法", role: "如何做？（how）", principle: "研究范式 → 研究设计（RQ–方法对应）→ 资料收集 → 分析方法·程序 → 效度保障 → 研究伦理", desc: "超越「做了什么」而正当化「为何用此方法」。评审关注方法选择理由·可重复性·效度处理三方面。" },
    ch6: { ko: "研究结果", role: "发现了什么？（what was found）", principle: "分析概览 → 数据特征 → 一次分析 → 二次分析 → 核心结果 → 结果摘要", desc: "暂搁置解释与讨论，系统呈现数据所示事实。结果中混入解释会被扣分。" },
    ch7: { ko: "讨论", role: "为何如此、有何意义？（why and so what）", principle: "核心发现解读 → 与先行研究比较 → 明确理论贡献 → 实践启示 → 研究局限 → 后续研究方向", desc: "将结果意义与理论连接以确立学术贡献。须在段落层面回答评审唯一问题：So what?" },
    ch8: { ko: "结论", role: "留下了什么？（legacy）", principle: "研究摘要 → 强调核心发现 → 理论贡献 → 实践启示 → 研究局限 → 后续研究", desc: "压缩全篇以留下学术遗产。四大原则：禁止新信息；引言目的与结论贡献一致；平衡；有力的末句。" },
  },
};

const TERMS_I18N = {
  en: {
    "term-1": { ko: "Research Gap", definition: "An area of scholarly omission or insufficient coverage in prior research.", analogy: "Analogy: uncharted territory on the map of existing AI research. If prior work thoroughly analyzed AI's technical performance but not how the general public perceives AI-created works—that unexplored area is the research gap.", usage: "Key step in the research background: prior studies addressed X but not Y. This is the gap the present study fills." },
    "term-2": { ko: "Research Question, RQ", definition: "Research purpose converted into concrete, investigable questions—the core questions the entire study must answer.", analogy: "Analogy: destinations on a research journey. If RQ1 asks how many routes exist from Seoul to Busan, RQ2 asks what characterizes each route, and RQ3 asks which route is most efficient—they build cumulatively.", usage: "Good RQs are not yes/no; they take the form of how, why, or what type." },
    "term-3": { ko: "Theoretical Framework, Analytical Framework", definition: "The conceptual and theoretical structure used to analyze phenomena in a study—it determines which lens is applied.", analogy: "Analogy: a camera lens. The same subject looks different through wide-angle vs. telephoto. Using Boden's creativity typology as a framework, AI creation can be viewed as exploratory, combinatorial, or transformational.", usage: "At the end of the theoretical background, explicitly present the integrated analytical framework for this study." },
    "term-4": { ko: "Literature Review / Prior Research Review", definition: "The systematic review, analysis, and synthesis of existing scholarly work related to the research topic.", analogy: "Analogy: mapping the scholarly terrain. Like reading a topographic map before climbing, researchers map which topic areas are well developed and which remain undeveloped.", usage: "The goal is not mere summary but to derive what has not yet been studied in the field." },
    "term-5": { ko: "Research Paradigm", definition: "A philosophical stance on how the researcher understands the world and knowledge—e.g., interpretivism, positivism, critical theory.", analogy: "Analogy: a worldview. Positivism holds objective truth exists and is measurable (favoring quantitative research); interpretivism holds truth is subjectively constructed (favoring qualitative research). The same AI creation phenomenon may be studied via survey (positivist) or interview (interpretivist).", usage: "State at the start of methodology that this study is grounded in [paradigm] to strengthen overall methodological coherence." },
    "term-6": { ko: "Validity", definition: "The degree to which a study actually measures what it intends to measure.", analogy: "Analogy: scale accuracy. Measuring height when you intend to measure weight lacks validity. Measuring general AI attitudes when you intend to measure AI creation perception is a validity problem.", usage: "In qualitative research, validity is strengthened through member checking and triangulation." },
    "term-7": { ko: "Reliability", definition: "The consistency of results when the study is repeated under the same conditions—the consistency of measurement.", analogy: "Analogy: a repeatable recipe. A restaurant is reliable if the same dish tastes the same every time. In coding studies, high inter-coder agreement (high Cohen's kappa) indicates high internal reliability.", usage: "Cohen's kappa ≥ .80 is recognized as almost perfect agreement—high reliability." },
    "term-8": { ko: "Triangulation", definition: "A strategy to cross-verify findings using multiple data sources, methods, researchers, or theories to increase credibility.", analogy: "Analogy: when interview, observation, and document analysis yield the same conclusion, the study's validity is strengthened.", usage: "In methodology, specify researcher triangulation (two independent analysts) or data triangulation (multiple sources)." },
    "term-9": { ko: "Purposive Sampling", definition: "A sampling method in which the researcher intentionally selects participants who best fit the research purpose.", analogy: "Analogy: audition judges selecting genre specialists. Selecting YouTube comments with 100+ AI-art-related comments uploaded after 2023 is purposive sampling.", usage: "Most common in qualitative research; selection criteria must be clearly stated for justification." },
    "term-10": { ko: "Thematic Analysis", definition: "A qualitative method that inductively identifies and categorizes recurring patterns and themes in data.", analogy: "Analogy: sorting travel photos into sea, mountain, food, and people. From thousands of comments, common themes such as tool perception, artistry debate, and ethical concern are identified.", usage: "Citing Braun & Clarke's (2006) six-step procedure (familiarization → initial codes → theme search → theme review → theme naming → report) strengthens methodological credibility." },
    "term-11": { ko: "Multidimensional Scaling (MDS)", definition: "A statistical method that visualizes similarity or distance between data points in two- or three-dimensional space.", analogy: "Analogy: drawing a map of inter-city distances using only distance information—similarly visualizing epistemological distance between AI creation perception types.", usage: "MDS results appear as coordinate plots; closer distance means more similar perception, farther means more opposing." },
    "term-12": { ko: "Q Methodology", definition: "A mixed method that identifies subjective perception types by having participants sort statement cards subjectively.", analogy: "Analogy: a personal taste map. Placing food cards from most to least liked reveals taste types; sorting AI-creation statements reveals perception types.", usage: "Suitable for mixed qualitative–quantitative research; perception types can be derived with relatively few participants (20–50)." },
    "term-13": { ko: "Conceptual Framework", definition: "A structural diagram of core concepts and their relationships in a study—the final product of the theoretical background.", analogy: "Analogy: an architectural blueprint. Before building, spaces and connections are drawn; before research, how key concepts (creation, AI, perception, type) connect is diagrammed.", usage: "Visualizing as 'Figure 2-1. Conceptual Framework of This Study' greatly improves examiner comprehension." },
    "term-14": { ko: "Operationalization", definition: "Converting abstract concepts into concrete forms measurable and analyzable in actual research.", analogy: "Analogy: to measure happiness, operationalize as 'number of smiles in the past month.' The abstract concept 'public perception' must be operationalized as linguistic expression patterns in YouTube comments.", usage: "In the theoretical background, explicitly state 'In this study, X is defined as Y.'" },
    "term-15": { ko: "Generalizability", definition: "The extent to which findings from a specific study can be applied to broader populations or other contexts.", analogy: "Analogy: judging an entire region's cuisine from one restaurant review. Generalizing 100 YouTube comments to all Koreans' AI perceptions is excessive; scope must match the data.", usage: "In the conclusion, state limitations: 'Results are limited to X; generalization to Y requires further research.'" },
    "term-16": { ko: "Reflexivity / Researcher Positionality", definition: "Recognizing and reflecting on how the researcher's background, perspective, and bias may influence the research process and findings.", analogy: "Analogy: a judge aware that personal experience may affect a verdict. A researcher favorable to AI art may more easily code positive expressions; acknowledging this and cross-checking demonstrates reflexivity.", usage: "A separate Researcher Positionality section in qualitative methodology increases scholarly credibility." },
    "term-17": { ko: "Theoretical Contribution", definition: "How the study extends, revises, or newly proposes existing theory or conceptual understanding.", analogy: "Analogy: adding a new road to an existing map. If Boden's creativity typology applied only to human creation, applying it to AI creation audience perception extends the theory's scope.", usage: "In discussion and conclusion, explicitly state how the study extends, revises, or newly proposes aspect Y of theory X." },
    "term-18": { ko: "Practical Implications", definition: "Concrete implications of findings for practice, policy, or social action.", analogy: "Analogy: applying lab results to hospital treatment. Finding three AI creation perception types implies platforms should use different communication strategies for each user type.", usage: "In discussion and conclusion, separate and clearly state theoretical contribution and practical implications." },
    "term-19": { ko: "Pilot Study", definition: "A small-scale trial conducted before the main study to review design and methodological issues in advance.", analogy: "Analogy: a preview screening before broadcast. Distributing 10 questionnaires to check item comprehension or testing a coding scheme on 100 comments is a pilot study.", usage: "Stating that coding reliability was pre-validated through a pilot study increases methodological rigor." },
    "term-20": { ko: "Institutional Review Board (IRB)", definition: "An institution that reviews and approves research protocols to protect participants' rights and safety in human subjects research.", analogy: "Analogy: a building permit. Like obtaining permission before construction, human-subjects research (interviews, surveys, observation) requires IRB approval before starting.", usage: "Citing IRB approval number 2023-XXX in methodology officially demonstrates ethical compliance." },
    "term-21": { ko: "Cohen's Kappa", definition: "A statistic (0–1) measuring agreement when two raters (coders) independently classify the same data.", analogy: "Analogy: two examiners grading independently. κ=1.0 is perfect agreement; κ=0 is chance level. κ≥.80 is almost perfect; κ=.60–.79 is substantial.", usage: "Report Cohen's kappa κ=.84, p<.001 with statistical significance when reporting coding reliability in qualitative research." },
    "term-22": { ko: "Abductive Reasoning", definition: "Inferring the hypothesis that best explains observed phenomena—logic between induction (data → theory) and deduction (theory → data).", analogy: "Analogy: a physician's diagnosis. Observing symptoms and inferring the most plausible diagnosis; observing data patterns and inferring which theory best explains them.", usage: "In mixed or exploratory studies, state that the study follows abductive logic—explaining data-derived patterns with existing theory." },
    "term-23": { ko: "Saturation (Data / Theoretical Saturation)", definition: "In qualitative research, the point when no new themes or codes emerge—criteria for stopping data collection.", analogy: "Analogy: a laundry basket saturated with water—adding more yields no absorption. When interviews no longer produce new themes, theoretical saturation is reached.", usage: "State in methodology: 'From the 15th interview, no new themes emerged; theoretical saturation was confirmed and data collection ended.'" },
    "term-24": { ko: "Thick Description", definition: "Geertz's (1973) concept: describing meaning and context richly, beyond surface behavior.", analogy: "Analogy: thin description is 'a woman winked'; thick description is 'a woman winked as a disguised signal to an accomplice.' In research: not merely 'positive comment' but context, why, and intent of positivity.", usage: "Qualitative results with specific quotes and context alongside numbers achieve thick description." },
    "term-25": { ko: "Mixed Methods Research", definition: "A research design integrating qualitative and quantitative methods in one study.", analogy: "Analogy: stereo sound—left speaker (quantitative: statistics) and right speaker (qualitative: interviews) together produce richer understanding. Survey broadly, interview deeply on AI creation perception.", usage: "Choose and specify one design type: sequential (qual → quant), concurrent (quant + qual), or transformative (theory-centered)." },
    "term-26": { ko: "Member Checking", definition: "A validity technique in qualitative research: showing interpretations and conclusions to participants for accuracy confirmation.", analogy: "Analogy: having a native speaker verify a translation. After coding interviews, asking participants 'I interpreted it this way—is that correct?' A participant confirming 'Yes, I see AI only as a tool' increases validity.", usage: "State in methodology: 'Member checking with five participants was conducted to verify accuracy of findings.'" },
    "term-27": { ko: "Grounded Theory", definition: "Glaser & Strauss's (1967) qualitative methodology—inductively generating theory from data.", analogy: "Analogy: inventing a recipe from available ingredients rather than following an existing one. Building perception theory from comment data without prior theory.", usage: "Specify grounded theory when inductively building theory without a pre-set theoretical framework." },
    "term-28": { ko: "Phenomenology", definition: "A qualitative methodology exploring how participants experience a phenomenon and construct its meaning.", analogy: "Analogy: different viewers experiencing the same film differently. Exploring each person's inner experience when first encountering AI-created work and the essential structure of that experience.", usage: "Phenomenological studies use bracketing to suspend researcher presuppositions and focus on participant experience." },
    "term-29": { ko: "Discourse Analysis", definition: "Analyzing how language produces meaning in social context and reflects power relations.", analogy: "Analogy: reading the power map hidden in language. Calling AI a 'tool' vs. a 'creator' in news reflects different power relations and worldviews.", usage: "Applied to AI creation news, policy documents, and online comments via critical discourse analysis (CDA)." },
    "term-30": { ko: "Epistemology", definition: "A branch of philosophy exploring the nature, scope, and limits of knowledge—how we can know.", analogy: "Analogy: finding the source of the river of knowledge. Positivist epistemology: knowledge only through observation and measurement; interpretivist: knowledge through meaning construction. Analyzing how the public knows AI creation is an epistemological approach.", usage: "In theoretical background, state that the study analyzes how the public constructs knowledge of AI creation from an epistemological perspective." },
    "term-31": { ko: "Ontology", definition: "Philosophical inquiry into the nature of reality—what exists and what is the essence of existence.", analogy: "Analogy: answering what the world is. Objectivist ontology: reality exists independently of observers; constructivist: reality is socially constructed. Asking whether AI creation is 'real art' is an ontological question.", usage: "When discussing research paradigm, connect: 'The ontological stance of this study is X, and the epistemology based on it is Y.'" },
  },
  zh: {
    "term-1": { ko: "研究空白", definition: "既有研究未涉及或未能充分涉及的学术空白领域。", analogy: "比喻：既有 AI 研究地图上尚未勘探的空白地带。若既有研究充分分析了 AI 的技术性能，但未研究普通大众如何感知 AI 创作——该未探索区域即为 Research Gap。", usage: "研究背景的核心步骤：既有研究处理了 X 但未处理 Y。这是本研究要填补的空白。" },
    "term-2": { ko: "研究问题，RQ", definition: "将研究目的转化为可探究的具体问题形式——全篇须回答的核心问题。", analogy: "比喻：研究之旅的目的地。若 RQ1 问从首尔到釜山有几条路，RQ2 问各条路的特征，RQ3 问哪条路更高效——逐层构建。", usage: "好的 RQ 不以是/否作答，而采用如何·为何·何种类型的形式。" },
    "term-3": { ko: "理论框架，分析框架", definition: "研究中用于分析现象的概念·理论结构——决定以何种透镜观察现象。", analogy: "比喻：相机镜头。同一对象用广角与长焦看起来不同。以 Boden 创造力类型论为框架，可将 AI 创作视为探索型/组合型/变换型。", usage: "在理论背景末段明确呈现整合后的本研究分析框架。" },
    "term-4": { ko: "文献研究/先行研究综述", definition: "系统检索·分析·综合与研究主题相关的既有学术研究的 process。", analogy: "比喻：绘制学术地图。如同登山前看地形图，研究前须掌握该领域研究地形——哪些主题已充分开发、哪些尚待开发。", usage: "文献研究的目标不是简单摘要，而是导出该领域尚未研究的内容。" },
    "term-5": { ko: "研究范式", definition: "研究者理解世界与知识的哲学立场——如解释主义、实证主义、批判理论等。", analogy: "比喻：世界观。实证主义认为存在可测量的客观真理（偏好定量）；解释主义认为真理由人主观建构（偏好定性）。同一 AI 创作现象，实证主义者用问卷、解释主义者用访谈分析。", usage: "在方法论开篇声明本研究基于［范式］，可提升方法论整体一致性。" },
    "term-6": { ko: "效度", definition: "研究是否准确测量其欲测量内容的程度。", analogy: "比喻：秤的准确性。欲测体重却测身高则无效度。欲分析 AI 创作感知却测量一般 AI 态度则出现效度问题。", usage: "定性研究中通过成员检验（Member Checking）、三角验证（Triangulation）保障效度。" },
    "term-7": { ko: "信度", definition: "在相同条件下重复研究时结果一致的程度——测量的一致性。", analogy: "比喻：可重复的食谱。同样材料与方法每次做出同样味道，餐厅信度高。编码研究中两名研究者独立编码结果一致（高 Cohen's kappa）则内部信度高。", usage: "Cohen's kappa ≥ .80 被视为几乎完全一致（Almost Perfect Agreement），信度高。" },
    "term-8": { ko: "三角验证", definition: "为提升研究可信度，使用多种资料来源、方法、研究者或理论交叉验证结果的策略。", analogy: "比喻：访谈+观察+文献分析得出相同结论，则研究效度增强。", usage: "在方法论中说明研究者三角验证（两人独立分析）或资料三角验证（多来源）。" },
    "term-9": { ko: "目的抽样", definition: "研究者有意选择最符合研究目的的对象的抽样方法。", analogy: "比喻： audition 评委只选某流派专家。按「AI 艺术相关评论 100 条以上、2023 年后上传」选样即为目的抽样。", usage: "定性研究中最常用；须明确呈现选择标准以正当化。" },
    "term-10": { ko: "主题分析", definition: "在定性数据中归纳识别并分类重复出现模式与主题的分析方法。", analogy: "比喻：整理旅行照片为海、山、食物、人物。从数千条评论中找出工具感知、艺术性争论、伦理担忧等共同主题。", usage: "引用 Braun & Clarke（2006）六步程序（熟悉化→初始编码→主题探索→主题审查→主题命名→报告）可提升方法论可信度。" },
    "term-11": { ko: "多维尺度分析", definition: "将数据间相似性·距离在二维或三维空间可视化的统计分析方法。", analogy: "比喻：仅用城市间距离信息绘制地图； likewise 将 AI 创作感知类型间的认识论距离空间化可视化。", usage: "MDS 结果以坐标图呈现；距离越近感知越相似，越远越对立。" },
    "term-12": { ko: "Q 方法论", definition: "为识别个人主观感知类型，让参与者主观分类陈述卡片的混合研究方法。", analogy: "比喻：个人口味地图。将食物卡片从最喜欢到最不喜欢排列可揭示口味类型；排列 AI 创作陈述卡片可揭示感知类型。", usage: "适合定性-定量混合研究；较少参与者（20–50 人）亦可导出感知类型。" },
    "term-13": { ko: "概念框架", definition: "研究核心概念及其关系的结构化图示——理论背景的最终产出。", analogy: "比喻：建筑设计图。建前绘制各空间位置与连接；研究前图示核心概念（创作、AI、感知、类型）如何连接。", usage: "以「图 2-1 本研究概念框架」可视化可大幅提升评审理解度。" },
    "term-14": { ko: "操作化定义", definition: "将抽象概念转化为实际研究中可测量·可分析的具体形式。", analogy: "比喻：测幸福须操作化为「近一月微笑次数」。「大众感知」须操作化为 YouTube 评论中的语言表达模式方可分析。", usage: "在理论背景中明确「本研究将 X 定义为 Y」。" },
    "term-15": { ko: "可推广性", definition: "特定研究结果应用于更广泛群体或其他情境的程度。", analogy: "比喻：用一家餐厅评价判断整区餐饮水平。将 100 条 YouTube 评论推广为全体韩国人 AI 感知过度；推广范围应限制在数据范围内。", usage: "结论中声明局限：「本研究结果限于 X，推广至 Y 群体须进一步研究。」" },
    "term-16": { ko: "反身性/研究者位置性", definition: "认识并反思研究者背景、视角、偏见对研究过程与结果的可能影响。", analogy: "比喻：法官认识个人经历可能影响判决。 favor AI 艺术的研究者更易编码积极表达；认识并公开、交叉检验即反身性。", usage: "定性方法论中单独设研究者位置性（Researcher Positionality）章节可提升学术可信度。" },
    "term-17": { ko: "理论贡献", definition: "研究如何扩展、修正或新提出既有理论或概念理解。", analogy: "比喻：在既有地图上添加新路。若 Boden 创造力类型论仅用于人类创作，将其用于 AI 创作受众感知分析即扩展理论适用范围。", usage: "讨论与结论中明确「本研究在理论层面扩展/修正/新提出 X 理论的 Y 方面」。" },
    "term-18": { ko: "实践启示", definition: "研究结果对现场、政策、社会实践提供的具体启示。", analogy: "比喻：将实验室成果用于临床治疗。发现三种 AI 创作感知类型意味着平台应对三类用户采用不同沟通策略。", usage: "讨论与结论中将理论贡献与实践启示分开、分别明确陈述。" },
    "term-19": { ko: "预试研究", definition: "正式研究前小规模进行，预先审查研究设计·方法论问题的试验研究。", analogy: "比喻：播出前试映。先发放 10 份问卷检验题项理解度，或用 100 条评论测试编码体系。", usage: "方法论中说明通过预试研究预先验证编码体系信度，可提升严谨性。" },
    "term-20": { ko: "机构审查委员会（IRB）", definition: "在人类受试研究中审查·批准研究方案以保护参与者权利与安全的机构。", analogy: "比喻：建筑许可。建前须获许可；以人为对象的研究（访谈、问卷、观察等）开始前须获 IRB 批准。", usage: "方法论中注明取得 IRB 批准号 2023-XXX 可正式证明遵守研究伦理。" },
    "term-21": { ko: "Cohen's Kappa", definition: "两名评估者（编码者）独立分类同一数据时一致度的统计量，取值 0–1。", analogy: "比喻：两名考官独立评分的一致程度。κ=1.0 完全一致；κ=0 为偶然水平。κ≥.80 为几乎完全一致；κ=.60–.79 为 substantial。", usage: "定性研究报告编码信度时一并呈现 Cohen's kappa κ=.84, p<.001 及统计显著性。" },
    "term-22": { ko: "溯因推理", definition: "推断最能解释观察现象的假说的方式——归纳（数据→理论）与演绎（理论→数据）之间的中间逻辑。", analogy: "比喻：医生诊断。据症状推断最 plausible 病名；研究者观察数据模式并推断最能解释该模式的理论。", usage: "混合或探索性研究中可声明本研究遵循溯因逻辑——用既有理论解释数据导出的模式。" },
    "term-23": { ko: "饱和（资料/理论饱和）", definition: "定性研究中不再出现新主题或编码的状态——可停止资料收集的标准。", analogy: "比喻：洗衣篮水已饱和，再加水无法吸收。访谈不再产生新主题时即达理论饱和。", usage: "方法论中说明「自第 15 次访谈起无新主题出现，确认理论饱和并结束资料收集。」" },
    "term-24": { ko: "厚描述", definition: "Geertz（1973）提出的概念：超越行为表面，丰富叙述其意义与情境。", analogy: "比喻：薄描述为「某女眨了眼」；厚描述为「某女为向同伙发信号而佯装玩笑地眨眼」。研究中：非仅「积极评论」，而述何种情境、为何、何种意图下积极表达。", usage: "定性结果叙述时以具体引文与情境配合数值即构成厚描述。" },
    "term-25": { ko: "混合方法研究", definition: "在一项研究中整合定性研究与定量研究的研究设计。", analogy: "比喻：立体声——左声道（定量：统计）与右声道（定性：访谈）同时运作时理解更丰富。问卷广泛探索、访谈深入理解 AI 创作感知。", usage: "选择并明确一种设计：顺序（定性→定量）、同时（定量+定性）或变革（理论中心）。" },
    "term-26": { ko: "成员检验", definition: "定性研究中将研究者解释与结论展示给参与者以确认准确性的效度验证方法。", analogy: "比喻：请母语者核对译文。编码访谈后问参与者「我这样理解对吗？」参与者确认「对，我只把 AI 当工具」则效度提高。", usage: "方法论中说明「为验证分析准确性，对 5 名参与者进行成员检验。」" },
    "term-27": { ko: "扎根理论", definition: "Glaser & Strauss（1967）发展的定性方法论——从数据中归纳生成理论。", analogy: "比喻：用现有食材现场发明食谱而非照既有食谱。无先行理论，仅从评论数据构建感知理论。", usage: "不预设理论框架、归纳构建理论的研究中明确扎根理论为方法论。" },
    "term-28": { ko: "现象学研究", definition: "探究参与者如何经验特定现象并如何建构其意义的定性方法论。", analogy: "比喻：同看一电影者各有不同感动。探究首次见 AI 创作物时各自的内在经验及该经验的本体结构。", usage: "现象学研究以括弧（Bracketing）暂搁研究者成见，聚焦参与者经验本身。" },
    "term-29": { ko: "话语分析", definition: "分析语言在社会情境中如何生产意义并反映权力关系的方法。", analogy: "比喻：阅读语言中隐藏的权力地图。报道中将 AI 称为「工具」与「创作者」反映不同权力关系与世界观。", usage: "用于 AI 创作相关新闻报道、政策文件、在线评论的批判性话语分析（CDA）。" },
    "term-30": { ko: "认识论", definition: "探究知识本质、范围、限度的哲学分支——我们如何认识。", analogy: "比喻：寻找知识之河的源头。实证主义认识论：仅通过观察与测量获得知识；解释主义：通过意义建构获得知识。分析大众如何「知道」AI 创作即认识论进路。", usage: "理论背景中可声明本研究从认识论视角分析大众 AI 创作知识建构方式。" },
    "term-31": { ko: "存在论", definition: "关于实在（reality）本质的哲学研究——何物存在、存在本质为何。", analogy: "比喻：回答世界是什么。客观主义存在论：实在独立于观察者存在；构成主义：实在由社会建构。「AI 创作是否真艺术」即追问艺术存在论本质。", usage: "讨论研究范式时可连贯陈述：「本研究存在论立场为 X，基于此的认识论为 Y。」" },
  },
};

// Chapter name mapping for quiz translation
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

// Rejection pattern translations
const REJECTION_PATTERNS = {
  en: { ...REJECTION_PATTERNS_EXTRA.en,
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
  zh: { ...REJECTION_PATTERNS_EXTRA.zh,
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

// Build comprehensive term lookups from knowledge-core.ts
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
  const koAnalogyToId = {};
  for (const t of terms) {
    koDefToId[t.definition] = t.id;
    koUsageToId[t.usage] = t.id;
    koAnalogyToId[t.analogy.replace(/^비유: /, "")] = t.id;
  }
  return { terms, koDefToId, koUsageToId, koAnalogyToId };
}

const { terms: CORE_TERMS, koDefToId, koUsageToId, koAnalogyToId } = buildCoreTerms();

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
const CORE_CHAPTERS = buildCoreChapters();

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
  },
};

function translateKoText(text, locale) {
  if (!text || locale === "ko") return text;
  let out = text;
  // Longest-first replacement for term fields
  const pairs = [];
  for (const t of CORE_TERMS) {
    const tr = TERMS_I18N[locale]?.[t.id];
    if (!tr) continue;
    pairs.push([t.definition, tr.definition]);
    pairs.push([t.usage, tr.usage]);
    pairs.push([t.analogy.replace(/^비유: /, ""), tr.analogy.replace(/^(Analogy:|比喻：) /, "")]);
    pairs.push([t.analogy, tr.analogy]);
  }
  for (const [ko, tr] of Object.entries(EXTRA_PHRASES[locale] || {})) {
    pairs.push([ko, tr]);
  }
  for (const [ko, tr] of Object.entries(DESC_SNIPPETS[locale] || {})) {
    pairs.push([ko, tr]);
  }
  for (const [id, chTr] of Object.entries(CHAPTERS_I18N[locale] || {})) {
    const core = CORE_CHAPTERS[id];
    if (core) {
      pairs.push([core.role, chTr.role]);
      pairs.push([core.principle, chTr.principle]);
      pairs.push([core.desc, chTr.desc]);
    }
  }
  for (const [ko, tr] of Object.entries(REJECTION_PATTERNS[locale] || {})) {
    pairs.push([ko, tr]);
  }
  pairs.sort((a, b) => b[0].length - a[0].length);
  for (const [ko, tr] of pairs) {
    if (ko && out.includes(ko)) out = out.split(ko).join(tr);
  }
  return out;
}

function termOptionLabel(koLabel, locale) {
  // Match "English (Korean)" or "English (Korean) (Extra)"
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
  const rp = REJECTION_PATTERNS[locale]?.[ko];
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
  const zh = locale === "zh";
  let q = koQ.q;
  let explanation = koQ.explanation;

  // Rejection pattern question
  const rejMatch = q.match(/다음은 「(.+?)」 장에서 지적되는 문제입니다\. 어떤 탈락 패턴인가요\?/);
  if (rejMatch) {
    const chKo = rejMatch[1];
    const chName = en ? (CHAPTER_KO_TO_EN[chKo] || chKo) : (CHAPTER_KO_TO_ZH[chKo] || chKo);
    const tail = koQ.q.split("\n").slice(1).join("\n");
    q = en
      ? `The following is a problem noted in the 「${chName}」 section. Which rejection pattern is it?\n${translateKoText(tail, locale)}`
      : `以下是「${chName}」章节指出的问题。属于哪种失分模式？\n${translateKoText(tail, locale)}`;
  }

  // Definition question
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

  // Term definition MCQ
  const termDefMatch = q.match(/「(.+?)」의 정의로 가장 적절한 것은\?/);
  if (termDefMatch) {
    const label = termDefMatch[1];
    q = en ? `Which is the best definition of 「${label}」?` : `「${label}」的最佳定义是？`;
  }

  // Term usage MCQ
  const usageMatch = q.match(/「(.+?)」을\(를\) 논문에서 활용하는 방식으로 옳은 것은\?/);
  if (usageMatch) {
    const label = usageMatch[1];
    q = en ? `Which is the correct way to use 「${label}」 in a thesis?` : `在论文中正确使用「${label}」的方式是？`;
  }

  // Analogy question
  const analMatch = q.match(/다음 비유가 설명하는 개념은\?\n"(.+?)"/);
  if (analMatch) {
    const analTr = translateKoText(analMatch[1], locale);
    q = en
      ? `Which concept does the following analogy describe?\n"${analTr}"`
      : `下列比喻说明的概念是？\n"${analTr}"`;
  }

  // True/false
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

  // Good pattern question
  const goodMatch = q.match(/「(.+?)」 장에서 '좋은 평가'를 받는 서술 패턴은\?/);
  if (goodMatch) {
    const chKo = goodMatch[1];
    const chName = en ? (CHAPTER_KO_TO_EN[chKo] || chKo) : (CHAPTER_KO_TO_ZH[chKo] || chKo);
    q = en ? `Which narrative pattern receives a 'good evaluation' in the 「${chName}」 section?` : `在「${chName}」章节中，哪种叙述模式会获得「好评价」？`;
    if (explanation.includes("권장되는")) {
      const pat = explanation.match(/「(.+?)」/)?.[1];
      const patTr = pat ? (REJECTION_PATTERNS[locale]?.[pat] || pat) : "";
      explanation = en ? `「${patTr}」 is a recommended good narrative pattern.` : `「${patTr}」是推荐的好叙述模式。`;
    }
  }

  const options = koQ.options.map((o) => translateOption(o, locale));

  explanation = translateKoText(explanation, locale);
  q = translateKoText(q, locale);
  // Fix "TermName: definition" prefix explanations
  for (const t of CORE_TERMS) {
    const tr = TERMS_I18N[locale]?.[t.id];
    if (!tr) continue;
    if (explanation.includes(`${t.en} (${t.ko})`)) {
      explanation = explanation.replace(`${t.en} (${t.ko})`, locale === "en" ? t.en : `${tr.ko} (${t.en})`);
    }
    if (explanation.startsWith(`${t.en}:`)) {
      explanation = `${t.en}: ${tr.definition}`;
    }
  }

  return { q, options, answer: koQ.answer, explanation };
}

// Content HTML translation helpers
function translateContentHtml(koHtml, locale, lessonId) {
  const mod = MODULES_I18N[locale]?.[lessonId];
  if (!mod) return koHtml;

  const en = locale === "en";
  const domain = mod.domain;
  const items = mod.items;

  // Build structured EN/ZH content from module items + key terms
  const intro = en
    ? `<div class="easy">The 「${domain}」 domain is one of 12 knowledge areas dividing the full thesis guide. The items below are essentials for this domain. Rather than memorizing terms, read while recalling "where each item applies in my research."</div>`
    : `<div class="easy">「${domain}」领域是将整份论文指南划分为 12 个知识领域之一。下列为本领域必知要点。不要死记术语，阅读时联想「各要点在我研究中何处运用」。</div>`;

  const itemsHeader = en ? "<h3>What you learn in this domain</h3>" : "<h3>本领域学习内容</h3>";
  const itemsList = `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  // Preserve term blocks from Korean by translating key sections
  let body = koHtml;

  // Replace Korean section headers
  const replacements = en
    ? [
        ["이 도메인에서 배우는 것", "What you learn in this domain"],
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
        ["처음 보는 용어라면 이름 자체보다 \"이게 왜 필요한가\"를 먼저 떠올리면 쉽습니다.", "If a term is new, recall \"why it is needed\" before the name itself."],
      ]
    : [
        ["이 도메인에서 배우는 것", "本领域学习内容"],
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
        ["처음 보는 용어라면 이름 자체보다 \"이게 왜 필요한가\"를 먼저 떠올리면 쉽습니다.", "若是新术语，先想「为何需要它」，再想名称本身。"],
      ];

  for (const [from, to] of replacements) {
    body = body.split(from).join(to);
  }

  // Translate term definitions in content
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
  body = body.replace(/어느 부분에 이 개념이 들어가는지 한 문장으로 적어 보세요/g, locale === "en" ? "this concept applies—in one sentence." : "运用于哪一部分。");

  // Translate chapter names in content
  for (const [ko, enName] of Object.entries(en ? CHAPTER_KO_TO_EN : CHAPTER_KO_TO_ZH)) {
    body = body.split(`「${ko}」`).join(`「${enName}」`);
  }

  // Replace domain intro
  const domainKoMatch = body.match(/「[^」]+」 도메인은/);
  if (domainKoMatch) {
    body = body.replace(/<div class="easy">「[^"]+」 도메인은[^<]+<\/div>/, intro);
  } else {
    body = intro + itemsHeader + itemsList + body;
  }

  // Replace items list section
  body = body.replace(/<h3>[^<]*<\/h3><ul>[\s\S]*?<\/ul>/, itemsHeader + itemsList);

  body = translateKoText(body, locale);

  return body;
}

function lessonMeta(lesson, locale) {
  const code = lesson.id;
  const mod = MODULES_I18N[locale]?.[code];
  const itemCount = mod?.items.length ?? 0;
  const en = locale === "en";
  return {
    title: en ? `${code} ${mod?.domain ?? lesson.title}` : `${code} ${mod?.domain ?? lesson.title}`,
    subtitle: en
      ? `${mod?.domain ?? ""} · ${itemCount} key items`
      : `${mod?.domain ?? ""} · 核心 ${itemCount} 项`,
  };
}

// ── Generate output ──────────────────────────────────────────────────────────

const lessons = loadLessons();

const lessonI18n = { en: {}, zh: {} };
for (const lesson of lessons) {
  for (const locale of ["en", "zh"]) {
    const meta = lessonMeta(lesson, locale);
    lessonI18n[locale][lesson.id] = {
      title: meta.title,
      subtitle: meta.subtitle,
      content: translateContentHtml(lesson.content, locale, lesson.id),
      quiz: lesson.quiz.map((q) => translateQuizItem(q, locale)),
    };
  }
}

let out = `/**
 * knowledge-content-i18n.ts — Knowledge Core localization
 *
 * The Knowledge Core in \`knowledge-core.ts\` and \`knowledge-lessons.ts\` is authored
 * in Korean. This module supplies EN / ZH translations for objectives, modules,
 * chapters, terms, and all 12 L0 domain lessons (title, subtitle, content, quiz).
 *
 * For locale \`ko\`: identity pass-through (source unchanged).
 */
import type { Locale } from "@/lib/i18n/types";
import type { KnowledgeChapter, KnowledgeTerm, KnowledgeModule } from "@/lib/rdos/knowledge-core";
import type { Lesson } from "@/lib/rdos/lesson-content";

/* ── Learning objectives ── */
const OBJECTIVES_I18N: Record<Exclude<Locale, "ko">, string[]> = ${JSON.stringify(OBJECTIVES_I18N, null, 2)};

/* ── Module domain + items ── */
interface ModuleI18n { domain: string; items: string[]; }
const MODULES_I18N: Record<Exclude<Locale, "ko">, Record<string, ModuleI18n>> = ${JSON.stringify(MODULES_I18N, null, 2)};

/* ── Chapter role / principle / desc (+ zh display title via ko field) ── */
interface ChapterI18n { ko: string; role: string; principle: string; desc: string; }
const CHAPTERS_I18N: Record<Exclude<Locale, "ko">, Record<string, ChapterI18n>> = ${JSON.stringify(CHAPTERS_I18N, null, 2)};

/* ── Term definition / analogy / usage (+ locale display name via ko field) ── */
interface TermI18n { ko: string; definition: string; analogy: string; usage: string; }
const TERMS_I18N: Record<Exclude<Locale, "ko">, Record<string, TermI18n>> = ${JSON.stringify(TERMS_I18N, null, 2)};

/* ── Lesson title / subtitle / content / quiz ── */
interface LessonI18n { title: string; subtitle: string; content: string; quiz: Lesson["quiz"]; }
export const KNOWLEDGE_LESSON_I18N: Record<Exclude<Locale, "ko">, Record<string, LessonI18n>> = {
  en: {
`;

for (const lesson of lessons) {
  const data = lessonI18n.en[lesson.id];
  out += `    "${lesson.id}": {\n`;
  out += `      title: ${tsString(data.title)},\n`;
  out += `      subtitle: ${tsString(data.subtitle)},\n`;
  out += `      content: ${tsString(data.content)},\n`;
  out += `      quiz: ${emitQuizArray(data.quiz)},\n`;
  out += `    },\n`;
}

out += `  },\n  zh: {\n`;

for (const lesson of lessons) {
  const data = lessonI18n.zh[lesson.id];
  out += `    "${lesson.id}": {\n`;
  out += `      title: ${tsString(data.title)},\n`;
  out += `      subtitle: ${tsString(data.subtitle)},\n`;
  out += `      content: ${tsString(data.content)},\n`;
  out += `      quiz: ${emitQuizArray(data.quiz)},\n`;
  out += `    },\n`;
}

out += `  },\n};\n\n`;

out += `export function localizeKnowledgeObjectives(objectives: string[], locale: Locale): string[] {
  if (locale === "ko") return objectives;
  return OBJECTIVES_I18N[locale] ?? objectives;
}

export function localizeKnowledgeModules(modules: KnowledgeModule[], locale: Locale): KnowledgeModule[] {
  if (locale === "ko") return modules;
  const map = MODULES_I18N[locale];
  if (!map) return modules;
  return modules.map((m) => {
    const tr = map[m.code];
    if (!tr) return m;
    return { ...m, domain: tr.domain, items: tr.items };
  });
}

export function localizeKnowledgeChapters(chapters: KnowledgeChapter[], locale: Locale): KnowledgeChapter[] {
  if (locale === "ko") return chapters;
  const map = CHAPTERS_I18N[locale];
  if (!map) return chapters;
  return chapters.map((ch) => {
    const tr = map[ch.id];
    if (!tr) return ch;
    if (locale === "en") {
      return { ...ch, ko: tr.ko, role: tr.role, principle: tr.principle, desc: tr.desc };
    }
    return { ...ch, ko: tr.ko, en: ch.en, role: tr.role, principle: tr.principle, desc: tr.desc };
  });
}

export function localizeKnowledgeTerms(terms: KnowledgeTerm[], locale: Locale): KnowledgeTerm[] {
  if (locale === "ko") return terms;
  const map = TERMS_I18N[locale];
  if (!map) return terms;
  return terms.map((t) => {
    const tr = map[t.id];
    if (!tr) return t;
    if (locale === "en") {
      return { ...t, definition: tr.definition, analogy: tr.analogy, usage: tr.usage };
    }
    return { ...t, ko: tr.ko, definition: tr.definition, analogy: tr.analogy, usage: tr.usage };
  });
}

export function localizeKnowledgeLesson(lesson: Lesson, locale: Locale): Lesson {
  if (locale === "ko") return lesson;
  const tr = KNOWLEDGE_LESSON_I18N[locale]?.[lesson.id];
  if (!tr) return lesson;
  return {
    ...lesson,
    title: tr.title,
    subtitle: tr.subtitle,
    content: tr.content,
    quiz: tr.quiz,
  };
}
`;

fs.writeFileSync(OUT, out);
const lines = out.split("\n").length;
console.log(`Wrote ${OUT} (${lines} lines)`);
