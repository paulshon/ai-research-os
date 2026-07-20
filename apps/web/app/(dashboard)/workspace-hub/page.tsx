"use client";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const PROJECTS = [
  { id: "1", titleKey: "workspaceHub.projects.p1.title", statusKey: "workspaceHub.projects.p1.status", progress: 65, color: "#6c8cff" },
  { id: "2", titleKey: "workspaceHub.projects.p2.title", statusKey: "workspaceHub.projects.p2.status", progress: 88, color: "#e8b84b" },
  { id: "3", titleKey: "workspaceHub.projects.p3.title", statusKey: "workspaceHub.projects.p3.status", progress: 22, color: "#3ecfb2" },
];

export default function WorkspaceHubPage() {
  const { t } = useTranslation();
  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <div className="max-w-[1680px] mx-auto">
        <p className="text-[14px] text-white/20 font-mono mb-1">{t("workspaceHub.pageLabel")}</p>
        <h1 className="font-nanum-myeongjo text-[25px] font-bold text-[#e8eaf0] mb-1">{t("workspaceHub.title")}</h1>
        <p className="text-[16px] text-white/35 mb-6">{t("workspaceHub.subtitle")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PROJECTS.map((p) => (
            <Link key={p.id} href={`/workspace/${p.id}`}
              className="p-4 rounded-[14px] bg-[#13161e] border border-white/[0.04] hover:border-white/[0.08] transition-all"
            >
              <p className="text-[17px] font-semibold text-[#e8eaf0] mb-1">{t(p.titleKey)}</p>
              <span className="text-[13px] px-2 py-0.5 rounded-full" style={{ background: p.color + "15", color: p.color }}>{t(p.statusKey)}</span>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: p.color }} />
                </div>
                <span className="text-[13px] text-white/25">{p.progress}%</span>
              </div>
            </Link>
          ))}
          <button className="p-4 rounded-[14px] border border-dashed border-white/[0.08] hover:border-white/[0.15] text-white/20 hover:text-white/40 transition-all text-center">
            <span className="text-[27px]">+</span>
            <p className="text-[15px] mt-1">{t("workspaceHub.newProject")}</p>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[16px] font-semibold text-[#e8eaf0] mb-3"><Icon name="📊" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("workspaceHub.knowledgeGraph")}</p>
            <div className="h-[200px] flex items-center justify-center text-white/15 text-[16px]">
              {t("workspaceHub.knowledgeGraphPlaceholder")}
            </div>
          </div>
          <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[16px] font-semibold text-[#e8eaf0] mb-3"><Icon name="💡" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("workspaceHub.researchMemory")}</p>
            <div className="h-[200px] flex items-center justify-center text-white/15 text-[16px]">
              {t("workspaceHub.researchMemoryPlaceholder")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
