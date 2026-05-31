import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_API_SECRET;
  const provided =
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("x-admin-secret");

  if (!adminSecret || provided !== adminSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, is_special_member, approval_status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
