-- 0005_engines_modules_services.sql — 엔진/모듈/서비스 레지스트리.
-- 11 Engines → 65 Modules → 250 Services 규모로 확장 가능한 계층 구조.
-- 각 서비스는 required_permission 으로 접근 권한을 선언한다(NULL = 공개).
create table if not exists public.engines (
  code       text primary key,
  name       text not null,
  en         text,
  status     text not null default 'available' check (status in ('available','coming')),
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  code        text primary key,
  engine_code text not null references public.engines(code) on update cascade on delete cascade,
  name        text not null,
  sort        int not null default 0
);
create index if not exists modules_engine_idx on public.modules(engine_code);

create table if not exists public.services (
  code                text primary key,
  module_code         text not null references public.modules(code) on update cascade on delete cascade,
  name                text not null,
  required_permission text references public.permissions(code) on update cascade on delete set null,
  sort                int not null default 0
);
create index if not exists services_module_idx on public.services(module_code);
create index if not exists services_perm_idx on public.services(required_permission);
