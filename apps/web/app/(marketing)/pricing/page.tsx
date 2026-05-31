"use client";
import { Icon } from "@/components/ui/icon";

import { useState } from "react";
import Link from "next/link";

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PricingPage() {
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  const handleContactSubmit = async () => {
    if (!contactName.trim() || !contactEmail.trim()) return;
    // Send contact form - in production this would hit an API endpoint
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
          type: "university_inquiry",
        }),
      }).catch(() => {});
      setContactSent(true);
      setTimeout(() => {
        setShowContact(false);
        setContactSent(false);
        setContactName("");
        setContactEmail("");
        setContactMessage("");
      }, 3000);
    } catch {
      setContactSent(true);
    }
  };

  const PLANS = [
    {
      key: "free", name: "Free", price: "₩0", period: "",
      desc: "개인 연구자를 위한 무료 플랜",
      features: ["프로젝트 3개", "AI 기본 기능 (본인 API 키)", "로컬 저장 (Local First)", "기본 구조 검증", "논문 크리틱 월 5회"],
      cta: "무료로 시작", ctaLink: "/signup", highlight: false,
    },
    {
      key: "scholar", name: "Scholar", price: "", period: "",
      desc: "본격적인 논문 작성을 위한 스칼라 플랜",
      features: ["무제한 프로젝트", "전체 AI 엔진 해제", "실시간 협업 (CRDT)", "전체 검증 엔진", "인용 자동화 + Zotero 연동", "AI 멘토링 무제한", "우선 기술 지원"],
      cta: "Scholar 시작하기", ctaLink: "/signup", highlight: true,
    },
    {
      key: "university", name: "University", price: "", period: "",
      desc: "대학·연구기관 팀 플랜",
      features: ["무제한 멤버", "교수-학생 권한 체계", "기관 SSO / ORCID", "관리자 대시보드", "전용 온보딩 지원", "SLA 보장"],
      cta: "문의하기", ctaLink: "", highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="pt-28 pb-16 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#a78bfa] mb-3 font-medium">Pricing</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-nanum-myeongjo font-bold mb-5">연구에 맞는 플랜을 선택하세요</h1>
        
      </div>
      <div className="max-w-[1050px] mx-auto px-6 pb-28">
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.key} className={`relative p-7 rounded-[20px] border transition-all duration-300 ${plan.highlight ? "bg-gradient-to-b from-[#4a6cf7]/[0.06] to-[#13161e] border-[#4a6cf7]/25 shadow-2xl shadow-[#4a6cf7]/[0.06] md:scale-[1.03]" : "bg-[#13161e] border-white/[0.04] hover:border-white/[0.08]"}`}>
              {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#4a6cf7] text-[10px] font-semibold text-white tracking-wide shadow-lg shadow-[#4a6cf7]/30">MOST POPULAR</div>}
              <h3 className="text-[20px] font-bold mb-1 mt-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                {plan.price && <span className="text-[32px] font-bold tracking-tight">{plan.price}</span>}
                {plan.period && <span className="text-[13px] text-white/25">{plan.period}</span>}
              </div>
              <p className="text-[13px] text-white/35 mb-6">{plan.desc}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-white/50">
                    <span className="mt-0.5 text-[#5ebd7c] flex-shrink-0"><IconCheck /></span>
                    {feat}
                  </li>
                ))}
              </ul>
              {plan.key === "university" ? (
                <button onClick={() => setShowContact(true)} className="block w-full text-center py-3.5 rounded-[12px] text-[14px] font-medium transition-all duration-200 bg-white/[0.04] hover:bg-white/[0.07] text-white/60 border border-white/[0.06]">
                  {plan.cta}
                </button>
              ) : (
                <Link href={plan.ctaLink} className={`block text-center py-3.5 rounded-[12px] text-[14px] font-medium transition-all duration-200 ${plan.highlight ? "bg-[#4a6cf7] hover:bg-[#5d7dff] text-white shadow-lg shadow-[#4a6cf7]/20 hover:-translate-y-[1px]" : "bg-white/[0.04] hover:bg-white/[0.07] text-white/60 border border-white/[0.06]"}`}>
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={(e) => { if (e.target === e.currentTarget) setShowContact(false); }}>
          <div className="w-full max-w-md p-6 rounded-[18px] bg-[#13161e] border border-white/[0.08] shadow-2xl">
            {contactSent ? (
              <div className="text-center py-8">
                <p className="text-[28px] mb-3"><Icon name="✅" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
                <p className="text-[16px] font-semibold mb-2">문의가 전송되었습니다</p>
                <p className="text-[13px] text-white/40">담당자가 빠르게 연락드리겠습니다.</p>
              </div>
            ) : (
              <>
                <h3 className="text-[18px] font-bold font-nanum-myeongjo mb-1">University 플랜 문의</h3>
                <p className="text-[12px] text-white/30 mb-5">기관 정보를 입력해주시면 담당자가 연락드립니다.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] text-white/30 mb-1">이름 / 기관명</label>
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none" placeholder="홍길동 / 서울대학교" />
                  </div>
                  <div>
                    <label className="block text-[12px] text-white/30 mb-1">이메일</label>
                    <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email"
                      className="w-full px-4 py-2.5 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none" placeholder="email@university.ac.kr" />
                  </div>
                  <div>
                    <label className="block text-[12px] text-white/30 mb-1">문의 내용</label>
                    <textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} rows={3}
                      className="w-full px-4 py-2.5 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none resize-none" placeholder="예상 사용자 수, 필요 기능 등..." />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleContactSubmit} disabled={!contactName.trim() || !contactEmail.trim()}
                      className="flex-1 py-2.5 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[10px] text-[13px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      문의 전송
                    </button>
                    <button onClick={() => setShowContact(false)} className="px-4 py-2.5 bg-white/[0.04] text-white/50 rounded-[10px] text-[13px] border border-white/[0.06]">
                      취소
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
