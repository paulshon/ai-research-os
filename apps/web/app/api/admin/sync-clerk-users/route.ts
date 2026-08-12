import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-auth";

/* 기존 Clerk 사용자 일괄 동기화 (백필).
   웹훅 도입 이전에 가입한 사용자나 누락분을 Supabase profiles 로 한 번에 연동한다.
   인증: 관리자 세션 쿠키 또는 x-admin-secret 헤더. POST /api/admin/sync-clerk-users */

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const client = await clerkClient();
  const limit = 100;
  let offset = 0;
  let total = 0;
  let created = 0;
  let synced = 0;

  for (let page = 0; page < 100; page++) {
    const res = await client.users.getUserList({ limit, offset });
    const users = res.data ?? [];
    if (users.length === 0) break;

    for (const u of users) {
      total++;
      const email = u.emailAddresses?.[0]?.emailAddress ?? null;
      const name =
        [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || null;
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", u.id)
        .maybeSingle();

      const row: Record<string, unknown> = {
        id: u.id,
        email,
        name,
        avatar_url: u.imageUrl ?? null,
        updated_at: new Date().toISOString(),
      };
      if (!existing) {
        Object.assign(row, { role: "student", plan: "free", approval_status: "pending" });
      }
      const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
      if (!error) {
        synced++;
        if (!existing) created++;
      }
    }
    if (users.length < limit) break;
    offset += limit;
  }

  return NextResponse.json({ ok: true, total, created, synced });
}
