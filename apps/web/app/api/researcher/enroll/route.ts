import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/* 연구자(Researcher) 플랜 가입 → researcher_enrollment(pending) 생성.
   관리자 승인 전까지 AI-Research-OS 정식 진입 보류(승인 후 진입).
   가입 조건(서버 재검증): 대표 논문 링크 2편 + 석사/학술 논문 링크 = 최소 2편 이상. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const profile = await req.json().catch(() => ({}));

  // 링크 검증: http(s) 형식 링크가 최소 2개 이상이어야 함
  const links = [profile.paper1, profile.paper2, profile.thesis].filter(
    (l: unknown) => typeof l === "string" && /^https?:\/\/.+/i.test(l as string)
  );
  if (links.length < 2) {
    return NextResponse.json(
      { error: "가입 조건 미충족: 유효한 학술/석사 논문 링크가 최소 2편 이상 필요합니다." },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false, status: "pending" });

  const { error } = await supabase.from("researcher_enrollment").upsert(
    { user_id: userId, email, status: "pending", source: "signup", profile, created_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, persisted: true, status: "pending" });
}
