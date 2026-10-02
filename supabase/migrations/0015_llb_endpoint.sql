-- LLB 게이트웨이(터널) 현재 주소. scripts/llb-start.ps1 이 쓰고 서버(service role)만 읽는다.
create table if not exists public.llb_endpoint (
  id text primary key,
  url text not null,
  updated_at timestamptz not null default now()
);
-- RLS 를 켜고 정책을 만들지 않는다 → anon/로그인 사용자는 접근 불가, service role 만 가능.
alter table public.llb_endpoint enable row level security;
