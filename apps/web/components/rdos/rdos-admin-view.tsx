"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

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
const RDOS_STATUS_LABEL: Record<string, string> = {
  none: "미등록", pending: "승인 대기", approved: "접근 허용", active: "활동중", rejected: "차단",
};

export default function RdosAdminView() {
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
      else setMsg(`목록 로드 실패: ${d.error ?? res.status}`);
    } finally { setLoading(false); }
  }, []);

  const loadMenus = useCallback(async () => {
    setMenusLoading(true);
    try {
      const res = await fetch("/api/admin/rdos/menus", { credentials: "same-origin" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setMenus(d.menus ?? []);
      else setMsg(`메뉴 로드 실패: ${d.error ?? res.status}`);
    } finally { setMenusLoading(false); }
  }, []);

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
      if (res.ok) { setMsg("연구자 플랜으로 승급 완료"); await loadMissions(); }
      else setMsg(`승급 실패: ${d.error ?? res.status}`);
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
      if (res.ok) { setMsg(`${label} 완료`); await loadEnrollments(); }
      else setMsg(`실패: ${d.error ?? res.status}`);
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
      if (res.ok) { setMenus((prev) => prev.map((m) => (m.key === key ? { ...m, enabled } : m))); setMsg(d.persisted ? "메뉴 설정 저장됨" : "저장(로컬) — DB 미연결"); }
      else setMsg(`실패: ${d.error ?? res.status}`);
    } finally { setBusy(null); }
  }

  const pending = enrollments.filter((e) => e.status === "pending");
  const filteredMembers = members.filter(
    (m) => q === "" || (m.email ?? "").toLowerCase().includes(q.toLowerCase()) || (m.name ?? "").includes(q)
  );

  return (
    <div>
      <Link href="/rdos" className="text-[12px] text-white/40 hover:text-white/80 transition">← Dashboard</Link>
      <div className="flex items-start gap-3 mt-4 mb-6">
        <span className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-[20px] flex-shrink-0 bg-[#e8b84b]/15 text-[#e8b84b]">👑</span>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">RDOS 관리자</h1>
          <p className="text-[12px] text-white/40 font-mono">슈퍼관리자 · 가입 승인 · 회원 접근 · 메뉴 관리</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {([["pending", `승인 대기 (${pending.length})`], ["members", `회원 (${members.length})`], ["missions", "미션 현황·승급"], ["menus", "메뉴 관리"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-[9px] text-[14px] font-semibold transition"
            style={{ background: tab === t ? "#e8b84b22" : "#161a22", color: tab === t ? "#e8b84b" : "#8a92a6" }}>
            {label}
          </button>
        ))}
      </div>

      {msg && <p className="text-[12.5px] text-[#3ecfb2] mb-4">{msg}</p>}

      {/* 승인 대기 */}
      {tab === "pending" && (
        loading ? <Loading /> :
        pending.length === 0 ? <Empty text="승인 대기 중인 신청이 없습니다." /> : (
          <div className="space-y-3">
            {pending.map((e) => (
              <RowBox key={e.user_id} title={e.profile?.name || e.email || e.user_id} sub={e.email}
                meta={e.profile && [e.profile.university, e.profile.department, e.profile.interest].filter(Boolean).join(" · ")}
                status="pending">
                <button disabled={busy === e.user_id} onClick={() => act(e.user_id, e.email, { approve: true }, "승인")}
                  className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#065f46] text-[#6ee7b7] disabled:opacity-50">승인</button>
                <button disabled={busy === e.user_id} onClick={() => act(e.user_id, e.email, { approve: false }, "거절")}
                  className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#3a1d1d] text-[#ffb0aa] disabled:opacity-50">거절</button>
              </RowBox>
            ))}
          </div>
        )
      )}

      {/* 회원 — 전체 회원 명부 연동 */}
      {tab === "members" && (
        loading ? <Loading /> : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름/이메일 검색"
              className="px-3 py-2 mb-3 rounded-[9px] bg-[#10131a] border border-white/[0.1] text-[13px] text-white/80 outline-none focus:border-[#e8b84b]/40 w-[240px]" />
            {filteredMembers.length === 0 ? <Empty text="회원이 없습니다." /> : (
              <div className="space-y-2.5">
                {filteredMembers.map((m) => {
                  const allowed = m.rdosStatus === "approved" || m.rdosStatus === "active";
                  return (
                    <RowBox key={m.user_id} title={m.name || m.email || m.user_id} sub={m.email} status={m.rdosStatus}>
                      {allowed ? (
                        <button disabled={busy === m.user_id} onClick={() => act(m.user_id, m.email, { approve: false }, "접근 차단")}
                          className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#3a2a14] text-[#e8b84b] disabled:opacity-50">접근 차단</button>
                      ) : (
                        <button disabled={busy === m.user_id} onClick={() => act(m.user_id, m.email, { approve: true }, "RDOS 허용")}
                          className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#065f46] text-[#6ee7b7] disabled:opacity-50">RDOS 허용</button>
                      )}
                      <button disabled={busy === m.user_id}
                        onClick={() => { if (confirm("이 회원의 RDOS 등록을 완전히 삭제(퇴출)할까요?")) act(m.user_id, m.email, { remove: true }, "퇴출"); }}
                        className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#3a1d1d] text-[#ff7066] disabled:opacity-50">퇴출</button>
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
        missions.length === 0 ? <Empty text="승인된 RDOS 회원이 없습니다." /> : (
          <div className="space-y-2.5">
            <p className="text-[13px] text-white/50 mb-3">연구준비자 회원이 프로그램 미션을 모두 완료하면 <span className="text-[#3ecfb2]">연구자 플랜으로 승급</span>할 수 있습니다.</p>
            {missions.map((m) => {
              const already = m.researcherStatus === "approved" || m.researcherStatus === "active";
              return (
                <div key={m.user_id} className="p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07]">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14.5px] font-semibold text-white/85 truncate">{m.name || m.email || m.user_id}</span>
                        {already && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#6c8cff]/15 text-[#6c8cff] font-semibold">연구자</span>}
                        {!already && m.eligible && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#5ebd7c]/15 text-[#5ebd7c] font-semibold">승급 가능</span>}
                      </div>
                      <p className="text-[12.5px] text-white/45 truncate">{m.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden max-w-[220px]">
                          <div className="h-full rounded-full" style={{ width: `${m.overallPct}%`, background: m.eligible ? "#3ecfb2" : "#6c8cff" }} />
                        </div>
                        <span className="text-[12px] text-white/55 font-mono">미션 {m.missionsDone}/{m.totalMissions} · {m.overallPct}%</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {already ? (
                        <span className="text-[12px] text-white/35">승급됨</span>
                      ) : (
                        <button disabled={!m.eligible || busy === m.user_id} onClick={() => upgrade(m.user_id, m.email)}
                          className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold bg-[#065f46] text-[#6ee7b7] disabled:opacity-40 disabled:cursor-not-allowed"
                          title={m.eligible ? "연구자 플랜으로 승급" : "미션을 모두 완료해야 승급 가능"}>
                          연구자 승급
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
            <p className="text-[13px] text-white/50 mb-3">비활성화한 메뉴는 모든 RDOS 회원의 사이드바에서 숨겨집니다. (대시보드는 항상 활성)</p>
            {menus.map((m) => (
              <div key={m.key} className="flex items-center gap-3 p-3.5 rounded-[12px] bg-[#10131a] border border-white/[0.07]">
                <div className="flex-1">
                  <p className="text-[14px] text-white/85">{m.label}</p>
                  <p className="text-[11.5px] text-white/40 font-mono">{m.route}{m.locked ? " · 항상 활성" : ""}</p>
                </div>
                <button disabled={m.locked || busy === m.key} onClick={() => toggleMenu(m.key, !m.enabled)}
                  className="relative w-[46px] h-[26px] rounded-full transition-colors disabled:opacity-40"
                  style={{ background: m.enabled ? "#3ecfb2" : "#33384a" }} aria-label={m.enabled ? "비활성화" : "활성화"}>
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
  return (
    <div className="flex items-center gap-4 p-4 rounded-[13px] bg-[#10131a] border border-white/[0.07]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-semibold text-white/85 truncate">{title}</span>
          <span className={`text-[11.5px] font-mono ${RDOS_STATUS_STYLE[status] ?? "text-white/40"}`}>· {RDOS_STATUS_LABEL[status] ?? status}</span>
        </div>
        {sub && <p className="text-[12.5px] text-white/45 truncate">{sub}</p>}
        {meta && <p className="text-[12px] text-white/40 mt-0.5 truncate">{meta}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">{children}</div>
    </div>
  );
}
function Loading() { return <p className="text-[13px] text-white/40">불러오는 중…</p>; }
function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-[13px] text-white/35 rounded-[13px] bg-[#10131a] border border-white/[0.06]">{text}</div>;
}
