import { Icon } from "@/components/ui/icon";
export default function NotificationsPage() {
  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[27px] font-bold font-nanum-myeongjo mb-2">알림</h1>
        <p className="text-[17px] text-white/35 mb-8">프로젝트 활동과 팀 알림을 확인합니다.</p>

        <div className="p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04] text-center py-16">
          <p className="text-[31px] mb-3 opacity-50"><Icon name="🔔" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
          <p className="text-[18px] text-white/40 font-medium mb-1">알림이 없습니다</p>
          <p className="text-[16px] text-white/20">프로젝트 활동, 팀원 초대, AI 검증 결과 등의 알림이 여기에 표시됩니다.</p>
        </div>
      </div>
    </div>
  );
}
