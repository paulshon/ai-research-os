-- 0008 (v55) — 실제 배포 상태(첨부 스크린샷) 반영 + 회원별 메뉴 오버라이드.
-- 멱등(idempotent): 이미 배포된 DB에 다시 적용해도 안전. requesting_user_id() 호환 유지.

-- 0) profiles 컬럼 정합성(앱 코드가 쓰는 컬럼을 누락 없이 보장; 이미 있으면 무시)
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists orcid_id text,
  add column if not exists gemini_model text default 'gemini-2.5-flash',
  add column if not exists language text default 'ko',
  add column if not exists theme text default 'dark',
  add column if not exists editor_font_size int default 14,
  add column if not exists auto_save boolean default true,
  add column if not exists local_storage_path text,
  add column if not exists approved boolean default false;

-- 1) Clerk id 게터 정합성: app.current_uid() 정규화 + public.requesting_user_id() 동기화
create schema if not exists app;
create or replace function app.current_uid()
returns text language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '');
$$;
-- Clerk-Supabase 통합 표준 헬퍼와 동일 값 반환(이미 존재하면 동등 정의로 교체)
create or replace function public.requesting_user_id()
returns text language sql stable as $$
  select app.current_uid();
$$;

-- 2) ENTERPRISE → University 로 등급 개편 (자식 테이블까지 멱등 반영)
do $$
begin
  if exists (select 1 from public.plans where code = 'enterprise')
     and not exists (select 1 from public.plans where code = 'university') then
    update public.plans set code = 'university', name = 'University' where code = 'enterprise';
  end if;
end $$;
insert into public.plans (code, name, rank, price_monthly, description)
  values ('university', 'University', 3, 0, '대학·연구기관 플랜')
  on conflict (code) do update set name = excluded.name;
-- on update cascade FK 가 없거나 university 행이 이미 있어도 충돌 없이 이전(멱등)
update public.profiles set plan = 'university' where plan = 'enterprise';
insert into public.plan_permissions (plan_code, permission_code, allowed)
  select 'university', permission_code, allowed from public.plan_permissions where plan_code = 'enterprise'
  on conflict (plan_code, permission_code) do nothing;
delete from public.plan_permissions where plan_code = 'enterprise';
insert into public.usage_limits (plan_code, metric, limit_value, period)
  select 'university', metric, limit_value, period from public.usage_limits where plan_code = 'enterprise'
  on conflict (plan_code, metric) do nothing;
delete from public.usage_limits where plan_code = 'enterprise';
delete from public.plans where code = 'enterprise';

-- 3) APA 인용 자동화 권한 추가
insert into public.permissions (code, name, category) values
  ('engine.apa', 'APA 인용 자동화 시스템', 'engine')
on conflict (code) do nothing;

-- 4) 회원별 메뉴 오버라이드 (관리자가 회원별로 차단/허용 선택수정)
--    allowed = false → 해당 메뉴 차단,  true → 명시적 허용.  plan/role 매핑보다 우선.
create table if not exists public.user_permission_overrides (
  user_id         text not null references public.profiles(id) on delete cascade,
  permission_code text not null references public.permissions(code) on update cascade on delete cascade,
  allowed         boolean not null default false,
  updated_at      timestamptz not null default now(),
  primary key (user_id, permission_code)
);
create index if not exists upo_user_idx on public.user_permission_overrides(user_id);

-- updated_at 트리거 (app.touch_updated_at 가 없으면 생성)
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists upo_touch on public.user_permission_overrides;
create trigger upo_touch before update on public.user_permission_overrides
  for each row execute function app.touch_updated_at();

-- 5) 관리자 판별 (security definer)
create or replace function app.is_admin()
returns boolean language sql stable security definer set search_path = app, public as $$
  select exists (select 1 from public.profiles where id = app.current_uid() and role = 'admin');
$$;

-- 6) has_permission: 오버라이드 우선 → 관리자 → plan∪role
create or replace function public.has_permission(perm_code text)
returns boolean language plpgsql stable security definer set search_path = public, app as $$
declare uid text := app.current_uid(); ov boolean; isadmin boolean; granted boolean;
begin
  if uid is null then return false; end if;
  select allowed into ov from public.user_permission_overrides
    where user_id = uid and permission_code = perm_code;
  if found then return ov; end if;                 -- 회원별 오버라이드가 최우선
  select (role = 'admin') into isadmin from public.profiles where id = uid;
  if coalesce(isadmin, false) then return true; end if;
  select exists (
    select 1 from public.profiles pr
    left join public.plan_permissions pp on pp.plan_code = pr.plan and pp.permission_code = perm_code and pp.allowed
    left join public.role_permissions rp on rp.role_code = pr.role and rp.permission_code = perm_code and rp.allowed
    where pr.id = uid and (pp.permission_code is not null or rp.permission_code is not null)
  ) into granted;
  return coalesce(granted, false);
end $$;

-- 7) my_permissions: 오버라이드 반영한 유효 권한 목록
create or replace function public.my_permissions()
returns table(permission_code text)
language plpgsql stable security definer set search_path = public, app as $$
declare uid text := app.current_uid(); isadmin boolean;
begin
  if uid is null then return; end if;
  select (role = 'admin') into isadmin from public.profiles where id = uid;
  return query
    select p.code from public.permissions p
    left join public.user_permission_overrides uo on uo.user_id = uid and uo.permission_code = p.code
    where case
      when uo.permission_code is not null then uo.allowed
      when coalesce(isadmin, false) then true
      else exists (select 1 from public.plan_permissions pp join public.profiles pr on pr.id = uid
                    where pp.plan_code = pr.plan and pp.permission_code = p.code and pp.allowed)
        or exists (select 1 from public.role_permissions rp join public.profiles pr on pr.id = uid
                    where rp.role_code = pr.role and rp.permission_code = p.code and rp.allowed)
    end;
end $$;

-- 8) 오버라이드 테이블 RLS: 본인 조회 / 관리자 전체 관리
alter table public.user_permission_overrides enable row level security;
drop policy if exists upo_read on public.user_permission_overrides;
create policy upo_read on public.user_permission_overrides for select
  using (user_id = app.current_uid() or app.is_admin());
drop policy if exists upo_admin on public.user_permission_overrides;
create policy upo_admin on public.user_permission_overrides for all
  using (app.is_admin()) with check (app.is_admin());
