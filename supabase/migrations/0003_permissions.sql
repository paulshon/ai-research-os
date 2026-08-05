-- 0003_permissions.sql — 권한 카탈로그.
create table if not exists public.permissions (
  code        text primary key,              -- 예: engine.writing, admin.panel, export.advanced
  name        text not null,
  category    text not null default 'engine', -- engine | module | service | feature | admin
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists permissions_category_idx on public.permissions(category);
