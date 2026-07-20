-- ════════════════════════════════════════════════════════════
-- v7/v8: 랜딩페이지 문의하기 → DB 저장 → 관리자 페이지 노출
-- ════════════════════════════════════════════════════════════
create table if not exists public.contact_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  type       text,
  message    text,
  status     text not null default 'new'
             check (status in ('new','read','done')),
  created_at timestamptz not null default now()
);
create index if not exists contact_inquiries_created_idx on public.contact_inquiries(created_at desc);

alter table public.contact_inquiries enable row level security;

-- v8: 공개 문의 폼은 누구나(anon/authenticated) INSERT 가능해야 한다.
--     (서비스 롤 키가 없어도 anon 키로 문의가 저장되도록 보장)
--     SELECT 정책은 두지 않으므로 조회는 Service Role(관리자 API)만 가능.
drop policy if exists contact_inquiries_insert_public on public.contact_inquiries;
create policy contact_inquiries_insert_public
  on public.contact_inquiries for insert
  to anon, authenticated
  with check (true);
