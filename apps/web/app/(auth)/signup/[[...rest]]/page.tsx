import { SignUp } from "@clerk/nextjs";
import { MEMBERSHIP_NOTICE } from "@/lib/membership";

const PLANS: Record<string, string> = {
  free: "FREE", basic: "BASIC", pro: "PRO", university: "University",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const sp = await searchParams;
  const plan = sp?.plan && PLANS[sp.plan] ? sp.plan : null;
  const redirect = plan ? `/onboarding?plan=${plan}` : "/onboarding";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0f14] px-6 py-10">
      <div className="w-full max-w-md p-4 rounded-[14px] bg-[#1a1e2a] border border-[#e8b84b]/20 mb-4">
        <p className="text-[11px] text-[#e8b84b] font-medium mb-1">공지</p>
        <p className="text-[13px] text-white/60 leading-relaxed">
          {MEMBERSHIP_NOTICE} 회원가입은 운영자의 승인 후 최종 완료됩니다.
        </p>
        {plan && (
          <p className="text-[12px] text-[#6c8cff] mt-2">
            선택한 플랜: <span className="font-semibold">{PLANS[plan]}</span>
          </p>
        )}
      </div>
      <SignUp
        path="/signup"
        routing="path"
        signInUrl="/login"
        forceRedirectUrl={redirect}
        fallbackRedirectUrl={redirect}
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#13161e] border border-white/[0.06] shadow-2xl rounded-[20px]",
            headerTitle: "text-[#e8eaf0]",
            headerSubtitle: "text-[#9ba3b8]",
            socialButtonsBlockButton:
              "bg-[#1a1e2a] border border-white/[0.10] text-[#e8eaf0] hover:bg-[#222637] hover:border-white/[0.18]",
            socialButtonsBlockButtonText: "text-[#e8eaf0] font-medium",
            socialButtonsBlockButtonArrow: "text-[#e8eaf0]",
            dividerLine: "bg-white/[0.07]",
            dividerText: "text-[#626880]",
            formFieldLabel: "text-[#9ba3b8]",
            formFieldInput:
              "bg-[#1a1e2a] border-white/[0.10] text-[#e8eaf0] placeholder:text-[#626880] focus:border-[#4a6cf7] focus:ring-[#4a6cf7]/20",
            formFieldInputShowPasswordButton: "text-[#9ba3b8] hover:text-[#e8eaf0]",
            formButtonPrimary: "bg-[#4a6cf7] hover:bg-[#5d7dff] text-white font-semibold",
            footerActionLink: "text-[#4a6cf7] hover:text-[#6c8cff]",
            footerActionText: "text-[#9ba3b8]",
            formFieldErrorText: "text-[#ff7066]",
            alertText: "text-[#ff7066]",
            otpCodeFieldInput:
              "bg-[#1a1e2a] border-white/[0.10] text-[#e8eaf0] focus:border-[#4a6cf7]",
            identityPreviewText: "text-[#e8eaf0]",
            identityPreviewEditButton: "text-[#4a6cf7] hover:text-[#6c8cff]",
            formResendCodeLink: "text-[#4a6cf7] hover:text-[#6c8cff]",
          },
        }}
      />
    </div>
  );
}
