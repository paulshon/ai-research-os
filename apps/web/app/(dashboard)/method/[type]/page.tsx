"use client";
import { Icon } from "@/components/ui/icon";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { getMethodType } from "@/lib/method/registry";
import QcaWorkspace from "@/components/method/qca-workspace";

export default function MethodTypePage() {
  const { t } = useTranslation();
  const params = useParams();
  const typeId = Array.isArray(params.type) ? params.type[0] : (params.type as string);
  const type = getMethodType(typeId);

  if (!type) {
    return (
      <div className="flex flex-col items-center justify-center h-full font-nanum-gothic text-center p-8">
        <Icon name="help" size={40} className="text-white/15 mb-3" />
        <p className="text-[17px] text-white/50 mb-1">알 수 없는 연구방법 유형입니다.</p>
        <Link href="/method" className="text-[#3ecfb2] text-[15px] hover:underline mt-2">
          ← 연구방법 카탈로그로 돌아가기
        </Link>
      </div>
    );
  }

  // Live, executable type
  if (type.id === "qca" && type.status === "available") {
    return <QcaWorkspace />;
  }

  // Scaffold for "coming" types — shows the dedicated menu structure for that type.
  return (
    <div className="flex flex-col font-nanum-gothic h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2 mb-4 text-[15px] text-white/30">
          <Link href="/method" className="hover:text-white/60 transition-colors inline-flex items-center gap-1">
            <Icon name="method" size={15} /> {t("pages.method.title")}
          </Link>
          <span className="text-white/10">|</span>
          <span>{type.name}</span>
        </div>

        <div className="mb-5 flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: type.color + "1f", color: type.color }}
          >
            <Icon name="hourglass" size={22} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold font-nanum-myeongjo flex items-center gap-2">
              {type.name}
              <span className="text-[11px] px-1.5 py-0.5 rounded-full text-white/35 bg-white/[0.05] font-medium align-middle">
                {t("pages.method.coming")}
              </span>
            </h1>
            {type.en && <p className="text-[13px] text-white/30">{type.en}</p>}
            <p className="text-[15px] text-white/45 mt-1 leading-relaxed">{type.summary}</p>
          </div>
        </div>

        <p className="text-[14px] text-white/30 mb-2">전용 메뉴 (워크플로우)</p>
        <div className="space-y-1.5">
          {type.steps.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#13161e] border border-white/[0.05]"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: type.color + "18", color: type.color }}
              >
                <Icon name={s.icon} size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-white/75">{s.label}</p>
                <p className="text-[13px] text-white/35 truncate">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <Icon name="idea" size={16} className="text-[#e8b84b] mt-0.5 flex-shrink-0" />
          <p className="text-[14px] text-white/45 leading-relaxed">
            이 유형은 메뉴 골격이 정의되어 있으며, 엔진이 탑재되면 위 단계가 그대로 실행
            가능한 작업공간으로 활성화됩니다. (혼합 질적내용분석 유형과 동일한 방식)
          </p>
        </div>
      </div>
    </div>
  );
}
