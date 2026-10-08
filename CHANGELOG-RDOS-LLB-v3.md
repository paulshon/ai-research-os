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

## 추가 (v3.1) — 네트워크 분석 확장·그림 스타일
- **분석 8종 추가**(보기 탭): 군집 요약(군집마다 대표 키워드·저널·국가·연도·인용 상위 논문), 구조 공백·브로커(Burt 제약·유효 크기), k-core(단계별 핵심 집단), 최단 경로(두 노드 선택·경로 강조), 시간 흐름(편수 비슷한 연도 구간별 네트워크), 신흥 주제(최근 3년 대 이전 점유율 증감·스파크라인), 네트워크 비교(두 검색어의 공통·고유 노드), 공인용(co-citation) 네트워크(12번째 종류).
- **그림 스타일**: 어두운 청록 바탕, 단색 둥근 노드(차분한 연두·자주·주황·청록 팔레트), 흰색 직선 엣지. 모양 선택에서 ‘종류별 모양’으로 바꿀 수 있다.
- 서버 응답 확장: `timeline`(구간별 그래프), `emerging`, `paperTable`(대표 논문 300편), `nodePapers`(노드→논문), `entityLabel`. 공인용은 상위 1,500편의 참고문헌(papers_v2)에서 계산.
- 새 파일: `lib/literature/network-analysis-extra.ts`. `network-graph.ts` 에 제약·유효 크기·k-core 지표 추가.
- 시험: 타입 검사(strict) + 브라우저에서 모든 보기·설정·드래그·노드 클릭을 자동으로 눌러 예외 없음 확인.

## 추가 (v3.2) — 데이터분석 대시보드 A~J
- **`/llb/analytics`(데이터분석)를 10개 영역 대시보드로 교체**: A 규모·동향, B 영향력, C 저널·출판, D 저자·협력, E 기관·국가, F 주제·지식 구조(5개 분석), G 재원·오픈액세스, H 인용 구조, I 통계 모델, J 품질·검색 설계. 상세 `docs/LLB-DASHBOARD.md`.
- **JCR 지표 범위 안내를 화면에 표시**: JCR 지표(JIF·사분위 등)는 학술지 논문의 약 31%에만 있고, 학술대회 논문·학위논문은 저널 지표 분석에서 빠진다. 대시보드 상단 안내, C·I 영역의 실제 보유 비율(유형별 막대 포함), 문서에 모두 표기.
- **F 영역 정밀 분석**: 주제 흐름(스트림그래프), 주제 변천(군집 계통 샌키: 신규·소멸·분기·합류 판정), 학제성(Rao–Stirling, 분야 간·개념 간 히트맵), 토픽·초록 지도(TF-IDF → LSA → k-means, 2차원), 연구 공백 매트릭스(주제 × 방법·대상 사전, 관측/기대).
- 새 파일: `lib/literature/llb-dashboard.ts`, `lib/literature/text-analytics.ts`(토큰화·TF-IDF·LSA·k-means·Rao–Stirling·OLS·로렌츠·주제 변천·주경로), `app/api/scholar/dashboard/route.ts`, `components/literature/viz.tsx`(차트 17종: 선·스트림·막대·히트맵·산점도·트리맵·선버스트·샌키·UpSet·타일 지도·코드·포레스트·로렌츠·상자·흐름도), `components/literature/llb-dashboard.tsx`.
- 시험: 계산 부품은 합성 자료로 정답 확인(군집 순도 1.0, 회귀가 알려진 계수 복원, 주경로·주제 변천 판정), 14개 서버 분석은 실제 DB(1.74억 편)로 실행, 화면은 타입 검사(strict)와 브라우저 자동 조작으로 확인.

## 추가 (v3.3) — 종단·횡단 분석, 시각화 확장
- **K 종단 분석**(`section=longitudinal`): 성장 모형·3년 예측·변화점, 8개 지표 Mann–Kendall 추세 패널, 분야 CAGR, 저자 신규 유입·재참여, 주제 생애주기(점유율 기준), 코호트 인용 궤적·반감기.
- **L 횡단 분석**(`section=cross&refYear=`): 기준 연도 한 해로 분야·유형·국가 비교, 교차표 χ², Welch t 검정(Cohen d), 분산분석 η², 상관·횡단 회귀.
- **시각화 확장**(`viz2.tsx`): 도넛·롤리팝·레이더·범프·슬로프·와플·게이지·소형 다중 선·예측 밴드·사분면을 추가하고, 기존 영역에 적용(유형 도넛, 분야 범프, JCR 보유 와플, 저널 레이더, 인용 집중 게이지, 주제 순위 범프·점유율 슬로프, OA 도넛, Price 지수 게이지 등).
- 새 파일: `lib/literature/panel-stats.ts`, `components/literature/viz2.tsx`, `components/literature/llb-dashboard-extra.tsx`. 선 그래프가 값 없는 해를 0 으로 그리던 문제 수정.

## v3.4 — 시각화 옵션·내보내기·해설·정밀 종횡단·한 번에 분석
- 차트 PNG/JPG 내보내기, 색상 모드 7종, 네트워크 스타일 옵션(배경·노드 크기·선 굵기/투명도/색·글자), 차트·네트워크 탭별 쉬운/학술 해석.
- A~L 한 번에 보기, 롤리팝·차트 글자 크기 통일.
- 종단(예측 검증·Holt·Pettitt·TFPW·KM)·횡단(Holm·Hedges·KW·분위수·반복 횡단) 정밀화.
- LLB 하위 메뉴 로딩에 도넛 로더 일괄 적용.

## v3.5 — 해석 도움말 재작성 · 글자 겹침 해소
- 모든 차트의 해석을 ‘쉬운 해석 / 학술적 해석 / 논문에 쓰기’ 3탭으로 확장하고, 문장을 실제 계산 결과의 숫자로 생성(`interpret*.ts`, 약 100개 카드).
- 차트 라벨 측정·줄바꿈·겹침 해소(`text-measure.ts`, `viz-text.tsx`), 차트 폭 px 기준 렌더.
- 주제 변천 표본을 인용순으로 변경(단일 시기로 쏠리던 문제 해결).
