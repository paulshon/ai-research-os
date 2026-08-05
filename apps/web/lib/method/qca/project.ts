/**
 * project.ts — in-memory QCA project store.
 * Faithful port of core/database.py (SQLite .qca) to a browser-side store.
 * All accessor names mirror the Python `Project` API so the ported engine
 * modules read almost identically to the originals.
 */
import type {
  QcaDocument,
  QcaSentence,
  QcaCode,
  QcaCodingResult,
  QcaCategory,
  QcaTheme,
  QcaEdge,
  QcaProjectState,
  NetworkType,
  CodingStatus,
} from "./types";

export class QcaProject {
  name: string;
  research_question: string;
  private _documents: QcaDocument[] = [];
  private _sentences: QcaSentence[] = [];
  private _codes: QcaCode[] = [];
  private _codebookName = "";
  private _coding: QcaCodingResult[] = [];
  private _categories: QcaCategory[] = [];
  private _themes: QcaTheme[] = [];
  private _edges: QcaEdge[] = [];
  private _interpretations: Record<string, string> = {};
  private _seq = 1;

  constructor(name = "본 연구", research_question = "") {
    this.name = name;
    this.research_question = research_question;
  }

  private nextId(): number {
    return this._seq++;
  }

  // ── meta ──────────────────────────────────────────────
  get_meta(key: "name" | "research_question", fallback = ""): string {
    if (key === "name") return this.name || fallback;
    if (key === "research_question") return this.research_question || fallback;
    return fallback;
  }

  // ── documents ─────────────────────────────────────────
  add_document(title: string, full_text = "", source = ""): number {
    const id = this.nextId();
    this._documents.push({ id, title, full_text, source });
    return id;
  }
  documents(): QcaDocument[] {
    return this._documents;
  }
  setDocumentFullText(docId: number, text: string): void {
    const d = this._documents.find((x) => x.id === docId);
    if (d) d.full_text = text;
  }

  // ── sentences ─────────────────────────────────────────
  add_sentence(document_id: number, sentence_text: string, position: number): number {
    const id = this.nextId();
    this._sentences.push({
      id,
      document_id,
      sentence_text,
      position,
      clean_text: "",
      tokens: [],
    });
    return id;
  }
  sentences(): QcaSentence[] {
    return this._sentences;
  }
  sentence_count(): number {
    return this._sentences.length;
  }
  update_sentence_clean(id: number, clean: string, tokens: string[]): void {
    const s = this._sentences.find((x) => x.id === id);
    if (s) {
      s.clean_text = clean;
      s.tokens = tokens;
    }
  }

  // ── codebook / codes ──────────────────────────────────
  clear_codes(): void {
    this._codes = [];
    this._codebookName = "";
  }
  create_codebook(name: string, _version = "1.0"): string {
    this._codebookName = name;
    return name;
  }
  get codebookName(): string {
    return this._codebookName;
  }
  add_code(_cbId: string, code: Partial<QcaCode> & { code_id: string; name: string }): number {
    const id = this.nextId();
    this._codes.push({
      id,
      code_id: code.code_id,
      name: code.name,
      meta_category: code.meta_category ?? "",
      definition: code.definition ?? "",
      indicator: code.indicator ?? "",
      inclusion_rule: code.inclusion_rule ?? "",
      exclusion_rule: code.exclusion_rule ?? "",
      decision_rule: code.decision_rule ?? "",
      example: code.example ?? "",
      counter_example: code.counter_example ?? "",
      memo: code.memo ?? "",
    });
    return id;
  }
  codes(): QcaCode[] {
    return this._codes;
  }

  // ── coding ────────────────────────────────────────────
  clear_coding(): void {
    this._coding = [];
  }
  add_coding(
    sentence_id: number,
    code_pk: number,
    confidence: number,
    source: string,
    status: CodingStatus,
    memo: string
  ): number {
    const id = this.nextId();
    const code = this._codes.find((c) => c.id === code_pk);
    const sent = this._sentences.find((s) => s.id === sentence_id);
    this._coding.push({
      id,
      sentence_id,
      code_id: code_pk,
      code_name: code?.name ?? "",
      meta_category: code?.meta_category ?? "",
      confidence,
      source,
      status,
      memo,
      sentence_text: sent?.sentence_text ?? "",
    });
    return id;
  }
  coding_results(): QcaCodingResult[] {
    return this._coding;
  }
  setCodingStatus(codingId: number, status: CodingStatus): void {
    const r = this._coding.find((x) => x.id === codingId);
    if (r) r.status = status;
  }

  // ── categories ────────────────────────────────────────
  clear_categories(): void {
    this._categories = [];
  }
  add_category(name: string, meta: string, description: string, freq: number): void {
    this._categories.push({ name, meta_category: meta, description, freq });
  }
  categories(): QcaCategory[] {
    return this._categories;
  }

  // ── themes ────────────────────────────────────────────
  clear_themes(): void {
    this._themes = [];
  }
  add_theme(name: string, description: string, members: string[], freq = 0): void {
    this._themes.push({ name, description, members, freq });
  }
  themes(): QcaTheme[] {
    return this._themes;
  }

  // ── networks ──────────────────────────────────────────
  clear_networks(net_type: NetworkType): void {
    this._edges = this._edges.filter((e) => e.net_type !== net_type);
  }
  add_edge(net_type: NetworkType, a: string, b: string, weight: number): void {
    this._edges.push({ net_type, source_node: a, target_node: b, weight });
  }
  edges(net_type?: NetworkType): QcaEdge[] {
    return net_type ? this._edges.filter((e) => e.net_type === net_type) : this._edges;
  }

  // ── interpretations ───────────────────────────────────
  save_interpretation(section: string, text: string): void {
    this._interpretations[section] = text;
  }
  get_interpretation(section: string): string {
    return this._interpretations[section] ?? "";
  }

  // commit() is a no-op (mirrors the SQLite API for source parity).
  commit(): void {
    /* in-memory: nothing to flush */
  }

  // ── serialization ─────────────────────────────────────
  toState(): QcaProjectState {
    return {
      name: this.name,
      research_question: this.research_question,
      documents: this._documents,
      sentences: this._sentences,
      codes: this._codes,
      codebookName: this._codebookName,
      coding: this._coding,
      categories: this._categories,
      themes: this._themes,
      edges: this._edges,
      interpretations: this._interpretations,
      _seq: this._seq,
    };
  }

  static fromState(state: QcaProjectState): QcaProject {
    const p = new QcaProject(state.name, state.research_question);
    p._documents = state.documents ?? [];
    p._sentences = state.sentences ?? [];
    p._codes = state.codes ?? [];
    p._codebookName = state.codebookName ?? "";
    p._coding = state.coding ?? [];
    p._categories = state.categories ?? [];
    p._themes = state.themes ?? [];
    p._edges = state.edges ?? [];
    p._interpretations = state.interpretations ?? {};
    p._seq = state._seq ?? 1;
    return p;
  }
}
