"use client";

import { SignUp } from "@clerk/nextjs";
import { use } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { hasClerk } from "@/hooks/use-safe-clerk";

const PLANS: Record<string, string> = {
  free: "FREE", basic: "BASIC", pro: "PRO", university: "University",
};

/* v15: Clerk 키 미설정(오프라인 로컬 모드)이면 <SignUp>이 throw → 로컬 모드 안내로 폴백 */
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

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { t } = useTranslation();
  const sp = use(searchParams);
  const plan = sp?.plan && PLANS[sp.plan] ? sp.plan : null;
  const redirect = plan ? `/onboarding?plan=${plan}` : "/onboarding";

  if (!hasClerk) return <LocalModeNotice />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0f14] px-6 py-10">
      <div className="w-full max-w-md p-4 rounded-[14px] bg-[#1a1e2a] border border-[#e8b84b]/20 mb-4">
        <p className="text-[11px] text-[#e8b84b] font-medium mb-1">{t("authPages.signup.noticeLabel")}</p>
        <p className="text-[13px] text-white/60 leading-relaxed">
          {t("common.membershipNotice")} {t("authPages.signup.noticeSuffix")}
        </p>
        {plan && (
          <p className="text-[12px] text-[#6c8cff] mt-2">
            {t("authPages.signup.selectedPlan")} <span className="font-semibold">{PLANS[plan]}</span>
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
