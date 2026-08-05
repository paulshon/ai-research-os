import type { SectionId } from "./sections";

export type MethodKind = "quant" | "qual" | "mixed";

export interface Axis {
  id: string;
  label: string;
  /** 기본 가중치(%) — 4개 합 100 */
  weight: number;
}

/** 섹션별 4개 고유 진단축(양적/혼합 기준). 방법 섹션은 질적 전환 시 swapAxesForMethod 로 교체한다. */
const BASE_AXES: Record<SectionId, Axis[]> = {
  background: [
    { id: "significance", label: "현상의 중요성", weight: 30 },
    { id: "lineage", label: "선행연구 계보", weight: 25 },
    { id: "gapClarity", label: "공백 명료성", weight: 30 },
    { id: "objectivity", label: "논조 객관성", weight: 15 },
  ],
  purpose: [
    { id: "clarity", label: "목적 명료성", weight: 30 },
    { id: "completeness", label: "요소 완결성(Purpose 5요소)", weight: 25 },
    { id: "rqAlignment", label: "RQ 정합성", weight: 30 },
    { id: "scope", label: "범위 적절성", weight: 15 },
  ],
  researchQuestion: [
    { id: "specificity", label: "질문 구체성", weight: 30 },
    { id: "testability", label: "검증 가능성", weight: 30 },
    { id: "theoryLink", label: "이론 연결성", weight: 20 },
    { id: "hypothesisLogic", label: "가설 도출 논리", weight: 20 },
  ],
  method: [
    { id: "reproducibility", label: "재현 가능성", weight: 25 },
    { id: "samplingJustification", label: "표집 정당화", weight: 25 },
    { id: "instrumentValidity", label: "도구 타당도", weight: 25 },
    { id: "analysisFit", label: "분석 정합성", weight: 25 },
  ],
  resultsAnalysis: [
    { id: "apaCompleteness", label: "통계보고 완전성(APA)", weight: 30 },
    { id: "hypothesisMapping", label: "가설-결과 대응", weight: 25 },
    { id: "interpretationSeparation", label: "해석 분리", weight: 25 },
    { id: "tableFigureUse", label: "표·그림 활용", weight: 20 },
  ],
  discussion: [
    { id: "noRestatement", label: "재진술 회피", weight: 25 },
    { id: "theoreticalInterpretation", label: "이론적 해석", weight: 30 },
    { id: "literatureDialogue", label: "선행연구 대화", weight: 25 },
    { id: "practicalImplication", label: "실천적 함의", weight: 20 },
  ],
  conclusion: [
    { id: "bookend", label: "수미상관", weight: 30 },
    { id: "contribution", label: "기여 구체성", weight: 30 },
    { id: "limitationHonesty", label: "한계 정직성", weight: 20 },
    { id: "futureResearch", label: "후속연구 명확성", weight: 20 },
  ],
};

/** 질적 연구에서는 표집/도구 축이 참여자 선정·신빙성 확보로 바뀐다. */
const QUALITATIVE_METHOD_AXES: Axis[] = [
  { id: "reproducibility", label: "재현 가능성", weight: 25 },
  { id: "participantSelection", label: "참여자 선정 논리", weight: 25 },
  { id: "credibilityProcedure", label: "신빙성 확보 절차", weight: 25 },
  { id: "analysisFit", label: "분석 정합성", weight: 25 },
];

export function getAxes(sectionId: SectionId, method: MethodKind): Axis[] {
  if (sectionId === "method" && method === "qual") return QUALITATIVE_METHOD_AXES;
  return BASE_AXES[sectionId];
}

/** 학문 분야 프로파일 — 섹션 가중치를 소폭 조정한다(연구방법·분석 섹션 강조). */
export interface FieldProfile {
  id: string;
  label: string;
  /** 강조 섹션(안내용 텍스트) */
  emphasis: SectionId[];
}

export const FIELD_PROFILES: FieldProfile[] = [
  { id: "general", label: "일반", emphasis: [] },
  { id: "business", label: "경영학", emphasis: ["method", "resultsAnalysis"] },
  { id: "education", label: "교육학", emphasis: ["background", "discussion"] },
  { id: "psychology", label: "심리학", emphasis: ["method", "researchQuestion"] },
  { id: "socialWelfare", label: "사회복지학", emphasis: ["purpose", "discussion"] },
  { id: "nursing", label: "간호학", emphasis: ["method", "resultsAnalysis"] },
];

export function fieldProfileById(id: string): FieldProfile {
  return FIELD_PROFILES.find((f) => f.id === id) ?? FIELD_PROFILES[0];
}
