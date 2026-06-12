/**
 * registry.ts — 연구방법 엔진 카탈로그.
 *
 * 논문구조엔진(THESIS_CATEGORIES)과 동일한 "카테고리 → 유형" 구조를 따른다.
 * 새로운 연구방법 유형을 추가하려면 아래 배열에 항목을 하나 추가하면 되며,
 * 동적 라우트 /method/[type] 페이지가 레지스트리의 steps(메뉴)를 읽어
 * 해당 유형 전용 작업 페이지를 자동으로 구성한다.
 *
 * status:
 *   - "available": 실행 가능한 유형 (전용 작업공간 탑재)
 *   - "coming":    골격만 정의된 유형 (메뉴 구조 미리 노출, 추후 엔진 탑재)
 */

export interface MethodStep {
  key: string;
  label: string;
  icon: string;
  desc: string;
}

export type MethodStatus = "available" | "coming";

export interface MethodType {
  id: string;
  name: string;
  en?: string;
  color: string;
  status: MethodStatus;
  summary: string;
  /** 해당 유형 전용 메뉴(워크플로우). available 유형은 작업공간이 이 순서를 따른다. */
  steps: MethodStep[];
}

export interface MethodCategory {
  cat: string;
  types: MethodType[];
}

/** 혼합 질적내용분석(QCA)의 10단계 워크플로우 — Codebook-Driven QCA System v3 이식. */
export const QCA_STEPS: MethodStep[] = [
  { key: "project", label: "1. 프로젝트", icon: "folder", desc: "연구명·연구문제 설정" },
  { key: "collect", label: "2. 자료수집", icon: "upload", desc: "Excel·CSV·텍스트 원문 불러오기" },
  { key: "clean", label: "3. 텍스트정제", icon: "spell", desc: "정규화·토큰화·표제어화·불용어 제거" },
  { key: "frequency", label: "4. 빈도분석", icon: "chart", desc: "단어빈도·N-gram·TF-IDF·공기어" },
  { key: "codebook", label: "5. 코드북", icon: "checklist", desc: "조작적 정의·지표·판정규칙 코딩체계" },
  { key: "coding", label: "6. 자동코딩", icon: "aiscan", desc: "규칙·의미·하이브리드 코딩 + 신뢰도" },
  { key: "theme", label: "7. 범주·주제", icon: "database", desc: "범주 빈도/밀도 → 상위범주 → 담론" },
  { key: "network", label: "8. 네트워크분석", icon: "network", desc: "키워드·코드·도시 네트워크와 중심성" },
  { key: "interpret", label: "9. 해석·논문", icon: "writing", desc: "연구방법·결과·논의·결론 초안 생성" },
  { key: "export", label: "10. 내보내기", icon: "download", desc: "XLSX·보고서·CSV·JSON 내보내기" },
];

export const METHOD_CATEGORIES: MethodCategory[] = [
  {
    cat: "🟢 질적 분석형",
    types: [
      {
        id: "qca",
        name: "혼합 질적내용분석",
        en: "Mixed Qualitative Content Analysis",
        color: "#3ecfb2",
        status: "available",
        summary:
          "코드북 기반 질적 내용분석(QCA)에 빈도·네트워크 등 양적 분석을 결합한 혼합 방법. 원문수집부터 논문서술까지 10단계를 100% 로컬로 실행한다.",
        steps: QCA_STEPS,
      },
      {
        id: "thematic",
        name: "주제분석",
        en: "Thematic Analysis",
        color: "#10b981",
        status: "coming",
        summary: "Braun & Clarke 6단계 주제분석 — 친숙화·초기코딩·주제탐색·검토·정의·서술.",
        steps: [
          { key: "familiarize", label: "1. 자료 친숙화", icon: "note", desc: "전사·정독·메모" },
          { key: "initial-codes", label: "2. 초기 코딩", icon: "checklist", desc: "의미 단위 코딩" },
          { key: "search-themes", label: "3. 주제 탐색", icon: "search", desc: "코드 군집화" },
          { key: "review-themes", label: "4. 주제 검토", icon: "shieldCheck", desc: "내적·외적 동질성" },
          { key: "define-themes", label: "5. 주제 정의·명명", icon: "edit", desc: "주제 서사 구성" },
          { key: "report", label: "6. 보고서 작성", icon: "writing", desc: "발췌 + 해석 서술" },
        ],
      },
      {
        id: "grounded",
        name: "근거이론",
        en: "Grounded Theory",
        color: "#d946ef",
        status: "coming",
        summary: "개방·축·선택 코딩을 통한 상향식 이론 생성과 지속적 비교.",
        steps: [
          { key: "open", label: "1. 개방 코딩", icon: "checklist", desc: "개념·범주 추출" },
          { key: "axial", label: "2. 축 코딩", icon: "network", desc: "범주 간 관계 연결" },
          { key: "selective", label: "3. 선택 코딩", icon: "target", desc: "핵심범주 중심 통합" },
          { key: "memo", label: "4. 메모·이론화", icon: "note", desc: "이론적 메모·포화" },
        ],
      },
    ],
  },
  {
    cat: "🔵 양적 분석형",
    types: [
      {
        id: "survey-stats",
        name: "설문 통계분석",
        en: "Survey Statistics",
        color: "#6c8cff",
        status: "coming",
        summary: "기술통계·신뢰도·요인분석·회귀 등 설문기반 양적 분석 파이프라인.",
        steps: [
          { key: "data", label: "1. 데이터 적재", icon: "upload", desc: "응답 데이터 불러오기" },
          { key: "descriptive", label: "2. 기술통계", icon: "chart", desc: "평균·표준편차·분포" },
          { key: "reliability", label: "3. 신뢰도·타당도", icon: "shieldCheck", desc: "Cronbach α·요인분석" },
          { key: "inference", label: "4. 추론통계", icon: "scale", desc: "t·ANOVA·회귀" },
          { key: "report", label: "5. 결과표·서술", icon: "writing", desc: "표·해석 초안" },
        ],
      },
    ],
  },
];

export const ALL_METHOD_TYPES: MethodType[] = METHOD_CATEGORIES.flatMap((c) => c.types);

export function getMethodType(id: string): MethodType | undefined {
  return ALL_METHOD_TYPES.find((t) => t.id === id);
}
