// 커널 기반 학습 상태 도출 — 데모 상수 대신 ResearchOS 커널 파이프라인으로 계산한다.
// 입력: 사용자별 메뉴 학습 진행(완료 레슨 수). 출력: 대시보드 뷰 모델.
import { ResearchOS } from "./os";
import { levelForXp, GROWTH_LEVELS } from "./growth/levels";

/** RDOS 메뉴 → 커널 매핑 (지식 노드 · 역량 차원 · 정합성 체인 단계) */
export const RDOS_MENU_MAP: Record<string, {
  label: string; provides: string; color: string; route: string;
  node: string; competency: CompetencyKey; lessons: number; chain?: ChainStep;
}> = {
  basics:    { label: "Research Basics", provides: "연구 기초", color: "#3ecfb2", route: "/rdos/basics",    node: "research-problem",  competency: "researchLiteracy", lessons: 8, chain: "problem" },
  structure: { label: "논문 구조 학습",  provides: "논문 구성 이해", color: "#a78bfa", route: "/rdos/structure", node: "paper-structure",   competency: "academicLiteracy", lessons: 10, chain: "purpose" },
  design:    { label: "연구설계 기초",   provides: "연구문제 작성", color: "#e8b84b", route: "/rdos/design",    node: "research-design",   competency: "methodLiteracy",   lessons: 8, chain: "method" },
  method:    { label: "연구방법론 기초", provides: "양적·질적 개요", color: "#f59e0b", route: "/rdos/method",    node: "methodology",       competency: "methodLiteracy",   lessons: 8 },
  reading:   { label: "논문 읽기 훈련",  provides: "논문 분석", color: "#34d399", route: "/rdos/reading",   node: "literature-analysis", competency: "thinkingLiteracy", lessons: 7, chain: "question" },
  apa:       { label: "APA 학습",        provides: "인용·참고문헌", color: "#a78bfa", route: "/rdos/apa",       node: "apa-citation",      competency: "writingLiteracy",  lessons: 6 },
  writing:   { label: "학술 글쓰기 훈련",provides: "문단 작성", color: "#7c93ff", route: "/rdos/writing",   node: "academic-writing",  competency: "writingLiteracy",  lessons: 8 },
  tutor:     { label: "AI 튜터",         provides: "질의응답", color: "#3ecfb2", route: "/rdos/tutor",     node: "ai-tutoring",       competency: "aiLiteracy",       lessons: 5 },
};

export type CompetencyKey =
  | "researchLiteracy" | "academicLiteracy" | "thinkingLiteracy"
  | "methodLiteracy" | "writingLiteracy" | "aiLiteracy";
type ChainStep = "problem" | "purpose" | "question" | "method";

const COMPETENCY_LABEL: Record<CompetencyKey, { label: string; color: string }> = {
  researchLiteracy: { label: "연구 리터러시", color: "#3ecfb2" },
  academicLiteracy: { label: "학술 리터러시", color: "#7c93ff" },
  thinkingLiteracy: { label: "사고 리터러시", color: "#a78bfa" },
  methodLiteracy:   { label: "방법 리터러시", color: "#e8b84b" },
  writingLiteracy:  { label: "글쓰기 리터러시", color: "#f472b6" },
  aiLiteracy:       { label: "AI 리터러시", color: "#34d399" },
};

const LESSON_XP = 15;
const COMPLETE_BONUS_XP = 10;
const LESSON_COMPETENCY_GAIN = 6;
const LESSON_KNOWLEDGE_GAIN = 6;

export interface RdosMission {
  key: string; title: string; provides: string; color: string; route: string;
  total: number; done: number; pct: number; status: "done" | "active" | "locked"; xp: number;
}
export interface RdosLearnerState {
  xp: number;
  level: { code: string; ko: string; en: string; minXp: number };
  nextLevel: { code: string; ko: string; en: string; minXp: number } | null;
  levelPct: number;
  badges: string[];
  competency: { key: string; label: string; score: number; color: string }[];
  knowledge: Record<string, number>;
  missions: RdosMission[];
  alignment: { chain: { step: string; ok: boolean }[]; conflicts: string[] };
  growthCurve: number[];
  summary: { overallPct: number; doneLessons: number; totalLessons: number; missionsDone: number; missionsActive: number; missionsLocked: number; activeMissionRoute: string | null };
  streakDays: number;
}

const MENU_ORDER = ["basics", "structure", "design", "method", "reading", "apa", "writing", "tutor"];

/**
 * 완료 진행(progress[menuKey] = 완료 레슨 수)을 커널 이벤트로 재생(replay)하여
 * XP·레벨·역량·지식·미션·정합성을 ResearchOS 커널에서 도출한다.
 */
export async function deriveRdosState(
  progress: Record<string, number>,
  opts: { streakDays?: number } = {}
): Promise<RdosLearnerState> {
  const os = new ResearchOS();
  const userId = "rdos-learner";
  await os.boot(userId);

  const growthCurve: number[] = [0];

  // 메뉴 순서대로 완료 레슨을 이벤트로 재생
  for (const key of MENU_ORDER) {
    const map = RDOS_MENU_MAP[key];
    const done = Math.max(0, Math.min(progress[key] ?? 0, map.lessons));
    for (let i = 0; i < done; i++) {
      await os.dispatch({
        type: "language.concept.mastered",
        userId, source: key, ts: Date.now(),
        payload: { nodeId: map.node, gain: LESSON_KNOWLEDGE_GAIN, competency: map.competency, xp: LESSON_XP },
      });
      const xpNow = (os.state(userId).motivation as any).xp as number;
      growthCurve.push(xpNow);
    }
    // 메뉴 완료 → 퀘스트 완료 + 보너스
    if (done >= map.lessons) {
      await os.dispatch({ type: "quest.complete", userId, source: key, ts: Date.now(), payload: { questId: `quest-${key}`, xp: COMPLETE_BONUS_XP } });
    }
    // 정합성 체인: 해당 단계를 학습하기 시작하면(진행>0) 체인에 등록 → 순서 불일치 탐지
    if (map.chain && done > 0) {
      await os.dispatch({ type: "alignment.set", userId, source: key, ts: Date.now(), payload: { [map.chain]: map.label } });
    }
  }
  await os.dispatch({ type: "alignment.check", userId, source: "derive", ts: Date.now(), payload: {} });

  const snap = os.state(userId) as any;
  const xp = snap.motivation.xp as number;
  const level = levelForXp(xp);
  const nextLevel = GROWTH_LEVELS.find((l) => l.minXp > xp) ?? null;
  const levelPct = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100;

  // 역량
  const scores = snap.competency.scores as Record<string, number>;
  const competency = (Object.keys(COMPETENCY_LABEL) as CompetencyKey[]).map((k) => ({
    key: k, label: COMPETENCY_LABEL[k].label, color: COMPETENCY_LABEL[k].color, score: Math.round(scores[k] ?? 0),
  }));

  // 미션 (학습 진행과 연동, 순차 해금)
  let prevDone = true;
  const missions: RdosMission[] = MENU_ORDER.map((key) => {
    const map = RDOS_MENU_MAP[key];
    const done = Math.max(0, Math.min(progress[key] ?? 0, map.lessons));
    const pct = Math.round((done / map.lessons) * 100);
    const status: RdosMission["status"] = done >= map.lessons ? "done" : prevDone ? "active" : "locked";
    prevDone = done >= map.lessons;
    return { key, title: map.label, provides: map.provides, color: map.color, route: map.route, total: map.lessons, done, pct, status, xp: map.lessons * LESSON_XP + COMPLETE_BONUS_XP };
  });

  const totalLessons = MENU_ORDER.reduce((a, k) => a + RDOS_MENU_MAP[k].lessons, 0);
  const doneLessons = MENU_ORDER.reduce((a, k) => a + Math.min(progress[k] ?? 0, RDOS_MENU_MAP[k].lessons), 0);
  const activeMission = missions.find((m) => m.status === "active") ?? null;

  // 배지 (Motivation) — 완료 미션 기반
  const badges: string[] = [];
  if (doneLessons > 0) badges.push("첫 학습");
  if (missions.find((m) => m.key === "basics")?.status === "done") badges.push("연구 기초 완료");
  if ((opts.streakDays ?? 0) >= 3) badges.push(`${opts.streakDays}일 연속`);

  // 정합성
  const alignChain = snap.alignment.chain as Record<string, unknown>;
  const chain = [
    { step: "연구문제", ok: !!alignChain.problem },
    { step: "연구목적", ok: !!alignChain.purpose },
    { step: "연구질문", ok: !!alignChain.question },
    { step: "방법론", ok: !!alignChain.method },
    { step: "결론", ok: !!alignChain.conclusion },
  ];
  const conflicts = (snap.alignment.conflicts as string[]) ?? [];

  return {
    xp, level, nextLevel, levelPct, badges,
    competency,
    knowledge: snap.knowledge.nodeMastery as Record<string, number>,
    missions,
    alignment: { chain, conflicts },
    growthCurve,
    summary: {
      overallPct: Math.round((doneLessons / totalLessons) * 100),
      doneLessons, totalLessons,
      missionsDone: missions.filter((m) => m.status === "done").length,
      missionsActive: missions.filter((m) => m.status === "active").length,
      missionsLocked: missions.filter((m) => m.status === "locked").length,
      activeMissionRoute: activeMission ? activeMission.route : null,
    },
    streakDays: opts.streakDays ?? 0,
  };
}
