-- ════════════════════════════════════════════════════════════
-- v7: 연구자 플랜(Researcher) 가입 — rdos_enrollment 와 대칭 구조.
--   · researcher 가입 신청(pending) → 관리자 승인(approved) → AI-Research-OS 진입
--   · 승인된 researcher 는 RDOS 에도 접근 가능(플랜 교차 접근)
--   · RDOS 회원이 미션 완료 후 '연구자 승급' 시에도 이 테이블에 approved 로 생성됨
-- ════════════════════════════════════════════════════════════
create table if not exists public.researcher_enrollment (
  user_id     text primary key,                       -- Clerk user id
  email       text,
  status      text not null default 'pending'
              check (status in ('pending','approved','active','rejected')),
  source      text not null default 'signup'          -- signup | upgrade(미션완료 승급)
              check (source in ('signup','upgrade')),
  profile     jsonb,                                   -- 소속기관·연구분야·ORCID·논문링크 등
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);
create index if not exists researcher_enrollment_status_idx on public.researcher_enrollment(status);

alter table public.researcher_enrollment enable row level security;
-- 정책 미정의 = Service Role(서버)만 접근.
