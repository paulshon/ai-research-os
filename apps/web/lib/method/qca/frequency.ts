/**
 * frequency.ts — frequency analysis engine (100% local).
 * Faithful port of core/frequency.py. The Python original uses scikit-learn's
 * TfidfVectorizer when available and otherwise a pure-python TF-IDF; the browser
 * has no sklearn, so this implements the *pure-python* branch (the deterministic
 * path the reference run was validated against).
 */
import type { QcaProject } from "./project";
import { Counter } from "./counter";
import type { FrequencySummary } from "./types";

function docTokens(project: QcaProject): string[][] {
  return project.sentences().map((r) => r.tokens ?? []);
}

export function wordFrequency(project: QcaProject, top = 50): Array<[string, number]> {
  const c = new Counter<string>();
  for (const toks of docTokens(project)) c.update(toks);
  return c.mostCommon(top);
}

export function ngramFrequency(project: QcaProject, n = 2, top = 30): Array<[string, number]> {
  const c = new Counter<string>();
  for (const toks of docTokens(project)) {
    for (let i = 0; i <= toks.length - n; i++) {
      c.add(toks.slice(i, i + n).join(" "));
    }
  }
  return c.mostCommon(top);
}

/** Corpus-wide TF-IDF top keywords — pure-python fallback formula. */
export function tfidfKeywords(project: QcaProject, top = 30): Array<[string, number]> {
  const docs = docTokens(project)
    .filter((t) => t.length)
    .map((t) => t.join(" "));
  if (!docs.length) return [];
  const N = docs.length;
  const df = new Counter<string>();
  const tfs: Counter<string>[] = [];
  for (const d of docs) {
    const toks = d.split(" ");
    const tf = new Counter<string>();
    tf.update(toks);
    tfs.push(tf);
    for (const w of new Set(toks)) df.add(w);
  }
  const agg = new Counter<string>();
  for (const tf of tfs) {
    for (const [w, f] of tf.entries()) {
      const idf = Math.log((1 + N) / (1 + df.get(w))) + 1;
      agg.add(w, f * idf);
    }
  }
  return agg.mostCommon(top).map(([w, s]) => [w, round(s, 4)]);
}

export function cooccurrence(
  project: QcaProject,
  top = 40,
  minCount = 2
): Array<[string, string, number]> {
  const c = new Counter<string>();
  for (const toks of docTokens(project)) {
    const uniq = Array.from(new Set(toks)).sort();
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        c.add(uniq[i] + "\u0000" + uniq[j]);
      }
    }
  }
  const pairs: Array<[string, string, number]> = [];
  for (const [key, n] of c.entries()) {
    if (n >= minCount) {
      const [a, b] = key.split("\u0000");
      pairs.push([a, b, n]);
    }
  }
  pairs.sort((x, y) => y[2] - x[2]);
  return pairs.slice(0, top);
}

export function summary(project: QcaProject): FrequencySummary {
  const docs = docTokens(project);
  const total = docs.reduce((a, t) => a + t.length, 0);
  const vocab = new Set<string>();
  for (const t of docs) for (const w of t) vocab.add(w);
  return {
    sentences: docs.length,
    tokens: total,
    vocabulary: vocab.size,
    avg_tokens_per_sentence: docs.length ? round(total / docs.length, 2) : 0,
  };
}

function round(x: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}
