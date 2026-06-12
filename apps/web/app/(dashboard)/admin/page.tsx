"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useEffect, useCallback } from "react";
import { MemberPermissionPanel } from "@/components/admin/member-permission-panel";
import { ContactInquiriesPanel } from "@/components/admin/contact-inquiries-panel";
import { useUser } from "@clerk/nextjs";

interface PendingMember {
  id: string;
  name: string;
  email: string;
  is_special_member: boolean;
  approval_status: string;
  created_at: string;
  membership_tier?: "free" | "scholar" | "university";
}

export default function AdminPage() {
  const { user } = useUser();
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [permUser, setPermUser] = useState<string | null>(null);
  const [tierDraft, setTierDraft] = useState<Record<string, "free" | "scholar" | "university">>({});

  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      // 인증은 httpOnly 관리자 세션 쿠키로 처리(시크릿을 클라이언트가 보유하지 않음)
      const res = await fetch("/api/admin/members", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as PendingMember[];
        setMembers(data);
        setTierDraft(
          Object.fromEntries(
            data.map((m) => [m.id, (m.membership_tier || "free") as "free" | "scholar" | "university"])
          )
        );
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  // 마운트 시 기존 관리자 세션 쿠키가 유효하면 곧바로 목록을 불러온다.
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdminLogin = async () => {
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: adminId, password: adminPw }),
      });
      if (res.ok) {
        setAdminPw("");
        await fetchMembers();
      } else if (res.status === 401) {
        alert("아이디 또는 비밀번호가 틀렸습니다.");
      } else {
        const d = await res.json().catch(() => ({}));
        alert(
          d?.error === "secret_not_configured"
            ? "서버에 ADMIN_API_SECRET 이 설정되지 않았습니다."
            : "로그인에 실패했습니다."
        );
      }
    } catch {
      alert("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    setProcessing(userId);
    try {
      const res = await fetch("/api/admin/approve-member", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, action, membershipTier: tierDraft[userId] || "free" }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === userId
              ? {
                  ...m,
                  approval_status: action === "approve" ? "approved" : "rejected",
                  membership_tier: tierDraft[userId] || "free",
                }
              : m
          )
        );
      }
    } finally {
      setProcessing(null);
    }
  };

  const statusColor = (s: string) =>
    s === "approved"
      ? "text-[#5ebd7c]"
      : s === "rejected"
        ? "text-[#ff7066]"
        : "text-[#e8b84b]";

  const isAdmin =
    (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  return (
    <div className="p-5 md:p-6 font-nanum-gothic max-w-[1680px] mx-auto">
      <h1 className="text-[25px] font-bold font-nanum-myeongjo mb-1">
        <Icon name="👑" className="inline-flex align-[-0.125em] mr-1" size={15} />관리자 — 회원 등급·승인·퇴출 관리
      </h1>
      <p className="text-[16px] text-white/35 mb-6">
        가입 신청자를 검토하고 승인·거절·퇴출 및 등급을 관리합니다. 랜딩페이지 문의사항 목록도 확인할 수 있습니다.
      </p>

      {!authenticated ? (
        <div className="p-6 rounded-[16px] bg-[#13161e] border border-white/[0.06] max-w-sm">
          <label className="block text-[15px] text-white/40 mb-2">관리자 아이디</label>
          <input
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            className="w-full px-3 py-2 bg-[#1a1e2a] border border-white/[0.08] rounded-lg text-[16px] text-white mb-3 focus:outline-none focus:border-[#4a6cf7]"
            placeholder="아이디"
          />
          <label className="block text-[15px] text-white/40 mb-2">비밀번호</label>
          <input
            type="password"
            value={adminPw}
            onChange={(e) => setAdminPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            className="w-full px-3 py-2 bg-[#1a1e2a] border border-white/[0.08] rounded-lg text-[16px] text-white mb-3 focus:outline-none focus:border-[#4a6cf7]"
            placeholder="비밀번호"
          />
          <button
            type="button"
            onClick={handleAdminLogin}
            disabled={loggingIn}
            className="w-full py-2.5 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-lg text-[16px] font-medium transition-all disabled:opacity-50"
          >
            {loggingIn ? "로그인 중…" : "로그인"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[16px] text-white/40">
              총 {members.length}명 · 대기 {members.filter((m) => m.approval_status === "pending").length}명
            </p>
            <button
              type="button"
              onClick={fetchMembers}
              className="px-3 py-1.5 text-[15px] bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/50 hover:text-white/70 transition-all"
            >
              새로고침
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-white/25">불러오는 중…</div>
          ) : members.length === 0 ? (
            <div className="text-center py-16 text-white/25">회원이 없습니다.</div>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="rounded-[14px] bg-[#13161e] border border-white/[0.05]"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[17px] font-medium text-[#e8eaf0]">
                      {m.name}
                    </span>
                    {m.is_special_member && (
                      <span className="px-2 py-0.5 rounded-full bg-[#e8b84b]/15 text-[#e8b84b] text-[13px] font-medium">
                        <Icon name="★" className="inline-flex align-[-0.125em] mr-1" size={15} />특별회원
                      </span>
                    )}
                    <span className={`text-[14px] ${statusColor(m.approval_status)}`}>
                      {m.approval_status === "approved"
                        ? "승인됨"
                        : m.approval_status === "rejected"
                          ? "거절됨"
                          : "대기중"}
                    </span>
                  </div>
                  <p className="text-[15px] text-white/35 truncate">{m.email}</p>
                  <p className="text-[14px] text-white/20 mt-0.5">
                    가입일: {new Date(m.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 items-center">
                  <select
                    value={tierDraft[m.id] || "free"}
                    onChange={(e) =>
                      setTierDraft((prev) => ({
                        ...prev,
                        [m.id]: e.target.value as "free" | "scholar" | "university",
                      }))
                    }
                    className="px-2 py-2 bg-[#1a1e2a] border border-white/[0.08] rounded-lg text-[15px] text-white/70"
                  >
                    <option value="free">Free</option>
                    <option value="scholar">Scholar</option>
                    <option value="university">University</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setPermUser((cur) => (cur === m.id ? null : m.id))}
                    className="px-3 py-2 bg-[#6c8cff]/12 border border-[#6c8cff]/25 text-[#9db0ff] rounded-lg text-[14px] hover:bg-[#6c8cff]/22 transition-all"
                  >
                    메뉴 권한
                  </button>
                {m.approval_status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      disabled={processing === m.id}
                      onClick={() => handleAction(m.id, "approve")}
                      className="px-4 py-2 bg-[#5ebd7c]/15 border border-[#5ebd7c]/30 text-[#5ebd7c] rounded-lg text-[15px] font-medium hover:bg-[#5ebd7c]/25 transition-all disabled:opacity-40"
                    >
                      {processing === m.id ? "…" : "승인"}
                    </button>
                    <button
                      type="button"
                      disabled={processing === m.id}
                      onClick={() => handleAction(m.id, "reject")}
                      className="px-4 py-2 bg-[#ff7066]/10 border border-[#ff7066]/25 text-[#ff7066] rounded-lg text-[15px] font-medium hover:bg-[#ff7066]/20 transition-all disabled:opacity-40"
                    >
                      거절
                    </button>
                  </div>
                )}
                {m.approval_status === "approved" && (
                  <button
                    type="button"
                    disabled={processing === m.id}
                    onClick={() => {
                      if (confirm(`${m.name} 회원을 퇴출시키겠습니까?`)) {
                        handleAction(m.id, "reject");
                      }
                    }}
                    className="px-3 py-2 bg-[#ff7066]/10 border border-[#ff7066]/15 text-[#ff7066] rounded-lg text-[14px] hover:bg-[#ff7066]/20 transition-all disabled:opacity-40"
                  >
                    퇴출
                  </button>
                )}
                </div>
                </div>
                {permUser === m.id && (
                  <div className="px-4 pb-4 border-t border-white/[0.05]">
                    <MemberPermissionPanel userId={m.id} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {authenticated && <ContactInquiriesPanel />}
    </div>
  );
}
