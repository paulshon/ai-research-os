import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getServiceSupabase } from "@/lib/supabase";

/** 슈퍼관리자: RDOS 가입 승인/거절 → 승인 시 해당 회원이 RDOS 진입 가능 */
export async function POST(req: Request) {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isSuperAdminEmail(email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { targetUserId, targetEmail, approve, remove } = await req.json().catch(() => ({}));
  if (!targetUserId) return NextResponse.json({ error: "targetUserId 필요" }, { status: 400 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  // 테이블 부재/스키마 캐시 오류를 사용자가 이해할 수 있는 안내로 변환
  const friendly = (msg: string) =>
    /schema cache|could not find the table|relation .* does not exist/i.test(msg)
      ? "DB에 RDOS 테이블이 없습니다. supabase/migrations/0014_consolidated_setup.sql 을 SQL Editor 에서 1회 실행하세요(스키마 캐시도 자동 갱신)."
      : msg;

  // v6(과제 1): 완전 퇴출 — enrollment 행 삭제(재가입 시 다시 승인 필요)
  if (remove === true) {
    const { error } = await supabase.from("rdos_enrollment").delete().eq("user_id", targetUserId);
    if (error) return NextResponse.json({ error: friendly(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, persisted: true, status: "removed" });
  }

  // v6: update → upsert. 자가 가입(enrollment) 행이 없는 일반 회원도
  // 슈퍼관리자가 RDOS 접근을 직접 부여/차단할 수 있게 한다(회원 명부 연동).
  const status = approve ? "approved" : "rejected";
  const { error } = await supabase
    .from("rdos_enrollment")
    .upsert(
      {
        user_id: targetUserId,
        email: targetEmail ?? null,
        track: "rdos",
        status,
        approved_at: approve ? new Date().toISOString() : null,
        approved_by: email,
      },
      { onConflict: "user_id" }
    );
  if (error) return NextResponse.json({ error: friendly(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true, persisted: true, status });
}
