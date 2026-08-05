/**
 * 메뉴 사이 데이터 흐름 선언.
 * 인스펙터의 "이 절에 쓸 재료" 렌더링이 이 선언을 그대로 사용한다.
 * 즉 데이터 흐름이 코드와 화면에서 동일하게 표현된다.
 */
export const MENU_FLOW = {
  research: { produces: ["ResearchDesign"] as const, consumes: ["Literature"] as const },
  method: { produces: ["MethodDesign"] as const, consumes: ["ResearchDesign"] as const },
  structure: {
    produces: ["ThesisType", "Outline"] as const,
    consumes: ["ResearchDesign", "MethodDesign"] as const,
  },
  writing: {
    produces: ["Manuscript"] as const,
    consumes: ["Outline", "MethodDesign", "Snippets", "Literature"] as const,
  },
  analyzer: {
    produces: ["AnalyzerRuns"] as const,
    consumes: ["Manuscript", "Outline", "MethodDesign", "ThesisType"] as const,
  },
  validation: {
    produces: ["ValidationRuns"] as const,
    consumes: ["Manuscript", "Literature"] as const,
  },
  critique: {
    produces: ["Critiques", "Corrections"] as const,
    consumes: ["Manuscript", "Literature"] as const,
  },
  schedule: {
    produces: ["Schedule"] as const,
    consumes: ["MethodDesign", "Outline", "ValidationRuns"] as const,
  },
} as const;

export type ProducedArtifact = (typeof MENU_FLOW)[keyof typeof MENU_FLOW]["produces"][number];
export type ConsumedArtifact = (typeof MENU_FLOW)[keyof typeof MENU_FLOW]["consumes"][number];

export type Anchor = {
  page?: number;
  charStart: number;
  charEnd: number;
  /** 원고 수정 후 재부착을 위한 앞뒤 32자 컨텍스트 해시 */
  contextHash: string;
};

export type RqCandidate = {
  id: string;
  text: string;
  confidence: number;
  evidence: string[];
  adopted?: boolean;
};

export type ResearchDesign = {
  topic: string;
  rqCandidates: RqCandidate[];
  adoptedRqId: string | null;
  conceptFramework: string;
  hypotheses: string[];
};

export type MethodDesign = {
  type: "quant" | "qual" | "mixed" | null;
  population: string;
  sampling: string;
  targetN: number;
  requiredN: number;
  instruments: string[];
  analysis: string;
  irb: string;
};

export type ThesisType = { typeId: string; categoryId: string };

export type OutlineSection = {
  id: string;
  number: string;
  title: string;
  level: number;
  targetChars: number;
  currentChars: number;
  status: "empty" | "draft" | "done";
};

export type Outline = { sections: OutlineSection[]; derivedFromTypeId: string | null };

export type LiteratureItem = {
  id: string;
  title: string;
  authors: string;
  year: number;
  doi?: string;
  /** 학술지명, 권(호) 등 서지 출처 — 예: "J. of Org. Behavior, 45(3)". */
  journal?: string;
  inLibrary: boolean;
  citedInBody: number;
};

export type ManuscriptBlock = {
  id: string;
  sectionId: string;
  content: string;
  origin: "human" | "ai";
  accepted: boolean;
  sources: string[];
};

export type Snippet = {
  id: string;
  text: string;
  slots: string[];
  category: string;
  sectionId?: string;
  origin: "mine" | "cite";
  useCount: number;
};

export type ValidationFinding = {
  rule: string;
  severity: "danger" | "warn" | "info";
  category: string;
  sectionId?: string;
  resolved: boolean;
  ignored?: boolean;
  title: string;
  detail: string;
  /** 근거 규정 — "규칙 설명 보기" 등 ghost 액션에서 펼쳐 보여준다. */
  regulation?: string;
  actions?: { label: string; kind: "primary" | "default" | "ghost"; href?: string; effect?: "resolve" | "ignore" }[];
};

export type ValidationRun = { at: string; findings: ValidationFinding[] };

export type AnalyzerFinding = {
  severity: "danger" | "warn" | "ok";
  axisId: string;
  title: string;
  detail: string;
  evidence: string;
  quote: string;
  anchor: Anchor;
  actions: { label: string; href: string }[];
};

export type AnalyzerSection = {
  sectionId: string;
  startPage: number;
  endPage: number;
  confidence: number;
  axes: { axisId: string; score: number; weight: number }[];
  findings: AnalyzerFinding[];
};

export type AnalyzerRun = {
  at: string;
  scope: string;
  comparisonSet: string;
  sections: AnalyzerSection[];
};

export type Correction = {
  id: string;
  category: string;
  subtype: string;
  quote: string;
  suggestion: string;
  reason: string;
  confidence: number;
  autoApplicable: boolean;
  anchor: Anchor;
  status: "open" | "applied" | "ignored";
};

export type Critique = {
  id: string;
  no: number;
  type: "logic" | "evidence" | "concept" | "style" | "structure";
  quote: string;
  comment: string;
  anchor: Anchor;
  status: "open" | "revising" | "approved";
  origin: "ai" | "human";
  author: string;
  at: string;
};

export type Milestone = {
  id: string;
  title: string;
  due: string;
  type: string;
  conditions: string[];
  linkedMenu: string;
  done?: boolean;
};

export type ProjectState = {
  name: string;
  researchDesign: ResearchDesign;
  methodDesign: MethodDesign;
  thesisType: ThesisType | null;
  outline: Outline;
  literature: LiteratureItem[];
  manuscript: ManuscriptBlock[];
  snippets: Snippet[];
  validationRuns: ValidationRun[];
  analyzerRuns: AnalyzerRun[];
  corrections: Correction[];
  critiques: Critique[];
  schedule: { milestones: Milestone[]; dueDate: string | null };
  savedAt: string | null;
};

export const EMPTY_PROJECT: ProjectState = {
  name: "새 논문 프로젝트",
  researchDesign: {
    topic: "",
    rqCandidates: [],
    adoptedRqId: null,
    conceptFramework: "",
    hypotheses: [],
  },
  methodDesign: {
    type: null,
    population: "",
    sampling: "",
    targetN: 0,
    requiredN: 0,
    instruments: [],
    analysis: "",
    irb: "",
  },
  thesisType: null,
  outline: { sections: [], derivedFromTypeId: null },
  literature: [],
  manuscript: [],
  snippets: [],
  validationRuns: [],
  analyzerRuns: [],
  corrections: [],
  critiques: [],
  schedule: { milestones: [], dueDate: null },
  savedAt: null,
};

/** 파생 값 — 저장하지 않는다. 저장하면 반드시 어긋난다. */
export function computeProgress(p: ProjectState) {
  const design =
    (p.researchDesign.adoptedRqId ? 50 : 0) +
    (p.methodDesign.type ? 25 : 0) +
    (p.methodDesign.targetN > 0 ? 25 : 0);

  const litTarget = 40;
  const lit = Math.min(100, Math.round((p.literature.filter((l) => l.inLibrary).length / litTarget) * 100));

  const writingTarget = 24000;
  const humanChars = p.manuscript
    .filter((b) => b.origin === "human" || b.accepted)
    .reduce((n, b) => n + b.content.replace(/\s/g, "").length, 0);
  const writing = Math.min(100, Math.round((humanChars / writingTarget) * 100));

  const last = p.validationRuns[p.validationRuns.length - 1];
  const total = last?.findings.length ?? 0;
  const open = last?.findings.filter((f) => !f.resolved).length ?? 0;
  const validation = total === 0 ? 0 : Math.round(((total - open) / total) * 100);

  const submit = p.schedule.milestones.length
    ? Math.round(
        (p.schedule.milestones.filter((m) => m.done).length / p.schedule.milestones.length) * 100,
      )
    : 0;

  const overall = Math.round((design + lit + writing + validation + submit) / 5);
  return { design, lit, writing, validation, submit, overall, humanChars, openFindings: open };
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return null;
  return Math.ceil((due - Date.now()) / 86400000);
}
