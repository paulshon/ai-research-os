"use client";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

type Enrollment = { user_id: string; email: string | null; status: string; profile: Record<string, unknown> | null; created_at: string };

export default function RdosApprovalList({ initial }: { initial: Enrollment[] }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(targetUserId: string, approve: boolean) {
    setBusy(targetUserId);
    try {
      const res = await fetch("/api/admin/rdos/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, approve }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.status) setRows((r) => r.map((e) => (e.user_id === targetUserId ? { ...e, status: json.status } : e)));
    } finally { setBusy(null); }
  }

  if (rows.length === 0) return <p className="text-[13px] text-white/40">{t("admin.rdos.noApplications")}</p>;

  return (
    <div className="space-y-2">
      {rows.map((e) => {
        const name = (e.profile?.name as string) ?? t("admin.rdos.noName");
        const uni = (e.profile?.university as string) ?? "";
        const color = e.status === "approved" ? "#3ecfb2" : e.status === "rejected" ? "#ff7066" : "#e8b84b";
        return (
          <div key={e.user_id} className="flex items-center gap-4 p-4 rounded-[12px] bg-[#13161e] border border-white/[0.07]">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate">{name} <span className="text-white/40 text-[12px]">· {e.email ?? e.user_id}</span></p>
              <p className="text-[12px] text-white/45">{uni}</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: color + "22", color }}>{e.status}</span>
            <div className="flex gap-2">
              <button onClick={() => decide(e.user_id, true)} disabled={busy === e.user_id || e.status === "approved"}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold bg-[#3ecfb2] text-[#070708] disabled:opacity-40">{t("admin.rdos.approve")}</button>
              <button onClick={() => decide(e.user_id, false)} disabled={busy === e.user_id}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium border border-white/[0.12] text-white/65 disabled:opacity-40">{t("admin.rdos.reject")}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
