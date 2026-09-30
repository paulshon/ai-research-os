/** LLB (로컬문헌기반) — Scholar Stack 하위 메뉴 */

export const LLB_NAV = [
  { id: "search", href: "/llb/search", icon: "🔍", label: "검색", desc: "로컬 메타·전문 기반 문헌검색" },
  { id: "databases", href: "/llb/databases", icon: "🗄️", label: "DB 목록", desc: "F 원천고 · L 색인허브 · K 전문고" },
  { id: "network", href: "/llb/network", icon: "🕸️", label: "네트워크분석", desc: "인용·관련논문 관계망" },
  { id: "analytics", href: "/llb/analytics", icon: "📊", label: "데이터분석", desc: "연도·저널·출처 통계" },
  { id: "insights", href: "/llb/insights", icon: "💡", label: "연구 인사이트", desc: "요약·비교·비판 도구" },
  { id: "gap", href: "/llb/gap", icon: "🕳️", label: "연구갭", desc: "연구 공백 탐색" },
  { id: "design", href: "/llb/design", icon: "📐", label: "연구설계", desc: "설계 제안" },
  { id: "cluster", href: "/llb/cluster", icon: "🔬", label: "군집분석", desc: "주제 클러스터" },
] as const;

export type LlbNavId = (typeof LLB_NAV)[number]["id"];

export const LLB_STACK = [
  {
    drive: "F:",
    name: "Corpus Vault",
    nameKo: "메타원천고",
    role: "OpenAlex Works 원본 Parquet",
    path: "F:\\OpenAlex",
    accent: "#3ecfb2",
  },
  {
    drive: "L:",
    name: "Index Hub",
    nameKo: "검색허브",
    role: "Crossref · PubMed · DataCite · ClickHouse",
    path: "L:\\Academic + L:\\ClickHouse",
    accent: "#6c8cff",
  },
  {
    drive: "K:",
    name: "Fulltext Store",
    nameKo: "전문저장고",
    role: "최근 5년·분야 OA 본문 텍스트",
    path: "K:\\OA_Fulltext",
    accent: "#e8b84b",
  },
] as const;
