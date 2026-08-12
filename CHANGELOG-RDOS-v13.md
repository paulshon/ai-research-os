# AI-Research-OS RDOS v13 — Changelog

v13은 v12(APA Citation Knowledge Graph) 위에 세 가지를 추가·수정했습니다.

## 1. 구조 엔진 — 확장 논문 유형 10종 추가 (24종 → 34종)
첨부 "범주별 유형별 논문정리(.xlsx)"와 각 유형별 "거시·미시 구조 완전가이드(.docx)"를
분석·반영하여, 기존 유형과 동일한 `Chapter[]` 포맷(거시 흐름·미시 문단·좋은/탈락 패턴)으로
신규 유형을 정리했습니다.

신규 카테고리·유형:
- **🔷 디지털·계산 연구형**: ㉕ 디지털 인문학 · ㉖ 데이터 사이언스 · ㉗ 네트워크 분석 · ㉘ 시뮬레이션 연구
- **🟠 철학·해석형**: ㉙ 철학적 논증 · ㉚ 해석학 연구 · ㉛ 현상학 연구
- **⚫ 학제간·미래형**: ㉜ 융합 연구 · ㉝ 미래예측 연구 · ㉞ 설계기반 연구

각 유형은 대표 서적의 방법론을 반영(예: 현상학=IPA/Merleau-Ponty, 해석학=Gadamer/Ricoeur,
철학적 논증=Weston·Graff/Birkenstein, 시뮬레이션=Law·Banks, 네트워크=Scott·Borgatti,
데이터사이언스=Provost·Hastie, 디지털인문학=Burdick·Rockwell, 융합=Repko·Szostak·Frodeman,
미래예측=Delphi(Linstone·Turoff)·시나리오(Lindgren), 설계기반=McKenney·Reeves·Bakker).

구현:
- 신규 파일 `apps/web/lib/research-data-ext.ts` — 10개 `CHAPTERS_*` 배열 + `EXT_CHAPTERS` 맵.
- `apps/web/lib/research-data.ts` — `THESIS_CATEGORIES`에 4개 카테고리/10개 유형 추가,
  `getChapters()`에 `...EXT_CHAPTERS` 병합, `EXT_CHAPTERS` import.
- 구조 엔진 페이지·우측 유형 선택 `<select>`·본문 유형 버튼에 자동 노출(KO 기준).
  i18n 미매핑 유형은 한글명으로 자연스럽게 폴백.

## 2. 모든 메뉴의 우측 프레임 — 좌측 경계 드래그 리사이즈
각 메뉴 페이지의 오른쪽 프레임(AI Copilot / AI 분석 패널)의 **왼쪽 경계를 드래그**하여
좌측으로 확장/축소할 수 있게 했습니다(더블클릭 시 기본 너비 복원, 너비는 메뉴별 저장).

- 신규 컴포넌트 `apps/web/components/ui/resizable-right-panel.tsx`
  (포인터 드래그, min/max 클램프, `localStorage` 저장, 데스크톱 전용·모바일 반응형 유지,
  `md`/`lg` 브레이크포인트 지원).
- 적용 페이지: 논문구조엔진(structure), 논문 분석(analyzer), 논문 크리틱(critique),
  논문 작성(writing). (literature-review/validation/schedule은 전체높이 AI 프레임이 아닌
  카드형 보조 사이드라 제외 — 레이아웃 안정성 보존.)

## 3. APA 인용 자동화 시스템 — 클라이언트 예외(Application error) 해결
"APA 인용 자동화 시스템 열기" 시 발생하던
`Application error: a client-side exception has occurred` 크래시를 수정했습니다.

- 원인: `APAAutomationSystem` 컴포넌트에서 `graph` `useMemo`가 `if (!open) return null;`
  **조기 반환 뒤**에 선언되어 있었습니다. 모달을 열 때(open false→true) 렌더되는 훅 수가
  증가하며 React의 Rules of Hooks 위반("Rendered more hooks than previous render")으로
  런타임 예외가 발생했습니다. esbuild 파싱·tsc 타입체크는 통과하지만 런타임에서만 드러나는 버그.
- 수정: `graph` `useMemo`를 다른 훅들과 함께 조기 반환 **이전**으로 이동. 이제 모든 훅이
  조건부 반환보다 앞서 호출됩니다.

## 검증
- esbuild 파싱: 수정/신규 8개 파일 전부 통과(research-data, research-data-ext,
  resizable-right-panel, structure/analyzer/critique/writing 페이지, apa-automation-system).
- strict tsc(React 타입 + `@/*` 경로): research-data·research-data-ext·resizable-right-panel·
  apa-automation-system **무오류**.
- Node 런타임 검증: 신규 10개 유형 `getChapters()`가 올바른 장 수 반환
  (현상학·해석학·철학·디지털인문학·데이터사이언스·네트워크 7장, 시뮬레이션·융합·미래예측·설계기반 9장),
  4개 신규 카테고리·유형명 노출 확인.
- 비고: Clerk/Supabase 키 부재로 전체 `next build`/실서버 부팅은 미실행. 검증은
  (esbuild 파싱 + strict tsc + Node 런타임 테스트)로 수행.

## 버전
- `apps/web/package.json`: 12.0.0 → **13.0.0**.
