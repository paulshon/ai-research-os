import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/admin-auth";

/* 관리자 — 회원 명부.
   v62: Clerk 를 회원 명부의 단일 진실원본(source of truth)으로 삼아,
        Supabase profiles 와 병합하여 반환한다. Clerk 에는 있으나 Supabase 에 없는
        회원은 즉시 백필(upsert)하여 두 명부의 불일치를 해소한다.
   인증: 관리자 세션 쿠키 또는 x-admin-secret 헤더. */

function planToTier(plan?: string | null): "free" | "scholar" | "university" {
  if (plan === "pro" || plan === "scholar") return "scholar";
  if (plan === "university") return "university";
  return "free";
}

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthorized(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // 1) Supabase 프로필 전부 → id 맵
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email, plan, role, is_special_member, approval_status, created_at, avatar_url");
  const profMap = new Map<string, Record<string, unknown>>();
  (profiles ?? []).forEach((p) => profMap.set(p.id as string, p as Record<string, unknown>));

  // 2) Clerk 사용자 전부 (페이지네이션)
  type Member = {
    id: string;
    name: string;
    email: string;
    is_special_member: boolean;
    approval_status: string;
    membership_tier: "free" | "scholar" | "university";
    created_at: string;
    source: "clerk+supabase" | "clerk-only" | "supabase-only";
  };
  const members: Member[] = [];
  const seen = new Set<string>();
  const toBackfill: Record<string, unknown>[] = [];

  let clerkOk = true;
  try {
    const client = await clerkClient();
    const limit = 100;
    let offset = 0;
    for (let page = 0; page < 100; page++) {
      const res = await client.users.getUserList({ limit, offset });
      const users = res.data ?? [];
      if (users.length === 0) break;

      for (const u of users) {
        seen.add(u.id);
        const prof = profMap.get(u.id);
        const email =
          u.emailAddresses?.[0]?.emailAddress ?? (prof?.email as string) ?? "";
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.username ||
          (prof?.name as string) ||
          "연구자";
        const createdAt = prof?.created_at
          ? String(prof.created_at)
          : new Date(u.createdAt ?? Date.now()).toISOString();

        if (!prof) {
          // Clerk 에만 있는 회원 → Supabase 로 백필(승인 대기)
          toBackfill.push({
            id: u.id,
            email: email || null,
            name,
            avatar_url: u.imageUrl ?? null,
            role: "student",
            plan: "free",
            approval_status: "pending",
            updated_at: new Date().toISOString(),
          });
        }

        members.push({
          id: u.id,
          name,
          email,
          is_special_member: (prof?.is_special_member as boolean) ?? false,
          approval_status: (prof?.approval_status as string) ?? "pending",
          membership_tier: planToTier(prof?.plan as string | undefined),
          created_at: createdAt,
          source: prof ? "clerk+supabase" : "clerk-only",
        });
      }
      if (users.length < limit) break;
      offset += limit;
    }
  } catch {
    clerkOk = false;
  }

  // 누락 프로필 백필 (불일치 해소)
  if (toBackfill.length > 0) {
    await supabase.from("profiles").upsert(toBackfill, { onConflict: "id" });
  }

  // 3) Supabase 에만 있는(=Clerk 에서 삭제된) 프로필도 표시 — 명부 완전성
  (profiles ?? []).forEach((p) => {
    const id = p.id as string;
    if (clerkOk && seen.has(id)) return;
    members.push({
      id,
      name: (p.name as string) || "연구자",
      email: (p.email as string) || "",
      is_special_member: (p.is_special_member as boolean) ?? false,
      approval_status: (p.approval_status as string) ?? "pending",
      membership_tier: planToTier(p.plan as string | undefined),
      created_at: String(p.created_at ?? new Date().toISOString()),
      source: clerkOk ? "supabase-only" : "supabase-only",
    });
  });

  // 최신 가입순
  members.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json(members);
}
