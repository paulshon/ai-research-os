-- ════════════════════════════════════════════════════════════
-- v4: 실시간 협업 문서 영속화 (Hocuspocus/Yjs CRDT 상태 저장)
-- 감사보고서 2.1 해결: 실시간 서버가 문서를 실제로 로드/저장하도록 한다.
-- state 는 Yjs 문서의 바이너리 상태를 base64 로 인코딩하여 저장.
-- 접근 제어는 애플리케이션(실시간 서버의 onAuthenticate)에서 수행하며,
-- DB 직접 접근은 Service Role 만 허용한다(RLS 정책 미정의 = anon 차단).
-- ════════════════════════════════════════════════════════════

create table if not exists public.collab_documents (
  name        text primary key,                 -- 문서 키 (예: project:<uuid>)
  owner_id    text references public.profiles(id) on delete cascade,
  state_b64   text not null default '',         -- Yjs update(바이너리) base64
  updated_at  timestamptz not null default now()
);
create index if not exists collab_documents_owner_idx on public.collab_documents(owner_id);

alter table public.collab_documents enable row level security;
-- (정책 미정의 = anon/authenticated 직접 접근 불가. 실시간 서버의 Service Role 키만 RLS 우회)
