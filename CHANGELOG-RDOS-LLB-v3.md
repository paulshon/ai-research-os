# CHANGELOG — LLB v3 (LLB v2 기반)

검색 DB를 **새 ClickHouse(ch-v2)의 새 `openalex.lit_papers`** 로 옮기고, LLB 네트워크 분석을 전면 개편했다.

## 데이터(검색 DB)
- 새 `lit_papers`: **174,194,577행**(= 고유 논문 수), 113열(앱 기존 54열 + JCR 지표 23 + OpenAlex 원본 항목 36). 위치 E:(디스크 `e_disk`, 정책 `lit_policy`), 약 183 GiB.
- 범위: 논문(article)·리뷰·프리프린트 + **학술대회 논문 14,642,936 + 학위논문 13,887,439**. OpenAlex 가 2026-09 릴리스에서 유형을 쪼갠 결과를 반영한 것(옛 표의 약 1,800만 건 차이의 원인).
- JCR(2026 JIF 파일) 연동: `lit_papers` 의 약 31%(학술지 정보가 없는 학위논문 등 제외). KCI 등재 목록이 없어 `in_kci` 는 모두 0.
- **FWCI·백분위 기준 변경**: 코호트 = 분야 × 연도(유형을 합침). 앱 `lit_cohort` 단계(분야×연도×유형)는 학위논문 FWCI 를 왜곡하므로 **다시 실행하지 말 것**. OpenAlex 원본 FWCI 는 `fwci_oa`.
- `openalex.lit_meta`(key='eligible_rows')에 적재 대상 수(174,194,577)를 기록 — 상태 상자의 분모.

## 화면·API
- **`/api/scholar/network`** (신규): 검색 순위 상위 N편(40·100·200·500·1,000·5,000·10,000)을 서버가 모아 11종 네트워크를 만든다. 검색 화면과 같은 순위·필터, `sort=relevance|cited|fwci|year`.
- **`lib/literature/network-graph.ts`** (신규, 서버·클라이언트 공용): 11종 그래프 구성, 연결·가중 연결·매개·근접·PageRank·군집계수, **Louvain 군집·모듈성**, 밀도·평균 경로·지름, 연결 요소별 배치(겹침 방지), 표본 요약(전체 vs 상위 100편 편수·인용 집중도).
- **`lib/literature/llb-network.ts`** (신규, 비생성): 상위 N편 wid 수집 → 5,000개씩 메타데이터 조회. 읽기 전용 계정 제약(결과 행 ≤ 100,000, 질의 URL 항목 ≤ 128 KB)을 지킨다.
- **`components/literature/network-explorer.tsx`** (신규): 범위 선택, 편수 측정 표, 종류별 노드 모양(원·둥근 사각형·육각형·마름모·오각형·팔각형·삼각형)·그라데이션, 크기=중심성 7종, 색=군집/종류/평균 연도, 확대·이동, 노드 클릭 상세, PNG/JPEG/SVG 저장, 자동 해설. `LlbNetworkPanel` 이 이것을 쓴다.
- 네트워크 11종: 공동저자, 키워드, 저자-키워드, 저널, **기관 협력, 국가 협력, 후원기관, MeSH(일반 표지어 제외), 개념, 인용, 서지 결합**.
- `lib/literature/llb-status.ts`: 적재율 = 서빙 행 / `lit_meta.eligible_rows`(없으면 옛 방식). 완전 적재가 "36% 적재 중단됨" 으로 보이던 문제 해결.
- 버그 수정: 그래프 드래그 중 `drag.current` 를 갱신 함수 안에서 읽다 null 로 터지는 문제(Application error), 읽기 전용 계정의 `max_result_rows` 한도 위반(Code 452), 질의 URL 항목 한도(Field value too long).

## 운영
- 컨테이너 `ch-v2`(포트 127.0.0.1:18123), 게이트웨이 포트 **18124**(Windows 가 8124–8223 예약), 터널 → Supabase `llb_endpoint`.
- `scripts/llb-supervisor.ps1`: 로그인 시 작업 스케줄러 `LLB-Supervisor` 가 ch-v2 → 게이트웨이 → 터널 → 주소 기록을 유지한다(E: 데이터 폴더가 올라올 때까지 대기).
- 읽기 전용 계정 `llb_ro` 권한을 `openalex.lit_*`, `openalex.papers_v2` 로 좁힘(`scripts/sql/llb_ro.users.xml.example`).
- 다른 PC 이전용 패키지·복원 방법: `docs/LLB-OPS.md`.

## 알려진 사항
- 구문 검색(`"…"`)은 앱의 질의가 색인을 쓰지 못해 첫 실행이 느리다(10분 이상 가능).
- 10,000편 분석은 게이트웨이를 거치면 1분 안팎(함수 제한 120초 안).
- 이 저장소 폴더에는 `node_modules` 가 없다: `npm install` 후 `npm run dev --workspace @ai-research-os/web`.
