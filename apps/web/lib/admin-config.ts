/* ════════════════════════════════════════════════════════════
   슈퍼관리자(super-admin) 지정 (v6)
   - 내장 기본 슈퍼관리자 + 환경변수(SUPER_ADMIN_EMAILS) 병합.
   - 내장 기본값은 소스에 평문으로 노출하지 않도록 base64 로 가린다(***).
     (브라우저·Node 모두 atob 사용 가능 → 동기 판정 유지)
   - 추가 슈퍼관리자는 SUPER_ADMIN_EMAILS / NEXT_PUBLIC_SUPER_ADMIN_EMAILS 로
     코드 수정 없이 부여/회전 가능.
═══════════════════════════════════════════════════════════════ */

// 내장 기본 슈퍼관리자(소스 평문 비노출). 필요 시 env 로 교체/추가 가능.
const BUILT_IN_SUPER_ADMINS_B64: string[] = ["c2FyYW5ncmVkNzc3QGdtYWlsLmNvbQ=="];

function decode(b64: string): string {
  try {
    if (typeof atob === "function") return atob(b64);
    // Node 폴백
    return Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function fromEnv(v?: string | null): string[] {
  return (v || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const SUPER_ADMIN_EMAILS: string[] = Array.from(
  new Set([
    ...BUILT_IN_SUPER_ADMINS_B64.map((b) => decode(b).trim().toLowerCase()).filter(Boolean),
    ...fromEnv(process.env.SUPER_ADMIN_EMAILS),
    ...fromEnv(process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS),
  ])
);

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** 전체 마스킹 표시용: 이메일을 a***@domain 형태로 가린다(UI 표시 보조). */
export function maskEmail(email?: string | null): string {
  if (!email) return "";
  const [u, d] = email.split("@");
  if (!d) return "***";
  return `${u.slice(0, 1)}***@${d}`;
}
