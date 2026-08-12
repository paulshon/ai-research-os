/**
 * cleaner.ts — text cleansing engine (100% local).
 * Faithful port of core/cleaner.py. The Python original uses KoNLPy/Okt when
 * present and otherwise falls back to a regex tokenizer; the browser has no
 * morphological analyzer, so this implements the *regex-fallback* path, which
 * is the deterministic branch the reference numbers were validated against.
 */
import type { QcaProject } from "./project";

const EN_STOP = new Set(
  `a an the and or but if then else of for to in on at by with from into over under
is are was were be been being do does did have has had this that these those it its
as not no nor so than too very can will just about above below up down out off again
i you he she they we me my your his her their our us them which who whom whose what`
    .split(/\s+/)
    .filter(Boolean)
);

const KO_STOP = new Set(
  `그리고 그러나 또한 이러한 그런 이런 저런 것 수 등 및 의 가 이 은 는 을 를 에 에서
으로 로 와 과 도 만 까지 부터 보다 처럼 같이 통해 위해 대한 대해 하는 한 하다 있다 없다
되다 그 이 저 더 매우 가장 즉 본 연구 따라 나타났다 보인다`
    .split(/\s+/)
    .filter(Boolean)
);

const STOP = new Set<string>([...EN_STOP, ...KO_STOP]);

// Python: r"[A-Za-z][A-Za-z\-']+|[가-힣]{1,}|[0-9]+"
const TOKEN_RE = /[A-Za-z][A-Za-z\-']+|[가-힣]+|[0-9]+/g;
const STARTS_LATIN = /^[A-Za-z]/;
const STARTS_LOWER_LATIN = /^[a-z]/;

export function normalize(text: string): string {
  if (!text) return "";
  let t = text.replace(/\u00a0/g, " ");
  t = t.replace(/https?:\/\/\S+/g, " "); // URLs
  t = t.replace(/\S+@\S+\.\S+/g, " "); // emails
  // Python: re.sub(r"[^\w\s가-힣.,!?'-]", " ", text). \w in Python (re.UNICODE)
  // matches letters incl. CJK; emulate by allowing word chars, whitespace,
  // hangul, and the punctuation set, dropping everything else.
  t = t.replace(/[^\p{L}\p{N}_\s.,!?'-]/gu, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

export function tokenize(text: string, minLen = 2): string[] {
  const norm = normalize(text);
  if (!norm) return [];
  const toks = norm.match(TOKEN_RE) ?? [];
  const out: string[] = [];
  for (let tok of toks) {
    if (STARTS_LATIN.test(tok)) tok = tok.toLowerCase();
    if (tok.length < minLen) continue;
    if (STOP.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

/** English lite lemmatizer — mirrors core/cleaner.lemmatize_lite exactly. */
export function lemmatizeLite(tokens: string[]): string[] {
  const out: string[] = [];
  for (let t of tokens) {
    if (STARTS_LOWER_LATIN.test(t)) {
      let handled = false;
      for (const suf of ["ies", "ied"]) {
        if (t.endsWith(suf) && t.length > 4) {
          t = t.slice(0, -suf.length) + "y";
          handled = true;
          break;
        }
      }
      if (!handled) {
        for (const suf of ["ing", "ed", "es", "s"]) {
          if (t.endsWith(suf) && t.length > suf.length + 2) {
            t = t.slice(0, -suf.length);
            break;
          }
        }
      }
    }
    out.push(t);
  }
  return out;
}

export function cleanProject(
  project: QcaProject,
  opts: { doLemma?: boolean; extraStopwords?: string[] } = {}
): number {
  const doLemma = opts.doLemma ?? true;
  const extra = new Set(
    (opts.extraStopwords ?? []).map((w) => w.trim().toLowerCase()).filter(Boolean)
  );
  let n = 0;
  for (const r of project.sentences()) {
    const clean = normalize(r.sentence_text);
    let toks = tokenize(r.sentence_text);
    if (doLemma) toks = lemmatizeLite(toks);
    if (extra.size) toks = toks.filter((t) => !extra.has(t));
    project.update_sentence_clean(r.id, clean, toks);
    n += 1;
  }
  project.commit();
  return n;
}
