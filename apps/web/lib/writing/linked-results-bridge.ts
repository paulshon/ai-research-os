/**
 * linked-results-bridge.ts — 연구설계·문헌연구 결과 ↔ 논문작성 연동.
 *
 * 연구설계 6개 기능 + 문헌연구(논문검색 갭분석 / 상세문헌엔진) 결과를
 * 브라우저에 저장하고, 논문작성 하단 패널에서 아코디언으로 조회한다.
 */

export const LINKED_RESULTS_STORAGE_KEY = "aros:writing:linked-results";
export const LINKED_RESULTS_EVENT = "aros:linked-results-changed";

export type LinkedResultKey =
  | "rd-topic"
  | "rd-rq"
  | "rd-concept"
  | "rd-method"
  | "rd-roadmap"
  | "rd-memory"
  | "lit-gap-search"
  | "lit-engine-search"
  | "lit-network"
  | "lit-gap"
  | "lit-design"
  | "lit-cluster";

export type LinkedResultGroup = "research-design" | "literature";

export interface LinkedPaper {
  title: string;
  authors?: string;
  year?: number;
  journal?: string;
  url?: string;
  doi?: string;
}

export interface LinkedResultItem {
  key: LinkedResultKey;
  group: LinkedResultGroup;
  title: string;
  body: string;
  papers?: LinkedPaper[];
  updatedAt: string;
}

export interface LinkedResultsStore {
  items: Partial<Record<LinkedResultKey, LinkedResultItem>>;
}

/** 논문작성 하단 아코디언 표시 순서 */
export const LINKED_RESULT_ORDER: LinkedResultKey[] = [
  "rd-topic",
  "rd-rq",
  "rd-concept",
  "rd-method",
  "rd-roadmap",
  "rd-memory",
  "lit-gap-search",
  "lit-engine-search",
  "lit-network",
  "lit-gap",
  "lit-design",
  "lit-cluster",
];

export const RESEARCH_SECTION_TO_KEY: Record<string, LinkedResultKey> = {
  topic: "rd-topic",
  rq: "rd-rq",
  concept: "rd-concept",
  method: "rd-method",
  roadmap: "rd-roadmap",
  memory: "rd-memory",
};

const emptyStore = (): LinkedResultsStore => ({ items: {} });

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LINKED_RESULTS_EVENT));
}

export function loadLinkedResults(): LinkedResultsStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(LINKED_RESULTS_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as LinkedResultsStore;
    return { items: parsed?.items ?? {} };
  } catch {
    return emptyStore();
  }
}

export function saveLinkedResults(store: LinkedResultsStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LINKED_RESULTS_STORAGE_KEY, JSON.stringify(store));
    notify();
  } catch {
    /* localStorage unavailable */
  }
}

export function upsertLinkedResult(
  item: Omit<LinkedResultItem, "updatedAt"> & { updatedAt?: string }
): void {
  const store = loadLinkedResults();
  const next: LinkedResultItem = {
    ...item,
    updatedAt: item.updatedAt ?? new Date().toISOString(),
  };
  // 빈 본문·논문이 모두 없으면 항목 제거
  if (!next.body.trim() && !(next.papers && next.papers.length > 0)) {
    delete store.items[next.key];
  } else {
    store.items[next.key] = next;
  }
  saveLinkedResults(store);
}

export function clearLinkedResults(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LINKED_RESULTS_STORAGE_KEY);
    notify();
  } catch {
    /* ignore */
  }
}

export function formatPaperList(papers: LinkedPaper[]): string {
  if (!papers.length) return "";
  return papers
    .map((p, i) => {
      const meta = [p.authors, p.year ? String(p.year) : "", p.journal]
        .filter(Boolean)
        .join(" · ");
      const link = p.url || (p.doi ? `https://doi.org/${p.doi}` : "");
      return `${i + 1}. ${p.title}${meta ? `\n   ${meta}` : ""}${link ? `\n   ${link}` : ""}`;
    })
    .join("\n\n");
}

export function buildNetworkSummaryFromMeta(
  papers: Array<{
    title: string;
    authors?: string;
    year?: number;
    journal?: string;
    keywords?: string[];
    url?: string;
    doi?: string;
  }>
): { body: string; papers: LinkedPaper[] } {
  const linked: LinkedPaper[] = papers.map((p) => ({
    title: p.title,
    authors: p.authors,
    year: p.year,
    journal: p.journal,
    url: p.url,
    doi: p.doi,
  }));
  const authorCount = new Map<string, number>();
  const keywordCount = new Map<string, number>();
  let edgeApprox = 0;
  for (const p of papers) {
    const authors = (p.authors || "")
      .split(/[,;]|\band\b|·|&/)
      .map((x) => x.trim())
      .filter((x) => x.length > 1);
    for (const a of authors) authorCount.set(a, (authorCount.get(a) || 0) + 1);
    if (authors.length > 1) edgeApprox += (authors.length * (authors.length - 1)) / 2;
    for (const kw of p.keywords || []) {
      const k = kw.trim();
      if (k) keywordCount.set(k, (keywordCount.get(k) || 0) + 1);
    }
  }
  const topAuthors = [...authorCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, n], i) => `${i + 1}. ${name} (연결도 ≈ ${n})`)
    .join("\n");
  const topKw = [...keywordCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, n], i) => `${i + 1}. ${k} (${n})`)
    .join("\n");
  const body = [
    "메타데이터 네트워크 분석 결과",
    `· 노드(저자): ${authorCount.size}`,
    `· 엣지(공동저자 추정): ${Math.round(edgeApprox)}`,
    `· 키워드 종류: ${keywordCount.size}`,
    `· 기반 논문: ${papers.length}편`,
    topAuthors ? `\n중심성 상위 노드 (연결 정도)\n${topAuthors}` : "",
    topKw ? `\n키워드 동시출현 상위\n${topKw}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { body, papers: linked };
}
