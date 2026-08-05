-- 0006_projects_usage.sql — 연구 프로젝트 · 사용량 제한/로그 · 활동로그.
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null references public.profiles(id) on delete cascade,
  workspace_id text,
  title        text not null default '새 프로젝트',
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists projects_owner_idx on public.projects(owner_id);
create index if not exists projects_workspace_idx on public.projects(workspace_id);
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function app.touch_updated_at();

-- 등급별 사용량 한도 (예: AI 호출/월, 프로젝트 수). limit_value = -1 → 무제한.
create table if not exists public.usage_limits (
  plan_code   text not null references public.plans(code) on update cascade on delete cascade,
  metric      text not null,                 -- ai_calls | projects | exports ...
  limit_value int  not null default 0,
  period      text not null default 'month', -- month | total
  primary key (plan_code, metric)
);

create table if not exists public.usage_logs (
  id         bigint generated always as identity primary key,
  user_id    text not null references public.profiles(id) on delete cascade,
  metric     text not null,
  amount     int  not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists usage_logs_user_metric_idx on public.usage_logs(user_id, metric, created_at);

create table if not exists public.activity_logs (
  id         bigint generated always as identity primary key,
  user_id    text references public.profiles(id) on delete set null,
  action     text not null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_user_idx on public.activity_logs(user_id, created_at);
