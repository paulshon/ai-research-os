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

/* s-renew-14: 실제 엔진이 탑재된 2종(혼합 질적내용분석 · 기본통계)만 노출한다.
   골격만 있던 주제분석·근거이론은 카탈로그에서 제거했다. */
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
    ],
  },
  {
    cat: "🔵 양적 분석형",
    types: [
      {
        id: "basic-stats",
        name: "기본통계",
        en: "Basic Statistics",
        color: "#6c8cff",
        status: "available",
        summary:
          "기술통계·t검정·ANOVA·신뢰도·회귀·SEM 등 양적 분석 기본통계 엔진. 모듈별 데모 12종·변수 설명·상세 해석·차트 내보내기.",
        steps: [
          { key: "overview", label: "1. 모듈 선택", icon: "chart", desc: "분석 기법·개요 확인" },
          { key: "data", label: "2. 데이터 적재", icon: "upload", desc: "데모·CSV·엑셀 불러오기" },
          { key: "preview", label: "3. 변수·미리보기", icon: "checklist", desc: "컬럼 의미·상위 행 확인" },
          { key: "steps", label: "4. 분석 절차", icon: "ruler", desc: "스토리형 단계 선택" },
          { key: "run", label: "5. 분석 실행", icon: "target", desc: "통계 계산·차트 생성" },
          { key: "export", label: "6. 해석·내보내기", icon: "download", desc: "상세 해석·PNG/JPEG/PDF/엑셀" },
        ],
      },
    ],
  },
];

export const ALL_METHOD_TYPES: MethodType[] = METHOD_CATEGORIES.flatMap((c) => c.types);

export function getMethodType(id: string): MethodType | undefined {
  return ALL_METHOD_TYPES.find((t) => t.id === id);
}
