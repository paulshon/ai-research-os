"use client";

import { hasClerk } from "@/hooks/use-safe-clerk";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";

import { useSignUp, useSignIn } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

function VerifyEmailPageInner() {
  const { t } = useTranslation();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "signup"; // "signup" | "reset"
  const emailParam = searchParams.get("email") ?? "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* 재전송 쿨다운 타이머 */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  /* OTP 입력 핸들러 */
  function handleDigit(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setError("");
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const next = [...code];
    digits.split("").forEach((d, i) => { next[i] = d; });
    setCode(next);
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  }

  /* 인증 제출 */
  async function handleVerify() {
    const fullCode = code.join("");
    if (fullCode.length < 6) { setError(t("authPages.verifyEmail.errorIncompleteCode")); return; }
    setLoading(true);
    setError("");

    try {
      if (mode === "signup" && signUpLoaded && signUp) {
        const result = await signUp.attemptEmailAddressVerification({ code: fullCode });
        if (result.status === "complete") {
          // Set active session before navigating - this is critical for Clerk
          if (result.createdSessionId) {
            await (signUp as any).setActive?.({ session: result.createdSessionId });
          }
          // Small delay to allow session to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.href = "/onboarding";
        } else {
          setError(t("authPages.verifyEmail.errorVerifyFailed"));
        }
      } else if (mode === "reset" && signInLoaded && signIn) {
        const result = await signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code: fullCode,
        });
        if (result.status === "needs_new_password") {
          router.push(`/reset-password?code=${fullCode}`);
        } else {
          setError(t("authPages.verifyEmail.errorInvalidResetCode"));
        }
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; code?: string }[] };
      const errMsg = clerkErr?.errors?.[0]?.message ?? t("authPages.verifyEmail.errorGeneric");
      const errCode = clerkErr?.errors?.[0]?.code ?? "";

      // Handle specific Clerk error codes
      if (errCode === "form_code_incorrect") {
        setError(t("authPages.verifyEmail.errorCodeIncorrect"));
      } else if (errCode === "verification_expired") {
        setError(t("authPages.verifyEmail.errorCodeExpired"));
      } else if (errCode === "verification_failed") {
        setError(t("authPages.verifyEmail.errorVerificationFailed"));
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  /* 재전송 */
  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    setResendSuccess(false);
    try {
      if (mode === "signup" && signUpLoaded && signUp) {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      } else if (mode === "reset" && signInLoaded && signIn) {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: emailParam,
        });
      }
      setResendSuccess(true);
      setResendCooldown(60);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr?.errors?.[0]?.message ?? t("authPages.verifyEmail.errorResendGeneric"));
    }
  }

  const isComplete = code.every((d) => d !== "");
  const title = mode === "reset" ? t("authPages.verifyEmail.titleReset") : t("authPages.verifyEmail.titleSignup");
  const subtitle =
    mode === "reset"
      ? t("authPages.verifyEmail.subtitleReset")
      : t("authPages.verifyEmail.subtitleSignup");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6 font-nanum-gothic">
      <div className="w-full max-w-sm">
        <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.06] shadow-2xl">

          {/* 아이콘 */}
          <div className="w-12 h-12 rounded-2xl bg-[#4a6cf7]/10 border border-[#4a6cf7]/20 flex items-center justify-center text-2xl mb-6 mx-auto">
            {mode === "reset" ? <Icon name="key" size={22} /> : <Icon name="mail" size={22} />}
          </div>

          {/* 제목 */}
          <h1 className="text-[20px] font-bold font-nanum-myeongjo text-[#e8eaf0] text-center mb-2">
            {title}
          </h1>
          <p className="text-[13px] text-[#9ba3b8] text-center mb-1">
            {subtitle}
          </p>
          {emailParam && (
            <p className="text-[13px] text-[#6c8cff] text-center mb-6 font-medium">
              {emailParam}
            </p>
          )}
          {!emailParam && <div className="mb-6" />}

          {/* OTP 입력 */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`
                  w-11 h-13 text-center text-[22px] font-bold rounded-[10px]
                  bg-[#1a1e2a] border transition-all outline-none
                  text-[#e8eaf0] caret-[#4a6cf7]
                  ${digit ? "border-[#4a6cf7]/60" : "border-white/[0.10]"}
                  focus:border-[#4a6cf7] focus:ring-2 focus:ring-[#4a6cf7]/20
                  ${error ? "border-[#ff7066]/60" : ""}
                `}
                style={{ height: "52px" }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-[12px] text-[#ff7066] text-center mb-4 bg-[#ff7066]/10 rounded-[8px] py-2 px-3">
              {error}
            </p>
          )}

          {/* 성공 메시지 */}
          {resendSuccess && (
            <p className="text-[12px] text-[#5ebd7c] text-center mb-4 bg-[#5ebd7c]/10 rounded-[8px] py-2 px-3">
              {t("authPages.verifyEmail.resendSuccess")}
            </p>
          )}

          {/* 인증 버튼 */}
          <button
            onClick={handleVerify}
            disabled={!isComplete || loading}
            className={`
              w-full py-3 rounded-[10px] text-[14px] font-semibold transition-all
              ${isComplete && !loading
                ? "bg-[#4a6cf7] hover:bg-[#5d7dff] text-white shadow-lg shadow-[#4a6cf7]/20"
                : "bg-[#1a1e2a] text-white/20 cursor-not-allowed border border-white/[0.06]"
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("authPages.verifyEmail.verifying")}
              </span>
            ) : (
              mode === "reset" ? t("authPages.verifyEmail.submitReset") : t("authPages.verifyEmail.submitSignup")
            )}
          </button>

          {/* 재전송 + 뒤로가기 */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => router.push(mode === "reset" ? "/forgot-password" : "/signup")}
              className="text-[12px] text-[#626880] hover:text-[#9ba3b8] transition-colors"
            >
              {t("authPages.verifyEmail.back")}
            </button>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className={`text-[12px] transition-colors ${
                resendCooldown > 0
                  ? "text-[#626880] cursor-not-allowed"
                  : "text-[#4a6cf7] hover:text-[#6c8cff]"
              }`}
            >
              {resendCooldown > 0 ? t("authPages.verifyEmail.resendCooldown").replace("{s}", String(resendCooldown)) : t("authPages.verifyEmail.resendButton")}
            </button>
          </div>

        </div>

        {/* 하단 안내 */}
        <p className="text-[11px] text-[#626880] text-center mt-4">
          {t("authPages.verifyEmail.footerHint")}
        </p>
      </div>
    </div>
  );
}

/* v15: Clerk 키 미설정(오프라인 로컬 모드)이면 Clerk 훅이 throw → 로컬 모드 안내로 폴백 */
function LocalModeNotice() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6">
      <div className="max-w-[420px] w-full p-8 rounded-[20px] bg-[#13161e] border border-white/[0.06] text-center">
        <h1 className="text-[20px] font-bold text-[#e8eaf0] mb-3">{t("authPages.localMode.title")}</h1>
        <p className="text-[14px] text-white/55 leading-relaxed mb-6">{t("authPages.localMode.desc")}</p>
        <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 rounded-[12px] text-[14px] font-semibold bg-[#4a6cf7] text-white hover:bg-[#5d7dff] transition-all">
          {t("authPages.localMode.enter")}
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  if (!hasClerk) return <LocalModeNotice />;
  return <VerifyEmailPageInner />;
}
