import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getServiceSupabase, getSupabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/* 랜딩 문의하기 (v8).
   POST {name,email,type,message} → contact_inquiries 저장(공개 제출).
     · 서비스 롤 키가 있으면 service 클라이언트로, 없으면 anon 클라이언트로 저장
       (마이그레이션 0012 의 anon INSERT 정책으로 보장).
   GET  → 관리자(슈퍼관리자 또는 관리자 세션)만 조회.
   PATCH {id,status} → 상태 변경(읽음/완료). */

export async function POST(req: Request) {
  try {
    const { name, email, type, message } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: "이름과 이메일은 필수입니다" }, { status: 400 });
    }
    // 저장 우선순위: service role(RLS 우회) → anon(INSERT 정책 허용)
    const supabase = getServiceSupabase() ?? getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "서버 DB가 설정되지 않았습니다. 관리자에게 문의해 주세요." },
        { status: 503 }
      );
    }
    const { error } = await supabase.from("contact_inquiries").insert({
      name: String(name).slice(0, 200),
      email: String(email).slice(0, 200),
      type: type ? String(type).slice(0, 100) : null,
      message: message ? String(message).slice(0, 5000) : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function authorized(req: NextRequest) {
  // 관리자 세션 쿠키/시크릿 또는 슈퍼관리자 이메일
  if (await isAdminAuthorized(req)) return true;
  const user = await currentUser();
  return isSuperAdminEmail(user?.emailAddresses?.[0]?.emailAddress ?? null);
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ inquiries: [] });
  const { data, error } = await supabase
    .from("contact_inquiries")
    .select("id, name, email, type, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiries: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !["new", "read", "done"].includes(status)) {
    return NextResponse.json({ error: "id 와 유효한 status 필요" }, { status: 400 });
  }
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });
  const { error } = await supabase.from("contact_inquiries").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
