import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { getMembershipProfile } from "@/lib/membership-server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/features",
  "/pricing",
  "/tutorials(.*)",
  "/docs(.*)",
  "/blog(.*)",
  "/contact",
  "/login(.*)",
  "/signup(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password(.*)",
  "/verify-email(.*)",
  "/reset-password(.*)",
  "/pending-approval(.*)",
  "/auth/callback(.*)",
  "/api/webhooks(.*)",
  "/api/auth(.*)",
]);

const isApprovalExempt = createRouteMatcher([
  "/pending-approval(.*)",
  "/control(.*)",
  "/api/membership(.*)",
  "/api/webhooks(.*)",
]);

/* ─────────────────────────────────────────────────────────────
   v40: 로그인·페이지 이동 병목 해소
   ───────────────────────────────────────────────────────────────
   문제: Clerk v6는 publicMetadata를 세션 토큰(sessionClaims)에 기본
   포함하지 않는다. 그래서 기존 미들웨어는 보호 경로로 이동할 때마다
   getMembershipProfile(userId)로 Supabase(미국 리전) DB를 왕복 조회했다.
   → 한국 사용자는 로그인 직후 및 모든 메뉴 이동 시 매번 수백 ms~수 초
     지연을 체감.

   해결(우선순위):
     1) 세션 클레임에서 승인 상태를 읽는다(네트워크 0회).
        - Clerk 대시보드 Session token에 {"metadata":"{{user.public_metadata}}"}
          를 추가하면 이후 DB 조회가 영구히 사라진다(권장).
     2) 없으면 서명된 httpOnly 쿠키 캐시에서 읽는다(네트워크 0회).
        - 사용자 ID에 HMAC으로 바인딩 → 위·변조/타 사용자 재사용 불가.
     3) 둘 다 없을 때만 DB를 1회 조회하고, 결과를 쿠키에 캐싱한다.
        - approved: 30분 캐시 / 그 외: 20초 캐시(승인 즉시 반영 위해 짧게).
   결과: "이동마다 DB 왕복" → "캐시 만료 시 1회"로 감소.
───────────────────────────────────────────────────────────────── */

const APPROVAL_COOKIE = "aros_appr";
const APPROVED_MAX_AGE = 60 * 30; // 30분
const PENDING_MAX_AGE = 20; // 20초

function getCacheSecret(): string {
  return (
    process.env.CLERK_WEBHOOK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

/** userId + status에 HMAC-SHA256 서명(Edge 런타임의 Web Crypto 사용) */
async function signApproval(
  userId: string,
  status: string
): Promise<string | null> {
  const secret = getCacheSecret();
  if (!secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${userId}:${status}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 쿠키에서 승인 상태를 읽고 서명을 검증(현재 인증된 userId 기준) */
async function readApprovalCookie(
  request: NextRequest,
  userId: string
): Promise<string | null> {
  const raw = request.cookies.get(APPROVAL_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx <= 0) return null;
  const status = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = await signApproval(userId, status);
  if (!expected || expected !== sig) return null;
  return status;
}

/** 응답에 서명된 승인 상태 쿠키를 설정 */
async function setApprovalCookie(
  res: NextResponse,
  userId: string,
  status: string
): Promise<void> {
  const sig = await signApproval(userId, status);
  if (!sig) return; // 시크릿 미설정 → 캐시 생략(매번 DB, 단 안전)
  res.cookies.set(APPROVAL_COOKIE, `${status}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: status === "approved" ? APPROVED_MAX_AGE : PENDING_MAX_AGE,
  });
}

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = request.nextUrl;

  if (!isPublicRoute(request) && !userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    userId &&
    (pathname === "/login" ||
      pathname === "/signup" ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (userId && !isPublicRoute(request) && !isApprovalExempt(request)) {
    const claims = sessionClaims as Record<string, unknown> | undefined;

    // 1) 세션 클레임 — 네트워크 0회 (여러 형태 지원)
    const readClaim = (obj: unknown): string | undefined =>
      (obj as { approvalStatus?: string } | undefined)?.approvalStatus;
    let approvalStatus: string | undefined =
      readClaim(claims?.metadata) ??
      readClaim(claims?.publicMetadata) ??
      readClaim(claims?.public_metadata);

    // 2) 서명된 쿠키 캐시 — 네트워크 0회
    if (!approvalStatus) {
      const cached = await readApprovalCookie(request, userId);
      if (cached) approvalStatus = cached;
    }

    // 3) 둘 다 없을 때만 DB 1회 조회 → 쿠키에 캐싱
    let needCache = false;
    if (!approvalStatus) {
      const profile = await getMembershipProfile(userId);
      approvalStatus = profile?.approval_status;
      if (approvalStatus) needCache = true;
    }

    if (approvalStatus && approvalStatus !== "approved") {
      const redirectRes = NextResponse.redirect(
        new URL("/pending-approval", request.url)
      );
      if (needCache) await setApprovalCookie(redirectRes, userId, approvalStatus);
      if (pathname.startsWith("/onboarding")) return redirectRes;
      if (
        !pathname.startsWith("/pending-approval") &&
        !pathname.startsWith("/api/")
      ) {
        return redirectRes;
      }
    }

    if (needCache && approvalStatus) {
      const res = NextResponse.next();
      await setApprovalCookie(res, userId, approvalStatus);
      return res;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
