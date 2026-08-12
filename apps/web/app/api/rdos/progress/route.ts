import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getLearnerState } from "@/lib/rdos/state-server";

/* s-renew-14 · 사이드바 「학습 메뉴」 진행률 연동
   대시보드가 쓰는 커널 상태(getLearnerState)를 그대로 재사용해,
   사이드바 하위메뉴에 대시보드와 똑같은 퍼센트를 표시한다. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    const state = await getLearnerState(userId ?? "rdos-learner");
    const progress: Record<string, { pct: number; done: number; total: number; status: string }> = {};
    for (const m of state.missions) {
      const key = m.route.match(/\/rdos\/([a-z]+)/)?.[1];
      if (!key) continue;
      progress[key] = { pct: m.pct, done: m.done, total: m.total, status: m.status };
    }
    return NextResponse.json({ progress });
  } catch {
    return NextResponse.json({ progress: {} });
  }
}
