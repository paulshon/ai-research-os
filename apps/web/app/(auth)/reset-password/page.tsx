"use client";
import { Icon } from "@/components/ui/icon";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  /* 비밀번호 강도 */
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ["", "약함", "보통", "강함", "매우 강함"][strength];
  const strengthColor = ["", "#ff7066", "#e8b84b", "#5ebd7c", "#3ecfb2"][strength];

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !code) { setError("유효하지 않은 재설정 링크입니다. 다시 시도해주세요."); return; }
    if (password.length < 8) { setError("비밀번호는 최소 8자 이상이어야 합니다."); return; }
    if (password !== confirm) { setError("비밀번호가 일치하지 않습니다."); return; }

    setLoading(true);
    setError("");

    try {
      const result = await signIn!.resetPassword({ password });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("비밀번호 재설정에 실패했습니다. 처음부터 다시 시도해주세요.");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; longMessage?: string }[] };
      const msg = clerkErr?.errors?.[0]?.longMessage ?? clerkErr?.errors?.[0]?.message;
      setError(msg ?? "오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6 font-nanum-gothic">
      <div className="w-full max-w-sm">
        <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.06] shadow-2xl">

          <div className="w-12 h-12 rounded-2xl bg-[#5ebd7c]/10 border border-[#5ebd7c]/20 flex items-center justify-center text-2xl mb-6 mx-auto">
            <Icon name="🔐" className="inline-flex align-[-0.125em] mr-1" size={15} />
          </div>

          <h1 className="text-[20px] font-bold font-nanum-myeongjo text-[#e8eaf0] text-center mb-2">
            새 비밀번호 설정
          </h1>
          <p className="text-[13px] text-[#9ba3b8] text-center mb-6">
            안전한 새 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={handleReset} className="space-y-4">
            {/* 새 비밀번호 */}
            <div>
              <label className="block text-[12px] text-[#9ba3b8] mb-1.5">새 비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="최소 8자 이상"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-[10px] bg-[#1a1e2a] border border-white/[0.10] text-[#e8eaf0] text-[14px] placeholder:text-[#626880] outline-none focus:border-[#4a6cf7] focus:ring-2 focus:ring-[#4a6cf7]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#626880] hover:text-[#9ba3b8] text-[13px] transition-colors"
                >
                  {showPw ? "숨김" : "보기"}
                </button>
              </div>
              {/* 강도 바 */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{ backgroundColor: i <= strength ? strengthColor : "rgba(255,255,255,0.07)" }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px]" style={{ color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block text-[12px] text-[#9ba3b8] mb-1.5">비밀번호 확인</label>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                placeholder="비밀번호를 다시 입력"
                className={`w-full px-3.5 py-2.5 rounded-[10px] bg-[#1a1e2a] border text-[#e8eaf0] text-[14px] placeholder:text-[#626880] outline-none focus:ring-2 transition-all ${
                  confirm && password !== confirm
                    ? "border-[#ff7066]/60 focus:border-[#ff7066] focus:ring-[#ff7066]/20"
                    : confirm && password === confirm
                    ? "border-[#5ebd7c]/60 focus:border-[#5ebd7c] focus:ring-[#5ebd7c]/20"
                    : "border-white/[0.10] focus:border-[#4a6cf7] focus:ring-[#4a6cf7]/20"
                }`}
                required
              />
              {confirm && password !== confirm && (
                <p className="text-[11px] text-[#ff7066] mt-1">비밀번호가 일치하지 않습니다.</p>
              )}
              {confirm && password === confirm && (
                <p className="text-[11px] text-[#5ebd7c] mt-1"><Icon name="✓" className="inline-flex align-[-0.125em] mr-1" size={15} />비밀번호가 일치합니다.</p>
              )}
            </div>

            {error && (
              <p className="text-[12px] text-[#ff7066] bg-[#ff7066]/10 rounded-[8px] py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password || password !== confirm}
              className={`w-full py-3 rounded-[10px] text-[14px] font-semibold transition-all ${
                password && password === confirm && !loading
                  ? "bg-[#4a6cf7] hover:bg-[#5d7dff] text-white shadow-lg shadow-[#4a6cf7]/20"
                  : "bg-[#1a1e2a] text-white/20 cursor-not-allowed border border-white/[0.06]"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  변경 중…
                </span>
              ) : (
                "비밀번호 변경 완료"
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
