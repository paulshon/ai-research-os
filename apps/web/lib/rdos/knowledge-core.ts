// ════════════════════════════════════════════════════════════
// RDOS L0 — 지식 코어(Knowledge Core) (v4)
// 논문 작성 가이드(논문가이드 5-4) 원천지식을 구조화한 데이터.
//   · KNOWLEDGE_CHAPTERS: 논문 8개 핵심 장(서술구조·핵심원리)
//   · KNOWLEDGE_TERMS: 31개 연구용어 해설(정의·비유/예시·활용)
// 첫 번째 문서(연구자 육성 OS)의 L0 KNOWLEDGE LAYER 에 대응하며,
// 엔진·퀘스트·레슨이 참조하는 지식 공급원(교과서) 역할을 한다.
// ════════════════════════════════════════════════════════════

export interface KnowledgeChapter {
  id: string; num: number; ko: string; en: string;
  role: string; principle: string; desc: string; engine: string;
}
export type TermCategory = "concept" | "method" | "theory" | "paradigm" | "contribution" | "process";
export interface KnowledgeTerm {
  id: string; num: number; en: string; ko: string;
  definition: string; analogy: string; usage: string; category: TermCategory;
}

export const KNOWLEDGE_CHAPTERS: KnowledgeChapter[] = [
  {
    "id": "ch1",
    "num": 1,
    "ko": "연구배경",
    "en": "Research Background",
    "role": "왜? (why)",
    "principle": "시대 변화 → 기존 연구 동향 → 연구 한계 → Research Gap → 연구 필요성 → 연구 목적",
    "desc": "거시적 사회·기술 변화에서 출발해 구체적 연구 공백으로 좁혀지는 깔때기(Funnel) 구조. 독자가 '왜 이 연구가 필요한가'를 자연스럽게 납득하도록 설계한다.",
    "engine": "research-foundation"
  },
  {
    "id": "ch2",
    "num": 2,
    "ko": "연구목적 및 연구문제",
    "en": "Research Purpose & Questions",
    "role": "무엇을? (what)",
    "principle": "핵심 목적(1개) + 세부 목적(3~4개) + RQ 2~4개, 위계적 구조로 배치",
    "desc": "연구목적은 논문 전체 설계의 나침반, 연구문제(RQ)는 목적을 조작적 질문으로 분해한 탐구 지도. 좋은 RQ는 예/아니오가 아니라 '어떻게·왜·어떤 유형으로'를 묻는다.",
    "engine": "research-design-studio"
  },
  {
    "id": "ch3",
    "num": 3,
    "ko": "이론적 배경",
    "en": "Theoretical Background",
    "role": "어떤 틀로? (with what lens)",
    "principle": "개념 문제 제기 → 개념 정의 → 이론 체계 정리 → 연구 동향 → 이론 비교·비판 → 개념 통합 → 분석 틀 도출",
    "desc": "이론 나열이 아니라 '이 연구를 어떤 이론적 렌즈로 보는가'를 논증하는 이론 구축 과정. 7단계로 분석 틀(Theoretical Framework)을 도출한다.",
    "engine": "academic-thinking"
  },
  {
    "id": "ch4",
    "num": 4,
    "ko": "문헌연구",
    "en": "Literature Review",
    "role": "기존은 어땠나? (what was done)",
    "principle": "초기 연구 → 발전 과정 계보 → 최근 동향 → 기존 연구 한계 → 연구 공백 명시적 도출",
    "desc": "시간 축(역사)과 주제 축(관점)을 교차해 선행연구 지형도를 그리고 연구 공백을 도출한다. 이론적 배경이 '렌즈'라면 문헌연구는 '지형(landscape)'이다.",
    "engine": "research-foundation"
  },
  {
    "id": "ch5",
    "num": 5,
    "ko": "연구방법",
    "en": "Research Methodology",
    "role": "어떻게? (how)",
    "principle": "연구 패러다임 → 연구 설계(RQ-방법 대응) → 자료 수집 → 분석 방법·절차 → 타당도 확보 → 연구 윤리",
    "desc": "무엇을 어떻게 했는지를 넘어 '왜 이 방법인가'를 정당화하는 장. 심사위원은 방법 선택 근거·재현 가능성·타당도 처리 3가지를 본다.",
    "engine": "research-design-studio"
  },
  {
    "id": "ch6",
    "num": 6,
    "ko": "연구결과",
    "en": "Research Results",
    "role": "무엇이 나왔나? (what was found)",
    "principle": "분석 개요 → 데이터 특성 → 1차 분석 → 2차 분석 → 핵심 결과 → 결과 요약",
    "desc": "해석·논의는 유보하고 데이터가 보여주는 사실만 체계적으로 제시한다. 결과에 해석을 섞으면 감점된다.",
    "engine": "academic-writing"
  },
  {
    "id": "ch7",
    "num": 7,
    "ko": "논의",
    "en": "Discussion",
    "role": "왜 그런가? (why and so what)",
    "principle": "핵심 발견 해석 → 선행 연구와 비교 → 이론적 기여 명시 → 실천적 함의 → 연구 한계 → 후속 연구 방향",
    "desc": "결과의 의미를 이론과 연결해 학문적 기여를 확립하는 장. 심사위원의 단 하나의 질문 'So what?'에 문단 수준에서 답해야 한다.",
    "engine": "academic-thinking"
  },
  {
    "id": "ch8",
    "num": 8,
    "ko": "결론",
    "en": "Conclusion",
    "role": "무엇을 남겼나? (legacy)",
    "principle": "연구 요약 → 핵심 발견 강조 → 이론적 기여 → 실천적 함의 → 연구 한계 → 후속 연구 방향",
    "desc": "논문 전체를 압축해 학문적 유산을 남기는 장. 새로운 정보 금지·서론 목적과 결론 기여의 일관성·균형·강한 마지막 문장이 4대 원칙.",
    "engine": "defense"
  }
];

export const KNOWLEDGE_TERMS: KnowledgeTerm[] = [
  {
    "id": "term-1",
    "num": 1,
    "en": "Research Gap",
    "ko": "연구 공백",
    "definition": "기존 연구들이 다루지 않았거나 불충분하게 다룬 학문적 공백 영역.",
    "analogy": "비유: 기존 AI 연구라는 지도에서 아직 탐험되지 않은 빈 땅. 기존 연구들이 AI의 기술적 성능은 충분히 분석했지만, 일반 대중이 AI 창작을 어떻게 인식하는지는 연구되지 않았다면 — 그 미탐구 영역이 바로 Research Gap이다.",
    "usage": "연구배경의 핵심 단계: 기존 연구는 X를 다루었으나 Y는 연구되지 않았다. 이것이 본 연구가 채우려는 공백이다.",
    "category": "concept"
  },
  {
    "id": "term-2",
    "num": 2,
    "en": "Research Question",
    "ko": "연구문제, RQ",
    "definition": "연구목적을 탐구 가능한 구체적 질문 형태로 변환한 것. 연구 전체가 답해야 할 핵심 질문들.",
    "analogy": "비유: 연구라는 여행의 목적지. RQ1이 서울에서 부산까지 가는 길은 몇 가지인가? 라면 RQ2는 각 길의 특징은 무엇인가? RQ3은 어떤 길이 왜 더 효율적인가? 처럼 점층적으로 구성된다.",
    "usage": "좋은 RQ는 예/아니오로 답하지 않고, 어떻게, 왜, 어떤 유형으로의 형식을 갖는다.",
    "category": "concept"
  },
  {
    "id": "term-3",
    "num": 3,
    "en": "Theoretical Framework",
    "ko": "이론적 틀, 분석 틀",
    "definition": "연구에서 현상을 분석하는 데 사용하는 개념적·이론적 구조. 어떤 렌즈로 현상을 볼 것인가를 결정한다.",
    "analogy": "비유: 카메라 렌즈. 같은 피사체도 광각렌즈로 보면 배경이 넓게 보이고, 망원렌즈로 보면 피사체만 크게 보인다. Boden의 창작 유형론을 분석 틀의 관점으로 예를 들어, AI 창작을 탐색적/조합적/변형적 세 유형으로 바라보게 된다.",
    "usage": "이론적 배경 마지막 단계에서 이상의 이론을 통합하여 본 연구의 분석 틀을 구성한다고 명시적으로 제시한다.",
    "category": "concept"
  },
  {
    "id": "term-4",
    "num": 4,
    "en": "Literature Review",
    "ko": "문헌연구/선행연구 검토",
    "definition": "연구 주제와 관련된 기존 학술 연구들을 체계적으로 검토·분석·종합하는 과정.",
    "analogy": "비유: 학문의 지도 그리기. 등산 전에 지형도를 보듯, 연구 전에 해당 분야의 연구 지형을 파악하는 것. 어느 지역(주제)은 이미 충분히 개발되었고, 어느 지역은 아직 미개발 상태다를 파악한다.",
    "usage": "문헌연구의 목표는 단순 요약이 아니라 이 분야에서 아직 연구되지 않은 것이 무엇인가를 도출하는 것이다.",
    "category": "process"
  },
  {
    "id": "term-5",
    "num": 5,
    "en": "Research Paradigm",
    "ko": "연구 패러다임",
    "definition": "연구자가 세계와 지식을 어떻게 이해하는지에 대한 철학적 입장. 해석주의, 실증주의, 비판이론 등이 대표적.",
    "analogy": "비유: 세계관. 실증주의는 세상에는 객관적 진실이 있고 측정 가능하다는 입장(양적 연구 선호), 해석주의는 진실은 사람마다 다르게 해석된다는 입장(질적 연구 선호). 같은 AI 창작 현상도 실증주의자는 설문으로, 해석주의자는 인터뷰로 분석한다.",
    "usage": "연구방법론 서두에 본 연구는 어떠한 [패러다임]에 기반한다고 명시하면 방법론 전체의 일관성이 높아진다.",
    "category": "paradigm"
  },
  {
    "id": "term-6",
    "num": 6,
    "en": "Validity",
    "ko": "타당도",
    "definition": "연구가 측정하려는 것을 실제로 정확하게 측정하고 있는지의 정도.",
    "analogy": "비유: 저울의 정확성. 체중을 재려는데 키를 재고 있다면 타당도가 없는 것. AI 창작 인식을 분석하는데 실제로는 AI에 대한 일반적 태도를 측정하고 있다면 타당도 문제가 발생한다.",
    "usage": "질적 연구에서는 구성원 확인(Member Checking), 삼각화(Triangulation)로 타당도를 확보한다.",
    "category": "method"
  },
  {
    "id": "term-7",
    "num": 7,
    "en": "Reliability",
    "ko": "신뢰도",
    "definition": "동일한 조건에서 연구를 반복했을 때 일관된 결과가 나오는 정도. 측정의 일관성.",
    "analogy": "비유: 반복 가능한 레시피. 같은 재료와 방법으로 요리를 반복했을 때 항상 같은 맛이 나야 식당의 신뢰도가 높다. 코딩 연구에서 두 명의 연구자가 독립적으로 코딩했을 때 결과가 일치한다면 (높은 Cohens Kappa) 내적 신뢰도가 높다.",
    "usage": "Cohens Kappa ≥ .80이면 Almost Perfect Agreement로 높은 신뢰도로 인정된다.",
    "category": "method"
  },
  {
    "id": "term-8",
    "num": 8,
    "en": "Triangulation",
    "ko": "삼각화",
    "definition": "연구의 신뢰성을 높이기 위해 여러 자료 출처, 연구 방법, 연구자, 이론을 사용하여 결과를 교차 검증하는 전략.",
    "analogy": "비유: 인터뷰 + 관찰 + 문서 분석으로 같은 결론이 나오면 연구의 타당성이 강화된다.",
    "usage": "방법론에서 연구자 삼각화(두 연구자가 독립적으로 분석) 또는 자료 삼각화(여러 출처 활용)를 명시한다.",
    "category": "method"
  },
  {
    "id": "term-9",
    "num": 9,
    "en": "Purposive Sampling",
    "ko": "목적 표집",
    "definition": "연구 목적에 가장 잘 부합하는 대상을 연구자가 의도적으로 선정하는 표집 방법.",
    "analogy": "비유: 오디션 심사위원이 특정 장르 전문가만 뽑는 것. AI 창작 인식 연구에서 AI 예술 관련 댓글 100개 이상이고, 2023년 이후 업로드된 영상이라는 기준으로 표본을 선정하면 목적 표집이다.",
    "usage": "질적 연구에서 가장 많이 사용되며, 선정 기준을 명확히 제시해야 정당화된다.",
    "category": "method"
  },
  {
    "id": "term-10",
    "num": 10,
    "en": "Thematic Analysis",
    "ko": "주제분석",
    "definition": "질적 데이터에서 반복적으로 나타나는 패턴과 주제를 귀납적으로 식별하고 분류하는 분석 방법.",
    "analogy": "비유: 여행 사진 정리. 수백 장의 여행 사진을 바다, 산, 음식, 사람으로 분류하듯, 수천 개의 댓글에서 공통 주제를 찾아 도구 인식, 예술성 논쟁, 윤리적 우려 등으로 분류한다.",
    "usage": "Braun & Clarke(2006)의 6단계 절차(친숙화 → 초기 코드 → 주제 탐색 → 주제 검토 → 주제 명명 → 보고)를 명시하면 방법론 신뢰도가 높아진다.",
    "category": "method"
  },
  {
    "id": "term-11",
    "num": 11,
    "en": "MDS",
    "ko": "다차원척도분석",
    "definition": "데이터 간의 유사성·거리를 2차원 또는 3차원 공간에 시각화하는 통계 분석 방법.",
    "analogy": "비유: 도시 간 거리 지도 만들기. 서울-부산은 멀고, 서울-인천은 가깝다는 거리 정보만으로 지도를 그리는 것처럼, AI 창작 인식 유형들 간의 인식론적 거리를 공간상에 시각화한다.",
    "usage": "MDS 결과는 좌표 그래프로 표현되며, 거리가 가까울수록 인식이 유사하고 멀수록 대립적임을 의미한다.",
    "category": "method"
  },
  {
    "id": "term-12",
    "num": 12,
    "en": "Q Methodology",
    "ko": "Q 방법론",
    "definition": "개인의 주관적 인식 유형을 식별하기 위해, 진술문 카드를 주관적으로 분류하는 혼합 연구 방법.",
    "analogy": "비유: 개인 취향 지도 그리기. 여러 음식 카드를 매우 좋아함부터 매우 싫어함까지 본인이 직접 배치하면, 그 배치 패턴으로 취향 유형이 드러나듯, AI 창작 관련 진술문 카드를 참가자가 직접 배치하면 인식 유형이 드러난다.",
    "usage": "소수의 참가자(20~50명)로도 인식 유형을 도출할 수 있어 질적-양적 혼합 연구에 적합하다.",
    "category": "method"
  },
  {
    "id": "term-13",
    "num": 13,
    "en": "Conceptual Framework",
    "ko": "개념적 프레임워크",
    "definition": "연구에서 사용되는 핵심 개념들과 그 관계를 구조적으로 도식화한 것. 이론적 배경의 최종 산출물.",
    "analogy": "비유: 건축 설계도. 건물을 짓기 전에 각 공간의 위치와 연결 방식을 도면으로 그리듯, 연구 전에 핵심 개념(창작, AI, 인식, 유형)들이 어떻게 연결되는지를 도식으로 제시한다.",
    "usage": "이론적 배경 마지막에 그림 2-1. 본 연구의 개념적 프레임워크처럼 시각화하면 심사위원의 이해도가 크게 높아진다.",
    "category": "concept"
  },
  {
    "id": "term-14",
    "num": 14,
    "en": "Operationalization",
    "ko": "조작적 정의",
    "definition": "추상적 개념을 실제 연구에서 측정·분석 가능한 구체적 형태로 변환하는 것.",
    "analogy": "비유: 행복을 측정하려면 최근 한 달간 웃은 횟수처럼 구체화해야 한다. 대중 인식이라는 추상적 개념을 유튜브 댓글에서 나타나는 언어적 표현 패턴으로 조작적으로 정의해야 분석이 가능해진다.",
    "usage": "이론적 배경에서 본 연구에서 X는 Y로 정의한다고 명시적으로 제시해야 한다.",
    "category": "concept"
  },
  {
    "id": "term-15",
    "num": 15,
    "en": "Generalizability",
    "ko": "일반화 가능성",
    "definition": "특정 연구의 결과를 더 넓은 집단이나 다른 맥락에 적용할 수 있는 정도.",
    "analogy": "비유: 한 음식점의 리뷰로 그 지역 전체 음식 수준을 판단하기. 100개 YouTube 댓글 분석 결과를 모든 한국인의 AI 인식으로 일반화하는 것은 과도하다. 일반화의 범위를 연구 데이터의 범위 내로 제한해야 한다.",
    "usage": "결론에서 본 연구는 X에 한정된 결과이며, Y 집단으로의 일반화에는 추가 연구가 필요하다고 한계를 명시한다.",
    "category": "concept"
  },
  {
    "id": "term-16",
    "num": 16,
    "en": "Reflexivity",
    "ko": "성찰성/연구자 위치성",
    "definition": "연구자 자신의 배경, 관점, 편견이 연구 과정과 결과에 어떤 영향을 미칠 수 있는지를 인식하고 반성하는 것.",
    "analogy": "비유: 판사가 자신의 개인적 경험이 판결에 영향을 미칠 수 있음을 인식하고 스스로 점검하는 것. AI 예술에 호의적인 연구자는 코딩 시 긍정적 표현을 더 쉽게 포착할 수 있다. 이를 인식하고 공개적으로 밝히며 교차 검토를 시행하는 것이 성찰성이다.",
    "usage": "질적 연구 방법론에서 연구자 위치성(Researcher Positionality) 절을 별도로 두어 서술하면 학술적 신뢰도가 높아진다.",
    "category": "paradigm"
  },
  {
    "id": "term-17",
    "num": 17,
    "en": "Theoretical Contribution",
    "ko": "이론적 기여",
    "definition": "연구가 기존 이론이나 개념적 이해를 어떻게 확장하거나 수정하거나 새롭게 제안했는지.",
    "analogy": "비유: 기존 지도에 새 도로를 추가하기. Boden의 창작 유형론이 인간 창작에만 적용되었다면, 이를 AI 창작 수용자 인식 분석에 적용하여 이론의 적용 범위를 확장하는 것이 이론적 기여다.",
    "usage": "논의와 결론에서 이론적 차원에서 본 연구는 X 이론의 Y 측면을 확장·수정·신규 제안한다고 명시적으로 서술한다.",
    "category": "contribution"
  },
  {
    "id": "term-18",
    "num": 18,
    "en": "Practical Implications",
    "ko": "실천적 함의",
    "definition": "연구 결과가 현장, 정책, 사회 실천에 어떤 구체적 시사점을 제공하는지.",
    "analogy": "비유: 실험실 연구 결과를 병원 치료에 적용하기. AI 창작 인식 유형이 세 가지라는 연구 결과는 AI 창작 플랫폼은 세 유형 사용자에게 각기 다른 커뮤니케이션 전략을 사용해야 한다는 실천적 시사점을 제공한다.",
    "usage": "논의 및 결론에서 이론적 기여와 실천적 함의를 분리하여 각각 명확히 서술한다.",
    "category": "contribution"
  },
  {
    "id": "term-19",
    "num": 19,
    "en": "Pilot Study",
    "ko": "예비 연구",
    "definition": "본 연구 전에 소규모로 수행하여 연구 설계·방법론의 문제점을 사전에 검토하는 소규모 시험 연구.",
    "analogy": "비유: 드라마 방영 전 시사회. 본 방영 전에 소규모 시사회를 열어 편집·연출 문제를 수정하듯, 설문지 10부를 먼저 배포하여 문항 이해도를 검증하거나, 100개 댓글로 코딩 체계를 먼저 테스트하는 것.",
    "usage": "방법론에서 예비 연구를 통해 코딩 체계의 신뢰도를 사전 검증하였다고 서술하면 방법론의 엄밀성이 높아진다.",
    "category": "method"
  },
  {
    "id": "term-20",
    "num": 20,
    "en": "IRB",
    "ko": "기관생명윤리위원회) (Institutional Review Board",
    "definition": "인간 대상 연구에서 참여자의 권리와 안전을 보호하기 위해 연구 프로토콜을 심의·승인하는 기관.",
    "analogy": "비유: 건축 허가증. 건물 짓기 전에 허가를 받아야 하듯, 인간을 대상으로 한 연구(인터뷰, 설문, 관찰 등)는 시작 전에 IRB 승인을 받아야 한다.",
    "usage": "방법론에서 IRB 승인 번호 2023-XXX를 취득하였다고 명시하면 연구 윤리 준수를 공식적으로 증명한다.",
    "category": "process"
  },
  {
    "id": "term-21",
    "num": 21,
    "en": "Cohens Kappa",
    "ko": "코헨의 카파",
    "definition": "두 명의 평가자(코더)가 같은 데이터를 독립적으로 분류했을 때의 일치도를 측정하는 통계량. 0~1 사이 값.",
    "analogy": "비유: 두 심사위원이 독립적으로 채점했을 때 점수가 얼마나 일치하는가. κ=1.0이면 완벽 일치, κ=0이면 우연 수준의 일치. κ≥.80은 매우 높은 일치(Almost Perfect), κ=.60~.79는 상당한 일치(Substantial)로 분류된다.",
    "usage": "질적 연구에서 코딩 신뢰도를 보고할 때 Cohens Kappa κ=.84, p<.001처럼 수치와 통계적 유의성을 함께 제시한다.",
    "category": "method"
  },
  {
    "id": "term-22",
    "num": 22,
    "en": "Abductive Reasoning",
    "ko": "귀추적 추론",
    "definition": "관찰된 현상을 가장 잘 설명할 수 있는 가설을 추론하는 방식. 귀납(데이터 → 이론)과 연역(이론 → 데이터) 사이의 중간 논리.",
    "analogy": "비유: 의사의 진단. 증상을 보고 가장 그럴듯한 병명을 추론하듯, 연구자가 데이터 패턴을 관찰하고 이 패턴을 가장 잘 설명하는 이론은 무엇인가를 추론하는 것.",
    "usage": "혼합 연구나 탐색적 연구에서 본 연구는 귀추적 논리를 따르며, 데이터에서 도출된 패턴을 기존 이론으로 설명하는 방식을 취한다고 명시할 수 있다.",
    "category": "theory"
  },
  {
    "id": "term-23",
    "num": 23,
    "en": "Saturation",
    "ko": "포화)  (Data Saturation / Theoretical Saturation",
    "definition": "질적 연구에서 더 이상 새로운 주제나 코드가 나타나지 않는 상태. 자료 수집을 중단할 수 있는 기준.",
    "analogy": "비유: 빨래통이 물로 가득 찬 상태. 계속 물을 부어도 더 이상 흡수되지 않을 때 포화 상태. 인터뷰를 계속해도 새로운 주제가 나오지 않을 때 이론적 포화가 달성된 것으로 판단하고 자료 수집을 마무리한다.",
    "usage": "방법론에서 15번째 인터뷰부터 새로운 주제가 출현하지 않아 이론적 포화를 확인하고 자료 수집을 종료하였다고 서술한다.",
    "category": "method"
  },
  {
    "id": "term-24",
    "num": 24,
    "en": "Thick Description",
    "ko": "두꺼운 기술",
    "definition": "Geertz(1973)가 제안한 개념으로, 행동의 표면적 기술을 넘어 그 의미와 맥락을 풍부하게 서술하는 것.",
    "analogy": "비유: 윙크에 대한 표현에서 얇은 기술은 어떤 여자가 윙크했다는 표현으로, 두꺼운 기술은 어떤 여자가 공모자에게 들키지 않으려고 농담처럼 위장하며 신호를 보냈다는 표현으로 구분한다. 이를 연구에 적용하면, AI 창작 댓글에서 단순히 긍정적 댓글이 아니라 어떤 맥락에서, 왜, 어떤 의도로 긍정적으로 표현했는지를 서술하는 것.",
    "usage": "질적 연구 결과를 서술할 때, 수치와 함께 구체적 인용문과 맥락을 함께 제공하면 두꺼운 기술이 된다.",
    "category": "method"
  },
  {
    "id": "term-25",
    "num": 25,
    "en": "Mixed Methods Research",
    "ko": "혼합 연구",
    "definition": "질적 연구와 양적 연구를 한 연구에서 통합하여 사용하는 연구 설계.",
    "analogy": "비유: 스테레오 음향 시스템에서 왼쪽 스피커(양적: 통계)와 오른쪽 스피커(질적: 인터뷰)가 함께 작동할 때 더 풍부한 소리가 나듯, 두 방법의 장점을 결합하면 더 완전한 이해가 가능하다. AI 창작 인식을 설문(양적)으로 넓게 탐색하고 인터뷰(질적)로 깊이 이해하는 방식.",
    "usage": "순차적(질적→양적), 동시적(양적+질적), 변형적(이론 중심) 설계 중 하나를 선택하고 설계 유형을 명시한다.",
    "category": "method"
  },
  {
    "id": "term-26",
    "num": 26,
    "en": "Member Checking",
    "ko": "구성원 확인",
    "definition": "질적 연구에서 연구자의 해석과 결론을 연구 참여자에게 보여주고 정확성을 확인하는 타당도 검증 방법.",
    "analogy": "비유: 번역 결과를 원어민에게 확인받기. 연구자가 인터뷰 내용을 코딩한 후, 참여자에게 제가 이렇게 해석했는데 맞나요? 라고 확인받는 것. 도구적 수용형으로 분류된 참여자가 맞아요, 저는 정말 AI를 도구로만 봐요라고 확인해 주면 타당도가 높아진다.",
    "usage": "방법론에서 분석 결과의 정확성 검증을 위해 참여자 5인에게 구성원 확인을 실시하였다고 명시한다.",
    "category": "method"
  },
  {
    "id": "term-27",
    "num": 27,
    "en": "Grounded Theory",
    "ko": "근거이론",
    "definition": "Glaser & Strauss(1967)가 개발한 질적 연구 방법론. 데이터에서 귀납적으로 이론을 생성하는 접근법.",
    "analogy": "비유: 현장에서 직접 만든 요리 레시피. 기존 레시피를 따르는 것이 아니라, 있는 재료(데이터)로 요리하다 보니 새로운 레시피(이론)가 생겨나는 것. AI 창작 인식에 대한 기존 이론 없이 댓글 데이터만으로 인식 이론을 새롭게 구축하는 방식.",
    "usage": "사전에 이론적 틀을 설정하지 않고 귀납적으로 이론을 구축하려는 연구에서 근거이론을 방법론으로 명시한다.",
    "category": "theory"
  },
  {
    "id": "term-28",
    "num": 28,
    "en": "Phenomenology",
    "ko": "현상학적 연구",
    "definition": "연구 참여자들이 특정 현상을 어떻게 경험하고 그 의미를 어떻게 구성하는지를 탐구하는 질적 연구 방법론.",
    "analogy": "비유: 같은 영화를 본 사람들이 각자 다른 감동을 경험하는 것. AI 창작물을 처음 봤을 때 각자가 어떤 내적 경험을 했는지, 그 경험의 본질적 구조가 무엇인지를 탐구하는 연구.",
    "usage": "현상학적 연구에서는 괄호치기(Bracketing)를 통해 연구자의 선입견을 일시적으로 유보하고 참여자의 경험 자체에 집중한다.",
    "category": "theory"
  },
  {
    "id": "term-29",
    "num": 29,
    "en": "Discourse Analysis",
    "ko": "담론 분석",
    "definition": "언어가 사회적 맥락에서 어떻게 의미를 생산하고 권력 관계를 반영하는지를 분석하는 방법.",
    "analogy": "비유: 언어에 숨겨진 권력 지도 읽기. AI 창작에 관한 신문 기사에서 AI를 도구로 표현하는 것과 창작자로 표현하는 것은 전혀 다른 권력 관계와 세계관을 반영한다. 담론 분석은 이러한 언어적 패턴이 어떤 사회적 의미를 갖는지를 분석한다.",
    "usage": "AI 창작 관련 언론 보도, 정책 문서, 온라인 댓글을 비판적 담론 분석(CDA)으로 분석할 때 활용한다.",
    "category": "theory"
  },
  {
    "id": "term-30",
    "num": 30,
    "en": "Epistemology",
    "ko": "인식론",
    "definition": "지식의 본질, 범위, 한계를 탐구하는 철학의 한 분야. 우리는 어떻게 알 수 있는가에 대한 연구.",
    "analogy": "비유: 지식이라는 강의 원천 찾기. 실증주의 인식론은 관찰과 측정으로만 지식을 얻을 수 있다, 해석주의 인식론은 의미 해석을 통해 지식을 구성한다고 본다. AI 창작 인식 연구에서 대중이 AI 창작을 아는 방식 자체를 분석하는 것이 인식론적 접근이다.",
    "usage": "이론적 배경에서 본 연구는 인식론적 관점에서 대중의 AI 창작 지식 구성 방식을 분석한다고 명시할 수 있다.",
    "category": "paradigm"
  },
  {
    "id": "term-31",
    "num": 31,
    "en": "Ontology",
    "ko": "존재론",
    "definition": "실재(reality)의 본질에 관한 철학적 연구. 무엇이 존재하는가, 존재의 본질은 무엇인가에 대한 탐구.",
    "analogy": "비유: 세계란 무엇인가에 대한 답. 객관주의 존재론은 현실은 관찰자와 독립적으로 존재한다, 구성주의 존재론은 현실은 사회적으로 구성된다고 본다. AI 창작이 진짜 예술인가라는 질문은 예술의 존재론적 본질을 묻는 것이다.",
    "usage": "연구 패러다임을 논의할 때 본 연구의 존재론적 입장은 X이며, 이에 기반한 인식론은 Y이다처럼 연결하여 서술한다.",
    "category": "paradigm"
  }
];

export const TERM_CATEGORY_LABEL: Record<TermCategory, string> = {
  concept: "개념·문제설정",
  method: "방법·측정·분석",
  theory: "질적 방법론·추론",
  paradigm: "패러다임·철학",
  contribution: "기여·함의",
  process: "연구 과정·윤리",
};

export function termsByCategory(): Record<TermCategory, KnowledgeTerm[]> {
  const out = { concept: [], method: [], theory: [], paradigm: [], contribution: [], process: [] } as Record<TermCategory, KnowledgeTerm[]>;
  for (const t of KNOWLEDGE_TERMS) out[t.category].push(t);
  return out;
}

/* ── v6: 지식 코어 학습목표 + 학습모듈(L0 12개 도메인) ──────────
   첫 번째 문서(연구자 육성 OS)의 L0 KNOWLEDGE LAYER 12개 도메인을
   학습 모듈로 구조화하여 지식 코어 화면에 노출한다. */
export const KNOWLEDGE_OBJECTIVES: string[] = [
  "논문 8개 장이 각각 어떤 질문에 답하는지 설명할 수 있다",
  "31개 핵심 연구용어를 정의·예시·활용 수준에서 이해한다",
  "연구입문→언어→사고→문제→문헌→이론→방법→설계→측정→분석→작성→심사의 지식 지형을 파악한다",
  "각 도메인의 핵심 개념을 엔진·퀘스트·레슨과 연결할 수 있다",
  "연구를 말하는 데 필요한 학술 언어 체계를 갖춘다",
];

export interface KnowledgeModule { code: string; domain: string; en: string; items: string[]; }
export const KNOWLEDGE_MODULES: KnowledgeModule[] = [
  { code: "L0-1",  domain: "연구입문",   en: "Research Fundamentals", items: ["연구의 정의·목적·특징·유형", "연구자의 역할", "학문·지식·이론·과학·실천", "연구윤리: 표절·중복게재·연구부정·IRB", "대학원 연구: 석사·박사·학술지·학회"] },
  { code: "L0-2",  domain: "연구언어",   en: "Research Language", items: ["연구문제·연구목적·연구질문", "가설·변수·개념·구인·척도", "신뢰도·타당도", "모집단·표본·평균·분산·표준편차·상관·유의확률", "질적용어: 코딩·범주화·주제분석·삼각검증·포화"] },
  { code: "L0-3",  domain: "연구사고",   en: "Research Thinking", items: ["비판적 사고: 가정·증거·논리·오류·편향", "학문적 사고: 개념화·범주화·비교·분석·종합", "논증: 주장·근거·반론·재반론", "시스템 사고: 인과·피드백·복잡성"] },
  { code: "L0-4",  domain: "연구문제",   en: "Research Problem", items: ["문제의 정의·유형", "좋은 문제 vs 나쁜 문제", "연구공백: 이론적·방법론적·맥락적·실천적", "문제진술: 배경·현황·공백·필요성"] },
  { code: "L0-5",  domain: "문헌연구",   en: "Literature Review", items: ["문헌검색: Scholar·Scopus·WoS·OpenAlex·Crossref", "문헌선별: 포함·제외기준·PRISMA", "문헌분석: 주제·연도·방법·결과", "문헌종합: Narrative·Scoping·Systematic·Meta"] },
  { code: "L0-6",  domain: "이론",       en: "Theory", items: ["이론·모형·개념틀·명제", "이론 구축: 개념·관계·명제·모형", "이론 비교: 강점·약점·적용범위"] },
  { code: "L0-7",  domain: "연구방법",   en: "Methodology", items: ["양적: 실험·조사·상관·인과", "질적: 현상학·근거이론·사례·내러티브·민족지", "혼합: 설명형·탐색형·수렴형", "특수: Q방법론·DBR·메타분석·내용분석"] },
  { code: "L0-8",  domain: "연구설계",   en: "Research Design", items: ["연구목적: 탐색·기술·설명·평가", "연구질문: 주질문·하위질문", "가설: 귀무·대립·매개·조절", "표집: 확률·비확률"] },
  { code: "L0-9",  domain: "측정도구",   en: "Measurement", items: ["설문지: 문항작성·척도설계·파일럿", "인터뷰: 반구조화·심층·포커스그룹", "관찰: 참여·비참여"] },
  { code: "L0-10", domain: "자료분석",   en: "Data Analysis", items: ["기초통계: 빈도·평균·표준편차", "추론통계: t검정·ANOVA·회귀·카이제곱", "고급통계: SEM·PLS-SEM·HLM·잠재성장", "질적분석: 개방·축·선택 코딩·주제분석"] },
  { code: "L0-11", domain: "논문작성",   en: "Academic Writing", items: ["서론: 배경·문제제기·목적·질문", "문헌고찰: 이론·선행연구·공백", "연구방법: 대상·도구·절차·분석", "결과·논의: 기술·해석·시사점·제한점"] },
  { code: "L0-12", domain: "논문심사",   en: "Defense", items: ["심사질문: 이론·방법·분석·결과", "발표: 슬라이드·스토리라인·기법", "대응: 반론·답변·설득"] },
];
