"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";

/* 통합 관리자 허브 (v9) — 슈퍼관리자 전용.
   · 연구자(AI-Research-OS) 관리자 / 연구준비자(RDOS) 관리자 진입
   · 연구자 본페이지(/dashboard) / 연구준비자 본페이지(/rdos) 바로가기 */

const CARDS = [
  { href: "/admin", kind: "admin", title: "AI-Research-OS 관리자", desc: "연구자 플랜 · 회원 승인·등급·퇴출·문의 관리", badge: "👑", color: "#6c8cff" },
  { href: "/rdos/admin", kind: "admin", title: "RDOS 관리자", desc: "연구준비자 플랜 · 가입 승인·회원 접근·미션 승급·메뉴 관리", badge: "👑", color: "#e8b84b" },
  { href: "/dashboard", kind: "go", title: "AI-Research-OS 본페이지", desc: "연구자 플랜 메인 — 논문 작성·문헌·검증 엔진", badge: "→", color: "#6c8cff" },
  { href: "/rdos", kind: "go", title: "RDOS 본페이지", desc: "연구준비자 플랜 메인 — 학습 모듈·지식 코어", badge: "→", color: "#3ecfb2" },
];

export default function ControlHub({ adminName }: { adminName: string }) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="max-w-[920px] mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center gap-3 mb-2">
          <BrandLogo size={34} radius={9} />
          <span className="font-nanum-myeongjo text-[18px] font-semibold">AI Research <span className="text-[#e8b84b]">OS</span> <span className="text-white/40">+ RDOS</span></span>
        </div>
        <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight mt-6">
          <span className="mr-2">👑</span>통합 관리자
        </h1>
        <p className="text-[14px] text-white/50 mt-1.5">
          {adminName}님, 환영합니다. 두 플랜의 관리자 페이지와 본페이지로 한 곳에서 이동할 수 있습니다.
        </p>

        <div className="mt-9 grid sm:grid-cols-2 gap-4">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href}
              className="group relative p-5 rounded-[16px] border transition-all overflow-hidden"
              style={{ background: "#10131a", borderColor: c.color + "33" }}>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `radial-gradient(420px circle at 30% 0%, ${c.color}14, transparent 70%)` }} aria-hidden />
              <div className="relative flex items-start gap-3">
                <span className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[18px] font-bold flex-shrink-0"
                  style={{ background: c.color + "1f", color: c.color }}>{c.badge}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold text-white/90">{c.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: c.color + "1f", color: c.color }}>
                      {c.kind === "admin" ? "관리자" : "바로가기"}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-white/50 mt-1 leading-relaxed">{c.desc}</p>
                </div>
                <span className="text-white/25 group-hover:text-white/60 transition-colors text-[18px] flex-shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-[13px] bg-[#0e1118] border border-white/[0.06]">
          <p className="text-[12px] text-white/45 leading-relaxed">
            이 페이지는 슈퍼관리자 전용입니다. 각 관리자 페이지에서 가입 승인·거부·회원 접근·메뉴 관리를 수행할 수 있으며,
            본페이지 버튼으로 실제 사용자 화면을 바로 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
