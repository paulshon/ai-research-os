"use client";

import { useTranslation } from "@/lib/i18n";

export default function TeamPage() {
  const { t } = useTranslation();
  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[27px] font-bold font-nanum-myeongjo">{t("team.title")}</h1>
            <p className="text-[17px] text-white/35 mt-1">{t("team.subtitle")}</p>
          </div>
          <button className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-[10px] text-[16px] font-medium hover:bg-[#5d7dff] transition-colors">{t("team.inviteMember")}</button>
        </div>

        {/* Members List */}
        <div className="p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
          <h2 className="text-[17px] font-semibold mb-4">{t("team.membersCount").replace("{count}", "1")}</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 rounded-[12px] bg-[#1a1e2a]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center text-[17px] font-bold">U</div>
              <div className="flex-1">
                <p className="text-[17px] font-medium">{t("team.you")}</p>
                <p className="text-[14px] text-white/25 font-['JetBrains_Mono',monospace]">{t("team.ownerRole")}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#6c8cff]/10 text-[13px] text-[#6c8cff] font-medium">{t("team.ownerBadge")}</span>
            </div>
          </div>
        </div>

        {/* Invite Section */}
        <div className="mt-6 p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
          <h2 className="text-[17px] font-semibold mb-4">{t("team.inviteSection")}</h2>
          <div className="flex gap-3">
            <input className="flex-1 px-4 py-2.5 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[16px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors" placeholder={t("team.emailPlaceholder")} />
            <select className="px-3 py-2.5 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[16px] text-white/50">
              <option value="editor">{t("team.roleEditor")}</option>
              <option value="commenter">{t("team.roleCommenter")}</option>
              <option value="viewer">{t("team.roleViewer")}</option>
            </select>
            <button className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-[10px] text-[16px] font-medium">{t("team.inviteButton")}</button>
          </div>
          <p className="text-[14px] text-white/20 mt-3">{t("team.inviteLimitNotice")}</p>
        </div>
      </div>
    </div>
  );
}
