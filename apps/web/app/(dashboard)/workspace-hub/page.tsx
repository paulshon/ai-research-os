"use client";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";

const PROJECTS = [
  { id: "1", title: "AI 윤리와 교육 효과 연구", progress: 65, status: "집필 중", color: "#6c8cff" },
  { id: "2", title: "메타분석: 원격교육 성과", progress: 88, status: "검토 중", color: "#e8b84b" },
  { id: "3", title: "질적 연구: 교사 역량", progress: 22, status: "초안", color: "#3ecfb2" },
];

export default function WorkspaceHubPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 font-nanum-gothic">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] text-white/20 font-mono mb-1">Workspace — AI Research OS</p>
        <h1 className="font-nanum-myeongjo text-[22px] font-bold text-[#e8eaf0] mb-1">워크스페이스</h1>
        <p className="text-[13px] text-white/35 mb-6">프로젝트 관리, 팀 협업, 연구 기억</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PROJECTS.map((p) => (
            <Link key={p.id} href={`/workspace/${p.id}`}
              className="p-4 rounded-[14px] bg-[#13161e] border border-white/[0.04] hover:border-white/[0.08] transition-all"
            >
              <p className="text-[14px] font-semibold text-[#e8eaf0] mb-1">{p.title}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: p.color + "15", color: p.color }}>{p.status}</span>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: p.color }} />
                </div>
                <span className="text-[10px] text-white/25">{p.progress}%</span>
              </div>
            </Link>
          ))}
          <button className="p-4 rounded-[14px] border border-dashed border-white/[0.08] hover:border-white/[0.15] text-white/20 hover:text-white/40 transition-all text-center">
            <span className="text-[24px]">+</span>
            <p className="text-[12px] mt-1">새 프로젝트</p>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[13px] font-semibold text-[#e8eaf0] mb-3"><Icon name="📊" className="inline-flex align-[-0.125em] mr-1" size={15} />Knowledge Graph</p>
            <div className="h-[200px] flex items-center justify-center text-white/15 text-[13px]">
              논문-개념-인용 네트워크 시각화 (준비 중)
            </div>
          </div>
          <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[13px] font-semibold text-[#e8eaf0] mb-3"><Icon name="💡" className="inline-flex align-[-0.125em] mr-1" size={15} />Research Memory</p>
            <div className="h-[200px] flex items-center justify-center text-white/15 text-[13px]">
              아이디어 진화 기록 (준비 중)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
