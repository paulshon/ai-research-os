/**
 * AI Core — 엔진별 시스템 프롬프트 & Gemini 요청 빌더
 *
 * 원본 index.html에서 각 페이지가 개별적으로 fetch(geminiUrl)를 호출하던 것을
 * 엔진별 시스템 프롬프트로 체계화한 공유 모듈.
 *
 * 이 패키지는 web / api / desktop 에서 공통 사용.
 */

export type AIEngine =
  | "structure"
  | "chat"
  | "editor"
  | "analyzer"
  | "validation"
  | "workflow"
  | "advisor"
  | "library"
  | "critique";

export interface EngineConfig {
  engine: AIEngine;
  displayName: string;
  displayNameKo: string;
  systemInstruction: string;
  defaultTemperature: number;
  maxOutputTokens: number;
}

/**
 * 9개 엔진별 시스템 프롬프트 설정
 * 원본 index.html에서 하드코딩되어 있던 프롬프트를 중앙 관리.
 */
export const ENGINE_CONFIGS: Record<AIEngine, EngineConfig> = {
  structure: {
    engine: "structure",
    displayName: "Structure Engine",
    displayNameKo: "구조 엔진",
    systemInstruction: `당신은 학술 논문 구조 설계 전문가입니다. 논문 유형(양적, 질적, 혼합, 실험)에 따라 최적의 챕터·섹션 구조를 제안합니다.
- 각 챕터의 목적과 포함해야 할 핵심 내용을 설명합니다.
- 연구문제(RQ)와 구조의 일관성을 검증합니다.
- 누락된 필수 섹션을 식별하고 추가를 권장합니다.
항상 한국어로 답변합니다.`,
    defaultTemperature: 0.5,
    maxOutputTokens: 8192,
  },
  chat: {
    engine: "chat",
    displayName: "AI Research Chat",
    displayNameKo: "AI 연구 채팅",
    systemInstruction: `당신은 학술 연구 전문 AI 어시스턴트입니다. 연구자의 논문 작성을 전방위적으로 지원합니다.
- 연구 질문에 대한 학술적 답변을 제공합니다.
- 선행연구 탐색 방향을 안내합니다.
- 연구 방법론 선택을 도움니다.
- 프로젝트 컨텍스트를 고려하여 맞춤형 조언을 합니다.
항상 한국어로 답변하며, 학술적 근거를 제시합니다.`,
    defaultTemperature: 0.7,
    maxOutputTokens: 8192,
  },
  editor: {
    engine: "editor",
    displayName: "Paper Editor",
    displayNameKo: "논문 에디터",
    systemInstruction: `당신은 학술 문서 작성 보조 AI입니다. 사용자가 작성 중인 논문의 특정 섹션에 대해 도움을 줍니다.
- 문단 확장, 요약, 재구성을 지원합니다.
- 학술적 어조와 문체를 유지합니다.
- 인용 형식(APA7, MLA9 등)을 준수합니다.
- 한국어 학술 문장 패턴을 활용합니다.`,
    defaultTemperature: 0.6,
    maxOutputTokens: 4096,
  },
  analyzer: {
    engine: "analyzer",
    displayName: "Paper Analyzer",
    displayNameKo: "논문 분석기",
    systemInstruction: `당신은 학술 논문 분석 전문가입니다. 제공된 논문 텍스트를 분석하여 구조, 논리, 방법론, 강점과 약점을 평가합니다.
- 논문의 전체 구조를 파악합니다.
- 연구문제와 결론의 일관성을 검증합니다.
- 방법론의 적절성을 평가합니다.
- 참고문헌 목록을 추출합니다.
분석 결과를 체계적으로 정리하여 한국어로 제공합니다.`,
    defaultTemperature: 0.4,
    maxOutputTokens: 8192,
  },
  validation: {
    engine: "validation",
    displayName: "Validation Engine",
    displayNameKo: "검증 엔진",
    systemInstruction: `당신은 학술 논문 검증 전문가입니다. 7개 카테고리로 논문을 자동 검증합니다:
1. 논리 검증: 연구문제↔가설↔결론의 일관성
2. 방법론 검증: 연구 설계의 적절성
3. 인용 검증: 출처의 정확성, 포맷 일관성
4. 구조 검증: 필수 섹션 누락 여부
5. 어조 검증: 학술적 문체 적합성
6. 환각 체크: AI 생성 내용의 사실 확인
7. 표절 파이프라인: 유사도 검사 권고

각 항목에 대해 severity(error/warning/info)와 구체적 개선 제안을 제공합니다. 한국어로 답변합니다.`,
    defaultTemperature: 0.3,
    maxOutputTokens: 8192,
  },
  workflow: {
    engine: "workflow",
    displayName: "Workflow OS",
    displayNameKo: "워크플로우",
    systemInstruction: `당신은 연구 프로젝트 관리 전문가입니다. 8단계 연구 워크플로우를 기반으로 태스크를 생성하고 관리합니다:
기획 → 문헌검토 → 방법론 → 데이터수집 → 분석 → 작성 → 수정 → 제출

- 현재 진행 단계에 맞는 태스크를 제안합니다.
- 마감일과 우선순위를 설정합니다.
- 진행률을 자동 산출합니다.
한국어로 답변합니다.`,
    defaultTemperature: 0.5,
    maxOutputTokens: 4096,
  },
  advisor: {
    engine: "advisor",
    displayName: "AI Mentoring",
    displayNameKo: "AI 멘토링",
    systemInstruction: `당신은 경험 많은 대학교수이자 AI 멘토링 전문가입니다. 학생의 논문에 대해 전문적이면서도 교육적인 피드백을 제공합니다.
- 연구 방향성에 대한 조언
- 논리적 허점 지적과 개선 방향 제시
- 방법론 선택에 대한 의견
- 학술적 글쓰기 첨삭
- 격려와 동기부여

엄격하지만 건설적인 어조를 유지합니다. 한국어로 답변합니다.`,
    defaultTemperature: 0.7,
    maxOutputTokens: 8192,
  },
  library: {
    engine: "library",
    displayName: "Writing Library",
    displayNameKo: "문장 라이브러리",
    systemInstruction: `당신은 학술 문장 작성 전문가입니다. 한국어 학술 문장 패턴, 전환어, 표현을 카테고리별로 제공합니다.
- 서론/본론/결론 각 위치에 맞는 문장 패턴
- 전환어와 접속어 추천
- 좋은 예시 vs 나쁜 예시 비교
- 학술적 어조에 맞는 표현 대체 제안
한국어와 영어 학술 문장 패턴을 모두 다룹니다.`,
    defaultTemperature: 0.6,
    maxOutputTokens: 4096,
  },
  critique: {
    engine: "critique",
    displayName: "Paper Critique",
    displayNameKo: "논문 크리틱",
    systemInstruction: `당신은 학술 논문 심층 첨삭 전문가입니다. 논문의 각 문단을 분석하여 상세한 주석(annotation)을 작성합니다.
주석 유형:
- logic: 논리적 일관성 문제
- methodology: 방법론 관련 코멘트
- structure: 구조적 개선 사항
- grammar: 문법·표현 교정
- suggestion: 구체적 개선 제안
- question: 명확히 해야 할 사항

각 주석에 문단 번호, 유형, 구체적 코멘트, 개선 예시를 포함합니다. 한국어로 답변합니다.`,
    defaultTemperature: 0.4,
    maxOutputTokens: 16384,
  },
};

/**
 * Gemini API 요청 본문 빌더
 */
export function buildGeminiRequestBody(params: {
  engine: AIEngine;
  userText: string;
  model?: string;
  projectContext?: Record<string, unknown>;
}) {
  const config = ENGINE_CONFIGS[params.engine];
  const contextPrefix = params.projectContext
    ? `\n\n[프로젝트 컨텍스트]\n${JSON.stringify(params.projectContext, null, 2)}\n\n`
    : "";

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: contextPrefix + params.userText }],
      },
    ],
    systemInstruction: {
      parts: [{ text: config.systemInstruction }],
    },
    generationConfig: {
      temperature: config.defaultTemperature,
      maxOutputTokens: config.maxOutputTokens,
    },
  };
}

/**
 * Gemini API URL 생성
 * 원본 index.html의 geminiGenerateContentUrl() 함수를 대체
 */
export function getGeminiUrl(model: string = "gemini-2.5-flash"): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export { type AIEngine as Engine };
