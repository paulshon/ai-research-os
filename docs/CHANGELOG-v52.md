# Changelog — v52

## 신규: 연구방법(Research Method) 엔진

논문구조엔진(THESIS_CATEGORIES)과 동일한 "카테고리 → 유형" 확장 구조를 갖는
**연구방법 엔진**을 새 메뉴/페이지로 추가했습니다. 연구방법 유형을 계속 추가할 수
있으며, 각 유형은 전용 하위 페이지와 그 유형에 필요한 메뉴(워크플로우)를 자동으로
가집니다.

- 새 메뉴: 사이드바 AI Tools 영역에 **연구방법**(아이콘 `method`, accent `#3ecfb2`).
  모바일/태블릿 내비게이션에도 자동 반영(`ENGINE_ITEMS`).
- 새 라우트:
  - `/method` — 연구방법 카탈로그(카테고리·유형 카드, 상태 배지, 단계 미리보기).
  - `/method/[type]` — 유형별 작업 페이지. `available` 유형은 전용 작업공간을,
    `coming` 유형은 메뉴 골격을 렌더링.
- 레지스트리: `lib/method/registry.ts` (`METHOD_CATEGORIES`, `MethodType`,
  `getMethodType`). 새 유형 추가 = 배열에 항목 1개 추가.
- 다국어(ko/en/zh): `sidebar.method`, `sidebar.tabMethod`, `pages.method.*` 추가.
- 페이지 영속화: `PageId`에 `method` 추가(임시저장/.aros 로드/리셋 연동).

## 신규 유형: 혼합 질적내용분석 (Mixed Qualitative Content Analysis)

`Codebook-Driven QCA System v3`(Python/Tkinter)을 분석하여 **혼합 질적내용분석**
유형으로 명명하고, 핵심 엔진을 TypeScript로 이식해 **브라우저에서 100% 로컬 실행**
가능하도록 탑재했습니다.

- 엔진: `lib/method/qca/` (project, cleaner, counter, frequency, codebook,
  coding, category, theme, network, interpret, importer, exporter).
  - SQLite → 인메모리 `QcaProject`(직렬화 가능, 드래프트에 저장).
  - 코딩: 규칙기반 + 의미기반(순수 TF-IDF 코사인) + 하이브리드, 신뢰도·다중코드.
  - 네트워크: 키워드/코드/도시 그래프 + degree·betweenness(가중 Brandes)·
    eigenvector·greedy-modularity 커뮤니티 — networkx 결과와 일치.
  - 해석: 연구방법·결과·논의·결론 초안(데이터 근거 템플릿, 선택적 AI 윤문).
- 10단계 작업공간: `components/method/qca-workspace.tsx`
  (1.프로젝트 2.자료수집 3.텍스트정제 4.빈도분석 5.코드북 6.자동코딩 7.범주·주제
  8.네트워크분석 9.해석·논문 10.내보내기). 기본 36문장 샘플 코퍼스 내장.
- 코드북: 기본 코드북(6코드/3상위범주) + Excel 코드북 가져오기
  (v3 다중시트 `2_Codebook_Master` + `4_Word_Criteria` + `5_Sentence_Criteria`
  자동 병합, 단일시트 폴백).
- 내보내기: 결과 워크북(.xlsx, SheetJS), 보고서(.md), 코딩(.csv), 전체(.json).

## 논문 작성 연동 (스크린샷 우상단 빨강 주석 반영)

연구방법 엔진의 산출 절(연구방법·결과·논의·결론)을 **논문 작성**으로 전달·삽입.

- 브리지: `lib/method/bridge.ts` (localStorage `aros:method:outputs`,
  `METHOD_OUTPUTS_EVENT`).
- 작업공간 9단계에서 절별/전체 "논문 작성에 적용".
- 논문 작성 툴바에 **연구방법** 버튼 + `components/method/method-insert-panel.tsx`
  슬라이드 패널 → 커서 위치에 절 삽입(`RichTextEditorHandle.insertText`).

## 검증 (실행·정밀 대조)

이식 엔진을 샘플 코퍼스(브라우저와 동일한 SheetJS 파싱 경로)로 끝까지 실행하여
Python 레퍼런스 수치와 **27개 항목 전부 일치**함을 확인했습니다.

- 36문장 / 288토큰 / 고유어휘 160 / 문장당 8.0.
- 상위어 font·digital·typography·through·hangul·system(6), human·global(5).
- 자동코딩 48배정 / 2모호. 상위범주 19/15/14.
- 키워드 네트워크 37노드·54엣지, degree top seoul(7)…
- 커뮤니티 6개 · 모듈성 0.6774 · betweenness hangul/variable/seoul =
  0.4286/0.3667/0.3254 (networkx와 동일).
- 검증 하니스: `docs/연구방법엔진파일/qca-verification/harness.ts`.

## 검증 게이트

- `tsc --noEmit`: 통과(0 errors).
- `next build`: 성공(22/22 페이지). 신규 라우트 `/method`, `/method/[type]` 포함.
