import "server-only";
import { getServiceSupabase } from "@/lib/supabase";
import { isSuperAdminEmail } from "@/lib/admin-config";
import { deriveRdosState, type RdosLearnerState } from "@ai-research-os/rdos-core";

/* ════════════════════════════════════════════════════════════
   RDOS 서버 데이터 레이어 (v3)
   - 학습 진행은 Supabase(rdos_progress)에 저장
   - 학습 상태(XP/역량/미션/정합성)는 rdos-core 커널로 도출(deriveRdosState)
   - 진입 권한은 슈퍼관리자 또는 승인된 enrollment
   - Supabase 미설정 시 시드값으로 graceful fallback (개발/데모)
═══════════════════════════════════════════════════════════════ */

export type RdosStatus = "pending" | "approved" | "active" | "rejected";
export interface RdosEnrollment {
  user_id: string; email: string | null; status: RdosStatus;
  streak_days: number; profile: Record<string, unknown> | null;
}

/** Supabase가 없을 때 사용하는 시드 진행 (데모) */
const SEED_PROGRESS: Record<string, number> = { basics: 3, structure: 2, design: 1, method: 1 };

export async function fetchProgress(userId: string): Promise<Record<string, number>> {
  const supabase = getServiceSupabase();
  if (!supabase) return { ...SEED_PROGRESS };
  const { data, error } = await supabase
    .from("rdos_progress")
    .select("menu_key, lessons_done")
    .eq("user_id", userId);
  if (error || !data || data.length === 0) return { ...SEED_PROGRESS };
  const out: Record<string, number> = {};
  for (const row of data as { menu_key: string; lessons_done: number }[]) out[row.menu_key] = row.lessons_done;
  return out;
}

export async function getEnrollment(userId: string): Promise<RdosEnrollment | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("rdos_enrollment")
    .select("user_id, email, status, streak_days, profile")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as RdosEnrollment;
}

/** v7: 연구자(Researcher) 등록 상태 조회 (플랜 교차 접근·승급 판정용) */
export async function getResearcherStatus(userId: string): Promise<RdosStatus | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("researcher_enrollment")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { status: RdosStatus }).status;
}

/** 커널에서 도출된 학습 상태 (대시보드/메뉴 페이지용) */
export async function getLearnerState(userId: string): Promise<RdosLearnerState> {
  const progress = await fetchProgress(userId);
  const enrollment = await getEnrollment(userId);
  const streakDays = enrollment?.streak_days ?? (Object.values(progress).some((v) => v > 0) ? 4 : 0);
  return deriveRdosState(progress, { streakDays });
}

/** 단일 메뉴 진행 조회 (메뉴 페이지용) */
export async function getMenuProgress(userId: string, menuKey: string): Promise<number> {
  const progress = await fetchProgress(userId);
  return progress[menuKey] ?? 0;
}

/* ── 접근 정책 (승인 기반 동적 게이팅) ──
   허용: 슈퍼관리자 이메일  OR  RDOS enrollment.status ∈ {approved, active}
        OR  연구자(Researcher) 승인 회원 (플랜 교차 접근 — 연구자는 RDOS 도 이용 가능). */
export async function isRdosAllowed(opts: { email: string | null; userId: string | null }): Promise<boolean> {
  if (isSuperAdminEmail(opts.email)) return true;
  if (!opts.userId) return false;
  const enrollment = await getEnrollment(opts.userId);
  if (enrollment?.status === "approved" || enrollment?.status === "active") return true;
  const researcher = await getResearcherStatus(opts.userId);
  return researcher === "approved" || researcher === "active";
}

/* ════════════════════════════════════════════════════════════
   v10: 학습 상태 스냅샷 — 사이드바 "저장" 버튼 ↔ 서버 연동
   - 저장은 rdos_progress(기존 스키마)에 그대로 영속화한다(스키마 변경 없음).
   - savedAt 은 rdos_progress.updated_at 의 최신값으로 표시한다.
   - Supabase 미설정 시 graceful fallback (persisted:false).
═══════════════════════════════════════════════════════════════ */
export interface RdosSaveMeta {
  savedAt: string | null;
  modules: number;
  totalLessons: number;
  persisted: boolean;
}

function summarize(progress: Record<string, number>) {
  const modules = Object.values(progress).filter((v) => v > 0).length;
  const totalLessons = Object.values(progress).reduce((a, b) => a + (b || 0), 0);
  return { modules, totalLessons };
}

/** 마지막 저장 시각·요약 조회 */
export async function getRdosSaveMeta(userId: string): Promise<RdosSaveMeta> {
  const progress = await fetchProgress(userId);
  const { modules, totalLessons } = summarize(progress);
  const supabase = getServiceSupabase();
  if (!supabase) return { savedAt: null, modules, totalLessons, persisted: false };
  const { data } = await supabase
    .from("rdos_progress")
    .select("updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const savedAt = (data as { updated_at?: string } | null)?.updated_at ?? null;
  return { savedAt, modules, totalLessons, persisted: true };
}

/** 현재 학습 진행을 서버에 저장(영속화)하고 저장 시각을 반환 */
export async function saveRdosSnapshot(userId: string): Promise<RdosSaveMeta> {
  const progress = await fetchProgress(userId);
  const { modules, totalLessons } = summarize(progress);
  const now = new Date().toISOString();
  const supabase = getServiceSupabase();
  if (!supabase) return { savedAt: now, modules, totalLessons, persisted: false };
  const rows = Object.entries(progress).map(([menu_key, lessons_done]) => ({
    user_id: userId, menu_key, lessons_done, updated_at: now,
  }));
  if (rows.length === 0) return { savedAt: now, modules, totalLessons, persisted: true };
  const { error } = await supabase
    .from("rdos_progress")
    .upsert(rows, { onConflict: "user_id,menu_key" });
  return { savedAt: now, modules, totalLessons, persisted: !error };
}
