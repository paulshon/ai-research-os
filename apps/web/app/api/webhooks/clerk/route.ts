import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";
import { isSpecialMemberName } from "@/lib/membership";

/**
 * Clerk Webhook — 회원가입 시 Supabase profiles 등록 + 운영자 승인 대기
 * 신규 가입자는 approval_status=pending (기존 회원은 DB 마이그레이션으로 approved)
 */
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
  }

  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let evt: {
    type: string;
    data: {
      id: string;
      email_addresses?: { email_address: string }[];
      first_name?: string | null;
      last_name?: string | null;
      image_url?: string | null;
    };
  };
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof evt;
  } catch (err) {
    console.error("[Clerk Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = evt.type;
  console.log(`[Clerk Webhook] Received event: ${eventType}`);

  // v4(감사 Medium): user.deleted 처리 — 회원 삭제 시 Supabase profiles 정리.
  if (eventType === "user.deleted") {
    const supabase = getServiceSupabase();
    if (supabase && evt.data?.id) {
      const { error } = await supabase.from("profiles").delete().eq("id", evt.data.id);
      if (error) {
        console.error("[Clerk Webhook] profile delete failed:", error.message);
        return NextResponse.json({ error: "Profile delete failed" }, { status: 500 });
      }
      console.log(`[Clerk Webhook] Profile deleted for user ${evt.data.id}`);
    }
    return NextResponse.json({ ok: true });
  }

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address || "";
    const name = `${first_name || ""} ${last_name || ""}`.trim() || "연구자";
    const special = isSpecialMemberName(name);

    const supabase = getServiceSupabase();
    if (!supabase) {
      console.error("[Clerk Webhook] SUPABASE_SERVICE_ROLE_KEY not configured");
      return NextResponse.json(
        { error: "Supabase service role not configured" },
        { status: 500 }
      );
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("approval_status")
      .eq("id", id)
      .maybeSingle();

    const profileData: Record<string, unknown> = {
      id,
      email,
      name,
      avatar_url: image_url || null,
      updated_at: new Date().toISOString(),
      is_special_member: special,
    };

    if (eventType === "user.created") {
      Object.assign(profileData, {
        role: "student",
        plan: "free",
        gemini_model: "gemini-2.5-flash",
        language: "ko",
        theme: "dark",
        approval_status: "pending",
      });
    } else if (existing && !existing.approval_status) {
      profileData.approval_status = "pending";
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" })
      .select();

    if (error) {
      console.error("[Clerk Webhook] Supabase upsert failed:", error);
      return NextResponse.json(
        { error: "Profile upsert failed", detail: error.message },
        { status: 500 }
      );
    }

    const approvalStatus =
      (data?.[0] as { approval_status?: string } | undefined)?.approval_status ??
      (eventType === "user.created" ? "pending" : "approved");

    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(id, {
        publicMetadata: {
          approvalStatus,
          isSpecialMember: special,
        },
      });
    } catch (metaErr) {
      console.warn("[Clerk Webhook] Clerk metadata update failed:", metaErr);
    }

    console.log(`[Clerk Webhook] Profile upserted for user ${id}:`, data);
  }

  return NextResponse.json({ ok: true });
}
