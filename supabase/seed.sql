-- seed.sql — 기본 데이터(등급·역할·권한·매핑·레지스트리). `supabase db reset` 시 재적용.
-- 매핑은 기본값이며, 이후 관리자가 plan_permissions/role_permissions 를 직접 수정(토글)한다.

-- ── Plans ──
insert into public.plans (code, name, rank, price_monthly, description) values
  ('free',      'FREE',       0,     0, '기본 무료 등급'),
  ('basic',     'BASIC',      1,  9900, '개인 연구자용 기본 등급'),
  ('pro',       'PRO',        2, 29000, '전문 연구자용 고급 등급'),
  ('university','University', 3, 99000, '기관/팀용 최상위 등급')
on conflict (code) do nothing;

-- ── Roles ──
insert into public.roles (code, name, rank, description) values
  ('student',    'Student',    0, '학생'),
  ('researcher', 'Researcher', 1, '연구원'),
  ('professor',  'Professor',  2, '교수'),
  ('admin',      'Admin',      9, '관리자')
on conflict (code) do nothing;

-- ── Permissions (엔진 + 기능 + 관리자) ──
insert into public.permissions (code, name, category) values
  ('engine.research',   '연구 설계 엔진',   'engine'),
  ('engine.literature', '문헌 연구 엔진',   'engine'),
  ('engine.writing',    '논문 작성 엔진',   'engine'),
  ('engine.validation', '검토·검증 엔진',   'engine'),
  ('engine.schedule',   '논문 일정 엔진',   'engine'),
  ('engine.structure',  '논문구조 엔진',    'engine'),
  ('engine.analyzer',   '논문 분석 엔진',   'engine'),
  ('engine.critique',   '논문 크리틱 엔진', 'engine'),
  ('engine.library',    '문장 라이브러리',  'engine'),
  ('engine.references', '참고문헌 정리',    'engine'),
  ('engine.method',     '연구방법(QCA) 엔진','engine'),
  ('feature.ai_basic',          'AI 기본 사용',   'feature'),
  ('feature.ai_unlimited',      'AI 무제한 사용', 'feature'),
  ('feature.export_advanced',   '고급 내보내기',  'feature'),
  ('feature.project_unlimited', '프로젝트 무제한','feature'),
  ('feature.collaboration',     '팀 협업',        'feature'),
  ('admin.panel',               '관리자 패널',    'admin'),
  ('engine.apa',                'APA 인용 자동화 시스템','engine')
on conflict (code) do nothing;

-- ── Plan → 권한 기본 매핑 (등급별 누적) ──
insert into public.plan_permissions (plan_code, permission_code) values
  -- FREE
  ('free','engine.research'),('free','engine.literature'),('free','engine.library'),
  ('free','engine.references'),('free','feature.ai_basic'),
  -- BASIC (= FREE + 작성/일정/구조)
  ('basic','engine.research'),('basic','engine.literature'),('basic','engine.library'),
  ('basic','engine.references'),('basic','feature.ai_basic'),
  ('basic','engine.writing'),('basic','engine.schedule'),('basic','engine.structure'),
  -- PRO (= BASIC + 검증/분석/크리틱/방법/고급내보내기)
  ('pro','engine.research'),('pro','engine.literature'),('pro','engine.library'),
  ('pro','engine.references'),('pro','feature.ai_basic'),
  ('pro','engine.writing'),('pro','engine.schedule'),('pro','engine.structure'),
  ('pro','engine.validation'),('pro','engine.analyzer'),('pro','engine.critique'),
  ('pro','engine.method'),('pro','feature.export_advanced'),
  -- ENTERPRISE (= PRO + AI무제한/프로젝트무제한/협업)
  ('university','engine.research'),('university','engine.literature'),('university','engine.library'),
  ('university','engine.references'),('university','feature.ai_basic'),
  ('university','engine.writing'),('university','engine.schedule'),('university','engine.structure'),
  ('university','engine.validation'),('university','engine.analyzer'),('university','engine.critique'),
  ('university','engine.method'),('university','feature.export_advanced'),
  ('university','feature.ai_unlimited'),('university','feature.project_unlimited'),('university','feature.collaboration')
  ,('basic','engine.apa'),('pro','engine.apa'),('university','engine.apa')
on conflict (plan_code, permission_code) do nothing;

-- ── Role → 권한 기본 매핑 (역할별 누적) ──
insert into public.role_permissions (role_code, permission_code) values
  -- Student
  ('student','engine.research'),('student','engine.writing'),('student','engine.library'),
  -- Researcher (= Student + 문헌/방법/분석/참고문헌)
  ('researcher','engine.research'),('researcher','engine.writing'),('researcher','engine.library'),
  ('researcher','engine.literature'),('researcher','engine.method'),('researcher','engine.analyzer'),
  ('researcher','engine.references'),
  -- Professor (= Researcher + 크리틱/검증/구조)
  ('professor','engine.research'),('professor','engine.writing'),('professor','engine.library'),
  ('professor','engine.literature'),('professor','engine.method'),('professor','engine.analyzer'),
  ('professor','engine.references'),('professor','engine.critique'),('professor','engine.validation'),
  ('professor','engine.structure'),
  -- Admin
  ('admin','admin.panel')
  ,('researcher','engine.apa'),('professor','engine.apa')
on conflict (role_code, permission_code) do nothing;

-- ── Usage limits (등급별; -1 = 무제한) ──
insert into public.usage_limits (plan_code, metric, limit_value, period) values
  ('free','ai_calls',30,'month'),       ('free','projects',2,'total'),
  ('basic','ai_calls',200,'month'),     ('basic','projects',10,'total'),
  ('pro','ai_calls',2000,'month'),      ('pro','projects',100,'total'),
  ('university','ai_calls',-1,'month'), ('university','projects',-1,'total')
on conflict (plan_code, metric) do nothing;

-- ── Engines / Modules / Services 레지스트리 (대표 시드; 확장 가능) ──
insert into public.engines (code, name, en, status, sort) values
  ('research','연구 설계','Research Design','available',1),
  ('literature','문헌 연구','Literature','available',2),
  ('writing','논문 작성','Writing','available',3),
  ('validation','검토·검증','Validation','available',4),
  ('method','연구방법(QCA)','Research Method','available',5),
  ('references','참고문헌 정리','References','available',6),
  ('analyzer','논문 분석','Analyzer','available',7),
  ('critique','논문 크리틱','Critique','available',8),
  ('library','문장 라이브러리','Sentence Library','available',9),
  ('structure','논문구조 엔진','Structure','available',10),
  ('schedule','논문 일정','Schedule','available',11)
on conflict (code) do nothing;

insert into public.modules (code, engine_code, name, sort) values
  ('method.qca','method','혼합 질적내용분석',1),
  ('references.apa','references','APA 인용',1),
  ('writing.editor','writing','에디터',1),
  ('analyzer.stats','analyzer','통계 분석',1)
on conflict (code) do nothing;

insert into public.services (code, module_code, name, required_permission, sort) values
  ('method.qca.run','method.qca','QCA 파이프라인 실행','engine.method',1),
  ('method.qca.export','method.qca','결과 내보내기','feature.export_advanced',2),
  ('references.apa.generate','references.apa','참고문헌 생성','engine.references',1),
  ('writing.editor.ai','writing.editor','AI 작성 도우미','feature.ai_basic',1)
on conflict (code) do nothing;

-- ── 관리자 부트스트랩 (운영 시 실제 Clerk id/email 로 교체) ──
-- update public.profiles set role = 'admin', approval_status = 'approved' where email = 'you@example.com';
