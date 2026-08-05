"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [wsName, setWsName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const router = useRouter();

  const STEPS = [
    { title: t("authPages.onboarding.step1Title"), desc: t("authPages.onboarding.step1Desc") },
    { title: t("authPages.onboarding.step2Title"), desc: t("authPages.onboarding.step2Desc") },
    { title: t("authPages.onboarding.step3Title"), desc: t("authPages.onboarding.step3Desc") },
    { title: t("authPages.onboarding.step4Title"), desc: t("authPages.onboarding.step4Desc") },
  ];

  // 온보딩 진입 시 Clerk → Supabase 프로필 동기화(가입 시 선택한 플랜 반영)
  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plan");
    fetch("/api/profile/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    }).catch(() => {});
  }, []);

  const next = () => {
    if (step < 3) setStep(step + 1);
    else router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] flex items-center justify-center px-6 font-nanum-gothic">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[#4a6cf7]" : "bg-white/[0.06]"}`} />
          ))}
        </div>

        <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.04]">
          <p className="text-[11px] text-white/25 font-['JetBrains_Mono',monospace] mb-2">{t("authPages.onboarding.stepLabel")} {step + 1}/4</p>
          <h2 className="text-[22px] font-bold mb-2 font-nanum-myeongjo">{STEPS[step].title}</h2>
          <p className="text-[14px] text-white/40 mb-8">{STEPS[step].desc}</p>

          {step === 0 && (
            <div className="space-y-4 text-[13px] text-white/40">
              <p>{t("authPages.onboarding.featuresIntro")}</p>
              <ul className="space-y-2">
                {[
                  t("authPages.onboarding.featureStructure"),
                  t("authPages.onboarding.featureCrdt"),
                  t("authPages.onboarding.featureValidation"),
                  t("authPages.onboarding.featureCitation"),
                  t("authPages.onboarding.featureLocalFirst"),
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5ebd7c]" />{f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 1 && (
            <div>
              <label className="block text-[12px] text-white/30 mb-2">{t("authPages.onboarding.workspaceNameLabel")}</label>
              <input value={wsName} onChange={(e) => setWsName(e.target.value)} className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors" placeholder={t("authPages.onboarding.workspaceNamePlaceholder")} />
              <p className="text-[12px] text-white/20 mt-3">{t("authPages.onboarding.workspaceNameHint")}</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="block text-[12px] text-white/30 mb-2">{t("authPages.onboarding.apiKeyLabel")}</label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]" placeholder="AIza..." />
              <p className="text-[12px] text-white/20 mt-3">
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-[#6c8cff] hover:underline">{t("authPages.onboarding.apiKeyLinkText")}</a>
                {t("authPages.onboarding.apiKeyHintSuffix")}
              </p>
              <button onClick={next} className="mt-4 px-4 py-2 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/40 hover:text-white/60 transition-colors">{t("authPages.onboarding.apiKeySkip")}</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-[13px] text-white/40">
              <p>{t("authPages.onboarding.readyIntro")}</p>
              <div className="p-4 rounded-[12px] bg-[#1a1e2a] border border-white/[0.04]">
                <p className="text-[12px] text-white/25 mb-2">{t("authPages.onboarding.recommendedTitle")}</p>
                <ol className="space-y-1.5 list-decimal list-inside text-[13px]">
                  <li>{t("authPages.onboarding.recommendedStep1")}</li>
                  <li>{t("authPages.onboarding.recommendedStep2")}</li>
                  <li>{t("authPages.onboarding.recommendedStep3")}</li>
                </ol>
              </div>
            </div>
          )}

          <button onClick={next} className="w-full mt-8 py-3.5 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[14px] font-medium transition-all shadow-lg shadow-[#4a6cf7]/20">
            {step === 3 ? t("authPages.onboarding.goToDashboard") : t("authPages.onboarding.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
