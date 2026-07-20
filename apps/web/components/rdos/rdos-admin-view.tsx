"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";

/* ════════════════════════════════════════════════════════════
   RDOS 관리자 (v6) — 슈퍼관리자 전용
     · 승인 대기: 자가 가입 신청(pending) 승인/거절
     · 회원: 전체 회원(profiles) 연동 — RDOS 접근 부여/차단/퇴출
     · 메뉴 관리: RDOS 메뉴 전역 활성/비활성
   세 탭 모두 실제 데이터(Supabase)와 연동하여 각각 동작한다.
═══════════════════════════════════════════════════════════════ */

interface Enrollment {
  user_id: string;
  email: string | null;
  status: "pending" | "approved" | "active" | "rejected";
  profile: { name?: string; university?: string; department?: string; interest?: string } | null;
  created_at: string;
}
interface Member { user_id: string; email: string | null; name: string | null; rdosStatus: string; }
interface MenuRow { key: string; label: string; route: string; locked: boolean; enabled: boolean; }
interface MissionRow { user_id: string; email: string | null; name: string | null; missionsDone: number; totalMissions: number; overallPct: number; eligible: boolean; researcherStatus: string; }

const RDOS_STATUS_STYLE: Record<string, string> = {
  none: "text-white/35", pending: "text-[#e8b84b]", approved: "text-[#5ebd7c]",
  active: "text-[#5ebd7c]", rejected: "text-[#ff7066]",
};
const RDOS_STATUS_LABEL_KEY: Record<string, string> = {
  none: "rdos.admin.statusNone", pending: "rdos.admin.statusPending", approved: "rdos.admin.statusApproved",
  active: "rdos.admin.statusActive", rejected: "rdos.admin.statusRejected",
};

export default function RdosAdminView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"pending" | "members" | "menus" | "missions">("pending");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [menusLoading, setMenusLoading] = useState(true);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rdos/enrollments", { credentials: "same-origin" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setEnrollments(d.enrollments ?? []); setMembers(d.members ?? []); }
      else setMsg(t("rdos.admin.loadListFailed").replace("{error}", String(d.error ?? res.status)));
    } finally { setLoading(false); }
  }, [t]);

  const loadMenus = useCallback(async () => {
    setMenusLoading(true);
    try {
      const res = await fetch("/api/admin/rdos/menus", { credentials: "same-origin" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setMenus(d.menus ?? []);
      else setMsg(t("rdos.admin.loadMenusFailed").replace("{error}", String(d.error ?? res.status)));
    } finally { setMenusLoading(false); }
  }, [t]);

  const loadMissions = useCallback(async () => {
    setMissionsLoading(true);
    try {
      const res = await fetch("/api/admin/rdos/missions", { credentials: "same-origin" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setMissions(d.members ?? []);
    } finally { setMissionsLoading(false); }
  }, []);

  async function upgrade(userId: string, email: string | null) {
    setBusy(userId); setMsg(null);
    try {
      const res = await fetch("/api/admin/rdos/upgrade", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, targetEmail: email }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMsg(t("rdos.admin.upgradeSuccess")); await loadMissions(); }
      else setMsg(t("rdos.admin.upgradeFailed").replace("{error}", String(d.error ?? res.status)));
    } finally { setBusy(null); }
  }

  useEffect(() => { loadEnrollments(); loadMenus(); loadMissions(); }, [loadEnrollments, loadMenus, loadMissions]);

  async function act(userId: string, email: string | null, body: Record<string, unknown>, label: string) {
    setBusy(userId); setMsg(null);
    try {
      const res = await fetch("/api/admin/rdos/approve", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, targetEmail: email, ...body }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMsg(t("rdos.admin.actionDone").replace("{label}", label)); await loadEnrollments(); }
      else setMsg(t("rdos.admin.actionFailed").replace("{error}", String(d.error ?? res.status)));
    } finally { setBusy(null); }
  }

  async function toggleMenu(key: string, enabled: boolean) {
    setBusy(key); setMsg(null);
    try {
      const res = await fetch("/api/admin/rdos/menus", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMenus((prev) => prev.map((m) => (m.key === key ? { ...m, enabled } : m))); setMsg(d.persisted ? t("rdos.admin.menuSaved") : t("rdos.admin.menuSavedLocal")); }
      else setMsg(t("rdos.admin.actionFailed").replace("{error}", String(d.error ?? res.status)));
    } finally { setBusy(null); }
  }

  const pending = enrollments.filter((e) => e.status === "pending");
  const filteredMembers = members.filter(
    (m) => q === "" || (m.email ?? "").toLowerCase().includes(q.toLowerCase()) || (m.name ?? "").includes(q)
  );

  const tabs = [
    ["pending", t("rdos.admin.tabPending").replace("{count}", String(pending.length))],
    ["members", t("rdos.admin.tabMembers").replace("{count}", String(members.length))],
    ["missions", t("rdos.admin.tabMissions")],
    ["menus", t("rdos.admin.tabMenus")],
  ] as const;

  return (
    <div>
      <Link href="/rdos" className="text-[12px] text-white/40 hover:text-white/80 transition">{t("rdos.admin.backToDashboard")}</Link>
      <div className="flex items-start gap-3 mt-4 mb-6">
        <span className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-[20px] flex-shrink-0 bg-[#e8b84b]/15 text-[#e8b84b]">👑</span>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">{t("rdos.admin.title")}</h1>
          <p className="text-[12px] text-white/40 font-mono">{t("rdos.admin.subtitle")}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(([tabKey, label]) => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className="px-4 py-2 rounded-[9px] text-[14px] font-semibold transition"
            style={{ background: tab === tabKey ? "#e8b84b22" : "#161a22", color: tab === tabKey ? "#e8b84b" : "#8a92a6" }}>
            {label}
          </button>
        ))}
      </div>

      {msg && <p className="text-[12.5px] text-[#3ecfb2] mb-4">{msg}</p>}

      {/* 승인 대기 */}
      {tab === "pending" && (
        loading ? <Loading /> :
        pending.length === 0 ? <Empty text={t("rdos.admin.noPending")} /> : (
          <div className="space-y-3">
            {pending.map((e) => (
              <RowBox key={e.user_id} title={e.profile?.name || e.email || e.user_id} sub={e.email}
                meta={e.profile && [e.profile.university, e.profile.department, e.profile.interest].filter(Boolean).join(" · ")}
                status="pending">
                <button disabled={busy === e.user_id} onClick={() => act(e.user_id, e.email, { approve: true }, t("rdos.admin.approve"))}
                  className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#065f46] text-[#6ee7b7] disabled:opacity-50">{t("rdos.admin.approve")}</button>
                <button disabled={busy === e.user_id} onClick={() => act(e.user_id, e.email, { approve: false }, t("rdos.admin.reject"))}
                  className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#3a1d1d] text-[#ffb0aa] disabled:opacity-50">{t("rdos.admin.reject")}</button>
              </RowBox>
            ))}
          </div>
        )
      )}

      {/* 회원 — 전체 회원 명부 연동 */}
      {tab === "members" && (
        loading ? <Loading /> : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rdos.admin.searchPlaceholder")}
              className="px-3 py-2 mb-3 rounded-[9px] bg-[#10131a] border border-white/[0.1] text-[13px] text-white/80 outline-none focus:border-[#e8b84b]/40 w-[240px]" />
            {filteredMembers.length === 0 ? <Empty text={t("rdos.admin.noMembers")} /> : (
              <div className="space-y-2.5">
                {filteredMembers.map((m) => {
                  const allowed = m.rdosStatus === "approved" || m.rdosStatus === "active";
                  return (
                    <RowBox key={m.user_id} title={m.name || m.email || m.user_id} sub={m.email} status={m.rdosStatus}>
                      {allowed ? (
                        <button disabled={busy === m.user_id} onClick={() => act(m.user_id, m.email, { approve: false }, t("rdos.admin.blockAccess"))}
                          className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#3a2a14] text-[#e8b84b] disabled:opacity-50">{t("rdos.admin.blockAccess")}</button>
                      ) : (
                        <button disabled={busy === m.user_id} onClick={() => act(m.user_id, m.email, { approve: true }, t("rdos.admin.allowRdos"))}
                          className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#065f46] text-[#6ee7b7] disabled:opacity-50">{t("rdos.admin.allowRdos")}</button>
                      )}
                      <button disabled={busy === m.user_id}
                        onClick={() => { if (confirm(t("rdos.admin.expelConfirm"))) act(m.user_id, m.email, { remove: true }, t("rdos.admin.expel")); }}
                        className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#3a1d1d] text-[#ff7066] disabled:opacity-50">{t("rdos.admin.expel")}</button>
                    </RowBox>
                  );
                })}
              </div>
            )}
          </>
        )
      )}

      {/* 미션 현황·승급 — 연구준비자 미션 완료 → 연구자 플랜 승급 연동 */}
      {tab === "missions" && (
        missionsLoading ? <Loading /> :
        missions.length === 0 ? <Empty text={t("rdos.admin.noApprovedMembers")} /> : (
          <div className="space-y-2.5">
            <p className="text-[13px] text-white/50 mb-3">
              {t("rdos.admin.missionsUpgradeNotice").split("{highlight}")[0]}
              <span className="text-[#3ecfb2]">{t("rdos.admin.researcherUpgradeHighlight")}</span>
              {t("rdos.admin.missionsUpgradeNotice").split("{highlight}")[1]}
            </p>
            {missions.map((m) => {
              const already = m.researcherStatus === "approved" || m.researcherStatus === "active";
              return (
                <div key={m.user_id} className="p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07]">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14.5px] font-semibold text-white/85 truncate">{m.name || m.email || m.user_id}</span>
                        {already && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#6c8cff]/15 text-[#6c8cff] font-semibold">{t("rdos.admin.researcherBadge")}</span>}
                        {!already && m.eligible && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#5ebd7c]/15 text-[#5ebd7c] font-semibold">{t("rdos.admin.upgradeEligibleBadge")}</span>}
                      </div>
                      <p className="text-[12.5px] text-white/45 truncate">{m.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden max-w-[220px]">
                          <div className="h-full rounded-full" style={{ width: `${m.overallPct}%`, background: m.eligible ? "#3ecfb2" : "#6c8cff" }} />
                        </div>
                        <span className="text-[12px] text-white/55 font-mono">{t("rdos.admin.missionsCount").replace("{done}", String(m.missionsDone)).replace("{total}", String(m.totalMissions)).replace("{pct}", String(m.overallPct))}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {already ? (
                        <span className="text-[12px] text-white/35">{t("rdos.admin.upgraded")}</span>
                      ) : (
                        <button disabled={!m.eligible || busy === m.user_id} onClick={() => upgrade(m.user_id, m.email)}
                          className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#065f46] text-[#6ee7b7] disabled:opacity-40 disabled:cursor-not-allowed"
                          title={m.eligible ? t("rdos.admin.upgradeButtonTitleEligible") : t("rdos.admin.upgradeButtonTitleNotEligible")}>
                          {t("rdos.admin.upgradeButton")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 메뉴 관리 */}
      {tab === "menus" && (
        menusLoading ? <Loading /> : (
          <div className="space-y-2.5">
            <p className="text-[13px] text-white/50 mb-3">{t("rdos.admin.menusDisableNotice")}</p>
            {menus.map((m) => (
              <div key={m.key} className="flex items-center gap-3 p-3.5 rounded-[12px] bg-[#10131a] border border-white/[0.07]">
                <div className="flex-1">
                  <p className="text-[14px] text-white/85">{m.label}</p>
                  <p className="text-[11.5px] text-white/40 font-mono">{m.route}{m.locked ? t("rdos.admin.alwaysActive") : ""}</p>
                </div>
                <button disabled={m.locked || busy === m.key} onClick={() => toggleMenu(m.key, !m.enabled)}
                  className="relative w-[46px] h-[26px] rounded-full transition-colors disabled:opacity-40"
                  style={{ background: m.enabled ? "#3ecfb2" : "#33384a" }} aria-label={m.enabled ? t("rdos.admin.disable") : t("rdos.admin.enable")}>
                  <span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all" style={{ left: m.enabled ? "23px" : "3px" }} />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function RowBox({ title, sub, meta, status, children }: { title: string; sub?: string | null; meta?: string | false | null; status: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  const statusLabelKey = RDOS_STATUS_LABEL_KEY[status];
  return (
    <div className="flex items-center gap-4 p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-semibold text-white/85 truncate">{title}</span>
          <span className={`text-[11.5px] font-mono ${RDOS_STATUS_STYLE[status] ?? "text-white/40"}`}>· {statusLabelKey ? t(statusLabelKey) : status}</span>
        </div>
        {sub && <p className="text-[12.5px] text-white/45 truncate">{sub}</p>}
        {meta && <p className="text-[12px] text-white/40 mt-0.5 truncate">{meta}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">{children}</div>
    </div>
  );
}
function Loading() {
  const { t } = useTranslation();
  return <p className="text-[13px] text-white/40">{t("rdos.admin.loading")}</p>;
}
function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-[13px] text-white/35 rounded-[13px] bg-[#10131a] border border-white/[0.06]">{text}</div>;
}
