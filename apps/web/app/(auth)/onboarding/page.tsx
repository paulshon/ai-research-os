"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { title: "환영합니다", desc: "AI Research OS에 오신 것을 환영합니다" },
  { title: "워크스페이스 생성", desc: "연구 프로젝트를 관리할 공간을 만드세요" },
  { title: "Gemini API 연결", desc: "AI 기능을 활성화하세요" },
  { title: "시작하기", desc: "첫 번째 연구 프로젝트를 만들어보세요" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [wsName, setWsName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const router = useRouter();

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
          <p className="text-[11px] text-white/25 font-['JetBrains_Mono',monospace] mb-2">Step {step + 1}/4</p>
          <h2 className="text-[22px] font-bold mb-2 font-nanum-myeongjo">{STEPS[step].title}</h2>
          <p className="text-[14px] text-white/40 mb-8">{STEPS[step].desc}</p>

          {step === 0 && (
            <div className="space-y-4 text-[13px] text-white/40">
              <p>AI Research OS는 다음 기능을 제공합니다:</p>
              <ul className="space-y-2">
                {["AI 기반 논문 구조 설계", "실시간 공동 편집 (CRDT)", "자동 검증 엔진", "인용 관리 시스템", "Local First 파일 저장"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5ebd7c]" />{f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 1 && (
            <div>
              <label className="block text-[12px] text-white/30 mb-2">워크스페이스 이름</label>
              <input value={wsName} onChange={(e) => setWsName(e.target.value)} className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors" placeholder="예: 석사 논문 2026" />
              <p className="text-[12px] text-white/20 mt-3">나중에 팀원을 초대하여 공동 작업할 수 있습니다.</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="block text-[12px] text-white/30 mb-2">Gemini API Key</label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]" placeholder="AIza..." />
              <p className="text-[12px] text-white/20 mt-3">
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-[#6c8cff] hover:underline">Google AI Studio</a>에서 무료로 발급받을 수 있습니다. API 키는 서버를 통해 안전하게 전달됩니다.
              </p>
              <button onClick={next} className="mt-4 px-4 py-2 text-[12px] bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/40 hover:text-white/60 transition-colors">나중에 설정하기</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-[13px] text-white/40">
              <p>준비가 완료되었습니다!</p>
              <div className="p-4 rounded-[12px] bg-[#1a1e2a] border border-white/[0.04]">
                <p className="text-[12px] text-white/25 mb-2">추천 시작 순서:</p>
                <ol className="space-y-1.5 list-decimal list-inside text-[13px]">
                  <li>구조 엔진에서 논문 유형 선택</li>
                  <li>AI 채팅으로 연구 질문 탐색</li>
                  <li>에디터에서 논문 작성 시작</li>
                </ol>
              </div>
            </div>
          )}

          <button onClick={next} className="w-full mt-8 py-3.5 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[14px] font-medium transition-all shadow-lg shadow-[#4a6cf7]/20">
            {step === 3 ? "대시보드로 이동" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
