/**
 * AI Research OS — 연구 데이터 (v5 HTML 이식)
 */

export const THESIS_CATEGORIES = [
  { cat: "🔵 실증 연구형", types: [
    { id: "quant", name: "① 양적 연구", color: "#6c8cff" },
    { id: "qual", name: "② 질적 연구", color: "#3ecfb2" },
    { id: "mixed", name: "③ 혼합 연구", color: "#a78bfa" },
    { id: "exp", name: "④ 실험 연구", color: "#ef4444" },
  ]},
  { cat: "🟩 문헌 검토형", types: [
    { id: "sr", name: "⑤ 체계적 문헌 검토", color: "#10b981" },
    { id: "meta", name: "⑥ 메타분석", color: "#e8b84b" },
    { id: "nr", name: "⑦ 서술적 문헌 검토", color: "#8b5cf6" },
    { id: "scr", name: "⑧ 범위 문헌 검토", color: "#06b6d4" },
  ]},
  { cat: "🟣 이론 개발형", types: [
    { id: "gt", name: "⑨ 귀납적 이론(근거이론)", color: "#d946ef" },
    { id: "dtt", name: "⑩ 연역적 이론 검증", color: "#f43f5e" },
    { id: "ct", name: "⑪ 비판 이론", color: "#dc2626" },
    { id: "ca", name: "⑫ 개념 분석", color: "#9333ea" },
  ]},
  { cat: "🟡 응용·실천형", types: [
    { id: "pa", name: "⑬ 정책 분석", color: "#f59e0b" },
    { id: "ar", name: "⑭ 실행 연구", color: "#84cc16" },
    { id: "er", name: "⑮ 평가 연구", color: "#14b8a6" },
    { id: "cs", name: "⑯ 사례 연구", color: "#0ea5e9" },
  ]},
  { cat: "🔴 방법론 개발형", types: [
    { id: "id", name: "⑰ 도구 개발", color: "#ef4444" },
    { id: "sv", name: "⑱ 척도 타당화", color: "#f97316" },
    { id: "algo", name: "⑲ 알고리즘/모델", color: "#6366f1" },
    { id: "fw", name: "⑳ 프레임워크", color: "#8b5cf6" },
  ]},
  { cat: "🌿 비교·역사형", types: [
    { id: "comp", name: "㉑ 비교 연구", color: "#059669" },
    { id: "hist", name: "㉒ 역사 연구", color: "#b45309" },
    { id: "da", name: "㉓ 담론 분석", color: "#7c3aed" },
    { id: "bio", name: "㉔ 전기적 연구", color: "#be185d" },
  ]},
];

export const THESIS_TYPES = THESIS_CATEGORIES.flatMap((c) => c.types);

export interface Chapter {
  num: string; title: string; color: string; desc: string; question: string;
  macro: string; micro: string[]; goodPatterns: string[]; badPatterns: string[];
}

export const CHAPTERS_QUANT: Chapter[] = [
  {
    num:'CH.01', title:'서론 (Introduction)', color:'#6c8cff',
    desc:'Academic Funnel 구조 · Why → What',
    question:'왜 이 연구가 필요한가?',
    macro:'거시 배경 → 학문적 공백 → 연구 목적 → RQ 선언',
    micro:['P1: 거시 현상 제시 (Phenomenon Opening)','P2: 기존 연구 계보 (Literature Mapping)','P3: Research Gap 명시 (Gap Statement)','P4: 연구목적 선언 (Purpose Statement)','P5: 연구 구성 예고 (Chapter Preview)'],
    goodPatterns:['Academic Funnel','Purpose 5요소','Gap Statement','RQ 의문문 형식'],
    badPatterns:['단순 나열','Gap 불명확','지나친 일반화','Purpose 누락']
  },
  {
    num:'CH.02', title:'이론적 배경 (Theoretical Framework)', color:'#ec4899',
    desc:'LENS · 이론 체계 구축',
    question:'어떤 이론적 렌즈로 해석하는가?',
    macro:'이론 소개 → 핵심 개념 → 이론 관계도 → 적용 근거',
    micro:['이론 발달사 및 주요 학자','핵심 변수·개념 정의','이론 간 관계 및 연구에 대한 적용 논거','선행연구 연결'],
    goodPatterns:['이론 적용 논거 명시','변수 조작적 정의','이론 vs 연구 연결'],
    badPatterns:['이론 나열만','적용 근거 없음','개념 혼용']
  },
  {
    num:'CH.03', title:'연구방법 (Methodology)', color:'#f87171',
    desc:'HOW · IMRaD 방법론',
    question:'어떻게 연구했는가?',
    macro:'연구 설계 → 대상/표집 → 측정 도구 → 분석 방법',
    micro:['연구 패러다임 및 설계 근거','표집 방법·대상·크기','측정 도구 타당도·신뢰도','통계 분석 방법 및 가정 검토'],
    goodPatterns:['Power Analysis 보고','표집 근거 명시','측정 도구 출처'],
    badPatterns:['표집 근거 없음','Effect Size 누락','가정 미검토']
  },
  {
    num:'CH.04', title:'연구결과 (Results)', color:'#fb923c',
    desc:'FOUND · APA 통계 보고',
    question:'무엇을 발견했는가?',
    macro:'기술통계 → 가설검정 → Effect Size → 결과 요약',
    micro:['APA 7판 4요소(p, CI, ES, 기술통계) 보고','가설별 결과 체계적 제시','표·그림 활용 및 해석','결과 해석 없이 사실만 보고'],
    goodPatterns:['p값+CI+ES 함께 보고','표 제목 APA 형식','결과-가설 대응'],
    badPatterns:['해석 혼입','p값만 보고','Effect Size 누락']
  },
  {
    num:'CH.05', title:'논의 (Discussion)', color:'#e879f9',
    desc:'SO WHAT · S-T-P-L 4단계',
    question:'이 결과가 의미하는 것은?',
    macro:'결과 재진술 → 이론 해석 → 실천적 함의 → 후속연구',
    micro:['S: 요약(Summary of findings)','T: 이론적 해석(Theoretical interpretation)','P: 실천적 시사점(Practical implications)','L: 한계 및 후속연구(Limitations)'],
    goodPatterns:['S-T-P-L 순서 준수','이론 연결 해석','구체적 후속연구 제안'],
    badPatterns:['결과 단순 반복','이론 연결 없음','한계 누락']
  },
  {
    num:'CH.06', title:'결론 (Conclusion)', color:'#38bdf8',
    desc:'LEGACY · 연구의 학문적 기여',
    question:'이 연구의 학문적 유산은?',
    macro:'연구 요약 → 기여점 → 한계 → 미래 방향',
    micro:['전체 연구 1~2문단 요약','이론적·실천적 기여 명시','연구 한계 솔직 서술','후속연구 방향 제시'],
    goodPatterns:['기여점 구체화','RQ 재호응','미래 연구 방향'],
    badPatterns:['논의 반복','기여점 모호','한계 과소평가']
  }
];

export const CHAPTERS_QUAL: Chapter[] = [
  {
    num:'CH.01', title:'서론 (Introduction)', color:'#6c8cff',
    desc:'현상의 경험적 복잡성 · 질적 방법 정당화',
    question:'왜 이 현상에 질적 접근이 필요한가?',
    macro:'사회적·학문적 현상 제기 → 기존 연구 한계(양적 공백) → 연구자 위치성 예고 → 질적 방법 정당화 → 탐구 질문 선언',
    micro:['P1: 현상의 경험적 복잡성·의미성 제기','P2: 기존 연구 흐름과 한계 (양적 방법으로 포착되지 않은 공백)','P3: 질적 연구 공백 명시 (Research Gap)','P4: 연구자 위치성(positionality) 예고','P5: 탐구 질문 및 연구 목적 선언 (개방형)'],
    goodPatterns:['현상의 경험적 복잡성 강조','질적 방법 정당화 명시','연구자 위치성 선언','개방형 탐구 질문 (어떻게/어떤 의미)'],
    badPatterns:['질적 방법 정당화 누락','위치성 미서술','폐쇄형 탐구 질문 (~인가?)','현상 수치화 강조','Gap 막연 ("질적 연구 부족")']
  },
  {
    num:'CH.02', title:'연구 방법론 (Methodology & Methods)', color:'#ec4899',
    desc:'패러다임 → 방법론 → 설계 철학적 정당화',
    question:'어떤 패러다임·방법론으로 탐구하는가?',
    macro:'패러다임 입장(존재론·인식론) → 질적 연구 전통/설계 → 참여자 선정(유목적 표집) → 자료 수집 → 분석 전략 → 신뢰성 확보',
    micro:['패러다임 선언 (구성주의/비판이론/포스트구조주의 등)','존재론·인식론 서술','질적 연구 전통 선택 근거 (현상학/근거이론/민족지학 등)','유목적 표집 전략 및 포화 근거','자료 수집·분석·신뢰성 확보 전략'],
    goodPatterns:['패러다임-방법론 일관성','존재론·인식론 명시','유목적 표집 근거','포화(saturation) 선언','IRB 승인 명시'],
    badPatterns:['패러다임 입장 불명확','방법(methods)만 서술, 방법론(methodology) 부재','표집 근거 없음','포화 개념 미적용']
  },
  {
    num:'CH.03', title:'이론적 배경 (Theoretical Framework)', color:'#f87171',
    desc:'이론적 감수성 렌즈 · 자료 대화 파트너',
    question:'어떤 이론적 렌즈로 현상을 바라보는가?',
    macro:'이론적 감수성 렌즈 제공 → 선행 연구 비판적 검토 → 분석 대화 파트너로서의 이론',
    micro:['역할1: 현상 이해 렌즈 (이론적 시각 제공)','역할2: 선행 연구 비판적 지도 (경험·의미·과정의 공백)','역할3: 분석 대화 파트너 (이론과 자료의 대화 구조)','이론 적용의 비연역적 원칙 (자료를 비추는 램프)'],
    goodPatterns:['이론적 감수성 명시','이론-자료 대화 구조','비연역적 적용 원칙','선행 연구 비판적 분석'],
    badPatterns:['이론에서 연역적 결론','이론 나열만','가설 도출식 적용','적용 근거 없음']
  },
  {
    num:'CH.04', title:'자료 수집 및 분석 (Data Generation & Analysis)', color:'#fb923c',
    desc:'현장 진입 · 면담 · 코딩 · 주제화',
    question:'어떻게 자료를 생성하고 분석했는가?',
    macro:'현장 진입·접근 → 면담 설계·실시 → 자료 관리·전사 → 분석 6단계(몰입→코딩→주제화→해석→표현) → 반성적 실천',
    micro:['현장 진입: 게이트키퍼 협상, 라포 형성','면담 설계: 반구조화 면담, 개방형 질문 프로토콜','분석 절차: 초기 코딩 → 집중 코딩 → 주제화 → 해석 → 표현','포화(saturation) 도달 근거','반성적 실천: 연구자 일지, 멤버체크, 동료 심사'],
    goodPatterns:['분석 6단계 절차 명시','포화 도달 선언','연구자 반성 일지','멤버체크 실시','전사 방법 기술'],
    badPatterns:['분석 절차 불명확','포화 미언급','반성적 실천 부재','면담 절차 미기술']
  },
  {
    num:'CH.05', title:'연구 발견 (Findings)', color:'#e879f9',
    desc:'Wolcott 3층 구조 · 주제별/사례별 구성',
    question:'무엇을 발견했는가?',
    macro:'주제별/사례별/서사적 구성 선택 → 각 주제: 도입→하위주제(3층 구조 반복)→통합 → 인용:분석 = 40:60',
    micro:['Wolcott 3층 구조: Layer 1 현상 기술(Description)','Layer 2 참여자 목소리 삽입(Participant Voice)','Layer 3 연구자 분석 논평(Analytic Commentary)','인용:분석 비율 = 40:60 유지','음성적 사례(negative case) 포함'],
    goodPatterns:['3층 구조 준수 (기술→인용→논평)','인용:분석 40:60 비율','다양한 인용 소개 표현','음성적 사례 포함','참여자 특성 명시'],
    badPatterns:['인용만 나열 (연구자 목소리 실종)','해석이 결과에 침투','인용 과잉 (60% 초과)','인용 소개 단일 패턴 ("~말하였다" 반복)','현상 기술(Layer 1) 부재']
  },
  {
    num:'CH.06', title:'논의 (Discussion)', color:'#38bdf8',
    desc:'해석적 의미화 · 이론 대화 · 기여',
    question:'그 발견의 의미는 무엇인가?',
    macro:'핵심 발견의 해석적 의미화 → 선행 연구와 비판적 대화 → 이론적·실천적 기여 → 연구 한계·후속연구',
    micro:['S1: 발견 개념화 재진술 (수치 없이 개념적 언어)','S2: 이론적 공명 선언 (이론과 대화)','S3: 의미 심화 해석 (사회·문화·구조적 메커니즘)','S4: 해석 층위 확장 (개인→집단→사회 구조)','선행 연구와 비판적 대화 (지지/확장/이의제기/대안)'],
    goodPatterns:['수치 없는 개념적 재표현','이론 연결 해석','비판적 대화 4유형','전이가능성 프레이밍','인식론적 반성'],
    badPatterns:['발견 재인용 (요약 반복)','So what 부재','이론 연결 없는 해석','한계 = 사과','기여 과장']
  },
  {
    num:'CH.07', title:'결론 (Conclusion)', color:'#3ecfb2',
    desc:'학문적 유산 선언 · 수미상관',
    question:'이 연구는 무엇을 남겼는가?',
    macro:'연구 요약(메타적 재서술) → 핵심 발견 강조 → 이론적 기여 → 실천적 함의 → 한계(전이가능성 조건) → 후속 연구 → 결어(학문적 유산 선언)',
    micro:['R1-R5: 연구 요약 (서론 반복 금지, 메타적 재서술)','K1-K5: 핵심 발견 + 학문적 메시지 선언','TC1-TC5: 이론적 기여 유형·내용·근거','PI1-PI5: 실천적 함의 (현장→정책 층위)','LM1-LM4: 한계를 전이가능성 조건으로 프레이밍','FR2-FR5: 후속 연구 + 결어(성찰적·능동적 유산 선언)'],
    goodPatterns:['수미상관 (탐구 질문 답변)','전이가능성 프레이밍','성찰적 결어','이론적 기여 구체화'],
    badPatterns:['논의 반복','기여점 모호','한계 과소평가','사과적 한계 서술']
  }
];

export const CHAPTERS_MIXED: Chapter[] = [
  {
    num:'CH.01', title:'서론 (Introduction)', color:'#a78bfa',
    desc:'문제 복합성 · 혼합 방법 정당화 · 설계 예고',
    question:'왜 혼합 방법이 필요한가?',
    macro:'연구 문제 복합성 제기 → QUAN 한계 → QUAL 한계 → 혼합 방법 정당화(7가지 이유) → 설계 유형 예고 → 3요소 MMR 목적 진술',
    micro:['P1: 현상의 복합적 성격 — 단일 방법으로 해결 불가','P2: QUAN만의 한계(경험적 맥락 미포착)','P3: QUAL만의 한계(일반화·체계적 검증 결여)','P4: 혼합 방법 정당화(7가지 혼합 이유 중 해당)+ 설계 예고','P5: 3요소 MMR Purpose Statement(QUAN+QUAL+통합 목적)','P6: 논문 구성 예고'],
    goodPatterns:['혼합 방법 7가지 이유 중 구체적 명시','설계 유형(수렴/설명적/탐색적) 예고','3요소 MMR 목적 진술','QUAN 한계+QUAL 한계 모두 제시'],
    badPatterns:['혼합 정당화 없이 "혼합 연구를 수행"만 선언','설계 유형 불명확','목적이 단순 병렬("양적도 하고 질적도")','Research Gap이 막연("연구 부족")','MMQ 누락','통합의 기여 미선언']
  },
  {
    num:'CH.02', title:'연구목적 및 혼합 연구 질문', color:'#8b5cf6',
    desc:'MMR Purpose Statement · 3층 RQ 구조',
    question:'무엇을 통합적으로 탐구하는가?',
    macro:'핵심 목적 선언 → QUAN 세부 목적 → QUAL 세부 목적 → 통합 목적 → 3층 연구 질문(QUAN RQ + QUAL RQ + MMQ)',
    micro:['P1: 혼합 연구의 총체적 목적 제시','P2: QUAN 세부 목적(변수 간 관계 검증)','P3: QUAL 세부 목적(경험 심층 탐구)','P4: 통합 목적(수렴/설명/탐색 통합)','P5: 3층 연구 질문 체계(QUAN RQ + QUAL RQ + MMQ + 메타추론 질문)'],
    goodPatterns:['3요소 목적 진술(QUAN+QUAL+통합)','설계별 강조 요소 적용','MMQ 포함','메타 추론 질문 선택적 포함'],
    badPatterns:['통합 목적 누락','QUAN·QUAL 목적만 병렬 나열','MMQ 없이 단독 방법 질문만','설계 유형과 목적 불일치']
  },
  {
    num:'CH.03', title:'이론적 배경 (Theoretical Framework)', color:'#f472b6',
    desc:'이중 렌즈 · QUAN 예측 + QUAL 감수성 + 통합 철학',
    question:'어떤 이중 렌즈로 바라보는가?',
    macro:'QUAN 예측 렌즈(변수 관계 이론) → QUAL 감수성 렌즈(경험 탐구 이론) → 통합의 철학적 정당화(프래그머티즘 등) → 선행 연구 비판적 검토',
    micro:['역할1: QUAN 예측 렌즈(가설 도출 이론)','역할2: QUAL 감수성 렌즈(경험·의미 분석 프레임)','역할3: 통합의 철학적 정당화(프래그머티즘)','선행 연구: QUAN·QUAL·혼합 연구 각각 비판적 검토','변형적 프레임워크 사용 시 사회정의 이론 관통'],
    goodPatterns:['이중 렌즈 명시(예측+감수성)','프래그머티즘 패러다임 연결','이론→분석틀→RQ 논리 사슬','QUAN·QUAL 선행연구 각각 비평'],
    badPatterns:['단일 이론만 적용','패러다임 선언이 교과서적','이론과 분석 틀 단절','이론적 예측과 RQ 불일치','문헌 비평 깊이 부족']
  },
  {
    num:'CH.04', title:'연구 방법론 (Mixed Methods Design)', color:'#fb923c',
    desc:'설계 유형 · 설계도 · 통합 전략 · 품질 기준',
    question:'어떻게 설계하고 통합했는가?',
    macro:'설계 유형 선언·근거 → 설계도(Visual Diagram) → QUAN 절차 → QUAL 절차 → 통합(Integration) 전략 → 품질 기준',
    micro:['① 설계 유형 선언 및 선택 근거','② 설계도(Visual Diagram): 순서+우선성+통합 지점','③ 각 스트랜드 절차(QUAN 표집·도구·분석 / QUAL 표집·수집·분석)','④ 통합 전략: 합성(merging)/연결(connecting)/삽입(embedding)','⑤ 품질 기준: QUAN 타당도 + QUAL 신뢰성 + MMR 통합 타당성'],
    goodPatterns:['설계 유형+선택 근거 명시','Visual Diagram 제시','통합 전략 구체적 기술','MMR 품질 기준 포함','MMR 표기법 사용(QUAN+QUAL 등)'],
    badPatterns:['설계 유형 미선언','설계도 누락','통합 전략 미기술','QUAN·QUAL 절차 분리 불명확','연결 단계 미기술(순차형)','MMR 품질 기준 누락','패러다임 입장 미언급']
  },
  {
    num:'CH.05', title:'연구결과 및 발견 (Results & Findings)', color:'#f59e0b',
    desc:'QUAN 결과 + QUAL 발견 + Joint Display 통합',
    question:'무엇을 발견하고 어떻게 통합했는가?',
    macro:'설계별 결과 구조 → QUAN 결과(APA 통계) → QUAL 발견(Wolcott 3층) → 통합 비교 섹션(Joint Display) → 통합 문단 4요소',
    micro:['수렴형: QUAN결과→QUAL발견→통합비교(Joint Display)','설명적순차: Phase1 QUAN→연결섹션→Phase2 QUAL→통합','탐색적순차: Phase1 QUAL→연결(도구개발)→Phase2 QUAN→통합','통합 문단 4요소: QUAN결과→전환신호→QUAL발견→Linking Language','Joint Display 유형: Side-by-Side / Statistics-by-Themes / Themes-to-Items'],
    goodPatterns:['통합 문단 4요소 구조 준수','Linking Language(수렴/보완/발산) 명시','전환 신호(Transition Signal) 배치','Joint Display 제시','발산 결과 학문적 해석'],
    badPatterns:['두 스트랜드 단순 병치(통합 해석 없음)','Linking Language 누락','전환 신호 없이 갑작스러운 전환','Joint Display 부재','발산 결과 숨김','QUAN 통계 불완전(CI/ES 누락)','QUAL 인용 과잉(40:60 위반)']
  },
  {
    num:'CH.06', title:'논의 (Discussion)', color:'#38bdf8',
    desc:'메타 추론 · 통합 해석 · 3층 비교 · 통합 기여',
    question:'통합의 의미는 무엇인가?',
    macro:'통합 발견 해석(수렴/보완/발산) → 메타 추론 선언 → 선행 연구 3층 비교(QUAN/QUAL/통합) → 이론적·실천적 기여 → MMR 한계·후속 연구',
    micro:['I1: 통합 결론 선언(수렴/보완/발산)','I2-I4: 각 관계 유형별 해석','I5: 메타 추론 선언','C1-C3: 선행 연구 3층 비교(QUAN비교+QUAL비교+통합기여)','T1-T2: MMR 이론 기여','P1-P4: 3층 실천 함의(QUAN기반+QUAL기반+통합처방)'],
    goodPatterns:['통합 해석 4단계 구조','메타 추론(meta-inference) 포함','3층 비교(C1+C2+C3)','3층 실천 함의(P2+P3+P4)','발산 결과 학문적 해석'],
    badPatterns:['두 스트랜드 논의 분리','메타 추론 없음','발산 결과 회피','혼합 기여 불명확','실천 함의 단일화','MMR 한계 누락','후속 연구 모호']
  },
  {
    num:'CH.07', title:'결론 (Conclusion)', color:'#3ecfb2',
    desc:'통합의 기여 선언 · 혼합의 학문적 유산',
    question:'혼합이었기에 무엇을 남겼는가?',
    macro:'연구 요약(R1-R5) → 핵심 발견 강조(K1-K5) → 이론적 기여(TC1-TC5) → 실천적 함의(PI1-PI4) → MMR 한계(LM1-LM4) → 후속·결어(FR2-FR5: 혼합의 유산)',
    micro:['R1-R5: 연구 요약(문제 복합성 재환기 → 3요소 목적 재진술 → 통합 발견)','K1-K5: 핵심 통합 발견 + 메타 추론 최종 선언','TC1-TC5: MMR 이론 기여(혼합만 가능한 통찰)','PI1-PI4: 3층 실천 함의(QUAN+QUAL+통합 처방)','LM1-LM4: MMR 고유 한계(통합 완전성, 이중 역량, 시간·자원)','FR2-FR5: 후속 연구 + 결어(혼합의 유산 선언)'],
    goodPatterns:['수미상관(서론 복합성→결론 통합 달성)','메타 추론 최종 선언(K5)','통합의 기여 명시적 선언','혼합의 유산 결어(FR5)','한계를 학문적 초대로 프레이밍'],
    badPatterns:['논의 반복','기여 과장','MMR 한계 누락','통합 기여 불명확','철학적 반성 부재']
  }
];

export const CHAPTERS_EXP: Chapter[] = [
  { num:'CH.01', title:'서론 (Introduction)', color:'#ef4444',
    desc:'인과 관계 질문 · 가설 도출 · 실험 방법 정당화',
    question:'왜 이 인과 관계를 검증해야 하는가?',
    macro:'선행 연구 흐름 → 이론적 모형 → 가설 도출 → 실험 방법 정당화 → 연구의 기여 예고',
    micro:['P1: 연구 영역의 중요성과 현상 제기','P2: 선행 연구의 흐름과 이론적 배경 요약','P3: 선행 연구의 한계·Research Gap 명시','P4: 가설 도출 논리(이론→예측)','P5: 실험 방법 정당화(무선할당·처치 설계)','P6: 연구의 기여 예고 및 논문 구성'],
    goodPatterns:['Academic Funnel 구조','가설이 이론에서 논리적으로 도출','실험 방법 정당화 명시','내적 타당도 위협 인식','4가지 타당도 구조 인식'],
    badPatterns:['가설 없이 바로 방법론','이론적 근거 없는 가설','실험 정당화 누락','인과 추론 목적 불명확','Gap이 막연("연구 부족")']
  },
  { num:'CH.02', title:'연구 방법론 (Method)', color:'#f97316',
    desc:'Participants · Apparatus · Design · Procedure',
    question:'어떻게 인과 관계를 검증하는가?',
    macro:'Participants(표집·할당) → Apparatus/Materials(도구·자극물) → Design(실험 설계) → Procedure(절차 시간순)',
    micro:['Participants: 표본 크기·산출 근거·모집·포함배제 기준·무선할당','Apparatus: 실험 장비·자극물·측정도구·신뢰도','Design: 실험 설계 유형·독립/종속변수·통제 전략','Procedure: 7단계 시간순(사전동의→사전검사→무선할당→처치→조작점검→사후측정→디브리핑)'],
    goodPatterns:['4하위 섹션 명확 분리','표본 크기 산출 근거 제시(검정력 분석)','시간순 Procedure','수동태·능동태 적절 사용','내적 타당도 위협 통제 명시'],
    badPatterns:['하위 섹션 미분리','표본 크기 근거 없음','Procedure 비시간순','처치 충실도 미기술','윤리 절차 누락','IRB 미언급']
  },
  { num:'CH.03', title:'연구결과 (Results)', color:'#eab308',
    desc:'가설별 체계적 답변 · APA 7판 통계 보고',
    question:'처치 효과는 어떠한가?',
    macro:'사전 분석(동질성 검정) → 주 분석(가설별) → 효과크기·신뢰구간 → 추가 분석(조절/매개)',
    micro:['4단계 미시 구조: Topic Sentence → 통계 기술 → 해석 → 의미','APA 7판: F(df1,df2)=값, p=값, η²=값, 95% CI [하한, 상한]','7단계 보고 순서: 기술통계→가정검토→주분석→사후검정→효과크기→추가분석→요약표'],
    goodPatterns:['가설 번호 순서 결과 제시','4요소 완전 보고(통계값+p+CI+ES)','표/그림 본문 참조','해석 분리(논의로 유보)','효과크기 보고'],
    badPatterns:['p값만 보고(효과크기 누락)','"유의하다"만 반복','해석과 결과 혼합','가정 검토 생략','표만 제시 본문 설명 없음']
  },
  { num:'CH.04', title:'논의 (Discussion)', color:'#22c55e',
    desc:'결과 해석 · 이론 기여 · 타당도 한계',
    question:'결과는 무엇을 의미하며 왜 그런가?',
    macro:'핵심 결과 이론적 해석 → 선행 연구 비교 → 이론적·실천적 기여 → 내적·외적 타당도 한계',
    micro:['I1-I5: 핵심 결과 해석(가설 지지/기각 의미)','C1-C4: 선행 연구와 비교(일치·불일치 설명)','TC1-PI2: 이론적 기여 + 실천적 함의','LM1-FR2: 내적 타당도 한계 + 외적 타당도 한계 + 후속 연구'],
    goodPatterns:['결과를 이론으로 환원 해석','선행 연구 구체적 비교','4가지 타당도 한계 각각 논의','한계를 후속 연구로 전환','인과 추론의 경계 인정'],
    badPatterns:['결과 단순 반복','선행 연구 피상적 비교','한계 너무 짧거나 형식적','자기 연구 과대 해석','내적 타당도 위협 미인정']
  },
  { num:'CH.05', title:'결론 (Conclusion)', color:'#6366f1',
    desc:'인과적 유산 선언 · 연구의 최종 답변',
    question:'인과 관계 질문에 대한 최종 답변은?',
    macro:'연구 목적 재환기 → 핵심 결과 요약 → 이론적·실천적 기여 → 타당도 한계·후속 → 인과적 유산 선언',
    micro:['R1-R5: 연구 요약(인과 추론 목적 재환기)','K1-K5: 핵심 결과 요약(가설 지지/기각)','TC1-TC5: 이론적 기여(인과 모형 확장/수정)','PI1-PI4: 실천적 함의','LM1-FR5: 타당도 한계 + 후속 연구 + 인과적 유산 결어'],
    goodPatterns:['수미상관(서론 인과 질문→결론 인과 답변)','인과적 유산 선언','한계를 학문적 초대로 프레이밍','이론적+실천적 기여 분리','간결하고 임팩트 있는 결어'],
    badPatterns:['서론과 단절된 결론','결과 단순 반복','한계만 나열','기여 과대 선언','후속 연구 모호']
  }
];

export const CHAPTERS_SR: Chapter[] = [
  {
    num:'CH.01', title:'서론 (Introduction)', color:'#10b981',
    desc:'PICO 정의 · 연구 필요성 · PROSPERO 등록',
    question:'왜 이 체계적 검토가 필요한가?',
    macro:'중요성 제기 → 기존 검토 평가 → PICO 목적 → 프로토콜 등록',
    micro:['P1: 임상적·사회적 중요성 (규모, 부담)','P2: 중재 배경 및 기전','P3: 기존 체계적 검토의 한계 평가','P4: PICO 기반 검토 목적 진술','P5: PROSPERO 등록번호 명시'],
    goodPatterns:['PICO 4요소 명시','PROSPERO 등록','기존 검토 한계 구체화','1차·2차 결과변수 구분'],
    badPatterns:['PICO 불명확','프로토콜 등록 미명시','기존 검토 한계 막연','1차/2차 결과변수 미구분']
  },
  {
    num:'CH.02', title:'연구 방법론 (Methods)', color:'#059669',
    desc:'PRISMA 2020 7하위섹션 · 검색전략 · 비뚤림평가',
    question:'어떻게 검색·선정·평가·통합했는가?',
    macro:'프로토콜→적격성기준→검색전략→선정과정→자료추출→비뚤림평가→통합방법',
    micro:['PR1-PR3: 프로토콜 및 PRISMA 준수 선언','EL1-EL6: PICO 기반 적격성 기준','SS1-SS6: 데이터베이스 및 회색문헌 검색','SL1-SL5: 독립 이중 선정 과정','RB1-RB4: RoB 2 / ROBINS-I 비뚤림평가','MA1-MA8: 무선효과모델·이질성·GRADE'],
    goodPatterns:['완전한 검색식(부록)','독립 이중 선정+kappa','RoB 2 도구 명시','GRADE 적용'],
    badPatterns:['검색식 미공개','단일 검토자','비뚤림 도구 미명시','GRADE 미수행']
  },
  {
    num:'CH.03', title:'연구결과 (Results)', color:'#047857',
    desc:'PRISMA 흐름도 · forest plot · GRADE SoF',
    question:'무엇을 발견했는가?',
    macro:'선정과정(흐름도) → 포함연구특성 → 비뚤림평가 → 메타분석 → 이질성 → GRADE',
    micro:['Step 1: PRISMA 흐름도 (식별→스크리닝→적격성→포함)','Step 2: 포함연구 특성표 (PICO 기준)','Step 3: RoB 2 traffic light plot','Step 4: forest plot + 통합효과크기','Step 5: I², Q, τ², 하위집단·민감도','Step 6: GRADE SoF 표 + 출판편향'],
    goodPatterns:['PRISMA 흐름도 필수','포함연구특성표','RoB traffic light','GRADE SoF 표'],
    badPatterns:['흐름도 누락','비뚤림결과 미보고','forest plot 미제시','결과에 해석 삽입']
  },
  {
    num:'CH.04', title:'논의 (Discussion)', color:'#065f46',
    desc:'GRADE 근거요약 · 임상함의 · 방법론 한계',
    question:'근거의 의미와 한계는 무엇인가?',
    macro:'GRADE 근거요약 → 임상적 함의 → 방법론적 한계 → 후속연구',
    micro:['GR1-GR5: GRADE 확실성 + NNT/MCID 해석','CI1-CI4: 임상·정책 함의','LM1-LM5: 검색·비뚤림·이질성·표본 한계','향후 연구 방향 (GRADE 낮은 결과변수 중심)'],
    goodPatterns:['GRADE 등급 명시','NNT 기반 권고','SoF 표 참조','한계를 강점 후 서술'],
    badPatterns:['GRADE 미언급','NNT 없는 함의','한계 서술 부재','결과 단순 반복']
  },
  {
    num:'CH.05', title:'결론 (Conclusion)', color:'#064e3b',
    desc:'임상·정책·연구 권고 · 수미상관',
    question:'무엇을 권고하는가?',
    macro:'근거 요약 → 임상적 권고 → 연구 권고 → GRADE 확실성 선언',
    micro:['SoF 표 기반 GRADE 확실성 재선언','임상·정책 권고 (근거 등급별)','연구 권고 (GRADE Low 이하 항목)','수미상관: 연구 공백 → 근거 달성 선언'],
    goodPatterns:['GRADE 기반 권고','수미상관 달성','임상·연구 권고 구분','학문적 기여 선언'],
    badPatterns:['GRADE 무시 권고','논의 단순 반복','권고 모호','기여 선언 없음']
  }
];

export const CHAPTERS_META: Chapter[] = [
  {
    num:'CH.01', title:'서론 (Introduction)', color:'#e8b84b',
    desc:'1차 연구 불일치 진단 · 기존 메타분석 평가 · 조절변수 이론',
    question:'왜 이 메타분석이 필요한가?',
    macro:'이론적 맥락 → 1차연구 불일치 진단 → 기존 메타분석 평가 → 연구문제 → 조절변수 이론',
    micro:['P1: 이론적·임상적 중요성 + [X]와 [Y] 관계 이론','P2: 1차 연구 결과 불일치 진단 (Hunter & Schmidt)','P3: 기존 메타분석의 한계 비판적 평가','P4: 연구문제 + 적격성 기준 예고','P5: 조절변수 분석의 이론적 근거 + 무선효과 모델 채택 근거'],
    goodPatterns:['1차연구 불일치 진단','기존 메타분석 평가','조절변수 이론적 근거','무선효과 모델 근거'],
    badPatterns:['불일치 진단 없음','기존 메타분석 미언급','조절변수 이론 부재','FE/RE 선택 근거 없음']
  },
  {
    num:'CH.02', title:'연구 방법론 (Methods)', color:'#d97706',
    desc:'효과크기 코딩 체계 · FE/RE 모델 · 유물교정 · 조절변수 계획',
    question:'어떻게 수행했는가?',
    macro:'프로토콜→적격성기준→검색전략→코딩체계→모델선택→조절변수계획',
    micro:['코딩 체계: 효과크기 지표 + 코딩 변수 목록','FE vs RE 모델 선택 근거 (Borenstein)','유물 교정 여부 (Hunter & Schmidt)','이질성 검정: Q·I²·τ²','아날로그 ANOVA(범주형) + 메타회귀(연속형)'],
    goodPatterns:['효과크기 지표 선택 근거','RE 모델 채택 근거','유물교정 여부 명시','조절변수 사전 계획'],
    badPatterns:['모델 선택 근거 없음','코딩 체계 불명확','유물교정 미언급','조절변수 무계획']
  },
  {
    num:'CH.03', title:'연구결과 (Results)', color:'#b45309',
    desc:'forest plot · 이질성 분해 · 조절변수 분석 · 출판편향',
    question:'무엇을 발견했는가?',
    macro:'선정과정→포함연구특성→전체효과크기→이질성→조절변수→출판편향',
    micro:['Step 1: PRISMA 흐름도','Step 2: 포함연구 특성표 (k, N, ES 범위)','Step 3: forest plot + 통합효과크기 + 95% CI','Step 4: Q·I²·τ²·예측구간 + 조절변수(아날로그ANOVA/메타회귀)','Step 5: funnel plot + Egger 검정 + Fail-safe N'],
    goodPatterns:['forest plot 필수','이질성 4원칙(Q·I²·τ²·PI)','아날로그 ANOVA/메타회귀','예측구간 보고'],
    badPatterns:['forest plot 미제시','이질성 I²만','조절변수 미분석','출판편향 미평가']
  },
  {
    num:'CH.04', title:'논의 (Discussion)', color:'#92400e',
    desc:'효과크기 이론 해석 · Cohen 기준 · 이질성 함의 · 방법론 한계',
    question:'효과크기의 의미와 한계는?',
    macro:'전체효과크기 이론해석 → 이질성·조절변수 함의 → 방법론 한계 → 후속연구',
    micro:['효과 방향·크기·일관성 이론적 해석 (Cohen 기준)','기존 메타분석과 효과크기 비교','이질성 조절변수 결과의 실천적 함의','검색·코딩·출판편향 한계','미탐색 조절변수 후속연구'],
    goodPatterns:['Cohen 기준 + 해당분야 기준','기존 메타분석 비교','조절변수 함의 명시','유물교정 후 해석'],
    badPatterns:['효과크기 방향만 언급','이론 연결 없음','조절변수 함의 생략','한계 미서술']
  },
  {
    num:'CH.05', title:'결론 (Conclusion)', color:'#78350f',
    desc:'종합 효과크기 권고 · 연구 유산 · 수미상관',
    question:'메타분석이 무엇을 남겼나?',
    macro:'연구문제 답변 → 조절변수 기반 권고 → 한계 선언 → 후속 메타분석 방향',
    micro:['연구문제에 대한 직접적 답변 (통합효과크기)','조절변수에 기반한 맥락화된 권고','RE 모델 한계: 특정 연구집합의 평균 효과','후속 메타분석·IPD 방향'],
    goodPatterns:['통합효과크기 직접 답변','조절변수 권고','RE 모델 한계 명시','IPD 후속 제안'],
    badPatterns:['논의 단순 반복','보편효과 주장','조절변수 권고 없음','후속 방향 모호']
  }
];

export const CHAPTERS_NR: Chapter[] = [
  {
    num:'CH.01', title:'서론 (Introduction)', color:'#8b5cf6',
    desc:'논거 중심 도입 · 범위 선언 · 저자 관점 · 구조 예고',
    question:'왜 이 문헌 검토가 필요한가?',
    macro:'현상 도입 → 주제 중요성 → 범위 선언 → 저자 관점 → 구조 예고',
    micro:['P1: 구체적 통계·논쟁·패러독스로 도입 (과도 일반화 금지)','P2: 이론·개념 배경 (핵심 개념 정의 예고)','P3: 기존 문헌 검토 상태 평가','P4: 검토 목적 + 저자 핵심 논거(point of view)','P5: 포함/제외 범위 선언','P6: 논문 구조 예고 (로드맵)'],
    goodPatterns:['구체적 통계로 시작','저자 관점 명시','범위(포함/제외) 선언','로드맵 예고'],
    badPatterns:['"인류 역사 이래..."식 도입','저자 관점 부재','범위 불명확','구조 예고 없음']
  },
  {
    num:'CH.02-N', title:'본론: 주제별 문헌 분석', color:'#7c3aed',
    desc:'비판적 분석 · 단순요약 금지 · 연구들 간 관계 명시',
    question:'이 주제 영역에서 무엇이 알려졌는가?',
    macro:'장 도입 → 핵심 개념·이론 → 비판적 분석 → 연구들 간 관계 → 장 소결',
    micro:['① 장 도입: 이 장의 주제와 논거 내 역할 선언','② 핵심 개념·이론: 지적 역사 추적','③ 비판적 분석: 지지·반증·보완 균형','④ 연구 간 관계: 일치·불일치·발전 명시','⑤ 장 소결: 알려진 것 + 공백 요약'],
    goodPatterns:['비판 구조 (주장+한계)','복수 출처 종합','연구 간 관계 서술','장 소결 포함'],
    badPatterns:['단순 요약 나열','단일 출처 의존','연구 간 관계 미서술','소결 없음']
  },
  {
    num:'CH.N+1', title:'종합·논의 (Synthesis & Discussion)', color:'#6d28d9',
    desc:'패턴 종합 · 이론 연결 · 연구 공백 명시 · 학문적 판단',
    question:'지식의 전체 상(picture)은 무엇인가?',
    macro:'패턴·경향 종합 → 이론 연결 → 연구 공백 → 실천적 함의',
    micro:['제1단계(30%): 전체 패턴·경향 종합 (일치vs불일치)','제2단계(25%): 이론적 함의 (지지/확장/도전)','제3단계(30%): 연구 공백 명시 (갭 구체화)','제4단계(15%): 실천·정책적 함의'],
    goodPatterns:['패턴과 불일치 구분','이론 연결 서술','갭 구체적 명시','함의 명시'],
    badPatterns:['본론 반복','이론 연결 없음','갭 막연("부족")','단순 요약']
  },
  {
    num:'CH.N+2', title:'결론 (Conclusion)', color:'#5b21b6',
    desc:'핵심 발견 요약 · 논거 최종 진술 · 후속 연구 제안 · 학문적 기여',
    question:'이 검토가 학문 공동체에 남기는 기여는?',
    macro:'핵심 발견 요약 → 논거 최종 진술 → 후속 연구 제안 → 기여 선언',
    micro:['검토 핵심 발견 요약 (반복 아닌 재구성)','논거의 최종 진술','구체적 후속 연구 방향 제안','학문적 기여 선언 + 수미상관'],
    goodPatterns:['핵심 발견 재구성','논거 최종 선언','구체적 후속연구','수미상관 달성'],
    badPatterns:['종합 반복','기여 선언 없음','후속연구 모호','수미상관 없음']
  }
];

export const CHAPTERS_GT: Chapter[] = [
  {
    num:'CH.01', title:'서론 (Introduction)', color:'#d946ef',
    desc:'현상 중요성 · 기존 이론 공백 · 근거이론 정당화 · 패러다임 입장',
    question:'왜 이 현상을 귀납적으로 탐구해야 하는가?',
    macro:'현상 중요성 → 기존 이론 한계 → 근거이론 정당화 → 연구 문제 → 패러다임 입장',
    micro:['P1: 현상의 사회적·이론적 중요성 + 내부 과정 공백','P2: 기존 연구의 한계 (외부구조 중심, 내부과정 미탐구)','P3: 이론적 배경 (분석 렌즈, 잠정적 배경으로)','P4: 근거이론 선택 정당화 (Charmaz 또는 Corbin & Strauss)','P5: 연구 문제 (과정 중심 개방형)','P6: 패러다임 입장 + 논문 구조 예고'],
    goodPatterns:['내부 과정 공백 명시','구성주의/객관주의 입장 선언','과정 중심 연구문제','이론은 잠정적 배경으로'],
    badPatterns:['외부 구조·통계만 언급','입장 불명확','기술적 연구문제','문헌이 분석 지배']
  },
  {
    num:'CH.02', title:'연구 방법론 (Methodology)', color:'#c026d3',
    desc:'이론적 표집 · 코딩 3단계 · 이론적 포화 · 엄밀성 4기준',
    question:'어떻게 수행했는가?',
    macro:'방법론적 패러다임 → 이론적 표집 → 자료수집 → 코딩 3단계 → 엄밀성',
    micro:['MT1: 구성주의 근거이론 채택 명시 (Charmaz/Corbin & Strauss)','MT2: 참여자 + 이론적 표집 전략','MT3: 심층 면담·관찰 자료수집','MT4-MT5: 개방·축·선택 코딩 + 메모·다이어그램','MT6-MT7: 이론적 포화 기준 + 엄밀성 4기준'],
    goodPatterns:['이론적 표집 전략 명시','이론적 포화 근거','메모 작성 언급','Charmaz 엄밀성 4기준'],
    badPatterns:['표집 기준 불명확','포화 근거 없음','코딩 절차 미기술','엄밀성 전략 누락']
  },
  {
    num:'CH.03', title:'결과 I: 범주 (Categories)', color:'#a21caf',
    desc:'개방·축 코딩 결과 · 범주 속성·차원 · 패러다임 모형',
    question:'무엇을 발견했는가? (범주 수준)',
    macro:'분석 개요 → 각 범주(속성·차원·자료) → 범주 간 관계(축 코딩) → 과정 분석',
    micro:['섹션 1: 전체 범주 목록 + 분석 구조 예고','섹션 2-N: 각 범주 (이름+정의+속성·차원+자료발췌+이론의미)','섹션 N+1: 축 코딩 - 패러다임 모형 (조건→현상→맥락→중재→행동→결과)','섹션 N+2: 과정 분석 (시간에 따른 변화 패턴)'],
    goodPatterns:['개념적 언어(범주명)','속성·차원 명시','자료 발췌 예시','패러다임 모형'],
    badPatterns:['기술적 언어','자료 발췌만 나열','범주 간 관계 미서술','이론적 의미 없음']
  },
  {
    num:'CH.04', title:'결과 II: 이론 (Theory)', color:'#86198f',
    desc:'핵심 범주 · 이론 도식 · 선택 코딩 · 서사적 이론 기술',
    question:'어떤 이론을 구성했는가?',
    macro:'핵심 범주 선택 → 이론적 통합 → 이론 도식 → 서사적 이론 기술 → 이탈사례',
    micro:['Step 1: 핵심 범주 선택 + 정당화 (Corbin & Strauss 4기준)','Step 2: 모든 범주의 핵심 범주 중심 통합','Step 3: 이론 도식 (Theoretical Diagram) 제시','Step 4: 서사적 이론 기술 (이론의 스토리)','Step 5: 이탈 사례 처리 → 이론 정교화'],
    goodPatterns:['핵심 범주 선정 근거','이론 도식 필수','서사적 이론 기술','이탈사례 처리'],
    badPatterns:['핵심 범주 선정 근거 없음','도식 없음','이론 없이 범주 나열','이탈사례 무시']
  },
  {
    num:'CH.05', title:'논의·결론 (Discussion & Conclusion)', color:'#701a75',
    desc:'이론 기여 · 기존 이론과 대화 · Charmaz 4기준 · 수미상관',
    question:'이 이론이 무엇을 기여하는가?',
    macro:'이론 핵심 기여 → 기존 이론과 대화 → 실천적 함의 → 방법론 한계 → 후속 연구',
    micro:['이론의 핵심 기여 명시 (기존 이론 대비 독창성)','기존 이론과 대화 (동의·확장·도전)','Charmaz 4기준: 신빙성·독창성·공명성·유용성','실천적·정책적 함의','수미상관: 공백 → 이론 달성 선언'],
    goodPatterns:['이론 독창성 선언','대화(동의/확장/도전)','Charmaz 4기준 명시','수미상관'],
    badPatterns:['기여 불명확','문헌 단순 연결','엄밀성 미언급','수미상관 없음']
  }
];

export const CHAPTERS_DTT: Chapter[] = [
  { num:'CH.01', title:'서론 (Introduction)', color:'#f43f5e',
    desc:'반증 가능성 기반 문제 제기와 가설 예고',
    question:'어떤 이론 명제를 왜 검증하는가?',
    macro:'현상 제기 → 이론 한계/미검증 영역 → 연구 공백 → 목적·가설 방향',
    micro:['P1 현상·중요성','P2 이론·선행연구 계보','P3 미검증 영역/Gap','P4 목적 선언','P5 가설 방향·논문 구성'],
    goodPatterns:['반증 가능성 명시','연구 공백 구체화','가설 방향 예고'],
    badPatterns:['이론 없이 문제 제기','가설 방향 누락','Gap 모호']
  },
  { num:'CH.02', title:'이론적 배경 (Theoretical Background)', color:'#fb7185',
    desc:'이론 명제에서 가설을 연역적으로 도출',
    question:'어떤 이론 논리로 가설을 도출하는가?',
    macro:'핵심 이론 정리 → 개념·변인 정의 → 이론 비교/비판 → 가설 도출',
    micro:['이론 준거 도입','인과 메커니즘 전개','맥락 적용','선행 실증 근거','H 공식 선언'],
    goodPatterns:['삼단논법적 가설 도출','변인 조작화','방향성 가설'],
    badPatterns:['이론 나열','가설 근거 부족','변인 정의 불명확']
  },
  { num:'CH.03', title:'연구방법 (Methodology)', color:'#f97316',
    desc:'엄격한 시험 조건 설계와 재현 가능성',
    question:'가설을 어떻게 엄격히 시험하는가?',
    macro:'패러다임 → 설계 → 표집/도구 → 분석 방법 → 윤리',
    micro:['실증주의/포스트실증주의 선언','RQ-가설-방법 정합성','조작적 정의·측정 타당도','검정력·표집 근거','분석 기준·유의수준'],
    goodPatterns:['타당도·신뢰도 명시','검정력 분석','재현 가능 절차'],
    badPatterns:['설계 정당화 부족','표집 근거 없음','분석 기준 누락']
  },
  { num:'CH.04', title:'연구결과 (Results)', color:'#f59e0b',
    desc:'APA 형식 통계 보고와 가설 판정',
    question:'통계적으로 무엇이 확인되었는가?',
    macro:'기술통계 → 모형검증 → 가설검정 → 효과크기 → 채택/기각',
    micro:['APA 통계값 보고','신뢰구간·효과크기 포함','가설별 판정 선언','기각 가설도 투명 보고','해석은 논의로 유보'],
    goodPatterns:['p+CI+ES 동시 보고','가설별 판정','결과 구조 명확'],
    badPatterns:['p값만 보고','해석 혼입','기각 결과 생략']
  },
  { num:'CH.05', title:'논의 (Discussion)', color:'#a855f7',
    desc:'통계 판정을 이론적 의미로 번역',
    question:'결과의 이론적·실천적 의미는 무엇인가?',
    macro:'핵심 발견 해석 → 선행연구 비교 → 기여/함의 → 한계',
    micro:['가설 결과 개념적 재진술','확증/수정 논리','지지·확장·이의 비교','실천적 함의','후속 연구'],
    goodPatterns:['So what 명확','기각 가설 대안 설명','절제된 기여'],
    badPatterns:['결과 반복','이론 연결 부재','기여 과장']
  },
  { num:'CH.06', title:'결론 (Conclusion)', color:'#38bdf8',
    desc:'가설 검증의 최종 답변과 학문적 유산',
    question:'이 연구가 남긴 최종 기여는 무엇인가?',
    macro:'요약 → 핵심 발견 → 이론/실천 기여 → 한계·후속',
    micro:['목적-결과 수미상관','핵심 판정 압축','기여 유형 명시','후속 연구 방향','학문적 유산 선언'],
    goodPatterns:['수미상관','간결한 권고','후속 방향 구체화'],
    badPatterns:['논의 반복','모호한 기여','새 정보 추가']
  }
];

export const CHAPTERS_CT: Chapter[] = [
  { num:'CH.01', title:'서론 (Introduction)', color:'#dc2626',
    desc:'비판적 관점 선언과 이데올로기 문제화',
    question:'왜 이 현상을 비판 이론으로 다뤄야 하는가?',
    macro:'사회 모순 제기 → 지배 담론 비판 → 비판 공백 → 위치성 → 비판 질문',
    micro:['P1 모순/불평등','P2 지배 담론 문제화','P3 이데올로기 공백','P4 연구자 위치성','P5 비판적 탐구 질문'],
    goodPatterns:['해방적 관점 명시','개방형 비판 질문','배제된 목소리 포함'],
    badPatterns:['중립성 가장','위치성 미서술','폐쇄형 질문']
  },
  { num:'CH.02', title:'이론적 틀 (Theoretical Framework)', color:'#ef4444',
    desc:'비판 이론 전통과 3차원 분석틀 구축',
    question:'어떤 비판 이론 틀로 분석하는가?',
    macro:'전통 위치화 → 핵심 개념 정의 → 인식론 명시 → 분석 범주 통합',
    micro:['Habermas/Fairclough 기반','이데올로기·권력·헤게모니 정의','존재론·인식론 입장','텍스트-담론실천-사회구조 통합'],
    goodPatterns:['개념 일관성','3차원 분석틀 명시','해방적 목표 연결'],
    badPatterns:['이론 나열','개념 혼용','분석틀 부재']
  },
  { num:'CH.03', title:'문헌 비판 (Critical Literature Review)', color:'#f97316',
    desc:'지배 담론 계보와 배제 메커니즘 분석',
    question:'기존 연구의 이데올로기적 한계는 무엇인가?',
    macro:'지배 담론 추적 → 배제된 목소리 발굴 → 공백 도출',
    micro:['담론 계보 비판','주변화 집단 분석','자연화된 전제 폭로','비판 공백 명시','분석 대상 정당화'],
    goodPatterns:['비판적 매핑','배제 분석','공백 구체화'],
    badPatterns:['요약 나열','비판 없는 인용','공백 모호']
  },
  { num:'CH.04', title:'비판적 분석 (Critical Analysis)', color:'#f59e0b',
    desc:'기술-해석-설명의 3층 분석 수행',
    question:'무엇이 어떻게 은폐·재생산되는가?',
    macro:'텍스트 기술 → 담론 해석 → 사회구조 설명 → 비판 발견 종합',
    micro:['Layer1 언어 패턴','Layer2 담론 효과','Layer3 권력 구조 연결','대항 담론 탐색','3차원 통합'],
    goodPatterns:['3층 구조 일관','텍스트:분석 균형','사회구조 연결'],
    badPatterns:['기술만 제시','Layer3 부재','인용 과잉']
  },
  { num:'CH.05', title:'비판적 해석 및 논의 (Interpretation & Discussion)', color:'#a855f7',
    desc:'비판 발견의 이론 대화와 해방적 함의',
    question:'비판 발견의 의미와 변혁 가능성은 무엇인가?',
    macro:'개념화 재진술 → 이론 대화 → 기여 선언 → 실천 처방',
    micro:['핵심 발견 의미화','지지/확장/이의/대안 비교','이론적 기여 유형','변혁적 함의','성찰성'],
    goodPatterns:['So what 명확','해방적 함의 구체화','성찰성 서술'],
    badPatterns:['발견 재인용','기여 막연','대항 담론 누락']
  },
  { num:'CH.06', title:'결론 (Conclusion)', color:'#38bdf8',
    desc:'해방적 유산 선언과 수미상관 완결',
    question:'이 연구가 남긴 비판적 유산은 무엇인가?',
    macro:'비판 요약 → 핵심 폭로 → 기여 → 함의 → 결어',
    micro:['핵심 비판 발견 압축','이론 정교화/도전','정책·실천 함의','한계·후속','강한 마지막 선언'],
    goodPatterns:['해방적 비전','수미상관','명시적 유산 선언'],
    badPatterns:['일반 요약','변혁 방향 부재','약한 결말']
  }
];

export const CHAPTERS_CA: Chapter[] = [
  { num:'CH.01', title:'서론 (Introduction)', color:'#9333ea',
    desc:'개념 모호성 진단과 분석 목적 선언',
    question:'왜 이 개념을 지금 분석해야 하는가?',
    macro:'중요성 제기 → 정의 불일치 → 분석 필요성 → 방법론 선택 → 목적',
    micro:['개념의 사용 맥락','정의 충돌 제시','학문·실천 문제화','방법론 정당화','4대 목적 선언'],
    goodPatterns:['불일치 근거 제시','목적 명확','잠정성 선언'],
    badPatterns:['광의 개념 선택','방법론 미명시','목적 모호']
  },
  { num:'CH.02', title:'이론적 배경 및 방법론 (Methodology)', color:'#a855f7',
    desc:'Walker & Avant / Rodgers 접근 정당화',
    question:'어떤 절차로 개념을 분석하는가?',
    macro:'철학적 기반 → 표본/자료 범위 → 분석 절차 → 품질 확보',
    micro:['8단계 또는 진화적 접근 선언','학문간·기간 범위 명시','코딩/주제분석 절차','Audit trail','방법론적 한계'],
    goodPatterns:['표본 기준 투명','절차 재현 가능','학문간 비교'],
    badPatterns:['표본 불명확','절차 생략','방법론 혼용']
  },
  { num:'CH.03', title:'개념 사용 검토 (Concept Usage)', color:'#c084fc',
    desc:'속성·대리용어·관련개념·선행/결과 수집',
    question:'문헌에서 개념은 어떻게 사용되는가?',
    macro:'사용 맵핑 → 대리용어/관련개념 구분 → 선행요인·결과 후보',
    micro:['다학문 사용 패턴','대리용어 정리','관련 개념 경계화','선행요인/결과 1차 코딩','참조 이론 연결'],
    goodPatterns:['범주별 체계화','경계 명확화','교차 학문 비교'],
    badPatterns:['단순 나열','개념 경계 불명','범주 혼합']
  },
  { num:'CH.04', title:'정의 속성 (Defining Attributes)', color:'#f59e0b',
    desc:'반복·구별·맥락 기반 핵심 속성 도출',
    question:'이 개념을 구별하는 핵심 속성은 무엇인가?',
    macro:'문헌 근거 → 속성 명명 → 맥락 해석 → 통합 정의',
    micro:['Layer1 근거 제시','Layer2 속성 정의','Layer3 맥락/관계 해석','속성 간 구조','잠정 통합 정의'],
    goodPatterns:['3~6개 핵심 속성','순환정의 회피','통합 정의 제시'],
    badPatterns:['속성 과잉','선행요인 혼입','Layer3 부재']
  },
  { num:'CH.05', title:'사례 구성 (Case Construction)', color:'#14b8a6',
    desc:'모형·경계·관련·반대 사례로 경계 검증',
    question:'속성은 실제 사례에서 어떻게 드러나는가?',
    macro:'모형사례 → 경계사례 → 관련/반대사례 → 속성 매핑',
    micro:['사례 서술','속성별 매핑','결여 속성 확인','개념 경계 재확인','사례 기반 정교화'],
    goodPatterns:['모형+경계+반대 포함','속성 매핑 명시','경계 검증'],
    badPatterns:['사례 나열만','새 속성 임의 추가','유형 혼동']
  },
  { num:'CH.06', title:'선행요인·결과·경험적 지시물', color:'#22c55e',
    desc:'시간 구조와 측정 가능성 연결',
    question:'개념은 어떤 조건에서 발생하고 어떻게 관찰되는가?',
    macro:'선행요인 규명 → 결과 규명 → 경험적 지시물·측정 연결',
    micro:['선행요인 vs 속성 구분','결과의 인과·시간성','지시물 유형화','측정 도구 연결','도구 개발 함의'],
    goodPatterns:['시간 순서 명확','지시물 구체화','측정 가능성 제시'],
    badPatterns:['선후 관계 불명','지시물 부재','측정 연결 없음']
  },
  { num:'CH.07', title:'논의 및 결론 (Discussion & Conclusion)', color:'#38bdf8',
    desc:'개념 프로파일 통합과 후속 연구 제안',
    question:'이 개념 분석이 남긴 이론·실천 기여는 무엇인가?',
    macro:'분석 종합 → 기여 → 한계 → 후속 사이클',
    micro:['개념 프로파일 요약','이론·연구·실천 기여','잠정성 재선언','후속 분석 제안','강한 결어'],
    goodPatterns:['기여 구체화','후속 방향 명확','수미상관'],
    badPatterns:['요약 반복','기여 모호','후속 제안 부재']
  }
];

export const CHAPTERS_PA: Chapter[] = [
  { num:'CH.01', title:'서론/문제 정의 (Problem Definition)', color:'#f59e0b',
    desc:'정책 문제의 인과 구조와 분석 범위 설정',
    question:'왜 이 정책 문제가 지금 분석되어야 하는가?',
    macro:'맥락 제기 → 현행 정책 한계 → 인과 이야기 → 범위·질문',
    micro:['문제 규모 실증','기존 대응 한계','causal story 유형화','분석 범위 한정','정책 질문 선언'],
    goodPatterns:['인과 이야기 명시','정량 근거','질문-목적 정합'],
    badPatterns:['현상 나열','인과 구조 부재','질문 모호']
  },
  { num:'CH.02', title:'증거 수집/현황 분석 (Evidence)', color:'#fb923c',
    desc:'문제 실태와 이해관계자 구조 실증화',
    question:'문제는 실제로 어떻게 분포·작동하는가?',
    macro:'규모/추이 → 분포/형평성 → 현행 성과 → 이해관계자',
    micro:['지표·시계열 분석','취약 집단 영향','기존 정책 성과/한계','행위자 이해 구조','국내외 사례'],
    goodPatterns:['근거 중심','분포 분석','비교 사례 포함'],
    badPatterns:['자료 출처 불명','형평성 누락','현행 분석 없음']
  },
  { num:'CH.03', title:'이론적 배경/분석틀 (Framework)', color:'#f97316',
    desc:'평가 기준과 정책 분석 렌즈 구축',
    question:'어떤 프레임으로 대안을 설계·평가하는가?',
    macro:'핵심 개념 정의 → 이론 비교 → 통합 분석틀 → 기준 도출',
    micro:['효율성·형평성 등 개념화','정책 이론 비교','통합 프레임 구축','평가 기준 정당화','규범적 입장 선언'],
    goodPatterns:['기준 선택 근거','이론-기준 연결','규범성 명시'],
    badPatterns:['기준 임의 설정','이론 나열','가치판단 은폐']
  },
  { num:'CH.04', title:'정책 대안 구성 (Alternatives)', color:'#eab308',
    desc:'현상유지 포함 다중 대안 설계',
    question:'어떤 대안들이 실행 가능한가?',
    macro:'대안 도출 → 변화 이론 → 실행 가능성 사전검토',
    micro:['2~5개 대안','status quo 포함','대안별 인과 경로','정치·행정·재정 검토','대안 차별성 확보'],
    goodPatterns:['대안 다양성','개입 지점 명확','실행가능성 검토'],
    badPatterns:['단일 대안','현상유지 누락','아이디어 나열']
  },
  { num:'CH.05', title:'평가 기준 선정 (Criteria)', color:'#84cc16',
    desc:'효과성·효율성·형평성 등 비교 잣대 확정',
    question:'무엇을 기준으로 대안을 비교할 것인가?',
    macro:'기준 목록화 → 우선순위화 → 측정 지표화',
    micro:['효과성/효율성/형평성','정치·행정 실현성','법적 적합성','지속가능성','기준 간 가중치'],
    goodPatterns:['기준 정당화','상충 가능성 예고','지표 구체화'],
    badPatterns:['기준 모호','우선순위 부재','지표 불명확']
  },
  { num:'CH.06', title:'대안 평가/비교 (Evaluation)', color:'#22c55e',
    desc:'평가 행렬로 성과와 상충을 체계 비교',
    question:'각 대안의 성과와 상충은 무엇인가?',
    macro:'기준별 평가 → 행렬 비교 → trade-off 분석',
    micro:['대안별 S1-S6 평가 구조','비용-편익 비교','형평성 영향 분석','정치/행정 가능성','종합 순위화'],
    goodPatterns:['평가행렬 제시','상충 구조 명시','근거 기반 종합'],
    badPatterns:['서술식 비교만','상충 회피','근거 없는 순위']
  },
  { num:'CH.07', title:'논의 및 결론 (Discussion & Conclusion)', color:'#38bdf8',
    desc:'최적안 권고와 실행·확산 전략',
    question:'무엇을 권고하며 어떻게 실행할 것인가?',
    macro:'핵심 해석 → 최적안 권고 → 실행 로드맵 → 위험 대응',
    micro:['정책 역설 해석','권고 근거 명시','단계별 실행 계획','이해관계자 수용 전략','후속 평가'],
    goodPatterns:['명시적 권고','실행 가능 계획','리스크 관리'],
    badPatterns:['모호한 제안','실행 전략 부재','결론 약함']
  }
];

export const CHAPTERS_AR: Chapter[] = [
  { num:'CH.01', title:'서론/연구 맥락 (Context)', color:'#84cc16',
    desc:'공유 관심사(felt concern)와 공개적 공간 설정',
    question:'어떤 실천 문제를 누구와 함께 변화시키는가?',
    macro:'맥락 기술 → felt concern → 위치성 → 목적/나선 예고',
    micro:['현장 맥락 기술','공유 관심사 선언','연구자·참여자 역할','공개적 공간 형성','이중 목표(개선+지식)'],
    goodPatterns:['협력적 출발','위치성 명시','나선 구조 예고'],
    badPatterns:['개인 관심사만','맥락 추상화','협력 부재']
  },
  { num:'CH.02', title:'이론·방법론 틀 (Framework)', color:'#65a30d',
    desc:'CPAR/실천구조 기반 탐구 설계',
    question:'왜 이 실행연구 접근이 적합한가?',
    macro:'접근법 선언 → 실천구조 틀 → 윤리 협약',
    micro:['기술적/실천적/비판적 유형 정당화','sayings-doings-relatings 틀','자료 계획','참여 윤리 규약','품질 기준'],
    goodPatterns:['방법론 정합성','실천구조 명시','윤리 투명성'],
    badPatterns:['접근법 불명','윤리 생략','틀 없는 진행']
  },
  { num:'CH.03', title:'정찰 (Reconnaissance)', color:'#a3e635',
    desc:'현재 실천과 제약 구조를 비판적으로 진단',
    question:'무엇이 현재 실천을 문제적으로 만드는가?',
    macro:'현재 실천 기술 → 구조 분석 → 비판 탐문',
    micro:['Layer1 사실 기술','Layer2 구조 조건 분석','Layer3 4기준 비판','공유 관심사 정교화','다목소리 확인'],
    goodPatterns:['3층 구조','4기준 적용','자료 근거 명시'],
    badPatterns:['판단 혼입','구조 분석 없음','단일 목소리']
  },
  { num:'CH.04', title:'계획 및 실행 (Planning & Acting)', color:'#f59e0b',
    desc:'변화 전략 설계와 사이클 실행',
    question:'무엇을 어떻게 바꾸기로 합의했는가?',
    macro:'집단 계획 → 실행 단계 → 모니터링',
    micro:['공유 관심사 재정의','역할/일정 계획','실행 조치 기술','동시 관찰/기록','사이클별 산출물'],
    goodPatterns:['집단 합의 기반','실행-관찰 동시','계획 구체성'],
    badPatterns:['계획 모호','실행 기록 부재','역할 불명']
  },
  { num:'CH.05', title:'자료 수집·분석 (Data & Analysis)', color:'#14b8a6',
    desc:'저널·관찰·면담의 삼각 검증 분석',
    question:'실행 중 어떤 변화 패턴이 나타났는가?',
    macro:'자료 조직화 → 패턴/범주 분석 → 검증',
    micro:['연구 저널 3층 기록','코딩·범주화','triangulation','의사소통 검증','잠정 실천 이론 도출'],
    goodPatterns:['복수 자료 출처','검증 절차 명시','패턴-행동 연결'],
    badPatterns:['단일 자료 의존','검증 생략','분석 모호']
  },
  { num:'CH.06', title:'반성 및 재계획 (Reflection)', color:'#38bdf8',
    desc:'4목소리 평가와 다음 사이클 설계',
    question:'무엇이 개선되었고 다음엔 무엇을 바꿀 것인가?',
    macro:'변화 서술 → 비판적 평가 → 재계획 결정',
    micro:['What changed','4목소리 평가','성공·실패 균형','재계획 유형 선택','다음 사이클 가설'],
    goodPatterns:['재계획 명확','실패 학습화','나선 연결'],
    badPatterns:['성공 편향','재계획 부재','사이클 단절']
  },
  { num:'CH.07', title:'논의 및 결론 (Discussion & Conclusion)', color:'#3ecfb2',
    desc:'실천 이론·전이 가능성·지식 공개',
    question:'이 실행연구가 실천 공동체에 남긴 기여는?',
    macro:'학습 종합 → 이론/실천 기여 → 전이 가능성 → 공개',
    micro:['실천 변화 총괄','If-then 실천 이론','전이 조건 명시','윤리/한계 성찰','지식 공유 전략'],
    goodPatterns:['지식 공개','전이 조건 제시','강한 결어'],
    badPatterns:['개인 성찰만','이론 기여 부재','일반화 과장']
  }
];

export const CHAPTERS_ER: Chapter[] = [
  { num:'CH.01', title:'서론/평가 맥락 (Evaluation Context)', color:'#14b8a6',
    desc:'평가 대상, 필요성, 사용자·질문 명시',
    question:'무엇을 왜 누구를 위해 평가하는가?',
    macro:'평가 대상 기술 → 필요성 → 의도된 사용자/사용 → 질문',
    micro:['evaluand 정의','평가 동기(개선/책무성)','사용자 식별','핵심 EQ 설정','범위 한정'],
    goodPatterns:['의도된 사용자 명확','EQ 명시','목적 정합'],
    badPatterns:['평가 대상 모호','EQ 누락','사용자 부재']
  },
  { num:'CH.02', title:'이론적 배경/평가 모형 (Models)', color:'#0ea5e9',
    desc:'CIPP·활용중심 프레임 정당화',
    question:'어떤 평가 틀과 기준으로 판단할 것인가?',
    macro:'평가 개념 정의 → 모형 비교 → 통합 프레임 → 기준 도출',
    micro:['merit/worth/significance','CIPP·UFE 비교','평가 표준 연결','가치 기준 체계화','분석틀 선언'],
    goodPatterns:['모형 선택 근거','기준 투명성','표준 연계'],
    badPatterns:['모형 미명시','기준 임의 설정','이론 나열']
  },
  { num:'CH.03', title:'문헌/선행평가 검토 (Prior Evaluations)', color:'#06b6d4',
    desc:'프로그램 이론과 기존 평가 공백 분석',
    question:'기존 연구와 평가는 무엇을 밝혔고 무엇이 남았는가?',
    macro:'프로그램 이론 검토 → 선행 평가 분석 → 평가 공백',
    micro:['logic model 검토','선행 결과/한계 정리','방법론 비교','미해결 질문 도출','본 평가 정당화'],
    goodPatterns:['이중 축 검토','공백 명시','논리모형 연결'],
    badPatterns:['연구 나열','평가 공백 불명','정당화 약함']
  },
  { num:'CH.04', title:'평가 설계/방법론 (Design)', color:'#0284c7',
    desc:'질문-방법-기준 정합 설계',
    question:'어떻게 정확하고 윤리적으로 평가하는가?',
    macro:'접근 선언 → 설계 → 자료 수집/분석 → 타당도·윤리',
    micro:['평가 유형 선언','기준·지표 체계','표본·자료원','혼합 방법/분석법','타당도·신뢰성·IRB'],
    goodPatterns:['질문-방법 대응','윤리성 명시','품질 기준 충족'],
    badPatterns:['방법 교조주의','타당도 누락','윤리 서술 부족']
  },
  { num:'CH.05', title:'평가 결과 (Findings)', color:'#0369a1',
    desc:'CIPP 차원별 결과와 기준 대비 판정',
    question:'평가 질문에 대한 증거 기반 답은 무엇인가?',
    macro:'분석 개요 → CIPP 결과 → 기준 대비 판정 → 요약',
    micro:['EQ별 결과 구조','양적·질적 증거 통합','기준 도달/미달 판정','예외/부정 결과 보고','논의 전환'],
    goodPatterns:['4층 구조','판정 명시','부정 결과 투명성'],
    badPatterns:['결과 나열','판정 부재','예외 생략']
  },
  { num:'CH.06', title:'논의/가치 판단 (Discussion)', color:'#1d4ed8',
    desc:'merit-worth-significance의 근거 기반 판단',
    question:'이 결과는 프로그램의 가치에 대해 무엇을 말하는가?',
    macro:'종합 판단 → 근거 논증 → 사용자별 함의 → 한계',
    micro:['가치 판단 선언','기준 간 종합','선행평가 비교','사용자별 함의','후속 평가 제안'],
    goodPatterns:['명시적 valuing','활용 함의 구체화','한계 성찰'],
    badPatterns:['판단 회피','결과 반복','권고 비약']
  },
  { num:'CH.07', title:'결론/권고·활용 전략', color:'#38bdf8',
    desc:'개선 권고, 활용 설계, 메타평가',
    question:'무엇을 권고하고 어떻게 활용·개선할 것인가?',
    macro:'요약 → 권고 → 활용 전략 → 메타평가 → 결어',
    micro:['종합 판정 재진술','개선/의사결정 권고','사용자별 보고 전략','Joint Committee 자가점검','학문·실천 유산'],
    goodPatterns:['실행 가능한 권고','활용 중심 보고','메타평가 포함'],
    badPatterns:['권고 모호','활용 전략 없음','자가점검 누락']
  }
];

export function getChapters(thesisType: string): Chapter[] {
  const map: Record<string, Chapter[]> = {
    quant: CHAPTERS_QUANT, qual: CHAPTERS_QUAL, mixed: CHAPTERS_MIXED, exp: CHAPTERS_EXP,
    sr: CHAPTERS_SR, meta: CHAPTERS_META, nr: CHAPTERS_NR, gt: CHAPTERS_GT,
    dtt: CHAPTERS_DTT, ct: CHAPTERS_CT, ca: CHAPTERS_CA, pa: CHAPTERS_PA, ar: CHAPTERS_AR, er: CHAPTERS_ER,
  };
  return map[thesisType] || CHAPTERS_QUANT;
}

export function getThesisTypeName(id: string): string {
  return THESIS_TYPES.find(t => t.id === id)?.name || "① 양적 연구";
}

export const ADVISORS = [
  { emoji: "🎓", name: "학술적 절차 검증멘토링", type: "양적연구 전문",
    traits: ["APA 7판 엄수", "통계 정밀도", "효과크기 필수"],
    feedbacks: [
      { type: "critical", text: "Effect Size 없는 결과 보고는 즉각 반려 사유입니다." },
      { type: "warning", text: "Power Analysis 사전 수행 여부가 명시되어야 합니다." },
      { type: "positive", text: "Academic Funnel 구조가 잘 갖춰져 있습니다." },
    ],
  },
  { emoji: "📚", name: "문헌 분석멘토링", type: "질적·이론 전문",
    traits: ["선행연구 포화도", "이론 정합성", "개념 명확성"],
    feedbacks: [
      { type: "warning", text: "핵심 이론의 원전 인용이 부족합니다." },
      { type: "critical", text: "Research Gap 선언이 모호합니다." },
      { type: "positive", text: "문헌 검토의 시간적 범위가 적절합니다." },
    ],
  },
  { emoji: "🔬", name: "통계 검증멘토링", type: "데이터 분석 전문",
    traits: ["표본 크기 검증", "가정 충족 확인", "시각화 품질"],
    feedbacks: [
      { type: "critical", text: "표본 크기가 기준에 부족합니다." },
      { type: "warning", text: "정규성 검정 결과가 누락되었습니다." },
      { type: "positive", text: "결과 표의 APA 형식이 정확합니다." },
    ],
  },
];

export const VALIDATION_RULES = [
  { icon: "check", title: "Academic Funnel 구조 확인됨", desc: "서론이 거시→중시→미시로 체계적으로 구성되어 있습니다.", score: 88 },
  { icon: "check", title: "RQ → 방법 정합성 통과", desc: "연구질문과 연구방법의 일치성이 확인되었습니다.", score: 92 },
  { icon: "warn", title: "Purpose Statement 보강 필요", desc: "Creswell 5요소 중 '연구 참여자' 요소가 불명확합니다.", score: 65 },
  { icon: "error", title: "5장 해석 혼입 감지됨", desc: "Results 섹션에 해석/논의 문장이 포함되어 있습니다.", score: 0 },
  { icon: "error", title: "Effect Size 누락", desc: "통계 결과에 Cohen's d 또는 η² 값이 보고되지 않았습니다.", score: 0 },
  { icon: "check", title: "APA 7판 인용 형식", desc: "본문 내 인용 형식이 APA 7판을 준수합니다.", score: 78 },
];

export const WORKFLOW_PHASES = [
  { id: "planning", label: "기획", icon: "🎯", color: "#6c8cff" },
  { id: "literature", label: "문헌검토", icon: "📚", color: "#3ecfb2" },
  { id: "methodology", label: "방법론", icon: "🔬", color: "#a78bfa" },
  { id: "collection", label: "자료수집", icon: "📋", color: "#e8b84b" },
  { id: "analysis", label: "분석", icon: "📊", color: "#f59e0b" },
  { id: "writing", label: "작성", icon: "✍", color: "#5ebd7c" },
  { id: "revision", label: "수정", icon: "🔄", color: "#ff7066" },
  { id: "submission", label: "제출", icon: "🚀", color: "#ec4899" },
];

export const DEFAULT_TASKS = [
  { id: 1, phase: "planning", title: "연구 주제 선정", done: false },
  { id: 2, phase: "planning", title: "연구문제(RQ) 작성", done: false },
  { id: 3, phase: "planning", title: "연구 설계 확정", done: false },
  { id: 4, phase: "literature", title: "핵심 키워드 선정", done: false },
  { id: 5, phase: "literature", title: "데이터베이스 검색", done: false },
  { id: 6, phase: "literature", title: "선행연구 매트릭스 작성", done: false },
  { id: 7, phase: "methodology", title: "연구 방법론 확정", done: false },
  { id: 8, phase: "methodology", title: "IRB 승인", done: false },
  { id: 9, phase: "collection", title: "설문/인터뷰 실시", done: false },
  { id: 10, phase: "collection", title: "데이터 정리·코딩", done: false },
  { id: 11, phase: "analysis", title: "기술통계 분석", done: false },
  { id: 12, phase: "analysis", title: "가설 검증", done: false },
  { id: 13, phase: "writing", title: "서론 작성", done: false },
  { id: 14, phase: "writing", title: "본론 작성", done: false },
  { id: 15, phase: "writing", title: "결론 작성", done: false },
  { id: 16, phase: "revision", title: "AI 멘토링 피드백 반영", done: false },
  { id: 17, phase: "revision", title: "APA 형식 점검", done: false },
  { id: 18, phase: "submission", title: "최종 제출", done: false },
];
