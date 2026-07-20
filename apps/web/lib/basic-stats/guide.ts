/**
 * 기본통계 — 커리큘럼 로더·타입
 * 기술·추론 분석 + 구조방정식 스토리형 절차
 */
export type BsChoice = { id: string; label: string; hint?: string };
export type BsStep = {
  id: string;
  title: string;
  why: string;
  nextWhy: string;
  choices: BsChoice[];
  example: string;
};
// v53: 심화 서술(명칭 유래·개요 풀이·프로세스 상세·예시 풀이)
export type BsNaming = { why: string; use: string; examples: string[] };
export type BsOverviewEasy = { plain: string; examples: string[] };
export type BsProcessDetail = { term: string; desc: string; examples: string[] };
export type BsExampleEasy = { ex: string; plain: string };
export type BsModule = {
  id: string;
  name: string;
  group: "classic" | "sem" | "spss" | "amos" | string;
  overview: string;
  process: string[];
  examples: string[];
  steps: BsStep[];
  sampleCsv: string;
  chart: string;
  next: string[];
  decision?: string;
  source?: string;
  // v53 심화
  naming?: BsNaming;
  overviewEasy?: BsOverviewEasy;
  processDetail?: BsProcessDetail[];
  examplesEasy?: BsExampleEasy[];
};
export type BsCurriculum = {
  version: string;
  source: string;
  story: { id: string; label: string; desc: string }[];
  basics: {
    title: string;
    chapters: {
      id: string; title: string; summary: string; examples: string[];
      detail?: { naming: string; meaning: string; examples: string[] };
    }[];
    // v53: 모든 척도·모든 변수 전면 서술
    scales?: {
      title: string; intro: string;
      items: { name: string; desc: string; stat: string; examples: string[] }[];
    };
    variables?: {
      title: string; intro: string;
      items: { name: string; desc: string; examples: string[] }[];
    };
  };
  semOverview: {
    title: string;
    easy: string;
    parts: { name: string; desc: string }[];
    examples: string[];
    story: string[];
  };
  decision: {
    title: string;
    assumptions: string[];
    branches: { when: string; then: string; to: string }[];
    // v53: 구분도 용어 가이드 + 8개 분석 명칭 유래
    termGuide?: { term: string; meaning: string; why: string; examples: string[] }[];
    analysisNaming?: { name: string; why: string; use: string; examples: string[] }[];
  };
  modules: BsModule[];
};

let cache: BsCurriculum | null = null;

export async function loadBasicStatsCurriculum(): Promise<BsCurriculum> {
  if (cache) return cache;
  const r = await fetch("/basic-stats-curriculum.json");
  if (!r.ok) throw new Error("basic-stats curriculum load failed");
  cache = await r.json();
  return cache!;
}

export function getModule(cur: BsCurriculum, id: string): BsModule | undefined {
  return cur.modules.find((m) => m.id === id);
}
