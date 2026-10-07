/** LLB (로컬문헌기반) — Scholar Stack 하위 메뉴 */

export const LLB_NAV = [
  { id: "search", href: "/llb/search", icon: "🔍", label: "검색", desc: "로컬 메타·전문 기반 문헌검색" },
  { id: "network", href: "/llb/network", icon: "🕸️", label: "네트워크분석", desc: "인용·관련논문 관계망" },
  { id: "analytics", href: "/llb/analytics", icon: "📊", label: "데이터분석", desc: "동향·영향력·저널·국가·주제 구조·통계 모델 10개 영역" },
  { id: "insights", href: "/llb/insights", icon: "💡", label: "연구 인사이트", desc: "요약·비교·비판 도구" },
  { id: "gap", href: "/llb/gap", icon: "🕳️", label: "연구갭", desc: "연구 공백 탐색" },
  { id: "design", href: "/llb/design", icon: "📐", label: "연구설계", desc: "설계 제안" },
  { id: "cluster", href: "/llb/cluster", icon: "🔬", label: "군집분석", desc: "주제 클러스터" },
] as const;

export type LlbNavId = (typeof LLB_NAV)[number]["id"];
