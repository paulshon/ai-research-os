import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { MENU_CATALOG, defaultAllowedFor } from "@/lib/menu-catalog";

/* 회원별 메뉴(권한) 오버라이드 관리 — 관리자 전용.
   GET  ?userId=  → 코드 기반 메뉴 카탈로그(상위+하위) + 회원 오버라이드 + 등급 기본 허용 상태.
                    DB permissions 시드 상태와 무관하게 항상 전체 메뉴를 반환한다.
   POST {userId, permission_code, allowed|null}  → allowed=null 이면 오버라이드 해제(기본값 복귀),
        true/false 면 명시적 허용/차단으로 저장. 등급 기본값보다 우선 적용된다.
   인증: 관리자 세션 쿠키(/api/admin/login) 또는 x-admin-secret 헤더. */

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthorized(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const [{ data: overrides }, { data: member }] = await Promise.all([
    supabase.from("user_permission_overrides").select("permission_code, allowed").eq("user_id", userId),
    supabase.from("profiles").select("plan, role").eq("id", userId).maybeSingle(),
  ]);

  const plan = member?.plan ?? "free";
  const role = member?.role ?? "student";

  // 등급 기본 허용집합 (관리자는 전체 허용)
  const defaultSet =
    role === "admin"
      ? new Set(
          MENU_CATALOG.flatMap((n) => [n.code, ...(n.children ?? []).map((c) => c.code)])
        )
      : defaultAllowedFor(plan);

  const inherited: Record<string, boolean> = {};
  MENU_CATALOG.forEach((n) => {
    inherited[n.code] = defaultSet.has(n.code);
    (n.children ?? []).forEach((c) => (inherited[c.code] = defaultSet.has(c.code)));
  });

  const ovMap: Record<string, boolean> = {};
  (overrides ?? []).forEach((o) => (ovMap[o.permission_code] = o.allowed));

  return NextResponse.json({
    catalog: MENU_CATALOG,
    overrides: ovMap,
    inherited,
    member: { plan, role },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  let body: { userId?: string; permission_code?: string; allowed?: boolean | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { userId, permission_code, allowed } = body;
  if (!userId || !permission_code) {
    return NextResponse.json({ error: "userId and permission_code required" }, { status: 400 });
  }

  if (allowed === null || allowed === undefined) {
    const { error } = await supabase
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", userId)
      .eq("permission_code", permission_code);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, reset: true });
  }

  // v5(과제 2 핵심 수정): user_permission_overrides.permission_code 는 permissions(code)
  // 를 외래키로 참조한다. MENU_CATALOG 의 하위 코드(engine.literature.search 등)가
  // permissions 에 시드돼 있지 않으면 override upsert 가 FK 위반으로 실패하여
  // "차단이 저장되지 않고 실행되지 않는" 증상이 발생했다. 저장 직전 해당 코드를
  // permissions 에 self-heal upsert 하여(없으면 생성) FK 를 항상 만족시킨다.
  const label =
    MENU_CATALOG.flatMap((n) => [{ code: n.code, label: n.label }, ...((n.children ?? []).map((c) => ({ code: c.code, label: c.label })))])
      .find((x) => x.code === permission_code)?.label ?? permission_code;
  await supabase
    .from("permissions")
    .upsert({ code: permission_code, name: label, category: "engine" }, { onConflict: "code" });

  const { error } = await supabase
    .from("user_permission_overrides")
    .upsert(
      { user_id: userId, permission_code, allowed, updated_at: new Date().toISOString() },
      { onConflict: "user_id,permission_code" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, allowed });
}
