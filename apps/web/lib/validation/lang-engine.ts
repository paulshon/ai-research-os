/**
 * 검토·검증 — 한글/영문 분리 검사 엔진
 *
 * 표절 · 맞춤법 · AI 생성 탐지 세 엔진을 언어별(ko / en)로 따로 돌린다.
 * 외부 API 없이 결정적(deterministic)으로 동작하며, 같은 입력은 항상 같은 결과를 낸다.
 *
 * 정직한 한계:
 *  - 표절: 인터넷/논문 DB 와 대조하지 않는다. 문서 내부 중복 + 사용자가 붙여 넣은 원문 대조 + 인용 누락만 본다.
 *  - AI 탐지: 문체 통계 휴리스틱이다. 증거가 아니라 단서이며, 표본이 짧으면 신뢰도를 낮춰 표시한다.
 *  - 맞춤법: 사전·규칙 기반이라 잡는 범위가 제한적이다. 형태소 분석기급 검사가 아니다.
 */

export type Lang = "ko" | "en";

export interface Sent {
  id: string;
  page: number;
  paragraph: number;
  sentence: number;
  text: string;
  start: number;
}

/* ════════════════ 언어 판별 ════════════════ */

export function langStats(text: string): { hangul: number; latin: number; ratioKo: number } {
  const hangul = (text.match(/[가-힣]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const total = hangul + latin;
  return { hangul, latin, ratioKo: total === 0 ? 0 : hangul / total };
}

export function detectLang(text: string): Lang {
  return langStats(text).ratioKo >= 0.3 ? "ko" : "en";
}

/** 선택한 언어와 본문이 어긋나면 경고 문구용 코드 */
export function langMismatch(text: string, lang: Lang): boolean {
  const { hangul, latin, ratioKo } = langStats(text);
  if (hangul + latin < 30) return false;
  return lang === "ko" ? ratioKo < 0.3 : ratioKo > 0.5;
}

/* ════════════════ 문장 분리 ════════════════ */

const CHARS_PER_PAGE = 1800;
const ABBREV = /(?:\b(?:e\.g|i\.e|et al|etc|vs|fig|figs|eq|eqs|no|dr|mr|mrs|ms|prof|cf|approx|ca|inc|ltd|st|jr|sr|al|pp|vol|ed|eds|resp)|\b[A-Z])\.$/i;

export function splitSentences(text: string): Sent[] {
  const out: Sent[] = [];
  if (!text || !text.trim()) return out;
  const parts = text.split(/(\n\s*\n|\f)/);
  let offset = 0;
  let paragraphNo = 0;
  for (const part of parts) {
    const base = offset;
    offset += part.length;
    if (!part.trim() || /^(\n\s*\n|\f)$/.test(part)) continue;
    paragraphNo += 1;
    let sentenceNo = 0;
    let startIdx = 0;
    const flush = (endIdx: number) => {
      const raw = part.slice(startIdx, endIdx);
      const lead = raw.length - raw.trimStart().length;
      const trimmed = raw.trim();
      startIdx = endIdx;
      if (!trimmed) return;
      sentenceNo += 1;
      const start = base + startIdx - raw.length + lead;
      out.push({
        id: `s${paragraphNo}-${sentenceNo}-${start}`,
        page: Math.floor(start / CHARS_PER_PAGE) + 1,
        paragraph: paragraphNo,
        sentence: sentenceNo,
        text: trimmed.replace(/\s*\n\s*/g, " "),
        start,
      });
    };
    for (let i = 0; i < part.length; i++) {
      const ch = part[i];
      if (ch === "\n") {
        // 문단 내부 줄바꿈: 앞 줄이 종결부호로 끝났을 때만 끊는다
        continue;
      }
      if (ch !== "." && ch !== "!" && ch !== "?" && ch !== "。" && ch !== "…") continue;
      let j = i;
      while (j + 1 < part.length && /[.!?。…]/.test(part[j + 1])) j++;
      // 닫는 따옴표/괄호는 문장에 붙인다
      while (j + 1 < part.length && /["'”’)\]]/.test(part[j + 1])) j++;
      const next = part[j + 1];
      if (next !== undefined && !/\s/.test(next)) { i = j; continue; } // 3.14, example.com, 약어 내부
      if (ch === "." && ABBREV.test(part.slice(startIdx, i + 1).trim().split(/\s+/).pop() ?? "")) { i = j; continue; }
      flush(j + 1);
      i = j;
    }
    flush(part.length);
  }
  return out;
}

/* ════════════════ 토큰화 ════════════════ */

const JOSA = ["에서는", "으로는", "에서", "으로", "에게", "까지", "부터", "처럼", "보다", "에는", "에도", "이나", "이다", "하는", "하고", "한다", "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "도", "로", "만"];

function stripJosa(w: string): string {
  for (const j of JOSA) if (w.length > j.length + 1 && w.endsWith(j)) return w.slice(0, -j.length);
  return w;
}

export function tokens(text: string, lang: Lang): string[] {
  if (lang === "en") return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?|\d+(?:\.\d+)?/g) ?? [];
  return (text.match(/[가-힣]+|[A-Za-z]+|\d+/g) ?? []).map((w) => stripJosa(w.toLowerCase()));
}

/** 표절용 shingle: 영문은 단어 4-gram, 한글은 공백·조사 영향을 줄이려 음절 6-gram */
function shingleSet(text: string, lang: Lang): Set<string> {
  const set = new Set<string>();
  if (lang === "en") {
    const t = tokens(text, "en");
    for (let i = 0; i + 4 <= t.length; i++) set.add(t.slice(i, i + 4).join(" "));
  } else {
    const s = (text.match(/[가-힣A-Za-z0-9]/g) ?? []).join("").toLowerCase();
    for (let i = 0; i + 6 <= s.length; i++) set.add(s.slice(i, i + 6));
  }
  return set;
}

const MIN_SHINGLES = 3;

/* ════════════════ 1) 표절 ════════════════ */

export interface PlagSource { name: string; text: string }

export interface PlagHit {
  sentenceId: string;
  page: number; paragraph: number; sentence: number;
  text: string;
  similarity: number; // 0-100
  kind: "internal" | "source" | "uncited-quote";
  matchLabel?: string;
  matchText?: string;
}

export interface PlagResult {
  hits: PlagHit[];
  overall: number;          // 유사 문장이 차지하는 글자 비율(%)
  sentences: number;
  comparedSources: number;
  uncitedQuotes: number;
}

const CITATION_RE = /\([^()]*\d{4}[a-z]?[^()]*\)|\[\d+(?:\s*[,–-]\s*\d+)*\]|[가-힣A-Za-z]+\s?\(\d{4}[a-z]?\)/;
const QUOTE_RE = /["“]([^"“”]{1,400})["”]|[‘']([^'‘’]{12,400})[’']/g;

export function checkPlagiarism(text: string, lang: Lang, sources: PlagSource[] = []): PlagResult {
  const sents = splitSentences(text);
  const hits: PlagHit[] = [];
  const sh = sents.map((s) => shingleSet(s.text, lang));
  const flaggedWeight = new Map<string, number>();

  // 1-a) 문서 내부 중복 — 역색인으로 O(총 shingle 수)
  const index = new Map<string, number[]>();
  sh.forEach((set, i) => { for (const g of set) { let a = index.get(g); if (!a) index.set(g, (a = [])); a.push(i); } });
  sh.forEach((set, j) => {
    if (set.size < MIN_SHINGLES) return;
    const overlap = new Map<number, number>();
    for (const g of set) for (const i of index.get(g) ?? []) if (i < j) overlap.set(i, (overlap.get(i) ?? 0) + 1);
    let best = -1, bestC = 0;
    for (const [i, c] of overlap) {
      const cont = c / set.size;
      if (cont > bestC) { bestC = cont; best = i; }
    }
    if (best >= 0 && bestC >= 0.6) {
      const s = sents[j];
      hits.push({ sentenceId: s.id, page: s.page, paragraph: s.paragraph, sentence: s.sentence, text: s.text, similarity: Math.round(bestC * 100), kind: "internal", matchLabel: `${sents[best].page}p ${sents[best].paragraph}·${sents[best].sentence}`, matchText: sents[best].text });
      flaggedWeight.set(s.id, bestC);
    }
  });

  // 1-b) 붙여 넣은 원문 대조
  const usable = sources.filter((s) => s.text.trim().length > 0);
  for (const src of usable) {
    const srcSents = splitSentences(src.text);
    const srcSh = srcSents.map((s) => shingleSet(s.text, lang));
    const all = new Set<string>();
    srcSh.forEach((set) => set.forEach((g) => all.add(g)));
    sh.forEach((set, j) => {
      if (set.size < MIN_SHINGLES) return;
      let c = 0;
      for (const g of set) if (all.has(g)) c++;
      const cont = c / set.size;
      if (cont < 0.4) return;
      const prev = flaggedWeight.get(sents[j].id) ?? 0;
      if (cont <= prev) return;
      let bi = 0, bc = -1;
      srcSh.forEach((ss, k) => { let m = 0; for (const g of set) if (ss.has(g)) m++; if (m > bc) { bc = m; bi = k; } });
      const s = sents[j];
      const existing = hits.findIndex((h) => h.sentenceId === s.id);
      const hit: PlagHit = { sentenceId: s.id, page: s.page, paragraph: s.paragraph, sentence: s.sentence, text: s.text, similarity: Math.round(cont * 100), kind: "source", matchLabel: src.name, matchText: srcSents[bi]?.text };
      if (existing >= 0) hits[existing] = hit; else hits.push(hit);
      flaggedWeight.set(s.id, cont);
    });
  }

  // 1-c) 인용부호는 있으나 출처 표기가 없는 문장
  const minQuote = lang === "ko" ? 15 : 30;
  let uncited = 0;
  for (const s of sents) {
    if (CITATION_RE.test(s.text)) continue;
    QUOTE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = QUOTE_RE.exec(s.text)) !== null) {
      const q = (m[1] ?? m[2] ?? "").trim();
      if (q.length >= minQuote && !hits.some((h) => h.sentenceId === s.id)) {
        hits.push({ sentenceId: s.id, page: s.page, paragraph: s.paragraph, sentence: s.sentence, text: s.text, similarity: 0, kind: "uncited-quote" });
        uncited++;
        break;
      }
    }
  }

  const total = sents.reduce((a, s) => a + s.text.length, 0);
  const covered = sents.reduce((a, s) => a + s.text.length * (flaggedWeight.get(s.id) ?? 0), 0);
  hits.sort((a, b) => a.page - b.page || a.paragraph - b.paragraph || a.sentence - b.sentence);
  return { hits, overall: total ? Math.min(100, Math.round((covered / total) * 100)) : 0, sentences: sents.length, comparedSources: usable.length, uncitedQuotes: uncited };
}

/* ════════════════ 2) 맞춤법 ════════════════ */

export interface GrammarIssue {
  sentenceId: string;
  page: number; paragraph: number; sentence: number;
  category: "spelling" | "spacing" | "grammar" | "punctuation" | "style";
  severity: "error" | "warning" | "info";
  original: string;
  suggestion: string;
  reason: string;
  context: string;
}

export interface GrammarResult { issues: GrammarIssue[]; score: number; sentences: number }

type Rule = { re: RegExp; to: string | ((m: RegExpMatchArray) => string); reason: string; category: GrammarIssue["category"]; severity: GrammarIssue["severity"] };

const KO_RULES: Rule[] = [
  ...([
    ["몇일", "며칠", "표준어는 ‘며칠’입니다."],
    ["왠만", "웬만", "‘웬만하다’가 표준어입니다."],
    ["되요", "돼요", "‘되어요’의 준말은 ‘돼요’입니다."],
    ["됬", "됐", "‘되었’의 준말은 ‘됐’입니다."],
    ["안됬", "안 됐", "‘안 되었다’의 준말은 ‘안 됐다’입니다."],
    ["않되", "안 되", "부정 부사는 ‘안’입니다."],
    ["할려고", "하려고", "‘-려고’가 바른 활용입니다."],
    ["하려구", "하려고", "‘-려고’가 표준입니다."],
    ["금새", "금세", "‘금세(금시에)’가 표준어입니다."],
    ["어떻해", "어떡해", "‘어떻게 해’의 준말은 ‘어떡해’입니다."],
    ["설레임", "설렘", "‘설레다’의 명사형은 ‘설렘’입니다."],
    ["희안", "희한", "‘희한하다’가 표준어입니다."],
    ["역활", "역할", "‘역할(役割)’이 맞습니다."],
    ["일일히", "일일이", "‘-이’ 부사입니다."],
    ["깨끗히", "깨끗이", "‘깨끗이’가 표준입니다."],
    ["오랫만", "오랜만", "‘오랜만’이 표준입니다."],
    ["바램", "바람", "‘바라다’의 명사형은 ‘바람’입니다."],
    ["웬지", "왠지", "‘왜인지’의 준말은 ‘왠지’입니다."],
    ["있읍니다", "있습니다", "‘-습니다’가 현행 표기입니다."],
    ["어의없", "어이없", "‘어이없다’가 표준어입니다."],
    ["곰곰히", "곰곰이", "‘곰곰이’가 표준입니다."],
    ["뵈요", "봬요", "‘뵈어요’의 준말은 ‘봬요’입니다."],
    ["수 밖에", "수밖에", "‘-ㄹ 수밖에’의 ‘수밖에’는 붙여 씁니다."],
  ] as const).map(([w, to, reason]): Rule => ({ re: new RegExp(w, "g"), to, reason, category: "spelling", severity: "error" })),
  { re: /(할|될|있을|없을|하는|있는|없는)(것|수|때)(?=[이은는을를도가에\s.,)]|$)/g, to: (m) => `${m[1]} ${m[2]}`, reason: "의존명사 ‘것·수·때’는 앞말과 띄어 씁니다.", category: "spacing", severity: "warning" },
  { re: /(되어|보여|쓰여|불려|나뉘어|바뀌어|잊혀)지(?:다|는|며|고|었|어|ㄴ|ㅂ)/g, to: (m) => m[0], reason: "이중 피동(‘-어지다’가 이미 피동인 말에 붙음)입니다. ‘되다/보이다’ 등으로 단순화하세요.", category: "grammar", severity: "warning" },
  { re: /(매우|정말|너무|아주|굉장히|상당히)\s/g, to: "삭제 또는 근거 있는 수치로 대체", reason: "학술문체: 근거 없는 강조 부사는 자제하세요.", category: "style", severity: "info" },
  { re: /(것 같다|것 같습니다|듯하다|듯합니다|인 것 같)/g, to: "단정적 서술", reason: "학술문체: 추측 표현보다 근거에 기반한 진술이 바람직합니다.", category: "style", severity: "info" },
  { re: /(저는|제가|나는|내가|우리는)\s/g, to: "본 연구는", reason: "학술문체: 1인칭 대신 ‘본 연구는’ 등을 권장합니다.", category: "style", severity: "info" },
  { re: /(해요|했어요|이에요|예요|거든요|같아요|인데요|잖아요|죠)(?=[.?!\s]|$)/g, to: "‘-ㅂ니다/-다’체", reason: "학술문체: 구어체(해요체) 종결은 논문에 적합하지 않습니다.", category: "style", severity: "warning" },
];

const EN_MISSPELL: [string, string][] = [
  ["teh", "the"], ["recieve", "receive"], ["occured", "occurred"], ["occurence", "occurrence"], ["seperate", "separate"], ["definately", "definitely"], ["accomodate", "accommodate"], ["untill", "until"], ["wich", "which"], ["thier", "their"], ["adress", "address"], ["enviroment", "environment"], ["goverment", "government"], ["begining", "beginning"], ["beleive", "believe"], ["acheive", "achieve"], ["existance", "existence"], ["neccessary", "necessary"], ["necesary", "necessary"], ["publically", "publicly"], ["refered", "referred"], ["sucess", "success"], ["sucessful", "successful"], ["writting", "writing"], ["arguement", "argument"], ["independant", "independent"], ["alot", "a lot"], ["wierd", "weird"], ["freind", "friend"], ["becuase", "because"], ["beacuse", "because"], ["thesis's", "thesis'"], ["significent", "significant"], ["signifcant", "significant"], ["analyis", "analysis"], ["anaylsis", "analysis"], ["hypotheis", "hypothesis"], ["paramter", "parameter"], ["dependant", "dependent"], ["reccomend", "recommend"], ["relevent", "relevant"], ["sepereate", "separate"], ["accross", "across"], ["tommorow", "tomorrow"], ["lenght", "length"], ["strenght", "strength"], ["calender", "calendar"], ["comparision", "comparison"], ["occassion", "occasion"], ["prefered", "preferred"], ["maintainance", "maintenance"], ["knowlege", "knowledge"], ["liason", "liaison"], ["embarass", "embarrass"], ["priviledge", "privilege"], ["persue", "pursue"], ["noticable", "noticeable"], ["mispell", "misspell"], ["dissapear", "disappear"], ["assesment", "assessment"], ["measurment", "measurement"], ["developement", "development"], ["enviromental", "environmental"],
];

const A_AN_AN_EXCEPT = /^(hour|honest|honou?r|heir|herb)/i;
const A_AN_A_EXCEPT = /^(uni|use|usu|uti|eu|one|once|ubiq|ura)/i;

export function checkGrammar(text: string, lang: Lang): GrammarResult {
  const sents = splitSentences(text);
  const issues: GrammarIssue[] = [];
  const push = (s: Sent, category: GrammarIssue["category"], severity: GrammarIssue["severity"], original: string, suggestion: string, reason: string) =>
    issues.push({ sentenceId: s.id, page: s.page, paragraph: s.paragraph, sentence: s.sentence, category, severity, original, suggestion, reason, context: s.text.length > 120 ? s.text.slice(0, 120) + "…" : s.text });

  for (const s of sents) {
    const t = s.text;
    // 공통: 공백·부호
    if (/ {2,}/.test(t)) push(s, "spacing", "warning", lang === "ko" ? "연속 공백" : "multiple spaces", lang === "ko" ? "단일 공백" : "single space", lang === "ko" ? "두 칸 이상 연속된 공백을 하나로 줄이세요." : "Collapse repeated spaces.");
    const sp = t.match(/\s[.,;:!?](?=\s|$)/);
    if (sp) push(s, "punctuation", "warning", sp[0], sp[0].trim(), lang === "ko" ? "부호 앞의 공백을 제거하세요." : "Remove the space before punctuation.");
    const ps = (t.match(/\(/g) ?? []).length - (t.match(/\)/g) ?? []).length;
    if (ps !== 0) push(s, "punctuation", "warning", ps > 0 ? "(" : ")", lang === "ko" ? "괄호 짝 맞추기" : "balance parentheses", lang === "ko" ? "여는/닫는 괄호의 수가 맞지 않습니다." : "Opening and closing parentheses do not match.");
    const qs = (t.match(/"/g) ?? []).length;
    if (qs % 2 === 1) push(s, "punctuation", "warning", '"', lang === "ko" ? "따옴표 짝 맞추기" : "balance quotes", lang === "ko" ? "큰따옴표 수가 홀수입니다." : "Odd number of double quotes.");

    if (lang === "ko") {
      for (const r of KO_RULES) {
        r.re.lastIndex = 0;
        const seen = new Set<string>();
        let m: RegExpExecArray | null;
        while ((m = r.re.exec(t)) !== null) {
          const orig = m[0].trim();
          if (seen.has(orig)) continue;
          seen.add(orig);
          const to = typeof r.to === "function" ? r.to(m) : r.to;
          push(s, r.category, r.severity, orig, to, r.reason);
        }
      }
      const cm = t.match(/[가-힣],[가-힣A-Za-z]/);
      if (cm) push(s, "spacing", "info", cm[0], cm[0].replace(",", ", "), "쉼표 뒤에는 공백을 둡니다.");
      if ((t.match(/의/g) ?? []).length >= 3 && /의\s?\S{0,8}의\s?\S{0,8}의/.test(t)) push(s, "style", "info", "‘의’ 연쇄", "문장 구조 분해", "‘의’가 연이어 쓰여 의미가 모호합니다.");
      if (t.replace(/\s/g, "").length > 120) push(s, "style", "info", `${t.replace(/\s/g, "").length}자 문장`, "문장 분할", "문장이 길어 가독성이 떨어집니다.");
    } else {
      const lower = t.match(/^[("'“‘\[]*([a-z])/);
      if (lower && !/^[("'“‘\[]*[a-z]+\./.test(t)) push(s, "grammar", "warning", t.slice(0, 12), lower[1].toUpperCase() + t.slice(t.indexOf(lower[1]) + 1, t.indexOf(lower[1]) + 12), "Sentence should start with a capital letter.");
      for (const m of t.matchAll(/\b([A-Za-z]+)\s+\1\b/gi)) {
        const w = m[1].toLowerCase();
        if (w === "that" || w === "had") continue;
        push(s, "grammar", "error", m[0], m[1], "Repeated word.");
      }
      for (const [w, to] of EN_MISSPELL) {
        const m = t.match(new RegExp(`\\b${w}\\b`, "i"));
        if (m) push(s, "spelling", "error", m[0], to, `Common misspelling of “${to}”.`);
      }
      for (const m of t.matchAll(/\b(could|should|would|must)\s+of\b/gi)) push(s, "grammar", "error", m[0], `${m[1]} have`, "“of” is a mis-hearing of “have”.");
      for (const m of t.matchAll(/\b(a|an)\s+([A-Za-z]+)/gi)) {
        const word = m[2];
        if (word === word.toUpperCase() && word.length > 1) continue;
        const startsVowel = /^[aeiou]/i.test(word);
        const wantsAn = (startsVowel && !A_AN_A_EXCEPT.test(word)) || A_AN_AN_EXCEPT.test(word);
        const art = m[1].toLowerCase();
        if (art === "a" && wantsAn) push(s, "grammar", "error", m[0], `an ${word}`, "Use “an” before a vowel sound.");
        if (art === "an" && !wantsAn) push(s, "grammar", "error", m[0], `a ${word}`, "Use “a” before a consonant sound.");
      }
      const cm = t.match(/[a-z][,;:][A-Za-z]/);
      if (cm) push(s, "spacing", "warning", cm[0], cm[0][0] + cm[0][1] + " " + cm[0][2], "Add a space after the punctuation mark.");
      const pd = t.match(/\b[a-z]{2,}\.[A-Z][a-z]+/);
      if (pd && !/[\/@]|www|\.(com|org|net|edu|io)\b/i.test(t)) push(s, "spacing", "warning", pd[0], pd[0].replace(".", ". "), "Add a space after the period.");
      const contr = t.match(/\b(don't|doesn't|didn't|can't|won't|isn't|aren't|wasn't|weren't|it's|that's|there's|we're|they're|I'm|I've|couldn't|wouldn't|shouldn't|hasn't|haven't)\b/i);
      if (contr) push(s, "style", "info", contr[0], "full form", "Academic style: avoid contractions.");
      const intens = t.match(/\b(very|really|extremely|totally|obviously|clearly|basically|a lot of|lots of|stuff|things?)\b/i);
      if (intens) push(s, "style", "info", intens[0], "precise wording", "Academic style: avoid vague or unsupported intensifiers.");
      const first = t.match(/\b(I think|I feel|I believe|in my opinion|we feel)\b/i);
      if (first) push(s, "style", "info", first[0], "evidence-based statement", "Academic style: ground claims in evidence rather than opinion markers.");
      const words = (t.match(/\S+/g) ?? []).length;
      if (words > 40) push(s, "style", "info", `${words} words`, "split sentence", "Very long sentence reduces readability.");
    }
  }
  const weight = issues.reduce((a, i) => a + (i.severity === "error" ? 3 : i.severity === "warning" ? 1.5 : 0.5), 0);
  const score = sents.length === 0 ? 100 : Math.max(0, Math.round(100 - (weight / sents.length) * 18));
  return { issues, score, sentences: sents.length };
}

/* ════════════════ 3) AI 생성 탐지 ════════════════ */

const AI_PHRASES_EN = /\b(moreover|furthermore|additionally|in conclusion|in summary|to summarize|it is (?:important|worth|crucial|essential) to (?:note|mention|emphasize|highlight)|it is worth noting|plays? a (?:crucial|pivotal|vital|key|significant) role|delve[sd]? into|in today's (?:fast-paced|digital|rapidly)|rapidly evolving|ever-evolving|tapestry|multifaceted|landscape of|underscor(?:e|es|ed|ing)|pivotal|leverag(?:e|es|ed|ing)|comprehensive (?:understanding|overview|analysis|approach)|holistic|a testament to|navigate the complexities|shed(?:s|ding)? light on|pav(?:e|es|ing) the way|seamless(?:ly)?|robust (?:framework|solution)|in the realm of|a wide range of|myriad|intricate|nuanced|foster(?:s|ing)?)\b|\bnot only\b[^.]{3,80}\bbut also\b/gi;
const AI_PHRASES_KO = /(결론적으로|종합적으로|요약하면|뿐만 아니라|이를 통해|중요한 역할을|핵심적인 역할|다양한 (?:측면|관점|요인|분야)|효과적으로|효율적으로|살펴보겠습니다|알아보겠습니다|할 수 있습니다|것이 중요합니다|것이 필요합니다|시사점을|다각적|패러다임|이러한 점에서|이와 같이|상호작용|지속 가능한|혁신적인|포괄적|심층적|궁극적으로|아울러|더불어|나아가)/g;
const TRANSITION_EN = /^(moreover|furthermore|additionally|however|therefore|thus|in conclusion|in summary|overall|consequently|importantly)\b/i;
const TRANSITION_KO = /^(또한|따라서|결론적으로|종합적으로|그러므로|이에|이를 통해|나아가|아울러|더불어|특히)/;
const HUMAN_EN = /\b(I|my|me|we|our)\b|\b\w+n't\b|\b\w+'s\b/g;
const HUMAN_KO = /(저는|제가|나는|내가|우리는|우리가|필자는|연구자는)/g;

export interface AISentence {
  sentenceId: string;
  page: number; paragraph: number; sentence: number;
  text: string;
  aiProbability: number;
  reasons: string[];
}

export interface AIResult {
  sentences: AISentence[];
  overall: number;                 // 0-100 문서 단위 AI 문체 점수
  verdict: "human" | "mixed" | "ai";
  confidence: "low" | "medium" | "high";
  metrics: { burstiness: number; formulaicPerSentence: number; openerRepeat: number; repeatedNgram: number; meanLength: number };
  sampleSize: number;              // 글자(ko) / 단어(en)
}

function lenOf(text: string, lang: Lang): number {
  return lang === "en" ? (text.match(/[A-Za-z0-9']+/g) ?? []).length : text.replace(/\s/g, "").length;
}

export function detectAI(text: string, lang: Lang): AIResult {
  const sents = splitSentences(text);
  const n = sents.length;
  const phrases = lang === "en" ? AI_PHRASES_EN : AI_PHRASES_KO;
  const transitions = lang === "en" ? TRANSITION_EN : TRANSITION_KO;
  const lens = sents.map((s) => lenOf(s.text, lang));
  const mean = n ? lens.reduce((a, b) => a + b, 0) / n : 0;
  const std = n ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / n) : 0;
  const cv = mean ? std / mean : 0;

  const openers = sents.map((s) => (tokens(s.text, lang)[0] ?? ""));
  const openerRepeat = n ? 1 - new Set(openers.filter(Boolean)).size / Math.max(1, openers.filter(Boolean).length) : 0;

  const flat = sents.map((s) => {
    phrases.lastIndex = 0;
    return (s.text.match(phrases) ?? []).length;
  });
  const formulaicPerSentence = n ? flat.reduce((a, b) => a + b, 0) / n : 0;

  // 반복 n-gram(문서 내)
  const grams = new Map<string, number>();
  let totalG = 0;
  for (const s of sents) {
    const tk = tokens(s.text, lang);
    const size = lang === "en" ? 3 : 2;
    for (let i = 0; i + size <= tk.length; i++) { const g = tk.slice(i, i + size).join(" "); grams.set(g, (grams.get(g) ?? 0) + 1); totalG++; }
  }
  let rep = 0;
  for (const c of grams.values()) if (c > 1) rep += c;
  const repeatedNgram = totalG ? rep / totalG : 0;

  const humanRe = lang === "en" ? HUMAN_EN : HUMAN_KO;
  humanRe.lastIndex = 0;
  const humanHits = (text.match(humanRe) ?? []).length;
  const typoHits = checkGrammar(text, lang).issues.filter((i) => i.category === "spelling").length;
  const citations = (text.match(new RegExp(CITATION_RE.source, "g")) ?? []).length;

  let score = 25;
  if (n >= 6) {
    if (cv < 0.3) score += 22; else if (cv < 0.4) score += 14; else if (cv < 0.5) score += 6; else if (cv > 0.65) score -= 8;
  }
  score += Math.min(34, formulaicPerSentence * 70);
  if (openerRepeat > 0.35) score += 8;
  if (repeatedNgram > 0.1) score += 6;
  score -= Math.min(15, typoHits * 3);
  score -= Math.min(10, (humanHits / Math.max(1, n)) * 12);
  score -= Math.min(8, (citations / Math.max(1, n)) * 12);
  const overall = n === 0 ? 0 : Math.max(3, Math.min(97, Math.round(score)));

  const sampleSize = lang === "en" ? lens.reduce((a, b) => a + b, 0) : lens.reduce((a, b) => a + b, 0);
  const small = lang === "en" ? sampleSize < 120 : sampleSize < 300;
  const mid = lang === "en" ? sampleSize < 400 : sampleSize < 1000;
  const confidence: AIResult["confidence"] = n < 6 || small ? "low" : mid ? "medium" : "high";

  const perSentence: AISentence[] = sents.map((s, i) => {
    const reasons: string[] = [];
    let p = overall * 0.45;
    if (flat[i] > 0) { p += Math.min(40, flat[i] * 18); reasons.push(lang === "ko" ? `정형 표현 ${flat[i]}건` : `${flat[i]} formulaic phrase(s)`); }
    if (transitions.test(s.text)) { p += 8; reasons.push(lang === "ko" ? "접속 부사로 시작" : "starts with a transition word"); }
    if (n >= 6 && cv < 0.45 && mean && Math.abs(lens[i] - mean) / mean < 0.15) { p += 8; reasons.push(lang === "ko" ? "문장 길이가 평균에 밀집" : "length clusters at the document mean"); }
    if (CITATION_RE.test(s.text)) p -= 10;
    if (reasons.length === 0) reasons.push(lang === "ko" ? "뚜렷한 AI 문체 단서 없음" : "no distinct AI-style cue");
    return { sentenceId: s.id, page: s.page, paragraph: s.paragraph, sentence: s.sentence, text: s.text, aiProbability: Math.max(2, Math.min(98, Math.round(p))), reasons };
  });

  return {
    sentences: perSentence,
    overall,
    verdict: overall < 35 ? "human" : overall < 60 ? "mixed" : "ai",
    confidence,
    metrics: { burstiness: Math.round(cv * 100) / 100, formulaicPerSentence: Math.round(formulaicPerSentence * 100) / 100, openerRepeat: Math.round(openerRepeat * 100) / 100, repeatedNgram: Math.round(repeatedNgram * 100) / 100, meanLength: Math.round(mean * 10) / 10 },
    sampleSize,
  };
}

/* ════════════════ 통합 품질 ════════════════ */

export interface QualityInput { plagiarism: number; grammar: number; ai: number; deep?: number | null }

export function qualityGrade({ plagiarism, grammar, ai, deep }: QualityInput): { grade: string; total: number } {
  const base = deep == null
    ? (100 - plagiarism) * 0.35 + grammar * 0.35 + (100 - ai) * 0.3
    : (100 - plagiarism) * 0.3 + grammar * 0.25 + (100 - ai) * 0.25 + deep * 0.2;
  const total = Math.round(base);
  const grade = total >= 90 ? "A+" : total >= 82 ? "A" : total >= 74 ? "B+" : total >= 66 ? "B" : total >= 58 ? "C" : "D";
  return { grade, total };
}
