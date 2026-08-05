import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { getServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/* 슈퍼관리자: RDOS 가입/회원 목록 (v6).
   - enrollments: rdos_enrollment 행(승인 대기/거절 등 자가 가입 기록)
   - members: 전체 회원(profiles) + 각자의 RDOS 상태(none/pending/approved/rejected)
     → 회원 탭에서 일반 회원에게도 RDOS 접근을 직접 부여/차단할 수 있다(연동). */
export async function GET() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isSuperAdminEmail(email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ enrollments: [], members: [] });

  const [{ data: enr }, { data: profiles }] = await Promise.all([
    supabase
      .from("rdos_enrollment")
      .select("user_id, email, status, profile, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, name, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const enrollments = enr ?? [];
  const statusMap = new Map<string, string>();
  enrollments.forEach((e) => statusMap.set(e.user_id as string, e.status as string));

  // 회원 명부 = profiles 기준 + RDOS 상태 병합. profiles 가 비면 enrollment 기반으로라도 채운다.
  type MemberRow = { user_id: string; email: string | null; name: string | null; rdosStatus: string };
  const members: MemberRow[] =
    (profiles ?? []).map((p) => ({
      user_id: p.id as string,
      email: (p.email as string) ?? null,
      name: (p.name as string) ?? null,
      rdosStatus: statusMap.get(p.id as string) ?? "none",
    })) ?? [];

  // profiles 에 없지만 enrollment 만 있는 사용자도 회원 목록에 포함
  const known = new Set(members.map((m) => m.user_id));
  for (const e of enrollments) {
    if (!known.has(e.user_id as string)) {
      members.push({
        user_id: e.user_id as string,
        email: (e.email as string) ?? null,
        name: (e.profile as { name?: string } | null)?.name ?? null,
        rdosStatus: (e.status as string) ?? "none",
      });
    }
  }

  return NextResponse.json({ enrollments, members });
}
