import type { ProjectState } from "./flow";

/**
 * 데모 시드 데이터.
 * 스토어가 비어 있을 때(주제 없음 + 문헌 없음) 대시보드가 전부 0%로 보이지 않도록
 * 하나의 그럴듯한 논문 프로젝트("정서적 조직몰입과 이직의도")를 채워 넣는다.
 * 실제 사용자가 값을 입력하기 시작하면 더 이상 호출되지 않는다.
 */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function buildDemoProject(): ProjectState {
  return {
    name: "박사논문 · 조직몰입과 이직의도",
    researchDesign: {
      topic: "정서적 조직몰입과 이직의도",
      adoptedRqId: "rq1",
      conceptFramework:
        "정서적 조직몰입 → 이직의도 (부적 영향), 심리적 안전감이 두 변인의 관계를 조절",
      hypotheses: [
        "H1. 정서적 조직몰입은 이직의도에 유의한 부적 영향을 미친다.",
        "H2. 심리적 안전감은 정서적 조직몰입과 이직의도의 관계를 조절한다.",
      ],
      rqCandidates: [
        {
          id: "rq1",
          text: "정서적 조직몰입은 MZ세대 사무직 종사자의 이직의도에 어떤 영향을 미치며, 그 관계는 조직 내 심리적 안전감에 의해 조절되는가?",
          confidence: 78,
          evidence: [
            "Meyer & Allen (1991) — 3요인 조직몰입 모형, 인용 4,120회",
            "김OO (2023) — 국내 MZ세대 대상 연구에서 정서적 몰입만 이직의도와 유의한 부적 관계",
          ],
          adopted: true,
        },
        {
          id: "rq2",
          text: "지속적 몰입과 규범적 몰입은 이직의도에 서로 다른 방향의 영향을 미치는가?",
          confidence: 61,
          evidence: ["국내 선행연구 4편 — 표본·산업군이 상이해 결과가 엇갈림"],
        },
        {
          id: "rq3",
          text: "재택근무 비율이 조직몰입–이직의도 관계를 매개하는가?",
          confidence: 44,
          evidence: ["관련 국내 실증 연구 부족 — 이론적 추론에 의존"],
        },
      ],
    },
    methodDesign: {
      type: "quant",
      population: "국내 사무직 종사자 중 1990–2005년생(MZ세대)",
      sampling: "층화 무선표집 · 산업군 5개 층",
      targetN: 320,
      requiredN: 384,
      instruments: ["정서적 몰입 (ACS, Meyer & Allen 1991, α=.89)", "이직의도 (TIS-6, Roodt 2004, α=.91)"],
      analysis: "위계적 회귀분석 + PROCESS Model 1 (Hayes 2022) · SPSS 29",
      irb: "신속심의 · 동의서 필요",
    },
    thesisType: null,
    outline: {
      derivedFromTypeId: null,
      sections: [
        { id: "ch1", number: "1", title: "서론", level: 1, targetChars: 2000, currentChars: 1450, status: "draft" },
        { id: "ch1-2", number: "1.2", title: "연구 목적", level: 2, targetChars: 800, currentChars: 800, status: "done" },
        { id: "ch2", number: "2", title: "이론적 배경", level: 1, targetChars: 4000, currentChars: 1600, status: "draft" },
        { id: "ch3", number: "3", title: "연구 설계", level: 1, targetChars: 2000, currentChars: 2000, status: "done" },
        { id: "ch4", number: "4", title: "연구방법", level: 1, targetChars: 3000, currentChars: 900, status: "draft" },
        { id: "ch4-2", number: "4.2", title: "표본 및 표집", level: 2, targetChars: 1000, currentChars: 312, status: "draft" },
        { id: "ch5", number: "5", title: "결과", level: 1, targetChars: 4000, currentChars: 0, status: "empty" },
        { id: "ch6", number: "6", title: "논의", level: 1, targetChars: 3000, currentChars: 0, status: "empty" },
      ],
    },
    literature: [
      { id: "lit1", title: "Psychological safety and turnover intention among millennials", authors: "Chen, L. & Roberts, K.", year: 2024, doi: "10.1177/0001839224001", journal: "J. of Org. Behavior, 45(3)", inLibrary: true, citedInBody: 6 },
      { id: "lit2", title: "조직몰입 3요인이 이직의도에 미치는 차별적 영향", authors: "김OO · 이OO", year: 2023, doi: "10.24985/kjbs.2023.31.2.1", journal: "인사조직연구, 31(2)", inLibrary: true, citedInBody: 5 },
      { id: "lit3", title: "Affective commitment as a buffer: A meta-analysis", authors: "Nguyen, T. et al.", year: 2022, doi: "10.1037/bul0000345", journal: "Psych. Bulletin, 148(2)", inLibrary: true, citedInBody: 3 },
      { id: "lit4", title: "MZ세대 사무직의 이직 결정 요인 탐색", authors: "박OO", year: 2025, doi: "10.35529/kmsr.2025.6.1", journal: "한국경영학회지, 54(1)", inLibrary: true, citedInBody: 0 },
      { id: "lit5", title: "A three-component conceptualization of organizational commitment", authors: "Meyer, J. & Allen, N.", year: 1991, doi: "10.1016/1053-4822(91)90011-Z", journal: "HRM Review, 1(1)", inLibrary: true, citedInBody: 9 },
      { id: "lit6", title: "Job embeddedness and voluntary turnover: a review", authors: "Kim, S.", year: 2021, inLibrary: true, citedInBody: 2 },
      { id: "lit7", title: "조직 내 신뢰와 이직의도의 관계", authors: "Park, J.", year: 2019, inLibrary: true, citedInBody: 1 },
      { id: "lit8", title: "심리적 안전감 척도의 타당화", authors: "Lee, H.", year: 2023, inLibrary: true, citedInBody: 4 },
      { id: "lit9", title: "Turnover intention scale (TIS-6): construct validity", authors: "Roodt, G.", year: 2004, doi: "10.4102/sajip.v30i2.146", journal: "SA J. of Industrial Psych., 30(2)", inLibrary: true, citedInBody: 2 },
      { id: "lit10", title: "직무배태성과 이직의도의 관계에 관한 메타분석", authors: "정OO", year: 2020, doi: "10.24230/ksiop.2020.33.4.777", journal: "한국심리학회지, 33(4)", inLibrary: true, citedInBody: 0 },
      { id: "lit11", title: "Remote work ratio and organizational attachment", authors: "Alvarez, D.", year: 2023, inLibrary: false, citedInBody: 0 },
      { id: "lit12", title: "세대별 조직몰입 차이에 관한 비교 연구", authors: "최OO · 한OO", year: 2021, doi: "10.22156/kjbs.2021.12.4.55", journal: "경영학연구, 12(4)", inLibrary: true, citedInBody: 0 },
      { id: "lit13", title: "Hierarchical regression and moderation analysis: a primer", authors: "Hayes, A.", year: 2022, doi: "10.1093/hayes2022", journal: "Guilford Press", inLibrary: true, citedInBody: 1 },
      { id: "lit14", title: "공공기관 종사자의 조직몰입과 이직의도", authors: "윤OO", year: 2018, inLibrary: false, citedInBody: 0 },
    ],
    manuscript: [
      {
        id: "blk-4-2-human",
        sectionId: "ch4-2",
        origin: "human",
        accepted: true,
        content:
          "본 연구의 모집단은 국내 사무직 종사자 중 1990년부터 2005년 사이에 출생한 이른바 MZ세대 근로자이다. 이들은 조직에 대한 태도와 이직 행동에서 이전 세대와 구별되는 특성을 보이는 것으로 보고되어 왔다(Chen & Roberts, 2024; 김OO, 2023). 표집은 산업군에 따른 대표성을 확보하기 위하여 층화 무선표집을 적용하였다.",
        sources: ["lit1", "lit2"],
      },
      {
        id: "blk-4-2-ai-draft",
        sectionId: "ch4-2",
        origin: "ai",
        accepted: false,
        content:
          "구체적으로 통계청 산업분류를 기준으로 제조업, 정보통신업, 금융·보험업, 전문·과학기술서비스업, 공공행정의 5개 층을 구성하였으며, 각 층에서 무선으로 응답자를 배정하였다. 표본 크기는 Cohen(1988)의 검정력 분석 절차에 따라 산출하였다. 효과크기 f²=.15, 유의수준 α=.05, 검정력 1–β=.80, 예측변인 5개를 가정할 때 요구되는 최소 표본은 384명이며, 응답 누락과 불성실 응답을 고려하여 총 420부를 배포하였다.",
        sources: ["연구 방법 · 검정력 분석", "lit13"],
      },
    ],
    snippets: [
      { id: "sn1", text: "본 연구는 〔모집단〕을 모집단으로 하여 층화 무선표집을 실시하였다.", slots: ["모집단"], category: "방법", sectionId: "ch4-2", origin: "mine", useCount: 3 },
      { id: "sn2", text: "표본 크기는 Cohen(1988)의 검정력 분석 절차에 따라 산출하였다.", slots: [], category: "방법", sectionId: "ch4-2", origin: "mine", useCount: 2 },
      { id: "sn3", text: "분석 결과 〔변인〕은 〔변인〕에 유의한 부적 영향을 미치는 것으로 나타났다(β = 〔값〕, p < .01).", slots: ["변인", "변인", "값"], category: "결과", origin: "mine", useCount: 5 },
      { id: "sn4", text: "선행연구들은 대체로 〔주장〕을 지지하고 있으나, 〔조건〕에서는 상반된 결과가 보고되고 있다.", slots: ["주장", "조건"], category: "이론", origin: "mine", useCount: 4 },
      { id: "sn5", text: "본 연구의 결과는 〔선행연구〕의 주장을 부분적으로 지지하는 한편, 〔차이〕라는 점에서 차별성을 갖는다.", slots: ["선행연구", "차이"], category: "논의", origin: "mine", useCount: 2 },
      { id: "sn6", text: "본 연구는 다음과 같은 한계를 지닌다. 첫째, 횡단 설계로 인해 인과관계를 확정하기 어렵다.", slots: [], category: "논의", origin: "mine", useCount: 1 },
      { id: "sn7", text: "이러한 배경에서 본 연구는 〔목적〕을 규명하는 것을 목적으로 한다.", slots: ["목적"], category: "서론", origin: "mine", useCount: 3 },
      { id: "sn8", text: "본 연구의 표본은 〔모집단〕를 대상으로 층화 무선표집을 통해 수집되었다.", slots: ["모집단"], category: "방법", sectionId: "ch4-2", origin: "cite", useCount: 0 },
      { id: "sn9", text: "〔모집단〕를 모집단으로 설정하고, 산업군을 층으로 하여 무선표집하였다.", slots: ["모집단"], category: "방법", sectionId: "ch4-2", origin: "cite", useCount: 0 },
      { id: "sn10", text: "응답 누락과 불성실 응답을 고려하여 총 〔수〕부를 배포하였다.", slots: ["수"], category: "방법", sectionId: "ch4-2", origin: "mine", useCount: 0 },
    ],
    validationRuns: [
      {
        at: daysFromNow(0),
        findings: [
          {
            rule: "APA-14",
            severity: "danger",
            category: "인용",
            sectionId: "ch3",
            resolved: false,
            title: "본문에 인용된 문헌 3건이 참고문헌 목록에 없습니다",
            detail: "Kim(2021), Park(2019), Lee(2023) — 본문에서 인용했으나 참고문헌에 대응 항목이 없습니다. 심사 규정상 즉시 반려 사유에 해당합니다.",
            regulation: "학위논문 심사 규정 §3.2 — 본문 인용과 참고문헌 목록은 1:1로 대응해야 한다.",
            actions: [
              { label: "참고문헌에 추가", kind: "primary", href: "/references" },
              { label: "본문에서 인용 삭제", kind: "default", effect: "resolve" },
              { label: "규칙 설명 보기", kind: "ghost" },
            ],
          },
          {
            rule: "STAT-07",
            severity: "warn",
            category: "통계 보고",
            sectionId: "ch4-2",
            resolved: false,
            title: "신뢰도 계수 보고 시 소수점 자리수가 일치하지 않습니다",
            detail: "α = .89 / α = .912 / α = .9 가 혼재합니다. APA 7판은 소수점 둘째 자리, 앞의 0 생략을 권장합니다.",
            regulation: "APA 7판 §6.36 — 통계치는 보고 전체에서 동일한 소수점 자리수를 사용한다.",
            actions: [
              { label: "자동 통일 (.89 형식)", kind: "primary", effect: "resolve" },
              { label: "무시", kind: "ghost", effect: "ignore" },
            ],
          },
          {
            rule: "PLAG-02",
            severity: "warn",
            category: "표절",
            sectionId: "ch2",
            resolved: false,
            title: "외부 문헌과 연속 32어절이 일치합니다",
            detail: "김OO(2018) 국내 타당화 논문의 개념 정의 부분과 일치합니다. 직접인용 표기 또는 재진술이 필요합니다.",
            regulation: "연구윤리 지침 §4.1 — 6어절 이상 연속 일치 시 직접인용 표기 또는 재진술이 필요하다.",
            actions: [
              { label: "직접인용으로 표기", kind: "primary", effect: "resolve" },
              { label: "재진술 제안", kind: "default", href: "/writing" },
              { label: "원문 대조", kind: "ghost", href: "/literature" },
            ],
          },
          {
            rule: "CITE-19",
            severity: "info",
            category: "인용",
            sectionId: "ch2",
            resolved: false,
            title: "동일 저자의 2024년 문헌이 2건 이상 인용되어 있습니다",
            detail: "Chen & Roberts (2024)를 여러 번 인용할 때는 첫 인용 이후 'a', 'b' 접미사로 구분하는 것이 좋습니다.",
            regulation: "APA 7판 §8.19 — 동일 저자·동일 연도 문헌은 a, b, c로 구분한다.",
            actions: [{ label: "접미사 자동 부여", kind: "primary", effect: "resolve" }],
          },
          {
            rule: "STYLE-04",
            severity: "info",
            category: "문체",
            sectionId: "ch4",
            resolved: false,
            title: "능동태와 수동태가 섞여 사용되고 있습니다",
            detail: "방법 장에서는 수동태('~이 실시되었다')로 통일하는 것을 권장합니다.",
            actions: [{ label: "표현 검토하기", kind: "default", href: "/writing" }],
          },
          {
            rule: "TABLE-03",
            severity: "info",
            category: "표·그림",
            resolved: false,
            title: "표 제목에 단위 표기가 없습니다",
            detail: "수치를 포함한 표에는 제목 또는 각주에 단위를 명시하는 것이 좋습니다.",
            actions: [{ label: "표 확인하기", kind: "default", href: "/writing" }],
          },
          {
            rule: "STRUCT-01",
            severity: "info",
            category: "구조",
            resolved: true,
            title: "장 순서",
            detail: "규정된 장 순서를 따릅니다.",
          },
          {
            rule: "FIG-02",
            severity: "info",
            category: "표·그림",
            resolved: true,
            title: "표·그림 번호",
            detail: "연속 번호가 규정과 일치합니다.",
          },
          {
            rule: "CITE-03",
            severity: "info",
            category: "인용",
            resolved: true,
            title: "각주 형식",
            detail: "각주 형식이 규정과 일치합니다.",
          },
          {
            rule: "ABS-01",
            severity: "info",
            category: "구조",
            resolved: true,
            title: "국문초록 분량",
            detail: "규정 범위 안에 있습니다.",
          },
          {
            rule: "KW-01",
            severity: "info",
            category: "구조",
            resolved: true,
            title: "키워드 개수",
            detail: "규정 개수를 충족합니다.",
          },
          {
            rule: "REF-05",
            severity: "info",
            category: "서지",
            resolved: true,
            title: "참고문헌 정렬",
            detail: "저자순 정렬이 규정과 일치합니다.",
          },
          {
            rule: "DOI-01",
            severity: "info",
            category: "서지",
            resolved: true,
            title: "DOI 형식",
            detail: "확인된 DOI 형식이 규정과 일치합니다.",
          },
        ],
      },
    ],
    analyzerRuns: [],
    corrections: [],
    critiques: [],
    schedule: {
      dueDate: daysFromNow(42),
      milestones: [
        { id: "ms1", title: "지도교수 중간 보고", due: daysFromNow(3), type: "보고·심사", conditions: ["3장 초안 작성", "표본 설계 확정 (n 수정 필요)", "검증 치명 지적 해소"], linkedMenu: "writing" },
        { id: "ms2", title: "IRB 심의 서류 제출", due: daysFromNow(11), type: "행정", conditions: ["동의서 양식 작성", "설문 문항 전문 작성"], linkedMenu: "method" },
        { id: "ms3", title: "데이터 수집 종료", due: daysFromNow(24), type: "데이터", conditions: ["목표 표본 확보"], linkedMenu: "method" },
        { id: "ms4", title: "전체 초고 완성", due: daysFromNow(31), type: "집필", conditions: ["전 장 초안 작성"], linkedMenu: "writing" },
        { id: "ms5", title: "심사본 제출", due: daysFromNow(42), type: "보고·심사", conditions: ["검증 지적 전체 해소"], linkedMenu: "validation" },
      ],
    },
    savedAt: null,
  };
}
