-- 0004_rbac_mappings.sql — Plan↔권한 / Role↔권한 매핑.
-- allowed 컬럼으로 관리자가 토글(선택수정) 가능. (RLS 정책은 0007 에서 관리자만 쓰기 허용)
create table if not exists public.plan_permissions (
  plan_code       text not null references public.plans(code) on update cascade on delete cascade,
  permission_code text not null references public.permissions(code) on update cascade on delete cascade,
  allowed         boolean not null default true,
  updated_at      timestamptz not null default now(),
  primary key (plan_code, permission_code)
);

create table if not exists public.role_permissions (
  role_code       text not null references public.roles(code) on update cascade on delete cascade,
  permission_code text not null references public.permissions(code) on update cascade on delete cascade,
  allowed         boolean not null default true,
  updated_at      timestamptz not null default now(),
  primary key (role_code, permission_code)
);

drop trigger if exists plan_perm_touch on public.plan_permissions;
create trigger plan_perm_touch before update on public.plan_permissions
  for each row execute function app.touch_updated_at();
drop trigger if exists role_perm_touch on public.role_permissions;
create trigger role_perm_touch before update on public.role_permissions
  for each row execute function app.touch_updated_at();
