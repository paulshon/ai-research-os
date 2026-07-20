# CHANGELOG v28 — 참고문헌 인용 리스트 정리 메뉴 추가

## 신규 메뉴: 참고문헌 인용 리스트 정리 (`/references`)
사이드바·상단 메뉴·태블릿 레일에 **"참고문헌 정리"** 메뉴를 추가하고,
전용 페이지를 신설했습니다.

### 1. 서지정보 포맷 전부 불러오기
- **DOI 조회** — `/api/citation-lookup` (Crossref → OpenAlex → Semantic Scholar,
  DOI-우선 파이프라인). DOI 또는 DOI가 포함된 텍스트 입력 지원
- **RIS(.ris)** 텍스트 붙여넣기 → 파싱하여 추가
- **BibTeX(.bib)** 텍스트 붙여넣기 → 파싱하여 추가
- **파일 업로드** — PDF/DOCX/HWP/HWPX/TXT에서 서지정보 추출(UODE 엔진)

### 2. 정렬
불러온 리스트를 다음 기준으로 정렬 (오름/내림 토글):
- **가나다/ABC순** — 제1저자 성 기준, 한글·영문 혼합을 `localeCompare(…, "ko")`로
  자연스럽게 정렬 (한글 → 영문 알파벳 순)
- **연도순** — 발행연도
- **제목순** — 제목 가나다/ABC

### 3. 인용 스타일 렌더
7개 스타일로 즉시 변환 표시: APA7 / MLA9 / Chicago / IEEE / Vancouver /
Harvard / Nature (전역 citationStyle과 연동)

### 4. 텍스트로 내보내기
- **.txt 파일 다운로드** — 선택 스타일·정렬 순서대로 번호 매긴 참고문헌 목록
- **클립보드 복사** — 동일 내용 복사

### 5. 전역 리스트 공유
기존 전역 `CitationProvider`의 `refDB`를 사용 → 문헌연구/인용 패널 등 다른 메뉴와
**동일한 참고문헌 리스트를 공유**하고 localStorage에 영속화됨.

## 구현 상세
- 신규 페이지: `app/(dashboard)/references/page.tsx`
- citation-bridge에 변환기 추가:
  · `canonicalToRefEntry` — CanonicalCitation → RefEntry (DOI/RIS/BibTeX 결과를
    전역 refDB로 편입)
  · `parseBibTextToRefEntry` — RIS/BibTeX 텍스트 → RefEntry (형식 자동 감지)
  · `parseAuthorName` — "Smith, John"/"John Smith"/"홍길동" 이름 파싱(한글 인식)
- 메뉴 추가:
  · `components/dashboard/sidebar.tsx` — AI Tools 섹션, Library 다음
  · `components/dashboard/tablet-rail.tsx` — 태블릿 아이콘 레일
  · `components/dashboard/dashboard-shell.tsx` — 상단바 우측(참고문헌 패널 옆)
- i18n: `references.*` 블록 + `sidebar.references` 라벨 (ko/en/zh)

## 검증
- `npm run build -w @ai-research-os/web` → 성공(EXIT 0), 정적 페이지 21개
  (`/references` 라우트 신규 생성 확인)
- `tsc --noEmit` → 타입 에러 0건
- 단위 검증: RIS/BibTeX 파싱(저자·연도·제목·DOI), 7개 스타일 렌더,
  3종 정렬(연도/저자/제목, 한글·영문 혼합) 모두 통과
- 클린 복사본 fresh install + build 통과

## 버전
- 0.27.0 → 0.28.0 (루트 및 apps/web)
