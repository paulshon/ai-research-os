-- ════════════════════════════════════════════════════════════
-- RDOS (연구준비자) — 가입/승인 + 학습 진행 (v3)
-- 학습 상태(XP·역량·미션·정합성)는 애플리케이션의 rdos-core 커널에서 도출하며,
-- DB에는 "원천 데이터"(승인 상태 + 메뉴별 완료 레슨)만 저장한다.
-- ════════════════════════════════════════════════════════════

-- 연구준비자 등록/승인
create table if not exists public.rdos_enrollment (
  user_id     text primary key,                         -- Clerk user id
  email       text,
  status      text not null default 'pending'
              check (status in ('pending','approved','active','rejected')),
  track       text not null default 'rdos',
  streak_days int  not null default 0,
  profile     jsonb,                                     -- 가입 폼(이름/소속대학/학과/관심분야 등)
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);

-- 메뉴별 학습 진행 (완료 레슨 수) — 커널 도출의 입력
create table if not exists public.rdos_progress (
  user_id      text not null,
  menu_key     text not null,                            -- basics | structure | design | ...
  lessons_done int  not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, menu_key)
);

create index if not exists rdos_enrollment_status_idx on public.rdos_enrollment(status);
create index if not exists rdos_progress_user_idx on public.rdos_progress(user_id);

-- RLS: 서버(Service Role)만 직접 조작. 클라이언트 직접 접근 차단.
alter table public.rdos_enrollment enable row level security;
alter table public.rdos_progress  enable row level security;
-- (정책 미정의 = 익명/anon 접근 불가. 서버 Service Role 키는 RLS를 우회)
