# AI-Research-OS RDOS v12 — Changelog

## 핵심: APA 인용 자동화 시스템 → Citation Knowledge Graph(CKG)로 대폭 개선

참고문헌 정리 메뉴의 **APA 인용 자동화 시스템** 모달을 단순 "참고문헌 생성기"에서
첨부 설계 문서(APA Citation Knowledge Graph IA, L0 Ontology → L6 Citation AI)와
APA 7판 매뉴얼을 반영한 **규칙 기반 스마트 인용 엔진**으로 전면 재구축했습니다.

### 1. 신규 인용 엔진 — `apps/web/lib/citation/apa-engine.ts` (무의존 순수 TS)
- **메타데이터 마스터 모델(CSL 유사 52필드)**: `CKGEntry` — Identity/Authorship/Temporal/
  Title/Source/Publication/Numeric/Identifier/Digital/Software/Legal/Status.
- **Reference Taxonomy**: 15 families / 40+ reference types (정기간행물·단행본·챕터·학술대회·
  학위논문·보고서·데이터셋·소프트웨어·웹·소셜미디어·영상·오디오·법률·AI 생성물·개인교신).
- **Metadata Profile**: 타입→필수/선택 필드를 자동 매핑하는 프로파일 시스템.
- **In-Text Engine**: 서술/괄호/직접/블록 인용, 저자 1·2·3+(et al.)·단체·무저자 규칙,
  동저자·동년도 `a/b/c` 접미사, 개인교신 특례.
- **Rendering Engine(8 스타일)**: APA7(정밀) + APA6/MLA9/Chicago/Harvard/IEEE/Vancouver/KCI.
  APA7 저자요소 마침표 규칙(`OpenAI. (2026).`)까지 반영.
- **Edge Case Engine**: 무저자→제목 우선, 무날짜→`n.d.`, 동저자·동년도 자동 접미사, 철회(retracted).
- **Validation Engine**: 프로파일별 필수필드 검사 + DOI/URL/ISSN/ISBN/ORCID 정규식 +
  중복 감지 + **APA 컴플라이언스 점수(0~100)**.
- **Auto Repair**: DOI 정규화, http→https, n.d./무저자 자동 처리.
- **Transformation Engine**: DOI · RIS · BibTeX · CSL-JSON → CKGEntry 변환(유형 자동판별).
- **Export**: CSL-JSON / BibTeX / RIS 직렬화.
- **Knowledge Base**: APA7 Rule DB 발췌(APA7_ITX/AUT/DAT/EDGE/REF/VAL).

### 2. 스마트 UI — `apps/web/components/apa/apa-automation-system.tsx` (전면 재작성)
17개 모듈 IA를 사용자 친화 11개 메뉴로 통합:
- **대시보드**: 문헌 수·컴플라이언스 점수·지원 유형·중복 수 + 컴플라이언스 막대 + 최근 문헌.
- **참고문헌 빌더**: 패밀리→타입 선택, 프로파일 기반 동적 입력, 선택 스타일 실시간 미리보기 +
  본문인용 미리보기 + 즉시 검증 배지, 리스트 편집/삭제, 동저자·동년도 자동 접미사.
- **본문 인용**: 리스트 문헌 선택→서술/괄호/직접/블록 + 쪽수, 규칙 자동 적용.
- **검증·자동수정**: 전체 스캔 + 점수 + 문헌별 이슈 + 원클릭 자동수정 + 중복 경고.
- **변환·가져오기**: DOI/RIS/BibTeX/CSL-JSON → 빌더 자동 채움.
- **내보내기**: 8개 스타일 렌더 + 복사/.txt/CSL-JSON/.bib/.ris + **참고문헌 정리 리스트로 전송**.
- **AI 도우미(Gemini 연동)**: 자연어→구조화 인용, 유형 자동판별, 오류 설명·교정, 누락정보 보완.
  모든 호출은 상단 전역 AI 진행바와 자동 연동(v11 기반).
- **지식그래프**: 리스트에서 저자·학술지·유형 분포(상위 8) 시각화.
- **분류체계·메타데이터**: 15 families / 40+ types / 프로파일 표시.
- **APA 지식베이스**: 규칙 검색.
- **설정**: 기본 스타일, 전송, 전체 비우기.

### 3. 데이터/연동
- 리스트는 브라우저 `localStorage`(`rdos_apa_ckg_v12`)에 자동 저장.
- "참고문헌 정리에 전송"으로 CKGEntry→RefEntry 변환 후 공용 참고문헌 DB(`ai_research_os_refdb`)에 추가.
- 기존 참고문헌 정리 페이지(import 시그니처 `APAAutomationSystem({ open, onClose })`) 호환 유지.

## 검증
- `apa-engine.ts`: TypeScript **strict** 타입체크 통과.
- `apa-engine.ts` + `apa-automation-system.tsx`: React 타입 + `@/*` 경로 매핑 하에 strict 타입체크 **무오류**.
- esbuild 파싱: 엔진·컴포넌트·references 페이지 모두 통과.
- Node 로직 스모크 테스트: 학술지/단행본/AI/트윗/보고서 APA7 렌더, 본문인용(서술/괄호/직접),
  a/b/c 접미사, IEEE/MLA9 렌더, RIS 가져오기, 검증 점수 — 정상.
- 비고: Clerk/Supabase 키가 없는 환경이라 전체 `next build`/실서버 부팅은 실행 불가.
  검증은 (esbuild 파싱 + strict tsc + Node 로직 테스트)로 수행.

## 버전
- `apps/web/package.json`: 11.0.0 → **12.0.0**.
