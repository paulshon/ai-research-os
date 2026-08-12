"use client";

/**
 * 논문작성 하단 — 연구설계·문헌연구 연동 결과 패널
 * - 수평 드래그 핸들로 높이 조절
 * - 아코디언: 한 번에 하나의 결과만 펼침
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";
import {
  LINKED_RESULT_ORDER,
  LINKED_RESULTS_EVENT,
  formatPaperList,
  loadLinkedResults,
  type LinkedResultItem,
  type LinkedResultKey,
} from "@/lib/writing/linked-results-bridge";

const HEIGHT_KEY = "rdos_panelh_writing_linked";
const DEFAULT_H = 260;
const MIN_H = 120;
const MAX_H = 560;

const META: Record<
  LinkedResultKey,
  { group: "rd" | "lit"; icon: string; color: string; titleKey: string; sourceHref: string }
> = {
  "rd-topic": {
    group: "rd",
    icon: "🎯",
    color: "#6c8cff",
    titleKey: "writingPage.linked.rdTopic",
    sourceHref: "/research",
  },
  "rd-rq": {
    group: "rd",
    icon: "❓",
    color: "#3ecfb2",
    titleKey: "writingPage.linked.rdRq",
    sourceHref: "/research",
  },
  "rd-concept": {
    group: "rd",
    icon: "🧠",
    color: "#a78bfa",
    titleKey: "writingPage.linked.rdConcept",
    sourceHref: "/research",
  },
  "rd-method": {
    group: "rd",
    icon: "📐",
    color: "#f59e0b",
    titleKey: "writingPage.linked.rdMethod",
    sourceHref: "/research",
  },
  "rd-roadmap": {
    group: "rd",
    icon: "🗺️",
    color: "#e8b84b",
    titleKey: "writingPage.linked.rdRoadmap",
    sourceHref: "/research",
  },
  "rd-memory": {
    group: "rd",
    icon: "💡",
    color: "#ec4899",
    titleKey: "writingPage.linked.rdMemory",
    sourceHref: "/research",
  },
  "lit-gap-search": {
    group: "lit",
    icon: "🔬",
    color: "#3ecfb2",
    titleKey: "writingPage.linked.litGapSearch",
    sourceHref: "/literature",
  },
  "lit-engine-search": {
    group: "lit",
    icon: "🔍",
    color: "#6c8cff",
    titleKey: "writingPage.linked.litEngineSearch",
    sourceHref: "/literature-review",
  },
  "lit-network": {
    group: "lit",
    icon: "network",
    color: "#a78bfa",
    titleKey: "writingPage.linked.litNetwork",
    sourceHref: "/literature-review",
  },
  "lit-gap": {
    group: "lit",
    icon: "💡",
    color: "#a78bfa",
    titleKey: "writingPage.linked.litGap",
    sourceHref: "/literature-review",
  },
  "lit-design": {
    group: "lit",
    icon: "📐",
    color: "#f59e0b",
    titleKey: "writingPage.linked.litDesign",
    sourceHref: "/literature-review",
  },
  "lit-cluster": {
    group: "lit",
    icon: "🔬",
    color: "#e8b84b",
    titleKey: "writingPage.linked.litCluster",
    sourceHref: "/literature-review",
  },
};

function hasContent(item?: LinkedResultItem): boolean {
  if (!item) return false;
  return Boolean(item.body?.trim()) || Boolean(item.papers && item.papers.length > 0);
}

export default function LinkedResultsPanel({
  onInsert,
}: {
  onInsert?: (text: string) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Partial<Record<LinkedResultKey, LinkedResultItem>>>({});
  const [openKey, setOpenKey] = useState<LinkedResultKey | null>(null);
  const [height, setHeight] = useState(DEFAULT_H);
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const heightRef = useRef(height);
  heightRef.current = height;

  const refresh = useCallback(() => {
    setItems(loadLinkedResults().items);
  }, []);

  useEffect(() => {
    refresh();
    try {
      const s = localStorage.getItem(HEIGHT_KEY);
      if (s) setHeight(Math.min(MAX_H, Math.max(MIN_H, Number(s) || DEFAULT_H)));
    } catch {
      /* ignore */
    }
    window.addEventListener(LINKED_RESULTS_EVENT, refresh);
    window.addEventListener("aros:project-reset", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LINKED_RESULTS_EVENT, refresh);
      window.removeEventListener("aros:project-reset", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const dy = startY.current - e.clientY;
      setHeight(Math.min(MAX_H, Math.max(MIN_H, startH.current + dy)));
    };
    const onUp = () => {
      setDragging(false);
      try {
        localStorage.setItem(HEIGHT_KEY, String(Math.round(heightRef.current)));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragging]);

  const startDrag = (e: React.PointerEvent) => {
    if (collapsed) {
      setCollapsed(false);
      return;
    }
    startY.current = e.clientY;
    startH.current = height;
    setDragging(true);
  };

  const toggle = (key: LinkedResultKey) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  const buildInsertText = (item: LinkedResultItem) => {
    const paperBlock =
      item.papers && item.papers.length > 0
        ? `\n\n${t("writingPage.linked.paperList")}\n${formatPaperList(item.papers)}`
        : "";
    return `${item.title}\n\n${item.body || ""}${paperBlock}`.trim();
  };

  const rdKeys = LINKED_RESULT_ORDER.filter((k) => META[k].group === "rd");
  const litKeys = LINKED_RESULT_ORDER.filter((k) => META[k].group === "lit");
  const filledCount = LINKED_RESULT_ORDER.filter((k) => hasContent(items[k])).length;

  const renderRow = (key: LinkedResultKey) => {
    const meta = META[key];
    const item = items[key];
    const filled = hasContent(item);
    const open = openKey === key;
    return (
      <div
        key={key}
        className="rounded-lg border overflow-hidden"
        style={{
          borderColor: open ? `${meta.color}55` : "rgba(255,255,255,0.06)",
          background: open ? "rgba(255,255,255,0.03)" : "transparent",
        }}
      >
        <button
          type="button"
          onClick={() => toggle(key)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
        >
          <span style={{ color: meta.color }} className="flex-shrink-0">
            <Icon name={meta.icon} size={14} />
          </span>
          <span className={`flex-1 text-[13.5px] truncate ${filled ? "text-white/80" : "text-white/35"}`}>
            {t(meta.titleKey)}
          </span>
          {filled ? (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              {t("writingPage.linked.ready")}
            </span>
          ) : (
            <span className="text-[11px] text-white/20 flex-shrink-0">{t("writingPage.linked.empty")}</span>
          )}
          <Icon
            name={open ? "chevronDown" : "chevronRight"}
            size={13}
            className="text-white/30 flex-shrink-0"
          />
        </button>
        {open && (
          <div className="px-3 pb-3 border-t border-white/[0.04]">
            {filled && item ? (
              <>
                <div className="flex items-center gap-2 mt-2 mb-2">
                  <Link
                    href={meta.sourceHref}
                    className="text-[12px] text-[#6c8cff] hover:underline"
                  >
                    {t("writingPage.linked.openSource")}
                  </Link>
                  {item.updatedAt && (
                    <span className="text-[11px] text-white/20">
                      {new Date(item.updatedAt).toLocaleString()}
                    </span>
                  )}
                  {onInsert && (
                    <button
                      type="button"
                      onClick={() => onInsert(buildInsertText(item))}
                      className="ml-auto text-[12px] px-2 py-1 rounded-md bg-[#6c8cff]/15 text-[#6c8cff] hover:bg-[#6c8cff]/25"
                    >
                      {t("writingPage.insertIntoEditor")}
                    </button>
                  )}
                </div>
                {item.body?.trim() && (
                  <div className="max-h-[180px] overflow-y-auto rounded-md bg-[#0d0f14] border border-white/[0.04] p-3 text-[13.5px] text-white/60 whitespace-pre-wrap leading-[1.65]">
                    {item.body}
                  </div>
                )}
                {item.papers && item.papers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[12px] text-white/35 mb-1.5">
                      {t("writingPage.linked.paperList")} ({item.papers.length})
                    </p>
                    <ul className="max-h-[140px] overflow-y-auto space-y-1.5">
                      {item.papers.map((p, i) => {
                        const href = p.url || (p.doi ? `https://doi.org/${p.doi}` : "");
                        return (
                          <li
                            key={`${p.title}-${i}`}
                            className="text-[12.5px] text-white/55 leading-snug"
                          >
                            <span className="text-white/25 mr-1">{i + 1}.</span>
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#3ecfb2] hover:underline"
                              >
                                {p.title}
                              </a>
                            ) : (
                              <span>{p.title}</span>
                            )}
                            {(p.authors || p.year) && (
                              <span className="block pl-4 text-white/30 truncate">
                                {[p.authors, p.year, p.journal].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-[13px] text-white/30 leading-relaxed">
                {t("writingPage.linked.emptyHint")}{" "}
                <Link href={meta.sourceHref} className="text-[#6c8cff] hover:underline">
                  {t("writingPage.linked.openSource")}
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex-shrink-0 border-t border-white/[0.06] bg-[#0d0f14] flex flex-col"
      style={{ height: collapsed ? 40 : height }}
    >
      {/* 리사이즈 핸들 (점선) */}
      <div
        onPointerDown={startDrag}
        onDoubleClick={() => setCollapsed((v) => !v)}
        role="separator"
        aria-orientation="horizontal"
        title={t("writingPage.linked.resizeHint")}
        className="h-3 flex-shrink-0 cursor-row-resize flex items-center justify-center group relative"
      >
        <div
          className={`w-full border-t border-dashed transition-colors ${
            dragging ? "border-[#6c8cff]" : "border-white/15 group-hover:border-[#6c8cff]/70"
          }`}
        />
        <div className="absolute inset-x-0 flex justify-center">
          <span className="px-2 text-[10px] text-white/25 bg-[#0d0f14] tracking-widest">······</span>
        </div>
      </div>

      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 pb-1.5 flex-shrink-0">
        <Icon name="link" size={14} className="text-[#3ecfb2]" />
        <p className="text-[13.5px] font-semibold text-white/70 flex-1 truncate">
          {t("writingPage.linked.panelTitle")}
        </p>
        <span className="text-[11px] text-white/25">
          {filledCount}/{LINKED_RESULT_ORDER.length}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.05]"
          title={collapsed ? t("writingPage.linked.expand") : t("writingPage.linked.collapse")}
        >
          <Icon name={collapsed ? "chevronDown" : "chevronUp"} size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/25 mb-1.5 px-0.5">
              {t("writingPage.linked.groupResearchDesign")}
            </p>
            <div className="space-y-1">{rdKeys.map(renderRow)}</div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/25 mb-1.5 px-0.5">
              {t("writingPage.linked.groupLiterature")}
            </p>
            <div className="space-y-1">{litKeys.map(renderRow)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
