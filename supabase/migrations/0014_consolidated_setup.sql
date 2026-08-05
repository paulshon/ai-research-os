-- ════════════════════════════════════════════════════════════
-- v9 통합 설정 — RDOS/연구자/문의 기능에 필요한 모든 테이블을 한 번에 생성(멱등).
-- 증상 "Could not find the table 'public.rdos_enrollment' in the schema cache" 는
-- 해당 테이블이 원격 DB에 없거나 PostgREST 스키마 캐시가 오래된 경우 발생한다.
-- 이 스크립트를 SQL Editor 에서 1회 실행하면 모든 테이블이 생성되고,
-- 마지막의 NOTIFY 로 스키마 캐시가 즉시 갱신된다.
-- ════════════════════════════════════════════════════════════

-- 1) 연구준비자(RDOS) 등록/승인
create table if not exists public.rdos_enrollment (
  user_id     text primary key,
  email       text,
  status      text not null default 'pending'
              check (status in ('pending','approved','active','rejected')),
  track       text not null default 'rdos',
  streak_days int  not null default 0,
  profile     jsonb,
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);

-- 2) 메뉴별 학습 진행
create table if not exists public.rdos_progress (
  user_id      text not null,
  menu_key     text not null,
  lessons_done int  not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, menu_key)
);

-- 3) RDOS 메뉴 전역 활성/비활성
create table if not exists public.rdos_menu_config (
  key        text primary key,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 4) 연구자(Researcher) 등록/승인 + 승급
create table if not exists public.researcher_enrollment (
  user_id     text primary key,
  email       text,
  status      text not null default 'pending'
              check (status in ('pending','approved','active','rejected')),
  source      text not null default 'signup'
              check (source in ('signup','upgrade')),
  profile     jsonb,
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text
);

-- 5) 랜딩 문의
create table if not exists public.contact_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  type       text,
  message    text,
  status     text not null default 'new' check (status in ('new','read','done')),
  created_at timestamptz not null default now()
);

create index if not exists rdos_enrollment_status_idx on public.rdos_enrollment(status);
create index if not exists rdos_progress_user_idx on public.rdos_progress(user_id);
create index if not exists researcher_enrollment_status_idx on public.researcher_enrollment(status);
create index if not exists contact_inquiries_created_idx on public.contact_inquiries(created_at desc);

-- RLS (서버 Service Role 만 접근; 문의는 공개 INSERT 허용)
alter table public.rdos_enrollment      enable row level security;
alter table public.rdos_progress         enable row level security;
alter table public.rdos_menu_config      enable row level security;
alter table public.researcher_enrollment enable row level security;
alter table public.contact_inquiries     enable row level security;

drop policy if exists contact_inquiries_insert_public on public.contact_inquiries;
create policy contact_inquiries_insert_public
  on public.contact_inquiries for insert to anon, authenticated with check (true);

-- 6) PostgREST 스키마 캐시 즉시 reload (schema cache 오류 해소)
notify pgrst, 'reload schema';
