-- 0001_profiles.sql — 회원 프로필 (인증은 Clerk, profiles.id = Clerk user id[text]).
-- 기존 앱 코드(webhook/clerk, membership-server, admin API)가 기대하는 컬럼과 일치.

create schema if not exists app;

-- updated_at 자동 갱신 트리거 함수
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create table if not exists public.profiles (
  id               text primary key,                         -- Clerk user id
  email            text,
  name             text,
  image_url        text,
  plan             text not null default 'free',             -- → plans.code
  role             text not null default 'student',          -- → roles.code
  approval_status  text not null default 'pending'
                     check (approval_status in ('pending','approved','rejected')),
  is_special_member boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists profiles_plan_idx on public.profiles(plan);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_approval_idx on public.profiles(approval_status);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();
