"use client";
import { Icon } from "@/components/ui/icon";

import { useCitation } from "./citation-context";
import { useTranslation } from "@/lib/i18n";

/** 상단 탭바 또는 툴바에 삽입할 참고문헌 버튼 */
export default function CitationButton() {
  const { togglePanel, refDB, citedRefs } = useCitation();
  const { t } = useTranslation();

  return (
    <button
      onClick={togglePanel}
      className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] transition-all whitespace-nowrap"
      style={{
        background: "rgba(52,211,153,0.08)",
        border: "1px solid rgba(52,211,153,0.2)",
        color: "#34d399",
      }}
      title={t("citations.buttonTitle")}
    >
      <Icon name="📚" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("citations.button")}
      {refDB.length > 0 && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(52,211,153,0.2)", color: "#34d399" }}
        >
          {refDB.length}
        </span>
      )}
      {citedRefs.length > 0 && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(96,165,250,0.2)", color: "#60a5fa" }}
        >
          {t("citations.cited")} {citedRefs.length}
        </span>
      )}
    </button>
  );
}
