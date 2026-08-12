import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getServiceSupabase } from "@/lib/supabase";
import { getLearnerState, getResearcherStatus } from "@/lib/rdos/state-server";

export const dynamic = "force-dynamic";

/* 슈퍼관리자: 연구준비자(RDOS) 회원별 미션 수행 현황 (v7).
   각 회원의 학습 상태를 커널로 도출하여 미션 완료 수·전체 진행률·승급 자격을 반환.
   승급 자격(eligible) = 모든 미션 완료(활성/잠금 0) AND 1개 이상 완료. */
export async function GET() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isSuperAdminEmail(email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ members: [] });

  const { data: enr } = await supabase
    .from("rdos_enrollment")
    .select("user_id, email, status, profile")
    .in("status", ["approved", "active"]);

  const members = [];
  for (const e of enr ?? []) {
    let missionsDone = 0, total = 0, overallPct = 0;
    try {
      const st = await getLearnerState(e.user_id as string);
      missionsDone = st.summary.missionsDone;
      total = st.summary.missionsDone + st.summary.missionsActive + st.summary.missionsLocked;
      overallPct = st.summary.overallPct;
    } catch { /* graceful */ }
    const researcher = await getResearcherStatus(e.user_id as string);
    const eligible = total > 0 && missionsDone >= total;
    members.push({
      user_id: e.user_id,
      email: e.email,
      name: (e.profile as { name?: string } | null)?.name ?? null,
      missionsDone, totalMissions: total, overallPct,
      eligible,
      researcherStatus: researcher ?? "none",
    });
  }
  return NextResponse.json({ members });
}
