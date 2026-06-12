import { Icon } from "@/components/ui/icon";
import Link from "next/link";

export default function BillingPage() {
  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[27px] font-bold font-nanum-myeongjo mb-2">결제 & 구독</h1>
        <p className="text-[17px] text-white/35 mb-8">현재 플랜과 결제 정보를 관리합니다.</p>

        {/* Current Plan */}
        <div className="p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04] mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[19px] font-semibold">현재 플랜</h2>
              <p className="text-[16px] text-white/30 mt-0.5">Free</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/[0.04] text-[15px] text-white/50 border border-white/[0.06]">무료</span>
          </div>
          <div className="space-y-2 text-[16px] text-white/40 mb-5">
            <p>프로젝트 3개 · AI 기본 기능 · 로컬 저장</p>
          </div>
          <button className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-[10px] text-[16px] font-medium hover:bg-[#5d7dff] transition-colors">Pro로 업그레이드</button>
        </div>

        {/* Stripe Integration Notice */}
        <div className="p-6 rounded-[18px] bg-[#1a1e2a] border border-white/[0.04] text-center">
          <p className="text-[16px] text-white/30"><Icon name="💳" className="inline-flex align-[-0.125em] mr-1" size={15} />Stripe 결제 연동은 TASK 4에서 구현됩니다.</p>
        </div>
      </div>
    </div>
  );
}
