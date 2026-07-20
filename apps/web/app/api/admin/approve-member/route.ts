import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/admin-auth";

/**
 * 운영자 회원 승인 API
 * 인증: 관리자 세션 쿠키(/api/admin/login) 또는 x-admin-secret 헤더
 * Body: { userId: string, action?: "approve" | "reject" }
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    userId?: string;
    action?: "approve" | "reject";
    membershipTier?: "free" | "scholar" | "university";
  };
  const userId = body.userId;
  const action = body.action ?? "approve";
  const membershipTier = body.membershipTier ?? "free";

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const approvalStatus = action === "approve" ? "approved" : "rejected";
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      approval_status: approvalStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json(
      { error: "Update failed", detail: error.message },
      { status: 500 }
    );
  }

  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { approvalStatus, membershipTier },
    });
  } catch (e) {
    console.warn("[approve-member] Clerk metadata update failed:", e);
  }

  return NextResponse.json({ ok: true, userId, approval_status: approvalStatus });
}
