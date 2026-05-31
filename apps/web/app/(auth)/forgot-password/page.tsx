"use client";
import { Icon } from "@/components/ui/icon";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !email.trim()) return;
    setLoading(true);
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setSent(true);
      // 인증 코드 입력 페이지로 이동 (mode=reset, 이메일 전달)
      router.push(`/verify-email?mode=reset&email=${encodeURIComponent(email.trim())}`);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; longMessage?: string }[] };
      const msg = clerkErr?.errors?.[0]?.longMessage ?? clerkErr?.errors?.[0]?.message;
      if (msg?.includes("not found") || msg?.includes("No user")) {
        setError("입력하신 이메일로 가입된 계정이 없습니다.");
      } else {
        setError(msg ?? "오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6 font-nanum-gothic">
        <div className="w-full max-w-sm text-center">
          <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.06] shadow-2xl">
            <div className="text-4xl mb-4"><Icon name="📨" className="inline-flex align-[-0.125em] mr-1" size={15} /></div>
            <h2 className="text-[18px] font-bold font-nanum-myeongjo text-[#e8eaf0] mb-2">이메일 발송 완료</h2>
            <p className="text-[13px] text-[#9ba3b8]">재설정 코드를 확인 중입니다…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6 font-nanum-gothic">
      <div className="w-full max-w-sm">
        <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.06] shadow-2xl">

          {/* 아이콘 */}
          <div className="w-12 h-12 rounded-2xl bg-[#e8b84b]/10 border border-[#e8b84b]/20 flex items-center justify-center text-2xl mb-6 mx-auto">
            <Icon name="🔑" className="inline-flex align-[-0.125em] mr-1" size={15} />
          </div>

          <h1 className="text-[20px] font-bold font-nanum-myeongjo text-[#e8eaf0] text-center mb-2">
            비밀번호 재설정
          </h1>
          <p className="text-[13px] text-[#9ba3b8] text-center mb-6">
            가입한 이메일 주소를 입력하면 재설정 코드를 보내드립니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] text-[#9ba3b8] mb-1.5">이메일 주소</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-[10px] bg-[#1a1e2a] border border-white/[0.10] text-[#e8eaf0] text-[14px] placeholder:text-[#626880] outline-none focus:border-[#4a6cf7] focus:ring-2 focus:ring-[#4a6cf7]/20 transition-all"
                autoFocus
                required
              />
            </div>

            {error && (
              <p className="text-[12px] text-[#ff7066] bg-[#ff7066]/10 rounded-[8px] py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className={`w-full py-3 rounded-[10px] text-[14px] font-semibold transition-all ${
                email.trim() && !loading
                  ? "bg-[#4a6cf7] hover:bg-[#5d7dff] text-white shadow-lg shadow-[#4a6cf7]/20"
                  : "bg-[#1a1e2a] text-white/20 cursor-not-allowed border border-white/[0.06]"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  전송 중…
                </span>
              ) : (
                "재설정 코드 전송"
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="text-[12px] text-[#626880] hover:text-[#9ba3b8] transition-colors"
            >
              ← 로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
