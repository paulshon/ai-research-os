"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";
import {
  HISTORY_EVENT,
  deleteSession,
  formatStamp,
  groupSessions,
  listSessions,
  putSession,
  type WorkSession,
} from "@/lib/workspace/history-store";
import { RESEARCH_FLOW_ITEMS } from "@/components/dashboard/sidebar-items";

/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 작업 히스토리 레일
   사이드바에서 전체메뉴가 빠진 자리를 채운다.
   제목과 연·월·일·시각을 함께 보여주고, 클릭하면 그 작업으로 되돌아간다.
   ══════════════════════════════════════════════════════════════════════ */

const META = new Map(RESEARCH_FLOW_ITEMS.map((e) => [e.href, e]));

export default function HistoryRail({ onNavigate }: { onNavigate?: () => void }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useState<WorkSession[]>([]);
  const [q, setQ] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [undo, setUndo] = useState<WorkSession | null>(null);

  const reload = useCallback(() => {
    void listSessions().then(setRows);
  }, []);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener(HISTORY_EVENT, h);
    window.addEventListener("storage", h);
    let ch: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        ch = new BroadcastChannel("studiumr");
        ch.onmessage = h;
      }
    } catch {
      /* noop */
    }
    return () => {
      window.removeEventListener(HISTORY_EVENT, h);
      window.removeEventListener("storage", h);
      ch?.close();
    };
  }, [reload]);

  /* 5초 안에 되돌리지 않으면 삭제를 확정한다 */
  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 5_000);
    return () => clearTimeout(id);
  }, [undo]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(needle));
  }, [rows, q]);

  const groups = useMemo(() => groupSessions(filtered), [filtered]);

  const open = useCallback(
    (row: WorkSession) => {
      void putSession({ ...row, updatedAt: Date.now() });
      onNavigate?.();
      router.push(row.href);
    },
    [router, onNavigate],
  );

  const remove = useCallback(
    async (row: WorkSession) => {
      setMenuId(null);
      setUndo(row);
      await deleteSession(row.id);
    },
    [],
  );

  const commitRename = useCallback(async () => {
    const row = rows.find((r) => r.id === editId);
    setEditId(null);
    if (!row) return;
    const title = editText.trim();
    if (!title || title === row.title) return;
    await putSession({ ...row, title: title.slice(0, 80), updatedAt: row.updatedAt });
  }, [editId, editText, rows]);

  const groupLabel = (key: string) =>
    key === "today"
      ? t("history.today")
      : key === "yesterday"
        ? t("history.yesterday")
        : key === "week"
          ? t("history.week")
          : key === "month"
            ? t("history.month")
            : locale === "ko"
              ? `${key}년`
              : key;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <p className="text-[10.5px] font-bold text-white/22 uppercase tracking-[.12em] flex-1 truncate">
          {t("history.title")}
        </p>
        <span className="text-[10.5px] text-white/20 tabular-nums">{rows.length}</span>
      </div>

      <div className="px-3 pb-2">
        <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] bg-white/[0.04] border border-white/[0.06] focus-within:border-[#6c8cff]/50 transition-colors">
          <Icon name="search" size={13} className="text-white/25 flex-shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("history.search")}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[12.5px] text-white/75 placeholder:text-white/22"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2 scrollbar-none">
        {groups.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-[12px] text-white/30 leading-relaxed">{t("history.empty")}</p>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.key} className="mb-1.5">
            <p className="sticky top-0 z-[1] px-2 py-1.5 text-[10.5px] font-bold text-white/25 backdrop-blur-sm">
              {groupLabel(String(g.key))}
            </p>
            {g.rows.map((row) => {
              const meta = META.get(row.href);
              const color = meta?.color ?? "#6c8cff";
              return (
                <div key={row.id} className="group relative">
                  {editId === row.id ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitRename();
                        if (e.key === "Escape") setEditId(null);
                      }}
                      className="w-full mx-1 px-2 py-2 rounded-[10px] bg-black/40 border border-[#6c8cff]/50 outline-none text-[12.5px] text-white/90"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => open(row)}
                      className="w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-white/[0.05] transition-colors"
                    >
                      <span
                        className="w-[22px] h-[22px] mt-[1px] rounded-[7px] flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}22`, color }}
                      >
                        <Icon name={meta?.icon ?? "research"} size={12} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12.5px] text-white/72 truncate leading-tight">
                          {row.title}
                        </span>
                        <span className="block text-[11px] text-white/28 tabular-nums leading-tight mt-[3px]">
                          {formatStamp(row.updatedAt, locale as string)}
                        </span>
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label={t("history.more")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId((v) => (v === row.id ? null : row.id));
                    }}
                    className="absolute right-1.5 top-1.5 w-6 h-6 rounded-md flex items-center justify-center text-white/25 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-white/10 transition-opacity"
                  >
                    <span aria-hidden className="text-[15px] leading-none">⋯</span>
                  </button>

                  {menuId === row.id && (
                    <div className="absolute right-2 top-8 z-20 w-[132px] rounded-[10px] border border-white/10 bg-[#141824] shadow-2xl py-1">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[0.06]"
                        onClick={() => {
                          setEditId(row.id);
                          setEditText(row.title);
                          setMenuId(null);
                        }}
                      >
                        {t("history.rename")}
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-[12px] text-[#ff7066] hover:bg-white/[0.06]"
                        onClick={() => void remove(row)}
                      >
                        {t("history.delete")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {undo && (
        <div className="mx-3 mb-2 flex items-center gap-2 px-2.5 py-2 rounded-[10px] bg-white/[0.06] border border-white/10">
          <span className="text-[11.5px] text-white/55 flex-1 truncate">{t("history.deleted")}</span>
          <button
            type="button"
            className="text-[11.5px] font-semibold text-[#6c8cff]"
            onClick={() => {
              void putSession(undo);
              setUndo(null);
            }}
          >
            {t("history.undo")}
          </button>
        </div>
      )}
    </div>
  );
}
