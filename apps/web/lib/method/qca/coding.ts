/**
 * coding.ts — auto-coding engine (content-analysis core).
 * Faithful port of core/coding.py:
 *   1) Rule coding   — indicator-keyword matching
 *   2) Semantic      — sentence↔code TF-IDF cosine (pure-python fallback)
 *   3) Hybrid        — weighted combination
 * Confidence scoring, multi-code assignment, and ambiguous detection included.
 */
import type { QcaProject } from "./project";
import type { QcaCode } from "./types";
import { Counter } from "./counter";

function pySplit(s: string): string[] {
  const t = s.trim();
  return t ? t.split(/\s+/) : [];
}

// ── rule-based ──────────────────────────────────────────
function indicators(code: QcaCode): string[] {
  const raw = code.indicator || "";
  return raw
    .split(/[,/;]/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
}

export function ruleScore(sentenceText: string, code: QcaCode): { score: number; hits: string[] } {
  const text = sentenceText.toLowerCase();
  const inds = indicators(code);
  if (!inds.length) return { score: 0, hits: [] };
  const hits = inds.filter((w) => text.includes(w));
  if (!hits.length) return { score: 0, hits: [] };
  const base = 0.6 + Math.min(hits.length - 1, 3) * 0.12;
  return { score: Math.min(base, 0.95), hits };
}

// ── semantic (pure-python TF-IDF cosine) ────────────────
function codeProfile(code: QcaCode): string {
  return [code.name, code.definition, (code.indicator || "").replace(/,/g, " "), code.example]
    .join(" ")
    .toLowerCase();
}

class SemanticModel {
  private profiles: string[];
  private df = new Counter<string>();
  private N: number;
  private codeVecs: Record<string, number>[];

  constructor(codes: QcaCode[]) {
    this.profiles = codes.map(codeProfile);
    const docs = this.profiles.map(pySplit);
    for (const d of docs) {
      for (const w of new Set(d)) this.df.add(w);
    }
    this.N = docs.length;
    this.codeVecs = this.profiles.map((p) => this.vec(p));
  }

  private vec(text: string): Record<string, number> {
    const toks = pySplit(text);
    const tf = new Counter<string>();
    tf.update(toks);
    const v: Record<string, number> = {};
    for (const [w, f] of tf.entries()) {
      const idf = Math.log((1 + this.N) / (1 + this.df.get(w))) + 1;
      v[w] = f * idf;
    }
    return v;
  }

  private static cos(a: Record<string, number>, b: Record<string, number>): number {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (!ak.length || !bk.length) return 0;
    const common = ak.filter((w) => w in b);
    let dot = 0;
    for (const w of common) dot += a[w] * b[w];
    let na = 0;
    for (const w of ak) na += a[w] * a[w];
    let nb = 0;
    for (const w of bk) nb += b[w] * b[w];
    na = Math.sqrt(na);
    nb = Math.sqrt(nb);
    return na && nb ? dot / (na * nb) : 0;
  }

  scores(sentenceText: string): number[] {
    const sv = this.vec(sentenceText.toLowerCase());
    return this.codeVecs.map((cv) => SemanticModel.cos(sv, cv));
  }
}

export type CodingMode = "rule" | "semantic" | "hybrid";

export interface CodeOptions {
  mode?: CodingMode;
  ruleThreshold?: number;
  semanticThreshold?: number;
  hybridAlpha?: number;
  multiCode?: boolean;
  maxCodes?: number;
}

export function codeProject(
  project: QcaProject,
  opts: CodeOptions = {}
): { assigned: number; ambiguous: number } {
  const mode = opts.mode ?? "hybrid";
  const ruleThreshold = opts.ruleThreshold ?? 0.6;
  const semanticThreshold = opts.semanticThreshold ?? 0.18;
  const hybridAlpha = opts.hybridAlpha ?? 0.55;
  const multiCode = opts.multiCode ?? true;
  const maxCodes = opts.maxCodes ?? 2;

  const codes = project.codes();
  if (!codes.length) throw new Error("코드북이 비어 있습니다. 먼저 코드북을 설치하세요.");

  const sem = mode === "rule" ? null : new SemanticModel(codes);
  project.clear_coding();

  let assigned = 0;
  let ambiguous = 0;

  for (const s of project.sentences()) {
    const text = s.sentence_text;
    const semScores = sem ? sem.scores(text) : codes.map(() => 0);

    type Cand = { code: QcaCode; final: number; src: string; hits: string[] };
    const candidates: Cand[] = [];

    codes.forEach((c, idx) => {
      const { score: rs, hits } = ruleScore(text, c);
      const ss = semScores[idx];
      let final: number;
      let src: string;
      if (mode === "rule") {
        final = rs;
        src = "rule";
      } else if (mode === "semantic") {
        final = ss;
        src = "semantic";
      } else {
        final = hybridAlpha * rs + (1 - hybridAlpha) * ss;
        src = rs > 0 ? "hybrid" : "semantic";
      }

      let ok = false;
      if (mode === "rule") ok = rs >= ruleThreshold;
      else if (mode === "semantic") ok = ss >= semanticThreshold;
      else ok = rs >= ruleThreshold || ss >= semanticThreshold;

      if (ok) candidates.push({ code: c, final: round(final, 3), src, hits });
    });

    candidates.sort((a, b) => b.final - a.final);

    if (!candidates.length) {
      ambiguous += 1;
      continue;
    }

    const picked = multiCode ? candidates.slice(0, maxCodes) : candidates.slice(0, 1);
    for (const cand of picked) {
      const memo = cand.hits.length ? "matched: " + cand.hits.join(", ") : "";
      project.add_coding(s.id, cand.code.id, cand.final, cand.src, "auto", memo);
      assigned += 1;
    }
  }

  project.commit();
  return { assigned, ambiguous };
}

export function codingStats(project: QcaProject): {
  total: number;
  by_code: Array<[string, number]>;
  by_source: Array<[string, number]>;
} {
  const rows = project.coding_results();
  const byCode = new Counter<string>();
  const bySrc = new Counter<string>();
  for (const r of rows) {
    byCode.add(r.code_name);
    bySrc.add(r.source);
  }
  return { total: rows.length, by_code: byCode.mostCommon(), by_source: bySrc.mostCommon() };
}

function round(x: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}
