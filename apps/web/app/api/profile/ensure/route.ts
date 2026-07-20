import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";

/* Clerk → Supabase 동기화 (로그인/온보딩 시 호출).
   가입은 Clerk 에서, 사용자 데이터는 Supabase profiles 에서 관리한다.
   profiles 가 없으면 생성(기본 plan=free, role=student, 승인대기), 있으면 기본정보 동기화.
   신규 가입 시 선택한 plan(free/basic/pro/university)을 전달하면 반영한다.
   → 신규 사용자뿐 아니라 기존 Clerk 사용자도 최초 호출 시 자동 연동된다. */

const PLANS = ["free", "basic", "pro", "university"];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  let desiredPlan: string | null = null;
  try {
    const body = await req.json();
    if (body?.plan && PLANS.includes(body.plan)) desiredPlan = body.plan;
  } catch {
    /* no body */
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || null;
  const avatar = user?.imageUrl ?? null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, plan")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    const row: Record<string, unknown> = {
      id: userId,
      email,
      name,
      avatar_url: avatar,
      role: "student",
      plan: desiredPlan ?? "free",
      approval_status: "pending",
    };
    const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ created: true, plan: row.plan });
  }

  const patch: Record<string, unknown> = {
    email,
    name,
    avatar_url: avatar,
    updated_at: new Date().toISOString(),
  };
  // 가입 직후 선택 플랜은 기본(free)일 때만 반영(이후 등급은 관리자/결제가 관리)
  if (desiredPlan && existing.plan === "free") patch.plan = desiredPlan;
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: false, plan: patch.plan ?? existing.plan });
}
