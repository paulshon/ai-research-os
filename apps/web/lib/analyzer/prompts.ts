import type { SectionId } from "./sections";
import { SECTION_LABEL } from "./sections";
import { getAxes, type MethodKind } from "./axes";

/**
 * 섹션×축(7×4=28) 판정 기준 안내문.
 * 각 기준은 실제로 본문에서 확인 가능한 관찰 포인트를 지정해,
 * AI가 원문에 없는 근거를 지어내지 않도록 한다.
 */
const AXIS_GUIDE: Record<string, string> = {
  // background
  significance: "다루는 현상·문제가 왜 지금 중요한지 구체적 근거(통계·사례·정책 등)로 뒷받침되는가.",
  lineage: "선행연구 흐름이 시간순 또는 주제별로 계보화되어 있는가, 단순 나열에 그치지 않는가.",
  gapClarity: "선행연구가 다루지 못한 공백(Research Gap)이 한 문장으로 짚어낼 만큼 뚜렷한가.",
  objectivity: "주장이 과도한 일반화나 감정적 어휘 없이 절제된 논조로 서술되는가.",
  // purpose
  clarity: "연구 목적이 모호한 수식어 없이 한 문장으로 명료하게 선언되는가.",
  completeness: "Creswell Purpose Statement 5요소(중심현상·방법·참여자·장소·목적동사) 중 몇 개가 포함되는가.",
  rqAlignment: "목적 문장과 이후 등장하는 연구질문이 같은 대상·범위를 가리키는가.",
  scope: "목적이 본문에서 실제로 다루는 범위와 과대·과소 없이 일치하는가.",
  // researchQuestion
  specificity: "연구질문이 추상적 개념어가 아니라 관찰·측정 가능한 대상으로 구체화되어 있는가.",
  testability: "질문이 자료로 답할 수 있는 형태(의문문·개방형/폐쇄형)로 서술되는가.",
  theoryLink: "질문이 이론적 배경에서 도출된 개념·변수와 연결되는가.",
  hypothesisLogic: "가설이 있다면 이론에서 연역적으로 도출되는 논리가 드러나는가.",
  // method
  reproducibility: "다른 연구자가 동일 절차를 재현할 수 있을 만큼 구체적으로 기술되는가.",
  samplingJustification: "표집 방법·크기·근거(검정력분석 등)가 명시되는가.",
  participantSelection: "참여자 선정 기준과 유목적 표집 논리, 포화 근거가 제시되는가.",
  instrumentValidity: "측정 도구의 타당도·신뢰도 또는 출처가 보고되는가.",
  credibilityProcedure: "삼각검증·멤버체크 등 신빙성 확보 절차가 서술되는가.",
  analysisFit: "분석 방법이 연구질문·자료 유형과 논리적으로 맞는가.",
  // resultsAnalysis
  apaCompleteness: "통계값·p·신뢰구간·효과크기 등 APA 4요소가 함께 보고되는가.",
  hypothesisMapping: "결과가 가설·연구질문 번호와 1:1로 대응되어 제시되는가.",
  interpretationSeparation: "해석·논의성 문장이 결과 섹션에 섞이지 않고 분리되는가.",
  tableFigureUse: "표·그림이 본문에서 언급되고 내용을 보완하는가.",
  // discussion
  noRestatement: "논의가 결과를 수치 그대로 반복하지 않고 개념적으로 재진술하는가.",
  theoreticalInterpretation: "결과가 이론적 배경의 개념과 연결되어 해석되는가.",
  literatureDialogue: "선행연구와 지지·확장·이의·대안 중 어떤 방식으로 대화하는지 드러나는가.",
  practicalImplication: "실천적·정책적 함의가 구체적 대상(현장·정책)을 향해 제시되는가.",
  // conclusion
  bookend: "서론의 질문·목적에 결론이 명시적으로 다시 응답하는가(수미상관).",
  contribution: "학문적·실천적 기여가 추상적 선언이 아니라 구체적으로 명시되는가.",
  limitationHonesty: "연구의 한계가 사과조가 아니라 정직하고 구체적으로 서술되는가.",
  futureResearch: "후속 연구 방향이 이번 연구의 한계에서 직접 도출되는가.",
};

export interface AxisPromptSpec {
  sectionId: SectionId;
  axisId: string;
  axisLabel: string;
  criterion: string;
}

/** 7×4 = 28개의 구조화된 판정 기준 목록. */
export function buildAxisPromptSpecs(method: MethodKind): AxisPromptSpec[] {
  const specs: AxisPromptSpec[] = [];
  (Object.keys(SECTION_LABEL) as SectionId[]).forEach((sectionId) => {
    getAxes(sectionId, method).forEach((axis) => {
      specs.push({
        sectionId,
        axisId: axis.id,
        axisLabel: axis.label,
        criterion: AXIS_GUIDE[axis.id] ?? axis.label,
      });
    });
  });
  return specs;
}

const RESPONSE_SCHEMA = `반드시 아래 JSON 스키마의 배열만 반환한다(다른 텍스트·마크다운 금지):
[{
  "axisId": "축 id",
  "score": 0-100 사이 정수 또는 null(해당 섹션이 없으면 null),
  "findings": [{
    "severity": "danger" | "warn" | "ok",
    "title": "한 줄 진단 제목",
    "detail": "구체적 설명",
    "quote": "본문에서 그대로 발췌한 문장(반드시 원문에 실제로 존재해야 함)",
    "location": "예: 2문단",
    "actions": ["구체적 개선 조치 1개 이상"]
  }]
}]
근거(quote)가 원문에 실제로 존재하지 않으면 그 finding은 아예 만들지 않는다.`;

/** 섹션 하나에 대해 그 섹션의 4개 축을 한 번에 판정하도록 요청하는 프롬프트. */
export function buildSectionAnalysisPrompt(
  sectionId: SectionId,
  method: MethodKind,
  sectionText: string,
  fieldLabel: string,
): { system: string; user: string } {
  const axes = getAxes(sectionId, method);
  const criteria = axes
    .map((a, i) => `${i + 1}. [${a.id}] ${a.label} — ${AXIS_GUIDE[a.id] ?? ""}`)
    .join("\n");
  return {
    system:
      `당신은 ${fieldLabel} 분야 논문 심사 전문가입니다. ` +
      `"${SECTION_LABEL[sectionId]}" 섹션을 아래 4개 축으로만 평가하고, 반드시 본문에 실재하는 문장만 인용하세요.`,
    user: `[평가 기준 4축]\n${criteria}\n\n[본문]\n${sectionText.slice(0, 6000)}\n\n${RESPONSE_SCHEMA}`,
  };
}
