# CHANGELOG v25 — UX·IA·서지정보 기능 개선

첨부된 이슈 1~7을 분석하여 수정했습니다. 이슈 1=5, 2=6은 동일 내용이므로
실제로는 5개의 구별되는 작업 항목으로 정리했습니다.

---

## 이슈 분석 요약

| 이슈 | 내용 | 처리 |
|------|------|------|
| 1 = 5 | 주요 페이지별 UX (Literature 인용탭/scholar API, Writing 에디터, Critique 모바일, Research 빈 껍데기) | 수정 |
| 2 = 6 | DOI-우선 메타데이터 파이프라인 | 신규 구현 |
| 3 | 디자인 시스템 (하드코딩 색상, 토큰 부재) | 토큰화 |
| 4 | 사이드바 IA (Literature/LitReview 중복, 14개 과다, /review 불일치) | 재구성 |
| 7 | 서지정보 포맷 불러오기 + 참고문헌 리스트 연동 | 신규 구현 |

> 참고: 이슈 1/5에서 "`/api/scholar`가 구현되지 않았다"고 되어 있었으나,
> 실제 코드에는 OpenAlex·CrossRef·Semantic Scholar를 호출하는 394줄짜리
> 완전한 라우트가 이미 존재했습니다. 문제는 API 자체가 아니라 **인용 관리 탭이
> citation-core 파이프라인과 연결되지 않은 것**이었으므로 그 연결을 구현했습니다.

---

## Issue 4 — 사이드바 IA 재구성

첨부해 주신 사이드바 코드를 적용하되, 모바일 하단 네비게이션
(`dashboard-shell.tsx`)이 `tabKey`를 사용하므로 해당 필드를 보존했습니다.
(첨부 버전 그대로 적용 시 안드로이드 하단 탭 라벨이 깨짐)

- **Literature + Literature Review 통합** → `/literature` 한 메뉴로. literature-review
  경로도 Literature 활성 상태로 인식. (중복/혼란 제거)
- **Research Flow / AI Tools 섹션 경계 명확화**
- **총 14개 → 10개로 축소** (인지 과부하 해소)
- **`/review` → `/validation` URL 불일치 수정** (review 항목이 `/validation` 직접 지정)
- 파일: `components/dashboard/sidebar.tsx`

## Issue 7 — 서지정보 포맷 불러오기 & 참고문헌 리스트 연동

Literature 페이지의 "인용 관리" 탭을 실제 기능으로 구현 (기존엔 "준비 중" 빈 화면).

- **신규 컴포넌트** `components/citation/citation-manager.tsx`
  - 서지정보 불러오기: **DOI 조회 / RIS 붙여넣기 / BibTeX 붙여넣기**
  - 7개 인용 스타일 변환: **APA7 · MLA9 · Chicago · IEEE · Vancouver · Harvard · Nature**
  - 내보내기: **RIS(.ris) / BibTeX(.bib) 파일 다운로드, 선택 스타일로 목록 복사**
  - 신뢰도 배지 + 검증(validateCitation) 표시
  - 불러온 서지정보가 **참고문헌 리스트에 자동 추가** (양방향 연동)
- **citation-core에 RIS/BibTeX 파서 추가** (`parseRIS`, `parseBibTeX`,
  `parseBibliographicText`, `toCanonicalCitation`) — 기존엔 내보내기만 있고
  불러오기 파서가 없었음
- Literature 페이지에 `ReferenceItem ↔ CanonicalCitation` 변환기 추가하여
  검색 결과·인용 관리가 동일한 참고문헌 리스트를 공유
- 파일: `app/(dashboard)/literature/page.tsx`, `packages/citation-core/src/index.ts`

## Issue 2/6 — DOI-우선 메타데이터 파이프라인

- **신규 API** `app/api/citation-lookup/route.ts`
  - Step 0: 입력에서 DOI 추출 (정규식, doi.org URL, RIS/BibTeX 내부 DOI 포함)
  - Step 3: DOI로 **Crossref** 조회 (신뢰도 95%)
  - Step 4: 실패 시 **OpenAlex → Semantic Scholar** 순차 폴백
  - Step 5: 모두 실패 시 수동 입력 안내 응답
  - 핵심: DOI 하나로 출판사 형식과 무관하게 표준 메타데이터 확보
- citation-core의 `extractDOIs`, `parseCrossRefResponse`, `parseOpenAlexResponse`,
  `computeConfidenceScore` 재사용

## Issue 1/5 — 페이지별 UX 개선

### Research 페이지 (빈 껍데기 → 섹션별 고유 기능)
6개 섹션(주제탐색/연구질문/개념매핑/방법론설계/연구로드맵/연구기억)이 모두
동일한 AI 채팅에 연결되던 문제를 해결. 각 섹션마다 **고유한 AI 시스템 프롬프트,
작업 동작 버튼, 입력 플레이스홀더**를 부여. 주제탐색은 학술 검색+AI 제안,
나머지는 섹션 특화 생성.
- 파일: `app/(dashboard)/research/page.tsx`

### Writing 페이지 (textarea → 리치 에디터, editor-core 사용)
단순 `<textarea>`를 **서식 지원 리치 텍스트 에디터**로 교체. editor-core 패키지의
`EDITOR_DEFAULTS`를 사용하여 코드 분리 목적 달성. 제목(H1~H3)·굵게·기울임·밑줄·
목록·인용구 툴바 제공. AI 코파일럿 출력을 **에디터에 직접 삽입**하는 버튼 추가
(코파일럿-에디터 연동).
- 신규: `components/editor/rich-text-editor.tsx`
- 파일: `app/(dashboard)/writing/page.tsx`

### Critique 페이지 (모바일 스크롤 개선)
이미 3-pane 모바일 전환 + 카테고리 칩 줄바꿈이 적용되어 있었음. 카드가 많을 때
카테고리 필터를 잃지 않도록 **필터 헤더를 sticky 고정**하여 모바일 스크롤 부담 완화.
- 파일: `app/(dashboard)/critique/page.tsx`

## Issue 3 — 디자인 토큰 시스템

컴포넌트에 하드코딩되던 색상(#0d0f14, #13161e 등)을 **의미 기반 CSS 토큰**으로
단일화. 색상/표면/경계/텍스트/강조/상태/간격/반경 토큰을 문서화하고,
`data-theme="light"` 라이트 모드 토큰 스캐폴드를 추가하여 향후 테마 전환 기반 마련.
- 파일: `app/globals.css`

### 빌드 설정
- `citation-core`, `document-core`를 `transpilePackages`에 추가
  (클라이언트 컴포넌트에서 TS 소스 패키지 import 가능하도록)
- 파일: `apps/web/next.config.ts`

---

## 검증
- `npm run build -w @ai-research-os/web` → 성공(EXIT 0), 정적 페이지 21개 생성
  (신규 `/api/citation-lookup` 추가로 20 → 21)
- `tsc --noEmit` → 타입 에러 0건
- citation-core 파서 단위 검증: RIS/BibTeX 파싱, 7개 스타일 포맷, RIS/BibTeX
  round-trip, DOI 추출(raw/URL/혼합텍스트) 모두 통과
- 사이드바 i18n 키(ko/en/zh) 전수 존재 확인

## 버전
- 루트 `package.json`: 0.24.0 → 0.25.0
- `apps/web/package.json`: 0.24.0 → 0.25.0
