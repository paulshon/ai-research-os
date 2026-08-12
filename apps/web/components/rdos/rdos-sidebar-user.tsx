"use client";

import { useCallback, useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { useSafeUser, useSafeClerk } from "@/hooks/use-safe-clerk";
import { LogOut } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useTranslation } from "@/lib/i18n";

/* ════════════════════════════════════════════════════════════
   RDOS 사이드바 사용자 영역 (v10)
   - 사용자 정보(아바타·이름·이메일)
   - 서버 저장 버튼 (/api/rdos/state, rdos_progress 영속화)
   - 로그아웃 버튼 (Clerk signOut)
   Clerk 미설정(데모) 시: 사용자명 placeholder + 저장 비활성 안내.
═══════════════════════════════════════════════════════════════ */

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const USER_BTN_APPEARANCE = {
  elements: {
    avatarBox: "w-9 h-9",
    userButtonPopoverCard:
      "bg-[#13161e] border border-white/[0.08] shadow-2xl rounded-[14px] !text-[#e8eaf0]",
    userButtonPopoverActionButton: "text-[#e8eaf0] hover:bg-white/[0.05] rounded-[8px]",
    userButtonPopoverActionButtonText: "text-[#e8eaf0] text-[14px] font-medium",
    userButtonPopoverActionButtonIcon: "text-[#9ba3b8]",
    userButtonPopoverFooter: "hidden",
    userPreviewMainIdentifier: "text-[#e8eaf0] font-semibold text-[14px]",
    userPreviewSecondaryIdentifier: "text-[#9ba3b8] text-[12px]",
  },
};

type SaveState = "idle" | "saving" | "saved" | "error";

function formatSavedAt(iso: string | null, t: (key: string) => string): string {
  if (!iso) return t("rdos.sidebarUser.neverSaved");
  const d = new Date(iso);
  if (isNaN(d.getTime())) return t("rdos.sidebarUser.savedGeneric");
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return t("rdos.sidebarUser.savedToday").replace("{time}", `${hh}:${mm}`);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return t("rdos.sidebarUser.savedDate")
    .replace("{date}", `${mo}.${dd}`)
    .replace("{time}", `${hh}:${mm}`);
}

export default function RdosSidebarUser({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { user, isLoaded } = useSafeUser();
  const clerk = useSafeClerk();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>("idle");

  const displayName = user?.fullName ?? user?.firstName ?? t("rdos.sidebarUser.guestName");
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initial = (displayName || "R").slice(0, 1).toUpperCase();

  useEffect(() => {
    let active = true;
    fetch("/api/rdos/state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d) setSavedAt(d.savedAt ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const onSave = useCallback(async () => {
    setState("saving");
    try {
      const r = await fetch("/api/rdos/state", { method: "POST" });
      if (!r.ok) throw new Error("save failed");
      const d = await r.json();
      setSavedAt(d.savedAt ?? new Date().toISOString());
      setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 2400);
    } catch {
      setState("error");
      setTimeout(() => setState((s) => (s === "error" ? "idle" : s)), 2800);
    }
  }, []);

  const onLogout = useCallback(() => {
    clerk.signOut({ redirectUrl: "/" });
  }, [clerk]);

  const saveLabel =
    state === "saving" ? t("rdos.sidebarUser.saving")
    : state === "saved" ? t("rdos.sidebarUser.saved")
    : state === "error" ? t("rdos.sidebarUser.retry")
    : t("rdos.sidebarUser.save");
  const saveIcon = state === "saving" ? "refresh" : state === "saved" ? "check" : state === "error" ? "warn" : "cloud";

  return (
    <div className="mt-auto border-t border-white/[0.06] px-3 py-3 space-y-2.5 bg-[#0a0c10]">
      {/* 사용자 정보 */}
      <div className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-[11px] hover:bg-white/[0.04] transition-colors">
        {hasClerk ? (
          <UserButton afterSignOutUrl="/" appearance={USER_BTN_APPEARANCE} />
        ) : (
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold bg-[#3ecfb2]/18 text-[#3ecfb2] flex-shrink-0">
            {initial}
          </span>
        )}
        {!compact && (
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold truncate text-[#e8eaf0] leading-tight">
              {isLoaded || !hasClerk ? displayName : t("rdos.sidebarUser.loading")}
            </p>
            {email && (
              <p className="text-[11.5px] truncate text-[#626880] leading-tight mt-0.5">{email}</p>
            )}
            <p className="text-[10.5px] text-[#4b5169] leading-tight mt-1">{formatSavedAt(savedAt, t)}</p>
          </div>
        )}
      </div>

      {/* 저장 · 로그아웃 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={state === "saving"}
          title={t("rdos.sidebarUser.saveTitle")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[10px] text-[12.5px] font-semibold transition-all
            ${state === "saved"
              ? "bg-[#3ecfb2]/18 text-[#3ecfb2]"
              : state === "error"
              ? "bg-[#ff7066]/15 text-[#ff7066]"
              : "bg-[#3ecfb2] text-[#06120f] hover:-translate-y-[1px]"} disabled:opacity-70`}
        >
          <Icon name={saveIcon} size={14} className={state === "saving" ? "animate-spin" : ""} />
          {!compact && <span>{saveLabel}</span>}
        </button>
        <button
          type="button"
          onClick={onLogout}
          title={t("rdos.sidebarUser.logoutTitle")}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[10px] text-[12.5px] font-medium text-white/55 border border-white/[0.1] hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-all"
        >
          <LogOut size={14} />
          {!compact && <span>{t("rdos.sidebarUser.logout")}</span>}
        </button>
      </div>

      {!hasClerk && !compact && (
        <p className="text-[10px] text-white/25 leading-snug px-1">
          {t("rdos.sidebarUser.clerkNotice")}
        </p>
      )}
    </div>
  );
}
