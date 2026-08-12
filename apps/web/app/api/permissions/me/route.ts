import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";
import { allMenuCodes, defaultAllowedFor } from "@/lib/menu-catalog";
import { isSuperAdminEmail } from "@/lib/admin-config";

/* 현재 로그인 사용자의 "유효 메뉴 접근권한"을 반환한다 (v64).
   계산: 슈퍼관리자 이메일 또는 role=admin → 전체 허용.
        그 외 → 등급(plan) 기본 허용집합 → 회원별 오버라이드 적용(true 추가 / false 제거).
   메뉴는 항상 화면에 표시되며, 허용되지 않은 메뉴는 "비활성(클릭 불가)" 처리된다.
   응답: { isAdmin, all, allowed: string[] } */

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    // 비로그인: 게이팅 없음
    return NextResponse.json({ isAdmin: false, all: true, allowed: [] }, { status: 200 });
  }

  // 슈퍼관리자 이메일 → 등급/DB 와 무관하게 전체 허용
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (isSuperAdminEmail(email)) {
    return NextResponse.json({ isAdmin: true, all: true, allowed: allMenuCodes() });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ isAdmin: false, all: true, allowed: [] });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, role")
    .eq("id", userId)
    .maybeSingle();

  const role = profile?.role ?? "student";
  if (role === "admin") {
    return NextResponse.json({ isAdmin: true, all: true, allowed: allMenuCodes() });
  }

  const allowed = defaultAllowedFor(profile?.plan);

  // 회원별 오버라이드: true → 허용 추가, false → 차단(제거)
  const { data: overrides } = await supabase
    .from("user_permission_overrides")
    .select("permission_code, allowed")
    .eq("user_id", userId);
  for (const o of overrides ?? []) {
    const code = o.permission_code as string;
    if (o.allowed) allowed.add(code);
    else allowed.delete(code);
  }

  return NextResponse.json({ isAdmin: false, all: false, allowed: Array.from(allowed) });
}
