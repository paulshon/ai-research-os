# CHANGELOG — LLB v2 (LLB v1 기반)

5억 OpenAlex DB를 검색 전용으로 정규화한 서빙 표(`openalex.lit_papers`)에 "문헌 연구 → LLB 검색"을 연결.

## 변경
- `apps/web/lib/literature/llb-search.ts` (신규, 생성 파일) — 모든 값이 `{name:Type}` 파라미터, 실패 시 예외.
  생성기: `문헌검색개발프로그램/lit-serving/gen-llb-ts.js` (직접 수정 금지, 원본 JS 수정 후 재생성).
- `app/api/scholar/route.ts` — `corpus=llb` 분기를 서빙 표 검색으로 교체.
  - 새 파라미터: `indexes(scie,ssci,ahci,esci,scopus,kci)`, `minJif`, `jifQuartile`, `yearFrom/yearTo`, `oaOnly`, `hasAbstract`, `citableOnly`, `sort(relevance|cited|year|jif)`, `lang`, `area`, `types`, `offset`.
  - 응답: `matched`, `matchedIsLowerBound`, `stage`, `ms`, `fallback`, 각 논문의 `meta`(색인·JIF·추정 IF·저널 H·fwci·백분위·OA·`suspect`).
  - 로컬 ClickHouse가 정상이면 0건도 0건으로 반환. **연결 실패 때만** 공개 API로 대체하며 `fallback: true`, 출처 `대체·…`로 명시(이전에는 "LLB" 라벨로 위장).
  - 문자열 이어붙이기 SQL(`'`만 이스케이프)을 제거.
- 2단계 관련도 검색: 1단계 제목 일치(빠름) → 페이지가 모자랄 때만 2단계 초록 일치. 1단계 점수는 초록 열을 읽지 않음(초록을 읽으면 흩어진 일치 행 때문에 열 전체를 읽게 됨: 30초 → 5~7초). 총 개수는 상한 100,001까지 세고 초과 시 "이상"으로 표시.
- `app/api/scholar/insights/route.ts` (신규) — 일치 집합 집계(연도·분야·언어·색인·OA), `?wids=` 로 인용·서지결합 네트워크.
- `components/literature/llb-panels.tsx` — 색인 토글·JIF·연도·OA·정렬 필터, 연도/분야 막대, 결과별 색인·JIF·fwci·OA 배지, "출처 확인 필요" 배지(오결합 의심), 대체 결과 경고 배너.
- L1(공개 API) 검색 경로는 변경 없음.

## 운영 전제
- 환경변수: `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`(읽기 전용 권장), `LLB_DB`, `LLB_TIMEOUT_S`(기본 15초).
- Vercel은 사설 ClickHouse에 직접 닿지 못하므로 터널/프록시 필요. 접근 불가 시 `fallback: true`.
- 데이터 준비: `문헌검색개발프로그램`에서 `lit_build:all` → `lit_citable` → `lit_confidence` → `lit_cohort` → `lit_facets`.
