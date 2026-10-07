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
