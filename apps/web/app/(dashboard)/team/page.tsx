"use client";

export default function TeamPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 font-nanum-gothic">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[24px] font-bold font-nanum-myeongjo">팀 관리</h1>
            <p className="text-[14px] text-white/35 mt-1">워크스페이스 멤버를 초대하고 관리합니다.</p>
          </div>
          <button className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-[10px] text-[13px] font-medium hover:bg-[#5d7dff] transition-colors">멤버 초대</button>
        </div>

        {/* Members List */}
        <div className="p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
          <h2 className="text-[14px] font-semibold mb-4">멤버 ({1}명)</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 rounded-[12px] bg-[#1a1e2a]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center text-[14px] font-bold">U</div>
              <div className="flex-1">
                <p className="text-[14px] font-medium">사용자 (나)</p>
                <p className="text-[11px] text-white/25 font-['JetBrains_Mono',monospace]">owner</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#6c8cff]/10 text-[10px] text-[#6c8cff] font-medium">Owner</span>
            </div>
          </div>
        </div>

        {/* Invite Section */}
        <div className="mt-6 p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
          <h2 className="text-[14px] font-semibold mb-4">초대하기</h2>
          <div className="flex gap-3">
            <input className="flex-1 px-4 py-2.5 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors" placeholder="이메일 주소 입력" />
            <select className="px-3 py-2.5 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white/50">
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-[10px] text-[13px] font-medium">초대</button>
          </div>
          <p className="text-[11px] text-white/20 mt-3">Pro 플랜 이상에서 최대 5명까지 초대할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
