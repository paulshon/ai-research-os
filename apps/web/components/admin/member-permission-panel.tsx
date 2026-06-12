"use client";

import { useEffect, useState } from "react";

interface MenuNode {
  code: string;
  label: string;
  href?: string;
  children?: MenuNode[];
}

/* 회원별 메뉴(권한) 차단/허용 패널 (v63).
   코드 기반 카탈로그(상위 메뉴 + 하위메뉴)를 계층형으로 표시하고,
   각 항목을 [허용]·[차단]·[기본] 으로 선택수정한다. 상위 메뉴를 펼치면 하위메뉴가 나온다. */
export function MemberPermissionPanel({ userId }: { userId: string }) {
  const [catalog, setCatalog] = useState<MenuNode[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [inherited, setInherited] = useState<Record<string, boolean>>({});
  const [member, setMember] = useState<{ plan: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/member-permissions?userId=${encodeURIComponent(userId)}`,
          { credentials: "same-origin" }
        );
        if (res.ok && alive) {
          const d = await res.json();
          setCatalog(d.catalog ?? []);
          setOverrides(d.overrides ?? {});
          setInherited(d.inherited ?? {});
          setMember(d.member ?? null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const apply = async (code: string, allowed: boolean | null) => {
    setSaving(code);
    try {
      const res = await fetch("/api/admin/member-permissions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permission_code: code, allowed }),
      });
      if (res.ok) {
        setOverrides((prev) => {
          const n = { ...prev };
          if (allowed === null) delete n[code];
          else n[code] = allowed;
          return n;
        });
      } else {
        const e = await res.json().catch(() => ({}));
        alert(`권한 저장 실패: ${e.error ?? res.status}`);
      }
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="py-4 text-[13px] text-white/30">메뉴 권한 불러오는 중…</div>;

  const Btn = ({
    active, color, onClick, children,
  }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-md text-[12px] font-medium border transition-all"
      style={
        active
          ? { background: `${color}22`, borderColor: `${color}66`, color }
          : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
      }
    >
      {children}
    </button>
  );

  const Row = ({ node, sub }: { node: MenuNode; sub?: boolean }) => {
    const ov = overrides[node.code];
    const hasOv = node.code in overrides;
    const inh = inherited[node.code];
    const hasKids = !!(node.children && node.children.length);
    const open = expanded.has(node.code);
    return (
      <div
        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
          sub ? "bg-[#0c0f15] border-white/[0.03] ml-5" : "bg-[#0f1219] border-white/[0.05]"
        }`}
      >
        <div className="min-w-0 flex items-center gap-1.5">
          {hasKids ? (
            <button
              type="button"
              onClick={() =>
                setExpanded((p) => {
                  const n = new Set(p);
                  n.has(node.code) ? n.delete(node.code) : n.add(node.code);
                  return n;
                })
              }
              className="text-white/40 hover:text-white/80 text-[12px] w-4"
              aria-label="하위메뉴 펼치기"
            >
              {open ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-4 inline-block" />
          )}
          <span className={`${sub ? "text-[12.5px] text-white/65" : "text-[13.5px] text-white/85 font-medium"}`}>
            {node.label}
          </span>
          <span className="ml-2 text-[11px] text-white/25 font-mono hidden sm:inline">{node.code}</span>
          {!hasOv && (
            <span className="ml-2 text-[11px]" style={{ color: inh ? "#5ebd7c99" : "#ff706699" }}>
              기본: {inh ? "허용" : "차단"}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <Btn active={hasOv && ov === true} color="#5ebd7c" onClick={() => apply(node.code, true)}>허용</Btn>
          <Btn active={hasOv && ov === false} color="#ff7066" onClick={() => apply(node.code, false)}>차단</Btn>
          <Btn active={!hasOv} color="#9db0ff" onClick={() => apply(node.code, null)}>기본</Btn>
          {saving === node.code && <span className="text-[11px] text-white/30 self-center">…</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="pt-3">
      <p className="text-[12px] text-white/35 mb-3">
        회원별 메뉴 권한 — 현재 등급 <b className="text-white/60">{member?.plan}</b> · 역할{" "}
        <b className="text-white/60">{member?.role}</b>. 상위 메뉴의 ▸ 를 누르면 하위메뉴가 펼쳐집니다.
        메뉴별 차단/허용은 등급·역할 기본값보다 우선합니다.
      </p>
      <p className="text-[11px] uppercase tracking-wider text-white/25 mb-1.5">메뉴 / 하위메뉴</p>
      <div className="space-y-1.5">
        {catalog.map((node) => (
          <div key={node.code} className="space-y-1.5">
            <Row node={node} />
            {expanded.has(node.code) &&
              (node.children ?? []).map((c) => <Row key={c.code} node={c} sub />)}
          </div>
        ))}
      </div>
    </div>
  );
}
