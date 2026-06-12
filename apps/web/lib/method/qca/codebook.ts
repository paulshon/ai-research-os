/**
 * codebook.ts — Codebook engine.
 * Faithful port of core/codebook.py: the default content-analysis codebook
 * (6 codes / 3 meta-categories) plus the v3 multi-sheet Excel importer that merges
 * 2_Codebook_Master with 4_Word_Criteria (indicator lexicon) and
 * 5_Sentence_Criteria (sentence-level rules).
 *
 * The engine stays free of SheetJS: callers parse the workbook and pass in a
 * plain { sheetName: { columns, rows } } structure.
 */
import type { QcaProject } from "./project";
import type { CodebookSpec, QcaCode } from "./types";

export interface ParsedSheet {
  columns: string[]; // ordered header names
  rows: Record<string, unknown>[]; // one object per data row
}
export type ParsedWorkbook = Record<string, ParsedSheet>;

export const DEFAULT_CODEBOOK: CodebookSpec = {
  name: "기본 내용분석 코드북",
  version: "1.0",
  codes: [
    {
      code_id: "A1",
      name: "자동화·생산성 향상",
      meta_category: "기술 역량 담론",
      definition: "생성형 AI가 작업을 자동화하고 생산성과 효율을 높이는 현상",
      indicator:
        "automation, productivity, efficiency, generate, model, tool, workflow, output, speed, scale",
      inclusion_rule: "자동화 또는 생산성 향상이 언급됨",
      exclusion_rule: "단순 제품 소개",
      decision_rule: "AI가 작업을 자동화하거나 생산성을 높이는가?",
      example: "Generative models automate routine tasks and raise productivity.",
      counter_example: "The laptop battery lasts ten hours.",
    },
    {
      code_id: "A2",
      name: "인간-AI 협업",
      meta_category: "기술 역량 담론",
      definition: "인간과 AI가 함께 창작하고 서로 보완하는 협업 관점",
      indicator:
        "collaboration, assistant, augment, human, creativity, partner, support, feedback, co-create, workflow",
      inclusion_rule: "인간과 AI의 협업이 동시에 등장",
      exclusion_rule: "AI 또는 인간만 단독 언급",
      decision_rule: "인간과 AI가 함께 작업하는 관계가 서술되는가?",
      example: "Writers treat the assistant as a creative partner that augments human work.",
      counter_example: "The meeting starts at noon.",
    },
    {
      code_id: "B1",
      name: "편향과 공정성",
      meta_category: "윤리·신뢰 담론",
      definition: "AI 산출물의 편향과 공정성·대표성 문제에 대한 담론",
      indicator:
        "bias, fairness, discrimination, equity, stereotype, harmful, inclusion, representation, gender, race",
      inclusion_rule: "편향 또는 공정성 문제가 언급됨",
      exclusion_rule: "기술 성능만 언급",
      decision_rule: "편향·공정성·대표성 문제가 제기되는가?",
      example: "The dataset encodes social bias, raising fairness and discrimination concerns.",
      counter_example: "The model has one billion parameters.",
    },
    {
      code_id: "B2",
      name: "투명성과 책임",
      meta_category: "윤리·신뢰 담론",
      definition: "AI의 투명성·설명가능성·책임성에 대한 신뢰 담론",
      indicator:
        "transparency, accountability, explainability, trust, audit, responsibility, governance, disclosure, oversight, safety",
      inclusion_rule: "투명성·책임·신뢰가 언급됨",
      exclusion_rule: "단순 사용 후기",
      decision_rule: "투명성·책임성·신뢰 확보가 서술되는가?",
      example: "Users demand transparency and accountability so they can trust the system.",
      counter_example: "The server is located in a data center.",
    },
    {
      code_id: "C1",
      name: "노동시장 변화",
      meta_category: "사회·제도 담론",
      definition: "AI 확산에 따른 일자리·노동시장 구조 변화",
      indicator:
        "job, labor, employment, worker, skill, displacement, reskilling, economy, workforce, automation",
      inclusion_rule: "일자리·노동시장 변화가 언급됨",
      exclusion_rule: "개인 일상 묘사",
      decision_rule: "노동시장·고용 구조 변화가 나타나는가?",
      example: "Automation reshapes the labor market and displaces some workers.",
      counter_example: "He commutes to the office by bus.",
    },
    {
      code_id: "C2",
      name: "교육·규제 대응",
      meta_category: "사회·제도 담론",
      definition: "AI에 대한 교육·정책·규제 차원의 제도적 대응",
      indicator:
        "education, regulation, policy, law, curriculum, literacy, school, student, government, framework",
      inclusion_rule: "교육 또는 규제·정책 대응이 언급됨",
      exclusion_rule: "기술 사양만 언급",
      decision_rule: "교육·정책·규제 차원의 대응이 나타나는가?",
      example: "Schools update the curriculum while governments draft AI regulation.",
      counter_example: "The library closes at nine.",
    },
  ],
};

export function installDefaultCodebook(project: QcaProject): string {
  return installCodebook(project, DEFAULT_CODEBOOK);
}

export function installCodebook(project: QcaProject, cb: CodebookSpec): string {
  project.clear_codes();
  const cbId = project.create_codebook(cb.name ?? "Codebook", cb.version ?? "1.0");
  for (const code of cb.codes) project.add_code(cbId, code);
  return cbId;
}

export function codebookToRows(project: QcaProject): Record<string, string>[] {
  return project.codes().map((c) => ({
    "Code ID": c.code_id,
    "Code Name": c.name,
    "Meta Category": c.meta_category,
    "Operational Definition": c.definition,
    "Indicator Keywords": c.indicator,
    "Inclusion Rule": c.inclusion_rule,
    "Exclusion Rule": c.exclusion_rule,
    "Decision Rule": c.decision_rule,
    Example: c.example,
  }));
}

// ── helpers ─────────────────────────────────────────────
function clean(x: unknown): string {
  const s = x === null || x === undefined ? "" : String(x);
  const low = s.trim().toLowerCase();
  return low === "nan" || low === "none" ? "" : s.trim();
}

function readWordCriteria(sheets: ParsedWorkbook): Record<string, { indicators: string; exclude: string }> {
  let target: ParsedSheet | null = null;
  for (const [name, sh] of Object.entries(sheets)) {
    const low = name.toLowerCase();
    if (low.includes("word") || name.includes("단어") || name.includes("표지어")) {
      target = sh;
      break;
    }
  }
  const out: Record<string, { indicators: string[]; exclude: string[] }> = {};
  if (!target) return {};
  const cols = target.columns;
  const cCode = cols[0];
  const cGrp = cols.length > 1 ? cols[1] : null;
  const cLex = cols.length > 2 ? cols[2] : cols.length > 1 ? cols[1] : cols[0];
  for (const r of target.rows) {
    const code = clean(r[cCode]);
    const grp = cGrp ? clean(r[cGrp]) : "";
    const lex = clean(r[cLex]);
    if (!code || !lex) continue;
    const d = (out[code] ??= { indicators: [], exclude: [] });
    if (grp.includes("제외") || grp.toLowerCase().includes("exclude")) {
      d.exclude.push(lex);
    } else if (grp.includes("판정조건") || (grp.includes("조건") && grp.includes("■"))) {
      // guidance line — skip
    } else {
      const terms = lex.replace(/\[[^\]]*\]/g, " ");
      d.indicators.push(terms);
    }
  }
  const merged: Record<string, { indicators: string; exclude: string }> = {};
  for (const [k, v] of Object.entries(out)) {
    merged[k] = { indicators: v.indicators.join("; "), exclude: v.exclude.join(" / ") };
  }
  return merged;
}

function readSentenceCriteria(sheets: ParsedWorkbook): Record<string, string> {
  let target: ParsedSheet | null = null;
  for (const [name, sh] of Object.entries(sheets)) {
    const low = name.toLowerCase();
    if (low.includes("sentence") || name.includes("문장")) {
      target = sh;
      break;
    }
  }
  const out: Record<string, string> = {};
  if (!target) return out;
  const cols = target.columns;
  const cCode = cols[0];
  const cRule = cols.length > 1 ? cols[1] : cols[0];
  const cInten = cols.length > 2 ? cols[2] : null;
  for (const r of target.rows) {
    const code = clean(r[cCode]);
    if (!code) continue;
    const rule = clean(r[cRule]);
    const inten = cInten ? clean(r[cInten]) : "";
    out[code] = (rule + (inten ? "  |  강도: " + inten : "")).trim();
  }
  return out;
}

function importMasterCodebook(
  project: QcaProject,
  sheets: ParsedWorkbook,
  master: ParsedSheet
): { codebookId: string; count: number; multiSheet: boolean } {
  const word = readWordCriteria(sheets);
  const sent = readSentenceCriteria(sheets);
  const colNames = master.columns;

  const col = (...names: string[]): string | null => {
    for (const n of names) {
      for (const k of colNames) {
        if (n === k || k.includes(n)) return k;
      }
    }
    return null;
  };

  const cCode = col("코드", "Code", "code id", "id");
  const cMeta = col("상위범주", "메타", "meta");
  const cName = col("코드명", "name");
  const cDef = col("정의", "definition");
  const cInc = col("포함기준", "inclusion");
  const cExc = col("제외기준", "exclusion");
  const cInd = col("대표지표", "지표", "indicator");
  const cQ = col("핵심질문", "question");
  const cPos = col("긍정사례", "긍정", "example");
  const cNeg = col("부정사례", "부정", "counter");
  const cI1 = col("강도1");
  const cI2 = col("강도2");
  const cI3 = col("강도3");

  const get = (r: Record<string, unknown>, c: string | null) => (c ? clean(r[c]) : "");

  const codes: CodebookSpec["codes"] = [];
  for (const r of master.rows) {
    const codeId = get(r, cCode);
    if (!codeId || ["코드", "code"].includes(codeId.toLowerCase())) continue;

    const baseInd = get(r, cInd);
    const extraInd = word[codeId]?.indicators ?? "";
    const mergedInd = [baseInd, extraInd].filter(Boolean).join("; ");

    const q = get(r, cQ);
    const srule = sent[codeId] ?? "";
    const decision = [q, srule].filter(Boolean).join("  →  ");

    const exc = get(r, cExc);
    const excExtra = word[codeId]?.exclude ?? "";
    const excMerged = [exc, excExtra].filter(Boolean).join(" / ");

    const intens: string[] = [];
    for (const [lab, c] of [
      ["강도1", cI1],
      ["강도2", cI2],
      ["강도3", cI3],
    ] as Array<[string, string | null]>) {
      const v = get(r, c);
      if (v) intens.push(`${lab}: ${v}`);
    }
    const memo = intens.join(" | ");

    codes.push({
      code_id: codeId,
      name: get(r, cName) || codeId,
      meta_category: get(r, cMeta),
      definition: get(r, cDef),
      indicator: mergedInd,
      inclusion_rule: get(r, cInc),
      exclusion_rule: excMerged,
      decision_rule: decision,
      example: get(r, cPos),
      counter_example: get(r, cNeg),
      memo,
    });
  }
  const cb: CodebookSpec = { name: "가져온 코드북 (다중시트)", version: "1.0", codes };
  return { codebookId: installCodebook(project, cb), count: codes.length, multiSheet: true };
}

/**
 * Import a codebook from a parsed workbook.
 * Auto-detects the multi-sheet v1 layout (2_Codebook_Master + 4/5 criteria sheets);
 * otherwise falls back to a single-sheet (Table 1) layout.
 */
export function importCodebookWorkbook(
  project: QcaProject,
  sheets: ParsedWorkbook
): { codebookId: string; count: number; multiSheet: boolean } {
  // 1) detect master sheet
  let master: ParsedSheet | null = null;
  for (const [name, sh] of Object.entries(sheets)) {
    const low = name.toLowerCase();
    if (low.includes("master") || low.includes("codebook_master") || name.includes("상세")) {
      master = sh;
      break;
    }
  }
  if (!master) {
    for (const sh of Object.values(sheets)) {
      const colnames = sh.columns.map((c) => String(c));
      const hasCode = colnames.some(
        (c) => ["코드", "Code", "code"].includes(c.trim()) || c.trim().startsWith("코드")
      );
      const hasDef = colnames.some((c) => c.includes("정의") || c.toLowerCase().includes("definition"));
      if (hasCode && hasDef) {
        master = sh;
        break;
      }
    }
  }
  if (master) return importMasterCodebook(project, sheets, master);

  // 2) single-sheet (Table 1) fallback
  const sh = Object.values(sheets)[0];
  const colsLower: Record<string, string> = {};
  for (const c of sh.columns) colsLower[String(c).trim().toLowerCase()] = c;
  const pick = (...names: string[]): string | null => {
    for (const n of names) if (n in colsLower) return colsLower[n];
    return null;
  };
  const get = (r: Record<string, unknown>, c: string | null) => (c ? clean(r[c]) : "");
  const codes: CodebookSpec["codes"] = [];
  for (const r of sh.rows) {
    const codeId = get(r, pick("code id", "id"));
    codes.push({
      code_id: codeId,
      name: get(r, pick("code name", "name", "하위범주", "범주")),
      meta_category: get(r, pick("meta category", "상위범주", "메타범주")),
      definition: get(r, pick("operational definition", "조작적 정의", "정의")),
      indicator: get(r, pick("indicator keywords", "지표", "핵심지표", "대표지표")),
      inclusion_rule: get(r, pick("inclusion rule", "포함기준")),
      exclusion_rule: get(r, pick("exclusion rule", "제외기준")),
      decision_rule: get(r, pick("decision rule", "판정 질문", "판정규칙", "핵심질문")),
      example: get(r, pick("example", "대표사례", "예시", "긍정사례")),
    });
  }
  const cb: CodebookSpec = { name: "Imported Codebook", version: "1.0", codes };
  return { codebookId: installCodebook(project, cb), count: codes.length, multiSheet: false };
}

export type { QcaCode };
