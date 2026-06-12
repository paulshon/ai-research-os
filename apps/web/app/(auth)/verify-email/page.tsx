"use client";
import { Icon } from "@/components/ui/icon";

import { useSignUp, useSignIn } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
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
    if (fullCode.length < 6) { setError("6자리 인증 코드를 모두 입력해주세요."); return; }
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
          setError("인증에 실패했습니다. 코드를 다시 확인해주세요.");
        }
      } else if (mode === "reset" && signInLoaded && signIn) {
        const result = await signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code: fullCode,
        });
        if (result.status === "needs_new_password") {
          router.push(`/reset-password?code=${fullCode}`);
        } else {
          setError("인증 코드가 올바르지 않습니다.");
        }
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; code?: string }[] };
      const errMsg = clerkErr?.errors?.[0]?.message ?? "오류가 발생했습니다. 다시 시도해주세요.";
      const errCode = clerkErr?.errors?.[0]?.code ?? "";
      
      // Handle specific Clerk error codes
      if (errCode === "form_code_incorrect") {
        setError("인증 코드가 올바르지 않습니다. 다시 확인해주세요.");
      } else if (errCode === "verification_expired") {
        setError("인증 코드가 만료되었습니다. 코드를 재전송해주세요.");
      } else if (errCode === "verification_failed") {
        setError("인증에 실패했습니다. 새 코드를 요청해주세요.");
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
      setError(clerkErr?.errors?.[0]?.message ?? "재전송 중 오류가 발생했습니다.");
    }
  }

  const isComplete = code.every((d) => d !== "");
  const title = mode === "reset" ? "비밀번호 재설정" : "이메일 인증";
  const subtitle =
    mode === "reset"
      ? "비밀번호 재설정 코드를 이메일로 보내드렸습니다."
      : "회원가입 확인 코드를 이메일로 보내드렸습니다.";

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
              새 코드가 이메일로 발송되었습니다.
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
                인증 중…
              </span>
            ) : (
              mode === "reset" ? "인증 후 비밀번호 재설정" : "이메일 인증 완료"
            )}
          </button>

          {/* 재전송 + 뒤로가기 */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => router.push(mode === "reset" ? "/forgot-password" : "/signup")}
              className="text-[12px] text-[#626880] hover:text-[#9ba3b8] transition-colors"
            >
              ← 돌아가기
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
              {resendCooldown > 0 ? `재전송 (${resendCooldown}s)` : "코드 재전송"}
            </button>
          </div>

        </div>

        {/* 하단 안내 */}
        <p className="text-[11px] text-[#626880] text-center mt-4">
          이메일이 오지 않으면 스팸 폴더를 확인해주세요.
        </p>
      </div>
    </div>
  );
}
