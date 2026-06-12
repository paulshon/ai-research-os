-- 0007_functions_rls.sql — 권한 헬퍼 함수 + RLS 정책.
-- 인증: Clerk JWT 의 sub 클레임(= profiles.id)을 request.jwt.claims GUC 에서 읽는다.

-- 현재 사용자 Clerk id
create or replace function app.current_uid()
returns text language sql stable as $$
  -- JWT 클레임이 없거나 빈 문자열이면 NULL (jsonb 캐스팅 오류 방지)
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '');
$$;

-- 관리자 여부 (RLS 재귀 방지를 위해 security definer)
create or replace function app.is_admin()
returns boolean language sql stable security definer set search_path = app, public as $$
  select exists(
    select 1 from public.profiles
    where id = app.current_uid() and role = 'admin'
  );
$$;

-- 권한 보유 여부: 현재 사용자의 plan 또는 role 매핑이 해당 권한을 allow 하면 true.
-- 관리자는 항상 true. 앱에서 supabase.rpc('has_permission', { perm_code }) 로 호출.
create or replace function public.has_permission(perm_code text)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists(
    select 1 from public.profiles pr
    left join public.plan_permissions pp
      on pp.plan_code = pr.plan and pp.permission_code = perm_code and pp.allowed
    left join public.role_permissions rp
      on rp.role_code = pr.role and rp.permission_code = perm_code and rp.allowed
    where pr.id = app.current_uid()
      and (pr.role = 'admin' or pp.permission_code is not null or rp.permission_code is not null)
  );
$$;

-- 현재 사용자의 유효 권한 목록(앱 부팅 시 일괄 로드용)
create or replace function public.my_permissions()
returns table(permission_code text) language sql stable security definer set search_path = public, app as $$
  with me as (select plan, role from public.profiles where id = app.current_uid())
  select p.code from public.permissions p, me
  where me.role = 'admin'
     or exists(select 1 from public.plan_permissions pp where pp.plan_code = me.plan and pp.permission_code = p.code and pp.allowed)
     or exists(select 1 from public.role_permissions rp where rp.role_code = me.role and rp.permission_code = p.code and rp.allowed);
$$;

-- ── RLS 활성화 ──
alter table public.profiles          enable row level security;
alter table public.plans             enable row level security;
alter table public.roles             enable row level security;
alter table public.permissions       enable row level security;
alter table public.plan_permissions  enable row level security;
alter table public.role_permissions  enable row level security;
alter table public.engines           enable row level security;
alter table public.modules           enable row level security;
alter table public.services          enable row level security;
alter table public.usage_limits      enable row level security;
alter table public.usage_logs        enable row level security;
alter table public.activity_logs     enable row level security;
alter table public.projects          enable row level security;

-- profiles: 본인 조회 / 관리자 전체. (민감필드 변경·생성은 service role 이 처리 → RLS 우회)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = app.current_uid() or app.is_admin());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all
  using (app.is_admin()) with check (app.is_admin());

-- 카탈로그(plans/roles/permissions/engines/modules/services/usage_limits): 공개 읽기, 관리자만 쓰기
do $$
declare t text;
begin
  foreach t in array array['plans','roles','permissions','engines','modules','services','usage_limits']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (true)', t, t);
    execute format('drop policy if exists %I_admin_write on public.%I', t, t);
    execute format('create policy %I_admin_write on public.%I for all using (app.is_admin()) with check (app.is_admin())', t, t);
  end loop;
end $$;

-- 권한 매핑: 공개 읽기(앱이 권한 계산), 관리자만 선택수정(insert/update/delete)
drop policy if exists plan_perm_read on public.plan_permissions;
create policy plan_perm_read on public.plan_permissions for select using (true);
drop policy if exists plan_perm_admin on public.plan_permissions;
create policy plan_perm_admin on public.plan_permissions for all
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists role_perm_read on public.role_permissions;
create policy role_perm_read on public.role_permissions for select using (true);
drop policy if exists role_perm_admin on public.role_permissions;
create policy role_perm_admin on public.role_permissions for all
  using (app.is_admin()) with check (app.is_admin());

-- projects: 소유자 본인 + 관리자
drop policy if exists projects_owner on public.projects;
create policy projects_owner on public.projects for all
  using (owner_id = app.current_uid() or app.is_admin())
  with check (owner_id = app.current_uid() or app.is_admin());

-- usage_logs: 본인 기록 추가 / 본인·관리자 조회
drop policy if exists usage_logs_insert on public.usage_logs;
create policy usage_logs_insert on public.usage_logs for insert
  with check (user_id = app.current_uid());
drop policy if exists usage_logs_read on public.usage_logs;
create policy usage_logs_read on public.usage_logs for select
  using (user_id = app.current_uid() or app.is_admin());

-- activity_logs: 본인 기록 추가 / 관리자 조회
drop policy if exists activity_logs_insert on public.activity_logs;
create policy activity_logs_insert on public.activity_logs for insert
  with check (user_id = app.current_uid() or user_id is null);
drop policy if exists activity_logs_read on public.activity_logs;
create policy activity_logs_read on public.activity_logs for select
  using (app.is_admin());
