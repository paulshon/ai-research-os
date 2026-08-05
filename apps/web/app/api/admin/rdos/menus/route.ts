import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getServiceSupabase } from "@/lib/supabase";
import { RDOS_MENUS } from "@/lib/rdos/menus";

export const dynamic = "force-dynamic";

/* 슈퍼관리자: RDOS 메뉴 전역 활성/비활성 관리 (과제 1).
   GET  → RDOS_MENUS 전체 + 각 메뉴의 enabled 상태.
   POST {key, enabled} → 해당 메뉴 활성/비활성 저장(대시보드/관리자는 토글 불가). */

async function requireSuperAdmin() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return { ok: isSuperAdminEmail(email), email };
}

const LOCKED = new Set(["dashboard"]); // 항상 활성(토글 불가)

export async function GET() {
  const { ok } = await requireSuperAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  const disabled = new Set<string>();
  if (supabase) {
    const { data } = await supabase.from("rdos_menu_config").select("key, enabled").eq("enabled", false);
    (data ?? []).forEach((r) => disabled.add(r.key as string));
  }
  const menus = RDOS_MENUS.map((m) => ({
    key: m.key,
    label: m.label,
    route: m.route,
    locked: LOCKED.has(m.key),
    enabled: !disabled.has(m.key),
  }));
  return NextResponse.json({ menus, persisted: !!supabase });
}

export async function POST(req: Request) {
  const { ok, email } = await requireSuperAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, enabled } = await req.json().catch(() => ({}));
  if (!key || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "key 와 enabled(boolean) 필요" }, { status: 400 });
  }
  if (LOCKED.has(key)) {
    return NextResponse.json({ error: "이 메뉴는 비활성화할 수 없습니다." }, { status: 400 });
  }
  if (!RDOS_MENUS.some((m) => m.key === key)) {
    return NextResponse.json({ error: "알 수 없는 메뉴 key" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false, key, enabled });

  const { error } = await supabase.from("rdos_menu_config").upsert(
    { key, enabled, updated_at: new Date().toISOString(), updated_by: email },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, persisted: true, key, enabled });
}
