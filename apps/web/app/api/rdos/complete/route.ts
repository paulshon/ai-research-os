import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";

/** 레슨 완료 기록 → rdos_progress 갱신 (커널 도출의 입력) */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { menuKey, lessonsDone } = await req.json().catch(() => ({}));
  if (!menuKey || typeof lessonsDone !== "number") {
    return NextResponse.json({ error: "menuKey, lessonsDone 필요" }, { status: 400 });
  }
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const { error } = await supabase.from("rdos_progress").upsert(
    { user_id: userId, menu_key: menuKey, lessons_done: lessonsDone, updated_at: new Date().toISOString() },
    { onConflict: "user_id,menu_key" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, persisted: true });
}
