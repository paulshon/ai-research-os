# AI Research OS — v20 변경사항

버전: **0.20.0** (v19 → v20)

본 릴리스는 세 가지 지시사항을 반영한다.

---

## 1. 원문 형식 재현 (논문분석 · 논문크리틱)

문제: PDF 외 포맷(DOCX/XLSX/PPTX/HWP/HWPX)이 "텍스트/오류 형식"으로 표시됨.
해결: PDF가 페이지 이미지로 원문을 보여주듯, 그 외 포맷도 **원문 레이아웃을
재현한 "문서 페이지"** 로 표시.

- 신규 컴포넌트 `components/uode/document-reproduction.tsx`
  - UODE 추출 블록을 종이 같은 표면 위에 구조 그대로 렌더
    (heading 위계 / 문단 / 리스트 / 표 / 슬라이드 구분 / 발표자 노트 / 캡션)
  - 드래그 선택 → 크리틱 생성과 연동
- **논문크리틱**: 비-PDF 문서를 UODE 블록으로 보관(`uodeBlocks`)하여
  중앙 뷰어에 원문 재현. 드래프트에 영속화. 페이지별 크리틱 배지 표시.
- **논문분석**: "원문(Source)" 탭 신설 — 업로드 즉시 원문 형식 그대로 재현.
- UODE `DocumentBlock`에 `UODEBlock` 별칭 추가.

## 2. 참고문헌 인용 — 저널 필드 정밀 캡처

지시(이미지 2·3): 두 저널 유형에서 발행연도·저널명·제목·저자·요약·핵심키워드·DOI 캡처.

- 신규 파서 `lib/citation/scholarly-parser.ts`
  - 레이아웃 자동 감지: **Elsevier/ScienceDirect 영문 저널**, **한국 디자인계열 저널**
  - Elsevier: "Journal NNN (YYYY)" 헤더, ABSTRACT 블록, Keywords, https://doi.org/… 추출
  - 한국 저널: 발행연도 라인, 국문+영문 제목, 주저자/교신저자, (요약)(Abstract), (Keyword),
    "… Vol.N no.M (YYYY)" footer 추출
  - 공통 DOI/요약/키워드 추출 + 휴리스틱 폴백
- `RefEntry`에 `abstract` / `keywords` 필드 추가.
- `citation-bridge.extractRefFromAnyFile`가 scholarly-parser를 1차로 사용(실패 시 기존 휴리스틱 폴백).
- 참고문헌 패널 카드에 **캡처된 키워드 칩** + **요약 접기/펼치기** 표시,
  참고문헌 라벨을 선택 스타일명으로 동적 표기.

검증: 두 저널 샘플 텍스트에 대해 14/14 런타임 assertion 통과
(저널명·연도·권·제목·DOI·요약·키워드·저자 모두 정확 추출).

## 3. 안드로이드(모바일) 전면 점검

문제: 모바일 레이아웃이 데스크탑과 크게 다르고 일부 기능 접근 불가.

- **대시보드 셸**: 모바일 하단 바에 **참고문헌(Citation) 버튼 · 설정** 노출
  (기존엔 데스크탑 상단바에만 존재). 햄버거 드로어로 전체 메뉴 접근.
- **참고문헌 패널**: 모바일 상/하단 바를 침범하지 않도록 `top-0 bottom-14 lg:top-10 lg:bottom-0`.
- **논문분석**: 모바일에서 업로드 패널이 사라지던 문제(`hidden md:flex`) 수정 →
  세로 스택(`flex-col md:flex-row`), 탭바 가로 스크롤.
- **논문크리틱**: 3-pane(구조/뷰어/크리틱)가 모바일에서 깨지던 문제 수정 →
  **모바일 pane 전환 탭** 신설(구조/뷰어/크리틱), 각 패널 `lg` 기준 반응형.
  파일 로드 시 뷰어로, 크리틱 생성 시 크리틱 패널로 자동 전환.
- **논문작성(writing)**: 모바일 챕터/소절 선택 드롭다운 신설(좌측 트리가 숨겨질 때 대체).

---

## 검증

- 변경/신규 파일 전체 `tsc --strict` 타입체크 통과
  (analyzer/critique/writing 페이지, dashboard-shell, citation-panel/context/bridge,
   scholarly-parser, document-reproduction, uode 전 모듈, citation-core/document-core).
- 런타임 테스트: 인용 포맷터·DOI·BibTeX·참고문헌 라인 추출(6/6), 저널 필드 캡처(14/14) 통과.

> 비고: 모바일 레이아웃은 Tailwind 반응형 클래스(`md:`, `lg:`) 기준으로 점검했으며,
> 실제 기기 픽셀 검증은 `pnpm install && pnpm build` 후 디바이스/에뮬레이터에서 1회 더 권장.
