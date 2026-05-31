"use client";
import { Icon } from "@/components/ui/icon";

import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="pt-28 pb-16 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#ec4899] mb-3 font-medium">Contact</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-nanum-myeongjo font-bold mb-5">문의하기</h1>
        <p className="text-white/35 max-w-lg mx-auto">University 플랜, 기술 지원, 제휴 등 무엇이든 물어보세요.</p>
      </div>
      <div className="max-w-lg mx-auto px-6 pb-28">
        {submitted ? (
          <div className="p-8 rounded-[20px] bg-[#13161e] border border-[#5ebd7c]/20 text-center">
            <div className="text-[32px] mb-3"><Icon name="✓" className="inline-flex align-[-0.125em] mr-1" size={15} /></div>
            <h2 className="text-[18px] font-semibold mb-2">전송 완료</h2>
            <p className="text-[13px] text-white/40">빠른 시일 내에 답변 드리겠습니다.</p>
          </div>
        ) : (
          <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.04] space-y-5">
            <div>
              <label className="block text-[12px] text-white/30 mb-2">이름</label>
              <input type="text" className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors" placeholder="홍길동" />
            </div>
            <div>
              <label className="block text-[12px] text-white/30 mb-2">이메일</label>
              <input type="email" className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors" placeholder="email@university.ac.kr" />
            </div>
            <div>
              <label className="block text-[12px] text-white/30 mb-2">문의 유형</label>
              <select className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white/60 focus:border-[#6c8cff] focus:outline-none transition-colors">
                <option>University 플랜 문의</option>
                <option>기술 지원</option>
                <option>제휴 / 파트너십</option>
                <option>기타</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-white/30 mb-2">메시지</label>
              <textarea rows={5} className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors resize-none" placeholder="문의 내용을 입력해 주세요..." />
            </div>
            <button onClick={() => setSubmitted(true)} className="w-full py-3.5 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[14px] font-medium transition-all shadow-lg shadow-[#4a6cf7]/20">전송하기</button>
          </div>
        )}
      </div>
    </div>
  );
}
