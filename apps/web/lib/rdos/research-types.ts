// 논문작성에서 지원하는 연구유형. 플랜 티어가 이 집합을 게이팅한다.
export type ResearchType =
  | "quantitative"        // 양적
  | "qualitative"         // 질적
  | "mixed"               // 혼합
  | "experimental"        // 실험연구
  | "systematic-review"   // 체계적 문헌고찰
  | "meta-analysis"       // 메타분석
  | "narrative-review"    // 서술적 문헌연구
  | "scoping-review";     // 범위 문헌연구

export const RESEARCH_TYPE_KO: Record<ResearchType, string> = {
  "quantitative": "양적연구",
  "qualitative": "질적연구",
  "mixed": "혼합연구",
  "experimental": "실험연구",
  "systematic-review": "체계적 문헌고찰",
  "meta-analysis": "메타분석",
  "narrative-review": "서술적 문헌연구",
  "scoping-review": "범위 문헌연구",
};
