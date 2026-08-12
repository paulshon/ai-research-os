-- 0009_menu_permissions_catalog.sql
-- v62: 사이드바의 "전 메뉴(및 하위메뉴)" 에 대해 관리자가 회원별 차단/허용을 할 수 있도록
--      permissions 카탈로그에 누락된 메뉴 코드를 멱등(ON CONFLICT DO NOTHING)으로 보장한다.
-- 기존 행은 절대 변경하지 않으며, 어떤 환경(부분 시드/완전 시드)에서 실행되어도 안전하다.

insert into public.permissions (code, name, category) values
  -- 사이드바 주요 메뉴 (대시보드는 제외 — 항상 노출, 차단 대상 아님)
  ('engine.research',         '연구 설계',           'engine'),
  ('engine.literature',       '문헌 연구',           'engine'),
  ('engine.writing',          '논문 작성',           'engine'),
  ('engine.validation',       '검토·검증',           'engine'),
  ('engine.schedule',         '논문일정',            'engine'),
  ('engine.structure',        '논문구조엔진',        'engine'),
  ('engine.method',           '연구방법',            'engine'),
  ('engine.analyzer',         '논문 분석',           'engine'),
  ('engine.critique',         '논문 크리틱',         'engine'),
  ('engine.library',          '문장 라이브러리',     'engine'),
  ('engine.references',       '참고문헌 정리',       'engine'),
  -- 하위 페이지 (별도 라우트로 존재하는 경우)
  ('engine.literature_review','문헌 리뷰 (하위)',    'engine'),
  ('engine.references_apa',   'APA 인용 자동화 (하위)','engine')
on conflict (code) do nothing;

-- 기본 plan 매핑 — 누락분만 추가 (기존 매핑은 보존).
-- free 사용자는 기본적으로 read 권한만 가질 수도 있으나, v61부터 게이팅은
-- "관리자가 명시적 차단(allowed=false)" 한 메뉴만 숨기는 blocklist 방식이므로,
-- 여기서는 추가 매핑 없이 카탈로그 보장만 한다.
