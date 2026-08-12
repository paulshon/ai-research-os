// L11 — Knowledge Layer
// 연구자가 배워야 할 지식 노드의 시드. 운영 시 수백~수천 노드로 확장 + pgvector 임베딩.

export interface KnowledgeNode {
  id: string;
  label: string;
  category: "concept" | "method" | "theory" | "framework" | "writing" | "defense";
  prerequisites: string[];
}

export const KNOWLEDGE_MAP: KnowledgeNode[] = [
  { id: "research-problem",  label: "연구문제", category: "concept", prerequisites: [] },
  { id: "research-purpose",  label: "연구목적", category: "concept", prerequisites: ["research-problem"] },
  { id: "research-question", label: "연구질문", category: "concept", prerequisites: ["research-purpose"] },
  { id: "hypothesis",        label: "가설",     category: "concept", prerequisites: ["research-question"] },
  { id: "variables",         label: "변수",     category: "concept", prerequisites: ["hypothesis"] },
  { id: "reliability",       label: "신뢰도",   category: "method",  prerequisites: ["variables"] },
  { id: "validity",          label: "타당도",   category: "method",  prerequisites: ["variables"] },
  { id: "sampling",          label: "표집",     category: "method",  prerequisites: ["validity"] },
  { id: "research-design",   label: "연구설계", category: "framework", prerequisites: ["sampling", "reliability"] },
  { id: "statistics",        label: "통계",     category: "method",  prerequisites: ["research-design"] },
  { id: "academic-writing",  label: "논문작성", category: "writing", prerequisites: ["research-design"] },
  { id: "defense",           label: "디펜스",   category: "defense", prerequisites: ["academic-writing"] },
];
