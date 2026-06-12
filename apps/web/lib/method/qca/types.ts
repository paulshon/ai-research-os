/**
 * QCA (Qualitative Content Analysis) engine — shared types.
 * TypeScript port of Codebook-Driven QCA System v3 (core/*.py).
 * The original persisted to SQLite (.qca); here state lives in-memory
 * inside a QcaProject instance and is serialized to the project draft.
 */

export interface QcaDocument {
  id: number;
  title: string;
  full_text: string;
  source: string;
}

export interface QcaSentence {
  id: number;
  document_id: number;
  sentence_text: string;
  position: number;
  clean_text: string;
  tokens: string[];
}

export interface QcaCode {
  id: number;
  code_id: string;
  name: string;
  meta_category: string;
  definition: string;
  indicator: string;
  inclusion_rule: string;
  exclusion_rule: string;
  decision_rule: string;
  example: string;
  counter_example?: string;
  memo?: string;
}

export type CodingStatus = "auto" | "approved" | "rejected";

export interface QcaCodingResult {
  id: number;
  sentence_id: number;
  code_id: number; // FK → QcaCode.id
  code_name: string;
  meta_category: string;
  confidence: number;
  source: string; // rule | semantic | hybrid | gemini
  status: CodingStatus;
  memo: string;
  sentence_text: string;
}

export interface QcaCategory {
  name: string;
  meta_category: string;
  description: string;
  freq: number;
}

export interface QcaTheme {
  name: string;
  description: string;
  members: string[];
  freq: number;
}

export type NetworkType = "keyword" | "code" | "city";

export interface QcaEdge {
  net_type: NetworkType;
  source_node: string;
  target_node: string;
  weight: number;
}

export interface CodebookSpec {
  name: string;
  version: string;
  codes: Array<Partial<QcaCode> & { code_id: string; name: string }>;
}

export interface NetworkMetrics {
  nodes: number;
  edges: number;
  degree: Array<[string, number]>;
  betweenness: Array<[string, number]>;
  eigenvector: Array<[string, number]>;
  communities: number;
  modularity: number | null;
}

export interface FrequencySummary {
  sentences: number;
  tokens: number;
  vocabulary: number;
  avg_tokens_per_sentence: number;
}

/** Plain serializable snapshot of a project (for draft persistence). */
export interface QcaProjectState {
  name: string;
  research_question: string;
  documents: QcaDocument[];
  sentences: QcaSentence[];
  codes: QcaCode[];
  codebookName: string;
  coding: QcaCodingResult[];
  categories: QcaCategory[];
  themes: QcaTheme[];
  edges: QcaEdge[];
  interpretations: Record<string, string>;
  _seq: number;
}
