"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";

/* 관리자 — 랜딩페이지 문의 목록 (v7).
   /api/contact GET 으로 문의를 불러오고, 상태(읽음/완료)를 변경한다. */

interface Inquiry {
  id: string; name: string; email: string; type: string | null;
  message: string | null; status: "new" | "read" | "done"; created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  new: "text-[#e8b84b] bg-[#e8b84b]/12", read: "text-[#6c8cff] bg-[#6c8cff]/12", done: "text-[#5ebd7c] bg-[#5ebd7c]/12",
};

export function ContactInquiriesPanel() {
  const { t } = useTranslation();
  const STATUS_LABEL: Record<string, string> = {
    new: t("admin.inquiries.statusNew"),
    read: t("admin.inquiries.statusRead"),
    done: t("admin.inquiries.statusDone"),
  };
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contact", { credentials: "same-origin" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setItems(d.inquiries ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: status as Inquiry["status"] } : x)));
    await fetch("/api/contact", {
      method: "PATCH", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }

  const newCount = items.filter((i) => i.status === "new").length;

  return (
    <div className="mt-10">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 mb-3">
        <h2 className="text-[19px] font-bold font-nanum-myeongjo">{t("admin.inquiries.title")}</h2>
        {newCount > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#e8b84b]/15 text-[#e8b84b] font-semibold">{t("admin.inquiries.newBadge").replace("{count}", String(newCount))}</span>}
        <span className="text-white/30 text-[13px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        loading ? <p className="text-[14px] text-white/35">{t("admin.inquiries.loading")}</p> :
        items.length === 0 ? (
          <div className="p-6 text-center text-[14px] text-white/30 rounded-[14px] bg-[#13161e] border border-white/[0.06]">{t("admin.inquiries.empty")}</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="p-4 rounded-[14px] bg-[#13161e] border border-white/[0.06]">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-semibold text-white/85">{it.name}</span>
                      <span className="text-[13px] text-white/40">{it.email}</span>
                      {it.type && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/55">{it.type}</span>}
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[it.status]}`}>{STATUS_LABEL[it.status]}</span>
                    </div>
                    <p className="text-[11px] text-white/30 mt-1 font-mono">{new Date(it.created_at).toLocaleString("ko-KR")}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {it.status !== "read" && <button onClick={() => setStatus(it.id, "read")} className="px-2.5 py-1 rounded-md text-[12px] bg-[#6c8cff]/12 text-[#6c8cff]">{t("admin.inquiries.markRead")}</button>}
                    {it.status !== "done" && <button onClick={() => setStatus(it.id, "done")} className="px-2.5 py-1 rounded-md text-[12px] bg-[#5ebd7c]/12 text-[#5ebd7c]">{t("admin.inquiries.markDone")}</button>}
                  </div>
                </div>
                {it.message && <p className="text-[14px] text-white/65 leading-relaxed whitespace-pre-wrap mt-2 pt-2 border-t border-white/[0.05]">{it.message}</p>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
