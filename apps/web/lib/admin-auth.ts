import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import type { NextRequest } from "next/server";

/* ════════════════════════════════════════════════════════════
   v4: 관리자 인증 보안 강화 (감사보고서 2.3 / 2.4 / Medium 시크릿 폴백)
   ──────────────────────────────────────────────────────────────
   변경점:
   - 하드코딩 운영 비밀번호 폴백 제거 (이전: dev 폴백 비밀번호).
     → 자격은 항상 환경변수(ADMIN_USERNAME / ADMIN_PASSWORD)에서만.
   - 세션 토큰을 고정 상수가 아니라 {uid, exp, nonce} 페이로드에
     HMAC 서명하는 방식으로 재설계 → 만료·사용자 바인딩·재생공격 방지.
   - 서명 시크릿을 ADMIN_API_SECRET 한 가지로 한정(Clerk/Supabase 키
     폴백 제거) → 한 비밀 손상이 다른 영역으로 번지지 않게.
─────────────────────────────────────────────────────────────── */

export const ADMIN_COOKIE = "aros_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8; // 8시간

/** 서명·검증에 쓰는 시크릿(서버 전용, 단일 출처) */
function signingSecret(): string {
  return process.env.ADMIN_API_SECRET || "";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function hmac(secret: string, data: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * 관리자 세션 토큰 발급.
 *  형식: base64url(JSON{uid,exp,nonce}).HMAC(secret, payload)
 *  - uid: 관리자 식별자(슈퍼관리자 이메일 또는 ADMIN_USERNAME)
 *  - exp: 만료 시각(epoch sec)
 *  - nonce: 토큰별 임의값(재발급마다 달라짐)
 * 시크릿 미설정 시 null.
 */
export function makeAdminSessionToken(uid: string, ttlSec: number = ADMIN_SESSION_MAX_AGE): string | null {
  const s = signingSecret();
  if (!s) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = b64url(Buffer.from(JSON.stringify({ uid, exp, nonce: b64url(randomBytes(9)) })));
  return `${payload}.${hmac(s, payload)}`;
}

/** 토큰 검증 → 유효하면 { uid }, 아니면 null. */
export function verifyAdminSessionToken(token: string | undefined | null): { uid: string } | null {
  const s = signingSecret();
  if (!s || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, hmac(s, payload))) return null;
  try {
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (typeof json.exp !== "number" || json.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof json.uid !== "string" || !json.uid) return null;
    return { uid: json.uid };
  } catch {
    return null;
  }
}

/**
 * 요청이 관리자 권한을 가졌는지 검증.
 *  1) 서버-투-서버: x-admin-secret 헤더(또는 ?secret=)가 ADMIN_API_SECRET 과 일치
 *  2) 브라우저: 서명·만료가 유효한 관리자 세션 쿠키
 */
export function isAdminRequest(req: NextRequest): boolean {
  const envSecret = process.env.ADMIN_API_SECRET;
  const provided =
    req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-admin-secret");
  if (envSecret && provided && safeEqual(provided, envSecret)) return true;

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  return verifyAdminSessionToken(token) !== null;
}

/**
 * 관리자 로그인 자격 검증.
 * 자격은 환경변수에서만 읽는다(ADMIN_USERNAME / ADMIN_PASSWORD).
 * 미설정 시 운영·개발 모두 로그인 불가 (하드코딩 폴백 없음).
 * 성공 시 발급에 쓸 uid(=username)를 반환, 실패 시 null.
 */
export function verifyAdminCredentials(username: string, password: string): string | null {
  const USER = process.env.ADMIN_USERNAME || "";
  const PASS = process.env.ADMIN_PASSWORD || "";
  if (!USER || !PASS) return null; // 미설정 → 거부
  return safeEqual(username, USER) && safeEqual(password, PASS) ? USER : null;
}

/**
 * v4: 관리자 권한 종합 검증(비동기).
 *  - 세션 쿠키 / x-admin-secret (isAdminRequest), 또는
 *  - Clerk 로그인 사용자가 슈퍼관리자 이메일이면 허용.
 */
export async function isAdminAuthorized(req: import("next/server").NextRequest): Promise<boolean> {
  if (isAdminRequest(req)) return true;
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const { isSuperAdminEmail } = await import("@/lib/admin-config");
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
    return isSuperAdminEmail(email);
  } catch {
    return false;
  }
}
