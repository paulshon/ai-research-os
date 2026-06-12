import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getServiceSupabase } from "@/lib/supabase";
import { getLearnerState } from "@/lib/rdos/state-server";

export const dynamic = "force-dynamic";

/* 슈퍼관리자: 연구준비자(RDOS) 회원 → 연구자(Researcher) 승급 (v7).
   조건: 프로그램 미션 전체 완료. 서버에서 재검증한 뒤에만 researcher_enrollment(approved, source=upgrade) 생성.
   미완료 회원은 승급 불가(403/400). */
export async function POST(req: Request) {
  const user = await currentUser();
  const adminEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isSuperAdminEmail(adminEmail)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { targetUserId, targetEmail } = await req.json().catch(() => ({}));
  if (!targetUserId) return NextResponse.json({ error: "targetUserId 필요" }, { status: 400 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  // 서버 재검증: 미션 전체 완료여야 승급 가능
  let eligible = false;
  try {
    const st = await getLearnerState(targetUserId);
    const total = st.summary.missionsDone + st.summary.missionsActive + st.summary.missionsLocked;
    eligible = total > 0 && st.summary.missionsDone >= total;
  } catch { eligible = false; }

  if (!eligible) {
    return NextResponse.json({ error: "승급 불가: 프로그램 미션을 모두 완료해야 연구자 플랜으로 승급할 수 있습니다." }, { status: 400 });
  }

  const { error } = await supabase.from("researcher_enrollment").upsert(
    {
      user_id: targetUserId,
      email: targetEmail ?? null,
      status: "approved",
      source: "upgrade",
      approved_at: new Date().toISOString(),
      approved_by: adminEmail,
    },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, persisted: true, status: "approved" });
}
