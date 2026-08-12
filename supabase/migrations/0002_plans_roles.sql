-- 0002_plans_roles.sql — 회원 등급(Plan) · 역할(Role) 마스터.
create table if not exists public.plans (
  code          text primary key,            -- free | basic | pro | enterprise
  name          text not null,
  rank          int  not null default 0,     -- 등급 서열(권한 상속/비교용)
  price_monthly numeric not null default 0,
  description   text,
  created_at    timestamptz not null default now()
);

create table if not exists public.roles (
  code        text primary key,              -- student | researcher | professor | admin
  name        text not null,
  rank        int  not null default 0,
  description text,
  created_at  timestamptz not null default now()
);

-- profiles.plan / profiles.role 가 마스터를 참조하도록 FK 연결(기존 데이터 호환 위해 NOT VALID 후 검증)
alter table public.profiles
  drop constraint if exists profiles_plan_fk,
  drop constraint if exists profiles_role_fk;
alter table public.profiles
  add constraint profiles_plan_fk foreign key (plan) references public.plans(code) on update cascade,
  add constraint profiles_role_fk foreign key (role) references public.roles(code) on update cascade;
