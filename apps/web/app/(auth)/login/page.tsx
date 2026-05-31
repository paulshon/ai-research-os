import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-6">
      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/signup"
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            /* 카드 */
            card: "bg-[#13161e] border border-white/[0.06] shadow-2xl rounded-[20px]",
            /* 헤더 */
            headerTitle: "text-[#e8eaf0]",
            headerSubtitle: "text-[#9ba3b8]",
            /* 소셜 버튼 – 텍스트 안 보임 핵심 수정 */
            socialButtonsBlockButton:
              "bg-[#1a1e2a] border border-white/[0.10] text-[#e8eaf0] hover:bg-[#222637] hover:border-white/[0.18]",
            socialButtonsBlockButtonText: "text-[#e8eaf0] font-medium",
            socialButtonsBlockButtonArrow: "text-[#e8eaf0]",
            /* 구분선 */
            dividerLine: "bg-white/[0.07]",
            dividerText: "text-[#626880]",
            /* 폼 레이블 */
            formFieldLabel: "text-[#9ba3b8]",
            /* 입력창 */
            formFieldInput:
              "bg-[#1a1e2a] border-white/[0.10] text-[#e8eaf0] placeholder:text-[#626880] focus:border-[#4a6cf7] focus:ring-[#4a6cf7]/20",
            formFieldInputShowPasswordButton: "text-[#9ba3b8] hover:text-[#e8eaf0]",
            /* 기본 버튼 */
            formButtonPrimary:
              "bg-[#4a6cf7] hover:bg-[#5d7dff] text-white font-semibold",
            /* 링크 / 하단 텍스트 */
            footerActionLink: "text-[#4a6cf7] hover:text-[#6c8cff]",
            footerActionText: "text-[#9ba3b8]",
            /* 에러 */
            formFieldErrorText: "text-[#ff7066]",
            alertText: "text-[#ff7066]",
            /* OTP 입력 */
            otpCodeFieldInput:
              "bg-[#1a1e2a] border-white/[0.10] text-[#e8eaf0] focus:border-[#4a6cf7]",
            /* 이메일 미리보기 */
            identityPreviewText: "text-[#e8eaf0]",
            identityPreviewEditButton: "text-[#4a6cf7] hover:text-[#6c8cff]",
            /* 재전송 링크 */
            formResendCodeLink: "text-[#4a6cf7] hover:text-[#6c8cff]",
          },
        }}
      />
    </div>
  );
}
