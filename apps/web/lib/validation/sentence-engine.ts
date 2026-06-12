/**
 * v41: Research Validation Center — 공유 문장 분석 엔진
 *
 * 두 IA 문서의 핵심 원칙을 구현한다:
 *   "페이지 → 문단 → 문장(Sentence Map)" 구조를 먼저 구축하면
 *    표절·맞춤법·AI 탐지가 동일한 SentenceNode(id)를 공유한다.
 *
 * 모든 분석(표절/맞춤법/AI)은 동일한 buildSentenceMap() 결과를 입력으로 사용하므로,
 * "n페이지 m문단 k문장"을 클릭하면 세 결과가 같은 좌표로 연결된다.
 *
 * 로컬(결정적) 알고리즘으로 구현되어 API 키 없이도 항상 동작한다.
 */

export interface SentenceNode {
  id: string;
  page: number;
  paragraph: number;
  sentence: number;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface GrammarIssue {
  sentenceId: string;
  page: number;
  paragraph: number;
  sentence: number;
  category: "spelling" | "spacing" | "grammar" | "punctuation" | "style";
  severity: "error" | "warning" | "info";
  original: string;
  suggestion: string;
  reason: string;
}

export interface AIDetectionResult {
  sentenceId: string;
  page: number;
  paragraph: number;
  sentence: number;
  aiProbability: number; // 0-100
  perplexity: number;    // 낮을수록 AI 가능성↑ (상대값)
  burstiness: number;    // 낮을수록 AI 가능성↑
  entropy: number;
  humanScore: number;
  reasons: string[];
}

export interface PlagiarismResult {
  sentenceId: string;
  page: number;
  paragraph: number;
  sentence: number;
  similarity: number; // 0-100
  matchedSentenceId?: string;
  plagiarismType: "internal" | "quote" | "uncited-quote";
  note: string;
}

const CHARS_PER_PAGE = 1800; // 페이지 추정 (form-feed 없을 때)

/** 텍스트 → SentenceNode[] (페이지/문단/문장 좌표 부여) */
export function buildSentenceMap(text: string): SentenceNode[] {
  const nodes: SentenceNode[] = [];
  if (!text || !text.trim()) return nodes;

  const paragraphs = text.split(/\n\s*\n|\f/);
  let globalOffset = 0;
  let paragraphNo = 0;

  for (const para of paragraphs) {
    const paraStart = text.indexOf(para, globalOffset);
    const base = paraStart >= 0 ? paraStart : globalOffset;
    globalOffset = base + para.length;

    const trimmedPara = para.trim();
    if (!trimmedPara) continue;
    paragraphNo += 1;

    // 문장 분리: 종결부호(. ! ?) 또는 한국어 종결(다. / 음. / 함. / 임.) 뒤 공백/끝
    const sentenceRegex = /[^.!?。]*(?:[.!?。]+|$)/g;
    let sentenceNo = 0;
    let m: RegExpExecArray | null;
    let localOffset = 0;
    while ((m = sentenceRegex.exec(para)) !== null) {
      const raw = m[0];
      if (!raw.trim()) {
        if (m.index === sentenceRegex.lastIndex) sentenceRegex.lastIndex++;
        continue;
      }
      sentenceNo += 1;
      const start = base + m.index;
      const end = start + raw.length;
      const page = Math.floor(start / CHARS_PER_PAGE) + 1;
      nodes.push({
        id: `s_${paragraphNo}_${sentenceNo}_${start}`,
        page,
        paragraph: paragraphNo,
        sentence: sentenceNo,
        text: raw.trim(),
        startOffset: start,
        endOffset: end,
      });
      localOffset = m.index + raw.length;
      if (m.index === sentenceRegex.lastIndex) sentenceRegex.lastIndex++;
    }
    void localOffset;
  }
  return nodes;
}

// ════════════════════════════════════════════════
// 1) 맞춤법 / 띄어쓰기 / 문장부호 / 학술문체 검사 (로컬 휴리스틱)
// ════════════════════════════════════════════════

const SPELL_PAIRS: { wrong: RegExp; right: string; reason: string }[] = [
  { wrong: /잇다/g, right: "있다", reason: "‘잇다(연결하다)’와 ‘있다(존재)’ 혼동" },
  { wrong: /되요/g, right: "돼요", reason: "‘되어요→돼요’" },
  { wrong: /안되/g, right: "안 되", reason: "부사 ‘안’ 뒤 띄어쓰기" },
  { wrong: /몇일/g, right: "며칠", reason: "표준어는 ‘며칠’" },
  { wrong: /왠만하면/g, right: "웬만하면", reason: "‘웬만하면’이 표준" },
  { wrong: /[가-힣]율(?=\s|[.,]|$)/g, right: "—률 검토", reason: "받침 뒤에는 ‘률’ (예: 비율→확률)" },
  { wrong: /로써(?=\s|[.,])/g, right: "로서/로써 확인", reason: "자격=‘로서’, 수단=‘로써’ 구분" },
];

const ACADEMIC_STYLE: { wrong: RegExp; reason: string }[] = [
  { wrong: /(매우|정말|너무|아주)\s/g, reason: "학술문체: 강조 부사(매우/너무 등) 사용 자제" },
  { wrong: /(것 같다|듯하다|인 것 같)/g, reason: "학술문체: 추측 표현보다 단정적 진술 권장" },
  { wrong: /(저는|제가|나는|내가)\s/g, reason: "학술문체: 1인칭 대신 ‘본 연구는’ 등 권장" },
];

export function checkGrammar(nodes: SentenceNode[]): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  for (const n of nodes) {
    const txt = n.text;

    // 띄어쓰기: 이중 공백
    if (/ {2,}/.test(txt)) {
      issues.push({
        sentenceId: n.id, page: n.page, paragraph: n.paragraph, sentence: n.sentence,
        category: "spacing", severity: "warning",
        original: "연속 공백", suggestion: "단일 공백", reason: "두 칸 이상 연속된 공백을 하나로 정리하세요.",
      });
    }
    // 문장부호: 마침표 앞 공백
    if (/\s[.,!?]/.test(txt)) {
      issues.push({
        sentenceId: n.id, page: n.page, paragraph: n.paragraph, sentence: n.sentence,
        category: "punctuation", severity: "warning",
        original: "부호 앞 공백", suggestion: "공백 제거", reason: "마침표·쉼표 앞의 공백을 제거하세요.",
      });
    }
    // 맞춤법
    for (const p of SPELL_PAIRS) {
      const mm = txt.match(p.wrong);
      if (mm) {
        issues.push({
          sentenceId: n.id, page: n.page, paragraph: n.paragraph, sentence: n.sentence,
          category: "spelling", severity: "error",
          original: mm[0], suggestion: p.right, reason: p.reason,
        });
      }
    }
    // 학술문체
    for (const s of ACADEMIC_STYLE) {
      const mm = txt.match(s.wrong);
      if (mm) {
        issues.push({
          sentenceId: n.id, page: n.page, paragraph: n.paragraph, sentence: n.sentence,
          category: "style", severity: "info",
          original: mm[0].trim(), suggestion: "학술문체로 수정", reason: s.reason,
        });
      }
    }
    // 문장 길이(가독성)
    if (txt.length > 160) {
      issues.push({
        sentenceId: n.id, page: n.page, paragraph: n.paragraph, sentence: n.sentence,
        category: "style", severity: "info",
        original: `${txt.length}자 문장`, suggestion: "문장 분할", reason: "문장이 길어 가독성이 떨어집니다. 두 문장으로 나누는 것을 권장합니다.",
      });
    }
  }
  return issues;
}

/** 맞춤법 정확도 점수 (100 - 가중 오류) */
export function grammarScore(nodes: SentenceNode[], issues: GrammarIssue[]): number {
  if (nodes.length === 0) return 100;
  const weight = issues.reduce((a, i) => a + (i.severity === "error" ? 3 : i.severity === "warning" ? 1.5 : 0.7), 0);
  const per = weight / nodes.length;
  return Math.max(0, Math.round(100 - per * 18));
}

// ════════════════════════════════════════════════
// 2) AI 생성 탐지 (로컬 통계: perplexity-proxy / burstiness / entropy / repetition)
// ════════════════════════════════════════════════

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]+|[가-힣]+/g) ?? [];
}

function shannonEntropy(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  let h = 0;
  for (const c of freq.values()) {
    const p = c / tokens.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export function detectAI(nodes: SentenceNode[]): { results: AIDetectionResult[]; overall: number } {
  if (nodes.length === 0) return { results: [], overall: 0 };

  const lengths = nodes.map((n) => tokenize(n.text).length || 1);
  const meanLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - meanLen) ** 2, 0) / lengths.length;
  const std = Math.sqrt(variance);
  // burstiness: (std - mean) / (std + mean) — 인간 글은 높음(다양), AI는 낮음(균일)
  const docBurstiness = (std - meanLen) / (std + meanLen + 1e-6);

  // 문서 전체 bigram 반복도
  const bigrams = new Map<string, number>();
  for (const n of nodes) {
    const tk = tokenize(n.text);
    for (let i = 0; i + 1 < tk.length; i++) {
      const bg = tk[i] + " " + tk[i + 1];
      bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
    }
  }

  const results: AIDetectionResult[] = nodes.map((n) => {
    const tk = tokenize(n.text);
    const len = tk.length || 1;
    const unique = new Set(tk).size;
    const diversity = unique / len;            // 낮으면 반복적
    const entropy = shannonEntropy(tk);
    // perplexity proxy: 어휘 다양성·엔트로피 기반(낮을수록 예측가능=AI스러움)
    const perplexity = Math.round((entropy * diversity) * 100) / 10;

    // 반복 bigram 비율
    let repeated = 0;
    for (let i = 0; i + 1 < tk.length; i++) {
      const bg = tk[i] + " " + tk[i + 1];
      if ((bigrams.get(bg) ?? 0) > 1) repeated++;
    }
    const repetition = tk.length > 1 ? repeated / (tk.length - 1) : 0;

    // 길이 균일성 (문장이 평균에 가까울수록 AI스러움)
    const lenDev = Math.abs(len - meanLen) / (std + 1e-6);
    const uniformity = Math.max(0, 1 - Math.min(1, lenDev)); // 0~1, 1=매우 균일

    const reasons: string[] = [];
    let score = 0;
    if (diversity < 0.62) { score += 26; reasons.push("낮은 어휘 다양성"); }
    if (perplexity < 4) { score += 24; reasons.push("낮은 Perplexity(예측가능한 표현)"); }
    if (repetition > 0.18) { score += 20; reasons.push("반복 표현/구문 패턴"); }
    if (uniformity > 0.7) { score += 16; reasons.push("문장 길이의 높은 균일성"); }
    if (docBurstiness > -0.1) { score += 14; reasons.push("낮은 Burstiness(문체 균일성)"); }
    if (reasons.length === 0) reasons.push("인간 작성 흔적(다양한 길이·어휘)");

    const aiProbability = Math.max(2, Math.min(98, Math.round(score)));
    return {
      sentenceId: n.id, page: n.page, paragraph: n.paragraph, sentence: n.sentence,
      aiProbability,
      perplexity,
      burstiness: Math.round((uniformity) * 100) / 100,
      entropy: Math.round(entropy * 100) / 100,
      humanScore: 100 - aiProbability,
      reasons,
    };
  });

  const overall = Math.round(results.reduce((a, r) => a + r.aiProbability, 0) / results.length);
  return { results, overall };
}

// ════════════════════════════════════════════════
// 3) 표절 검사 (로컬: 내부 중복 n-gram + 인용부호/출처 탐지)
// ════════════════════════════════════════════════

function shingles(tokens: string[], n = 4): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) set.add(tokens.slice(i, i + n).join(" "));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function checkPlagiarism(nodes: SentenceNode[]): { results: PlagiarismResult[]; overall: number } {
  if (nodes.length === 0) return { results: [], overall: 0 };
  const shings = nodes.map((n) => shingles(tokenize(n.text)));
  const results: PlagiarismResult[] = [];

  nodes.forEach((n, i) => {
    // 내부 중복(자기표절/중복문장)
    let bestSim = 0;
    let bestId: string | undefined;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const sim = jaccard(shings[i], shings[j]);
      if (sim > bestSim) { bestSim = sim; bestId = nodes[j].id; }
    }

    const hasQuote = /["“”'']/.test(n.text);
    const hasCitation = /\(\s*[A-Za-z가-힣].*\d{4}\s*\)|\[\d+\]|\(\d{4}\)/.test(n.text);

    if (bestSim >= 0.5) {
      results.push({
        sentenceId: n.id, page: n.page, paragraph: n.paragraph, sentence: n.sentence,
        similarity: Math.round(bestSim * 100), matchedSentenceId: bestId,
        plagiarismType: "internal",
        note: "문서 내 다른 문장과 높은 중복(자기표절·중복서술 가능)",
      });
    } else if (hasQuote && !hasCitation) {
      results.push({
        sentenceId: n.id, page: n.page, paragraph: n.paragraph, sentence: n.sentence,
        similarity: 60, plagiarismType: "uncited-quote",
        note: "인용부호가 있으나 출처 표기가 보이지 않음(인용 누락 위험)",
      });
    }
  });

  // 전체 유사도: 플래그된 문장 비중 + 평균 내부 유사도
  const flaggedRatio = results.length / nodes.length;
  const overall = Math.min(100, Math.round(flaggedRatio * 100));
  return { results, overall };
}

/** 등급 산정 */
export function qualityGrade(plagiarism: number, grammar: number, aiRate: number): { grade: string; total: number } {
  // 표절 낮을수록, 맞춤법 높을수록, AI 낮을수록 좋음
  const total = Math.round((100 - plagiarism) * 0.35 + grammar * 0.35 + (100 - aiRate) * 0.3);
  let grade = "D";
  if (total >= 90) grade = "A+";
  else if (total >= 82) grade = "A";
  else if (total >= 74) grade = "B+";
  else if (total >= 66) grade = "B";
  else if (total >= 58) grade = "C";
  return { grade, total };
}
