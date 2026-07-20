import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  makeAdminSessionToken,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

/* 관리자 로그인 — 자격 검증(서버) 후 서명된 httpOnly 세션 쿠키 발급.
   비밀번호/시크릿은 브라우저로 전달되지 않는다. */
export async function POST(req: NextRequest) {
  // 1차: Clerk 로그인 사용자만 시도 가능
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const username = body.username ?? "";
  const password = body.password ?? "";
  const adminUid = verifyAdminCredentials(username, password);
  if (!adminUid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = makeAdminSessionToken(adminUid);
  if (!token) {
    // ADMIN_API_SECRET 미설정 → 쿠키 서명 불가
    return NextResponse.json({ error: "secret_not_configured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return res;
}

/* 관리자 로그아웃 — 세션 쿠키 제거 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
