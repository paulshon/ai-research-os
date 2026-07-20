// L14 — Analytics Layer
// Analytics Kernel이 쌓은 이벤트 스트림을 집계하는 뷰 함수들.
import type { ResearchOS } from "../os";

export function learningAnalytics(os: ResearchOS, userId: string) {
  const s = os.state(userId) as any;
  return {
    timeOnTask: s.analytics?.timeOnTask ?? 0,
    eventCount: s.analytics?.events?.length ?? 0,
    level: s.motivation?.level ?? 0,
    xp: s.motivation?.xp ?? 0,
    badges: s.motivation?.badges ?? [],
    conflicts: s.alignment?.conflicts ?? [],
    competency: s.competency?.scores ?? {},
  };
}
