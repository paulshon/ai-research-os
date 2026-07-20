"use client";
import { Icon } from "@/components/ui/icon";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { METHOD_CATEGORIES, type MethodType } from "@/lib/method/registry";
import { localizeMethodCategories } from "@/lib/i18n/method-labels";

function MethodCard({ type }: { type: MethodType }) {
  const { t } = useTranslation();
  const available = type.status === "available";
  const card = (
    <div
      className={`group relative h-full rounded-2xl border p-4 transition-all ${
        available
          ? "bg-[#13161e] border-white/[0.06] hover:border-white/15 hover:-translate-y-0.5"
          : "bg-[#0f1218] border-dashed border-white/[0.06]"
      }`}
      style={available ? { boxShadow: `inset 0 0 0 1px ${type.color}14` } : {}}
    >
      <div className="flex items-start gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: type.color + "1f", color: type.color }}
        >
          <Icon name={available ? "method" : "hourglass"} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-semibold text-[#e8eaf0] truncate">{type.name}</h3>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                available ? "text-[#3ecfb2] bg-[#3ecfb2]/15" : "text-white/35 bg-white/[0.05]"
              }`}
            >
              {available ? t("pages.method.available") : t("pages.method.coming")}
            </span>
          </div>
          {type.en && <p className="text-[12px] text-white/30 truncate">{type.en}</p>}
        </div>
      </div>
      <p className="text-[14px] text-white/45 leading-relaxed mb-3">{type.summary}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {type.steps.slice(0, 6).map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-md bg-white/[0.03] text-white/40 border border-white/[0.04]"
          >
            <Icon name={s.icon} size={11} />
            {s.label.replace(/^\d+\.\s*/, "")}
          </span>
        ))}
        {type.steps.length > 6 && (
          <span className="text-[12px] px-2 py-0.5 text-white/25">+{type.steps.length - 6}</span>
        )}
      </div>
      {available ? (
        <span
          className="inline-flex items-center gap-1 text-[14px] font-medium"
          style={{ color: type.color }}
        >
          {t("pages.method.open")} <Icon name="arrowRight" size={14} />
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[14px] text-white/25">
          {t("pages.method.coming")}
        </span>
      )}
    </div>
  );

  if (!available) return card;
  return (
    <Link href={`/method/${type.id}`} className="block h-full">
      {card}
    </Link>
  );
}

export default function MethodLandingPage() {
  const { t } = useTranslation();
  const categories = useMemo(() => localizeMethodCategories(t), [t]);

  return (
    <div className="flex flex-col font-nanum-gothic h-full overflow-y-auto">
      <div className="p-4 md:p-6 max-w-5xl w-full mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-[15px] text-white/30">
          <Icon name="method" size={15} className="text-[#3ecfb2]" />
          <span>AI Tools</span>
          <span className="text-white/10">|</span>
          <span>{t("pages.method.catalog")}</span>
        </div>

        <div className="mb-6">
          <h1 className="text-[23px] font-bold font-nanum-myeongjo mb-1 flex items-center gap-2">
            <Link href="/admin" className="hover:opacity-70 transition-opacity" title={t("methodPage.adminPage")}>
              <Icon name="method" className="inline-flex align-[-0.125em]" size={18} />
            </Link>
            {t("pages.method.title")}
          </h1>
          <p className="text-[16px] text-white/35">{t("pages.method.desc")}</p>
        </div>

        {/* Extensibility hint */}
        <div className="mb-6 flex items-start gap-2.5 p-3 rounded-xl bg-[#3ecfb2]/[0.06] border border-[#3ecfb2]/15">
          <Icon name="idea" size={16} className="text-[#3ecfb2] mt-0.5 flex-shrink-0" />
          <p className="text-[14px] text-white/50 leading-relaxed">{t("pages.method.addHint")}</p>
        </div>

        {/* Categories → types */}
        <div className="space-y-6">
          {categories.map((cat, ci) => (
            <section key={ci}>
              <p className="text-[14px] text-white/30 mb-2.5">{cat.cat}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cat.types.map((ty) => (
                  <MethodCard key={ty.id} type={ty} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
