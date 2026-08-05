# CHANGELOG — RDOS v11

v10 대비 3개 과제를 반영했다. 학술 연구 워크스페이스(대시보드)의 AI 분석 UX·문서
불러오기·한컴 문서 변환을 정비했다.

---

## 과제 1 — 전역 AI 분석 진행 표시기(상단 메뉴바)

모든 메뉴의 AI 분석에 **진행률 표시가 없던 문제**를 해결했다. 상단 메뉴바 우측의
빈 공간에 **10단계 세그먼트 진행바 + 퍼센트**를 배치하고, 모든 메뉴의 AI 호출에
**자동 연동**되도록 단일 지점에 계측했다.

- 신규 `apps/web/lib/ai-progress.ts` — 모듈 단위 pub/sub 싱글턴(`aiProgress`).
  `begin/set/setLabel/end/reset`, 동시 작업 카운트, 92%까지 자연 진행 후 완료 시
  100% 확정→0.6s 후 숨김. `useSyncExternalStore` 로 구독.
- 신규 `apps/web/components/dashboard/global-ai-progress.tsx` —
  10개 동일 사이즈 세그먼트가 좌→우로 10%씩 점등(현재 구간 펄스), 라벨·퍼센트 표시.
  데스크탑 메뉴바용 `variant="bar"`, 모바일 헤더 하단용 `variant="thin"`.
- `apps/web/components/dashboard/dashboard-shell.tsx` — 상단 메뉴바 중앙(탭과 우측
  컨트롤 사이 빈 영역)에 진행바를 삽입, 모바일 헤더 하단에 얇은 줄 추가.
- `apps/web/hooks/use-gemini.ts` — 모든 메뉴의 AI 호출이 통과하는 `generate()` 에
  `aiProgress.begin()/end()` 를 1회 계측 → **연구설계·문헌·논문작성·검토검증·구조엔진
  ·연구방법(QCA)·논문분석·논문크리틱 등 전 메뉴 자동 적용**.

## 과제 2 — 논문분석 불러오기 UX를 논문크리틱과 동일하게 재설계

`apps/web/app/(dashboard)/analyzer/page.tsx` 전면 재작성.

- **LEFT**: 업로드(드래그&드롭/클릭/붙여넣기) + **페이지 썸네일 미리보기**
  (논문크리틱과 동일).
- **CENTER**: **원문(PDF 페이지 이미지 또는 UODE 재현) + 변환된 텍스트**를 함께 표시.
  글자 크기 조절, "AI 자동 분석" 버튼 제공.
- **RIGHT**: **변환된 텍스트를 대상으로** 전체분석 · 미시구조 · 문장별분석 ·
  BERT검증 · 개선제안 5종 AI 분석 실행·결과 패널.
- PDF.js 지연 렌더링(IntersectionObserver), UODE `DocumentReproduction` 재사용,
  페이지 저장/복원(`usePagePersistence`) 연동. 모바일 2-pane(원문·분석) 전환.

## 과제 3 — HWP/HWPX → PDF 변환 통합(논문분석·논문크리틱 적용)

첨부된 3개 MCP 패키지를 검토해 **두 갈래**로 통합했다.

### (A) 브라우저 내장 HWP 파서 — 항상 동작(추가 의존성 없음)
- `apps/web/lib/uode/extractors.ts` 의 `extractHwp` 를 정식 레코드 파서로 교체.
  OLE2(CFB) 컨테이너 → `BodyText/Section*` 스트림 zlib(deflate) 해제 →
  `HWPTAG_PARA_TEXT(67)` 레코드 워크로 UTF-16LE 본문 추출(제어문자 규칙 반영).
  라이브러리는 **기존 로더가 이미 쓰는 `XLSX.CFB` + `pako`(CDN)** 만 사용 →
  npm 의존성 추가 없음. 실패 시 PrvText 스캔으로 폴백.
  - 검증: 샘플 `.hwp` → 77개 블록 / 2,598자 한국어 본문 추출 PASS.
- `apps/web/lib/uode/loaders.ts` — `ensurePako()`, `ensureCFB()` 추가.
- HWPX 는 기존 ZIP+XML 경로로 파싱.

### (B) LibreOffice 변환(원문 PDF 레이아웃 재현) — 선택적 고급 경로
- 신규 `apps/web/app/api/convert/hwp/route.ts` (Node 런타임) —
  `soffice --headless --convert-to pdf:writer_pdf_Export`. 바이너리 탐색:
  ① `LIBREOFFICE_BIN` ② 동봉 런타임 ③ 시스템 PATH. 없으면 **501→클라이언트 폴백**.
- 신규 `apps/web/lib/hwp-convert.ts` — 클라이언트 `convertHwpToPdf()`/`isHwpFile()`.
  변환 성공 시 PDF 로 렌더, 실패/미설치 시 (A) 내장 파서로 자동 폴백.
- 논문분석·논문크리틱 `handleFile` 양쪽에 HWP/HWPX 분기 배선(변환 진행은 전역 진행바 표시).
- 신규 `services/hwp-convert/` — 독립 변환 서비스(`server.mjs`, 포트 7330) +
  참조 파서 소스(`vendor/hwpjs`, `vendor/openhwp-core`).

### LibreOffice 런타임에 대한 정직한 처리
- 제공된 `mcp-libreoffice-runtime` 은 **약 285 MB(해제 715 MB)**, **Windows 전용**
  (soffice.exe) 으로, 리눅스 샌드박스/브라우저에서 실행 불가하고 배포 패키지에
  포함하면 전달이 비현실적이다. 따라서 **바이너리는 패키지에 임베드하지 않고**,
  `services/hwp-convert/vendor/libreoffice/PLACE_RUNTIME_HERE.md` 의 안내대로
  사용자가 드롭하면 라우트·서비스가 **자동 탐지**하도록 슬롯과 배선을 제공했다.
- 런타임이 없어도 (A) 내장 파서로 **분석·크리틱은 정상 동작**한다.

---

## 검증 방법(주의)
- 본 환경은 Clerk/Supabase 키가 없어 전체 `next build`/실기동은 불가하여,
  변경 파일 10종 **esbuild 파싱 검사(전부 통과)** + 독립 모듈 **tsc strict 타입검사
  (통과)** + **HWP 레코드 파서 Node 단위검증(PASS)** 으로 확인했다.
- 버전: `apps/web/package.json` 10.0.0 → **11.0.0**.
