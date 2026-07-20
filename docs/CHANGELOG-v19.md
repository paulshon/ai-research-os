# AI Research OS — v19 변경사항

버전: **0.19.0** (v18 → v19)

본 릴리스는 두 가지 엔진을 도입하여 **논문 분석 / 논문 크리틱 / 참고문헌 인용**
세 메뉴의 "불러오기" 기능을 확장한다.

---

## 1. UODE — Unified Office Document Engine (통합 오피스 문서 처리 엔진)

설계 철학: **"문서를 여는 것"이 아니라 "문서를 이해하는 것"**
(Visual Fidelity + Structural Understanding + Semantic Intelligence)

### 새 패키지
- `packages/document-core` — UODE 타입·파이프라인·포맷 스펙 레이어
  (DocumentFormat, ProcessingPipeline, UniversalDocumentObject, FORMAT_CAPABILITIES,
  buildUODEAnalysisPrompt 등). 실제 서버 파싱(GROBID/python-docx 등)의 계약(Contract) 정의.

### 새 클라이언트 구현
- `apps/web/lib/uode/` — 브라우저에서 동작하는 실제 추출 구현
  - `detect.ts` — 확장자 / MIME / magic-byte 포맷 판별
  - `loaders.ts` — pdf.js · mammoth · SheetJS · JSZip CDN 지연 로드
  - `extractors.ts` — 포맷별 추출 엔진
    - PDF: 텍스트 레이어 reading-order 복원, 스캔본 OCR 필요 감지
    - DOCX: mammoth HTML 변환 → heading/list/table 구조화
    - XLSX/XLS/CSV: SheetJS 시트별 표 추출
    - PPTX: 슬라이드 XML + 발표자 노트
    - HWPX: section XML 본문 추출
    - HWP(5.x): 프리뷰 텍스트 best-effort 추출
    - TXT/MD: 평문 패스스루
  - `engine.ts` — `processDocument()` 단일 진입점, 언어 감지·신뢰도·체크섬, `toFormattedText()`
  - `adapter.ts` — UODEDocument → UniversalDocumentObject 변환, 참고문헌 라인 추출

### 적용 메뉴
- **논문 분석 (analyzer)**: 기존 PDF 외 불가 → 이제 모든 포맷에서 원문 텍스트를
  추출하여 원문 형식 그대로 표시. 전체분석/미시구조/문장별/BERT/제안 모두 가능.
- **논문 크리틱 (critique)**: DOCX/XLSX/PPTX/HWP/HWPX 등을 PDF처럼 불러와
  원문 형식을 보존한 텍스트로 표시(PDF 이미지 렌더링 경로는 유지).

---

## 2. Citation Core v2.0 — 통합 참고문헌·인용 시스템

설계 철학: **"텍스트 변환"이 아니라 "학술 메타데이터 재구성"**

### 업그레이드 패키지
- `packages/citation-core` (0.1.0 → 0.2.0)
  - Canonical Citation Object 표준 구조
  - DOI 엔진(추출·검증), Crossref / OpenAlex / Semantic Scholar 클라이언트
  - **7개 인용 스타일**: APA7, MLA9, Chicago, IEEE, Vancouver, Harvard, Nature
  - In-text(Parenthetical/Narrative/Et al./Multiple), Validation, Confidence Scoring
  - BibTeX / RIS Export
  - v18 `CitationData` 하위 호환(`upgradeLegacyCitation`)

### 새 브리지
- `apps/web/lib/citation/citation-bridge.ts`
  - 기존 `RefEntry` ↔ `CanonicalCitation` 변환
  - 선택 스타일로 본문/참고문헌 렌더링
  - **UODE 통합**: PDF 외 포맷(DOCX/HWP/HWPX 등)에서도 참고문헌 추출

### 적용 메뉴
- **참고문헌 인용 (citation)**:
  - `loadPDFs`가 PDF 전용 필터를 제거하고 UODE 지원 모든 포맷 허용
  - 패널에 **인용 스타일 선택기** 추가 (7개 스타일)
  - 본문 삽입·전체 복사가 선택된 스타일로 동작

---

## 검증

- 신규/변경 모듈 전체 `tsc --strict` 타입체크 통과
- 인용 포맷터·DOI 추출·신뢰도·BibTeX/RIS·검증 런타임 테스트 통과
- UODE 참고문헌 추출(한글/번호/DOI 포함) 런타임 테스트 통과

> 참고: 구형 바이너리 포맷(.doc/.ppt/.xls 일부, .hwp 본문 전체)과 스캔 PDF의
> 정밀 파싱·OCR은 서버 사이드(GROBID, LibreOffice, PaddleOCR 등)에서 수행하도록
> document-core 스펙에 계약이 정의되어 있으며, 클라이언트는 best-effort 추출을 제공한다.
