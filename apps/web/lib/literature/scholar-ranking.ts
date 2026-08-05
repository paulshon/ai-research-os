/**
 * 문헌 검색 랭킹 — 수정안 §2 (의미 유사도·최신성·인용·연구설계 일치·분야 적합)
 */

export type ScholarMethodBoost =
  | "quantitative"
  | "qualitative"
  | "mixed"
  | "experimental"
  | "all";

export interface RankablePaper {
  similarity: number;
  year: number | null;
  citations: number;
  title: string;
  abstract: string;
  keywords: string[];
  journal: string;
}

const METHOD_PATTERNS: Record<Exclude<ScholarMethodBoost, "all">, RegExp> = {
  quantitative: /\b(quantitative|survey|regression|sem\b|anova|experiment|statistical|scale|questionnaire)\b/i,
  qualitative: /\b(qualitative|phenomenolog|grounded|interview|thematic|ethnograph|narrative inquiry|case study)\b/i,
  mixed: /\b(mixed.?method|concurrent|sequential|triangulation)\b/i,
  experimental: /\b(experimental|randomized|rct\b|control group|intervention|pretest|posttest)\b/i,
};

export function boostSimilarityForMethod(
  text: string,
  method: ScholarMethodBoost,
): number {
  if (method === "all") return 0;
  return METHOD_PATTERNS[method].test(text) ? 0.1 : 0;
}

export function rankScholarPapers<T extends RankablePaper>(
  papers: T[],
  opts: {
    method?: ScholarMethodBoost;
    projectKeywords?: string[];
  } = {},
): T[] {
  const method = opts.method ?? "all";
  const kw = (opts.projectKeywords ?? [])
    .map((k) => k.toLowerCase().trim())
    .filter(Boolean);
  const nowYear = new Date().getFullYear();

  const scored = papers.map((p) => {
    let score = p.similarity;
    if (p.year != null && p.year > 1990) {
      const age = nowYear - p.year;
      score += Math.max(0, 0.14 - age * 0.012);
    }
    if (p.citations > 0) {
      score += Math.min(0.12, Math.log10(p.citations + 1) * 0.04);
    }
    const blob = `${p.title} ${p.abstract} ${p.keywords.join(" ")}`;
    score += boostSimilarityForMethod(blob, method);
    if (kw.length) {
      const lower = blob.toLowerCase();
      const hits = kw.filter((k) => lower.includes(k)).length;
      score += Math.min(0.1, hits * 0.03);
    }
    return { ...p, similarity: Math.min(0.995, score) };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored;
}
