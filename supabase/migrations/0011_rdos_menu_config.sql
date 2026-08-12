-- ════════════════════════════════════════════════════════════
-- v5(과제 1): RDOS 메뉴 관리 — 슈퍼관리자가 RDOS 메뉴를 전역 활성/비활성.
-- 비활성 메뉴는 모든 RDOS 회원의 사이드바에서 숨겨진다(대시보드/관리자는 항상 노출).
-- 행이 없으면 기본 활성(enabled=true)으로 간주한다.
-- ════════════════════════════════════════════════════════════

create table if not exists public.rdos_menu_config (
  key        text primary key,            -- RDOS_MENUS 의 key
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.rdos_menu_config enable row level security;
-- 정책 미정의 = anon/authenticated 직접 접근 불가. Service Role(서버)만 접근.
