-- ═══════════════════════════════════════════
-- v10: 회원가입 운영자 승인 · 특별회원
-- 기존 가입 회원은 approved 로 일괄 처리
-- ═══════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_special_member BOOLEAN NOT NULL DEFAULT false;

-- 이미 가입된 회원은 승인 완료 처리 (신규만 pending)
UPDATE public.profiles
SET approval_status = 'approved'
WHERE approval_status = 'pending'
  AND created_at < now();

CREATE INDEX IF NOT EXISTS idx_profiles_approval_status
  ON public.profiles (approval_status);
