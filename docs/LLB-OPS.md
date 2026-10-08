# LLB 운영 — ch-v2 · 게이트웨이 · 터널 · 이전

## 구성
```
Vercel ─HTTPS─► Cloudflare 터널(임시 주소) ─► llb-gateway.mjs(127.0.0.1:18124) ─► ClickHouse ch-v2(127.0.0.1:18123)
                         └ 주소를 Supabase llb_endpoint 에 기록(앱이 30초 안에 읽음)
```
| 항목 | 값 |
|---|---|
| ClickHouse | 컨테이너 `ch-v2`, HTTP 127.0.0.1:18123, 데이터 C:\CH_v2\data + E:\CH_ch2_data(`lit_papers`) |
| 게이트웨이 | 127.0.0.1:18124 (인증·SELECT 전용·분당 제한). Windows 가 8124–8223 을 예약하므로 8124 는 쓸 수 없다 |
| 비밀 | `E:\CH_lit\llb-access.env` (GATEWAY_*, CH_*, SUPABASE_*) — 저장소에 올리지 않는다 |
| 자동 시작 | 작업 스케줄러 `LLB-Supervisor`(로그인 30초 후) → `scripts/llb-supervisor.ps1` |
| 수동 시작 | `scripts/llb-supervisor.ps1` 직접 실행(또는 `Start-ScheduledTask -TaskName LLB-Supervisor`) |
| 로그 | `E:\CH_lit\llb-supervisor.log` |

## 읽기 전용 계정
`scripts/sql/llb_ro.users.xml.example` 를 `users.d/llb_ro.xml` 로 복사하고 **비밀번호 해시만 채운다**(sha256). 권한은 `openalex.lit_*`, `openalex.papers_v2`, `system.parts`, `system.tables` 의 SELECT 뿐.

## 적재 상태 분모
`scripts/sql/lit_meta.sql` — `openalex.lit_meta` 에 `eligible_rows`(papers_v2 에서 lit_papers 조건에 맞는 논문 수)를 기록. `llb-status.ts` 가 이 값을 분모로 쓴다. 증분 적재 후에는 값을 다시 세어 갱신한다.

## 데이터 구축 요약(자세한 기록은 작업 노트)
parquet(OpenAlex 2026-09-23) → `papers_v2`(+`papers_v2_ext` 나머지 열, `oa_authors` 등) → `lit_papers`(앱 SQL + JCR 사전 + 원본 항목). 후처리: 코호트(분야×연도), 패싯, `meta_conflict`(DOI 중복·저널 분야 모순 표시).

## 백업·이전
- 최종 백업: `K:\lit_papers_final_20261007`(해시 검증), 복원 스크립트와 안내서: `K:\lit_papers_final_20261007_RESTORE`.
- 전체 DB 이전 패키지: `K:\ch_portable_20261007`(표 38개 + 딕셔너리, `README_KO.md` 에 노트북 Docker 복원 절차, `tools\restore_all.py`).
- 다른 PC 에서 LLB 를 쓰려면: ch-v2 를 복원한 뒤 `apps/web/.env.local` 에 `CLICKHOUSE_URL=http://127.0.0.1:18123` 만 두면 된다. 외부(Vercel) 공개는 그 PC 에서 `llb-expose-setup.ps1` 로 계정·비밀번호를 새로 만든다.

## 점검 명령
```
curl http://127.0.0.1:18123/ -d "SELECT count() FROM openalex.lit_papers"      # 174194577
curl http://127.0.0.1:18124/ping -u llb:<게이트웨이 비밀번호>                    # Ok.
GET  <배포 주소>/api/scholar/llb-status                                         # connected:true, percent:100
GET  <배포 주소>/api/scholar/network?q=machine+learning&kind=coword&scope=100
```

## 502/524 가 나는 이유와 대책 (2026-10-08)
- 증상: 대시보드 ‘A~L 한 번에 보기’에서 일부 영역이 `LLB ClickHouse 502`(Cloudflare 오류 HTML) 또는 530 으로 실패.
- 원인 ① 동시 질의 과부하: ‘artificial intelligence’ 같은 큰 검색은 질의 하나가 lit_papers 1.3억 행의 제목 색인을 훑어 5~10초 걸리고, 한 영역이 질의 8~12개를 한꺼번에 보낸다. 영역 둘만 겹쳐도 20여 개가 동시에 돌아 전부 느려지고, 게이트웨이(70초)·Cloudflare 임시 터널(약 100초) 제한을 넘겨 502/524 가 난다(DB 쪽 시험에서도 4개 영역 동시 실행 시 110초 초과 재현).
- 원인 ② 연결 재사용 경쟁: 게이트웨이(Node)의 keep-alive 기본값(5초)이 터널이 쓰던 연결을 먼저 닫아 한참 쉰 뒤 첫 요청이 502.
- 원인 ③ 터널 주소 교체: 감독 프로그램이 재시작되어 임시 터널 주소가 바뀌면 진행 중이던 요청이 530.
- 대책: 게이트웨이에 동시 실행 제한(GATEWAY_CONCURRENCY, 기본 5)과 대기열(최대 55초, 넘으면 503), keep-alive 120초, 상류 제한 92초, 분당 600회. 앱의 `ch()` 는 프로세스당 동시 3개(LLB_CH_CONCURRENCY)로 제한하고 502/503/504/524/530 을 한 번 다시 시도하며, 오류 메시지는 Cloudflare HTML 대신 한 줄로 줄인다. 대시보드의 한 번에 보기는 일시 오류를 영역 단위로 한 번 더 시도한다.
