-- ════════════════════════════════════════════════════════════
-- v5(과제 2): 메뉴 권한 카탈로그의 "모든" 코드(상위 + 하위)를 permissions 에 시드.
-- user_permission_overrides.permission_code → permissions(code) FK 를 항상 만족시켜
-- 하위 메뉴 차단/허용 저장 실패(FK 위반)를 근본 해소한다. 멱등(ON CONFLICT DO NOTHING).
-- (앱의 /api/admin/member-permissions POST 도 저장 직전 self-heal upsert 로 이중 보장)
-- ════════════════════════════════════════════════════════════

insert into public.permissions (code, name, category) values
  -- 상위 메뉴
  ('engine.research',            '연구 설계',            'engine'),
  ('engine.literature',          '문헌 연구',            'engine'),
  ('engine.writing',             '논문 작성',            'engine'),
  ('engine.validation',          '검토·검증',            'engine'),
  ('engine.schedule',            '논문일정',             'engine'),
  ('engine.structure',           '논문구조엔진',         'engine'),
  ('engine.method',              '연구방법',             'engine'),
  ('engine.analyzer',            '논문 분석',            'engine'),
  ('engine.critique',            '논문 크리틱',          'engine'),
  ('engine.library',             '문장 라이브러리',      'engine'),
  ('engine.references',          '참고문헌 정리',        'engine'),
  -- 문헌 연구 하위
  ('engine.literature.search',   '논문 검색',            'engine'),
  ('engine.literature.reading',  '읽기 공간',            'engine'),
  ('engine.literature.matrix',   '문헌 매트릭스',        'engine'),
  ('engine.literature.citation', '인용 관리',            'engine'),
  ('engine.literature.gap',      '갭 분석',              'engine'),
  ('engine.literature.collection','컬렉션',              'engine'),
  -- 논문 작성 하위
  ('engine.writing.quant',       '양적 연구',            'engine'),
  ('engine.writing.qual',        '질적 연구',            'engine'),
  ('engine.writing.others',      '그 외 연구유형',       'engine'),
  -- 검토·검증 하위
  ('engine.validation.apa',      '논문 형식 검증',       'engine'),
  ('engine.validation.ref',      '참고문헌 정리',        'engine'),
  ('engine.validation.abstract', '초록 작성',            'engine'),
  ('engine.validation.caption',  '그림/표 캡션',         'engine'),
  ('engine.validation.plagiarism','표절 검사',           'engine'),
  ('engine.validation.spell',    '맞춤법 검사',          'engine'),
  -- 논문 분석 하위
  ('engine.analyzer.source',     '원문',                 'engine'),
  ('engine.analyzer.overall',    '전체 분석',            'engine'),
  ('engine.analyzer.micro',      '미시 분석',            'engine'),
  ('engine.analyzer.sentence',   '문장 분석',            'engine'),
  ('engine.analyzer.suggestions','개선 제안',            'engine'),
  -- 논문 크리틱 하위
  ('engine.critique.logic',      '논리',                 'engine'),
  ('engine.critique.evidence',   '근거',                 'engine'),
  ('engine.critique.concept',    '개념',                 'engine'),
  ('engine.critique.style',      '문체',                 'engine'),
  ('engine.critique.structure',  '구조',                 'engine'),
  -- 참고문헌 하위
  ('engine.references.doi',      'DOI',                  'engine'),
  ('engine.references.ris',      'RIS',                  'engine'),
  ('engine.references.bibtex',   'BibTeX',               'engine')
on conflict (code) do nothing;
