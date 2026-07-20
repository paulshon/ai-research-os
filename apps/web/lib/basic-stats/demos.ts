/**
 * 기본통계 — 모듈별 데모 데이터 12종 + 미리보기·변수 설명 헬퍼
 */
import demosJson from "./basic-stats-demos.generated.json";

export type BsDemo = {
  id: string;
  title: string;
  desc: string;
  n: number;
  csv: string;
};

export type ColumnGlossary = {
  key: string;
  label: string;
  meaning: string;
};

const DEMOS = demosJson as Record<string, BsDemo[]>;

/** 연구 주제별 종속·독립변수 한글 의미 (미리보기 정밀화) */
const TOPIC_VARS: { match: RegExp; y: string; x1: string; x2: string; score: string; group: string; context: string }[] = [
  { match: /학습동기/, y: "학습동기 총점", x1: "자기효능감(5점)", x2: "주당 학습시간", score: "학습동기 점수", group: "집단(수업·조건)", context: "대학생의 학습동기와 관련 요인" },
  { match: /조직몰입/, y: "조직몰입 총점", x1: "상사지지(5점)", x2: "직무자율성", score: "조직몰입 점수", group: "집단(부서·조건)", context: "직장인의 조직몰입과 성과 맥락" },
  { match: /수업 만족|온라인 수업/, y: "수업만족도", x1: "상호작용 품질", x2: "콘텐츠 유용성", score: "만족도 점수", group: "집단(남/여·방식)", context: "온라인·원격수업 만족도" },
  { match: /복지 인식/, y: "복지인식 점수", x1: "정보접근성", x2: "지역애착", score: "복지인식", group: "집단(거주·채널)", context: "지역사회 복지 인식" },
  { match: /창업의도/, y: "창업의도", x1: "기업가정신", x2: "자원접근성", score: "창업의도 점수", group: "집단(전공·경험)", context: "스타트업 창업의도" },
  { match: /진로성숙/, y: "진로성숙도", x1: "진로탐색", x2: "부모지지", score: "진로성숙 점수", group: "집단(학년·프로그램)", context: "중학생 진로성숙" },
  { match: /직무스트레스|간호/, y: "직무스트레스", x1: "업무부하", x2: "사회적지지", score: "스트레스 점수", group: "집단(근무형태)", context: "간호·직무 스트레스" },
  { match: /브랜드/, y: "브랜드충성도", x1: "브랜드신뢰", x2: "만족도", score: "충성도 점수", group: "집단(구매경험)", context: "소비자 브랜드 충성" },
  { match: /디지털리터러시|노인/, y: "디지털리터러시", x1: "기기사용빈도", x2: "교육경험", score: "리터러시 점수", group: "집단(연령대)", context: "노인 디지털리터러시" },
  { match: /교사|소진/, y: "교사효능감", x1: "소진(역)", x2: "동료지지", score: "효능감 점수", group: "집단(학교급)", context: "교사 소진·효능감" },
  { match: /기후/, y: "기후행동의도", x1: "환경태도", x2: "규범인식", score: "행동의도", group: "집단(캠페인노출)", context: "기후행동 의도" },
  { match: /헬스케어|앱/, y: "앱지속사용의도", x1: "유용성", x2: "용이성", score: "사용의도", group: "집단(이용기간)", context: "헬스케어 앱 사용" },
];

const GENERIC_COL: Record<string, { label: string; meaning: string }> = {
  id: { label: "응답 ID", meaning: "설문 응답자 식별번호" },
  ID: { label: "응답 ID", meaning: "설문 응답자 식별번호" },
  group: { label: "집단", meaning: "비교 집단(처치·통제·조건)" },
  집단: { label: "집단", meaning: "평균 비교에 쓰는 집단 구분" },
  score: { label: "점수", meaning: "측정 척도 총점 또는 핵심 종속변수" },
  y: { label: "종속변수(Y)", meaning: "설명하려는 결과 변수" },
  x1: { label: "독립변수(X1)", meaning: "첫 번째 예측·설명 변수" },
  x2: { label: "독립변수(X2)", meaning: "두 번째 예측·설명 변수" },
  학년: { label: "학년", meaning: "응답자의 학년(또는 학기) 구분" },
  전공: { label: "전공", meaning: "소속 전공·계열" },
  학습동기점수: { label: "학습동기 점수", meaning: "학습동기 척도 점수" },
  선호학습시간: { label: "선호 학습시간", meaning: "주로 학습하는 시간대" },
  부서: { label: "부서", meaning: "소속 부서·팀" },
  근속: { label: "근속", meaning: "근속 기간 범주" },
  조직몰입점수: { label: "조직몰입 점수", meaning: "조직몰입 척도 점수" },
  근무형태: { label: "근무형태", meaning: "주간·교대 등 근무 형태" },
  수강방식: { label: "수강방식", meaning: "온라인·혼합 등 수업 방식" },
  학년대: { label: "학년대", meaning: "학년 또는 연령대 구간" },
  만족도점수: { label: "만족도 점수", meaning: "수업·서비스 만족도" },
  기기: { label: "기기", meaning: "주로 사용한 기기" },
  거주지역: { label: "거주지역", meaning: "조사 대상 거주 지역" },
  연령대: { label: "연령대", meaning: "응답자 연령 구간" },
  복지인식점수: { label: "복지인식 점수", meaning: "지역 복지에 대한 인식" },
  정보경로: { label: "정보경로", meaning: "복지 정보를 접한 경로" },
  전공계열: { label: "전공계열", meaning: "이공·인문 등 계열" },
  창업경험: { label: "창업경험", meaning: "창업·창업동아리 경험" },
  창업의도점수: { label: "창업의도 점수", meaning: "창업 의도 척도" },
  지역: { label: "지역", meaning: "거주·활동 지역" },
  진로성숙점수: { label: "진로성숙 점수", meaning: "진로성숙도 척도" },
  상담경험: { label: "상담경험", meaning: "진로·심리 상담 경험" },
  근무부서: { label: "근무부서", meaning: "병동·부서 구분" },
  경력: { label: "경력", meaning: "임상·직무 경력" },
  직무스트레스점수: { label: "직무스트레스 점수", meaning: "직무 스트레스 척도" },
  교대여부: { label: "교대여부", meaning: "교대근무 여부" },
  구매경험: { label: "구매경험", meaning: "브랜드 구매·이용 경험" },
  채널: { label: "채널", meaning: "구매·접촉 채널" },
  충성도점수: { label: "충성도 점수", meaning: "브랜드 충성도 척도" },
  연령: { label: "연령", meaning: "응답자 연령대" },
  교육경험: { label: "교육경험", meaning: "디지털 교육·훈련 경험" },
  리터러시점수: { label: "리터러시 점수", meaning: "디지털 리터러시 척도" },
  기기종류: { label: "기기종류", meaning: "주로 사용하는 디지털 기기" },
  학교급: { label: "학교급", meaning: "초·중·고 등 학교급" },
  경력년: { label: "경력년", meaning: "교직 경력" },
  효능감점수: { label: "효능감 점수", meaning: "교사 효능감 척도" },
  소진수준: { label: "소진수준", meaning: "직무 소진 수준" },
  캠페인노출: { label: "캠페인노출", meaning: "기후·환경 캠페인 노출" },
  거주형태: { label: "거주형태", meaning: "거주 형태" },
  행동의도점수: { label: "행동의도 점수", meaning: "기후행동 의도 척도" },
  정보원: { label: "정보원", meaning: "환경 정보 출처" },
  이용기간: { label: "이용기간", meaning: "앱 이용 기간" },
  사용의도점수: { label: "사용의도 점수", meaning: "지속 사용 의도" },
  OS: { label: "OS", meaning: "모바일 OS" },
  학습동기: { label: "학습동기", meaning: "종속변수(학습동기)" },
  자기효능감: { label: "자기효능감", meaning: "예측변수(자기효능감)" },
  주당학습시간: { label: "주당학습시간", meaning: "주당 학습 시간(시간)" },
  조직몰입: { label: "조직몰입", meaning: "종속변수(조직몰입)" },
  상사지지: { label: "상사지지", meaning: "예측변수(상사 지지)" },
  직무자율성: { label: "직무자율성", meaning: "예측변수(직무 자율성)" },
};

function topicFor(title: string) {
  return TOPIC_VARS.find((t) => t.match.test(title)) ?? null;
}

/** 데모 제목·컬럼에 맞춘 변수 설명표 */
export function columnGlossary(demo: BsDemo | null | undefined, headers: string[]): ColumnGlossary[] {
  const topic = demo ? topicFor(demo.title) : null;
  return headers.map((h) => {
    const key = h.trim();
    if (topic) {
      if (/^y$/i.test(key)) return { key, label: topic.y, meaning: `${topic.context}의 종속변수` };
      if (/^x1$/i.test(key)) return { key, label: topic.x1, meaning: `${topic.context}의 주요 예측변수` };
      if (/^x2$/i.test(key)) return { key, label: topic.x2, meaning: `${topic.context}의 보조 예측변수` };
      if (/^score$/i.test(key)) return { key, label: topic.score, meaning: `${topic.context}의 핵심 점수` };
      if (/^group$/i.test(key) || key === "집단") return { key, label: topic.group, meaning: "평균 비교에 쓰는 집단 구분" };
    }
    const g = GENERIC_COL[key];
    if (g) return { key, label: g.label, meaning: g.meaning };
    // 이미 한글 헤더면 그대로 쓰고 문맥 보강
    if (/[가-힣]/.test(key)) {
      return { key, label: key, meaning: topic ? `${topic.context} 관련 변수` : "설문·측정 변수" };
    }
    return { key, label: key, meaning: "데이터 열" };
  });
}

export function demoContextBlurb(demo: BsDemo | null | undefined): string {
  if (!demo) return "현재 불러온 CSV를 표로 확인합니다.";
  const topic = topicFor(demo.title);
  const base = topic?.context ?? demo.desc;
  return `「${demo.title}」 — ${base}. ${demo.desc}`;
}

export function getDemosForModule(moduleId: string): BsDemo[] {
  return DEMOS[moduleId] || [];
}

export function getDemo(moduleId: string, demoId: string): BsDemo | undefined {
  return getDemosForModule(moduleId).find((d) => d.id === demoId);
}

export function previewCsv(
  csv: string,
  maxRows = 8,
): { headers: string[]; rows: string[][]; total: number } {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [], total: 0 };
  const headers = lines[0].split(",");
  const rows = lines.slice(1, maxRows + 1).map((l) => l.split(","));
  return { headers, rows, total: Math.max(0, lines.length - 1) };
}

export const CLASSIC_MODULE_IDS = [
  "freq", "ttest", "anova", "validity", "efa", "reliability",
  "assoc", "reg_basic", "reg_mid", "reg_adv", "cluster",
] as const;

export const SEM_MODULE_IDS = [
  "cfa", "path", "sem", "sem_fix", "sem_mod", "mg",
] as const;
