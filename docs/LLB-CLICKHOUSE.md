# LLB(로컬문헌기반) — ClickHouse 연동

> **v3 변경**: 검색 DB 가 새 컨테이너 `ch-v2`(127.0.0.1:18123, 174,194,577행)로 바뀌었고 게이트웨이 포트는 18124 다. 운영·이전은 `docs/LLB-OPS.md`, 네트워크 분석은 `docs/LLB-NETWORK.md`, 변경 내역은 `CHANGELOG-RDOS-LLB-v3.md`.

LLB 화면(`/llb/*`)과 `GET /api/scholar?corpus=llb` 는 ClickHouse 의 정규화된 서빙 표 `openalex.lit_papers` 를 직접 검색한다.
원본 `openalex.papers_v2`(약 5억 건)는 인용망 계산에만 쓴다.

## 접속 설정

`apps/web/.env.local` 에 넣는다(`.env.example` 의 "LLB" 절 참고).

| 변수 | 기본값 | 뜻 |
|---|---|---|
| `CLICKHOUSE_URL` | `http://127.0.0.1:18123` (v3: ch-v2) | ClickHouse HTTP 주소 |
| `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD` | 빈 값 | 인증이 있을 때만 |
| `LLB_DB` | `openalex` | `lit_papers` 가 있는 DB |
| `LLB_SRC_DB` | `openalex` | `papers_v2` 가 있는 DB |
| `LLB_TIMEOUT_S` | `15` | 쿼리 1건 최대 시간(초) |

## 실행

```bash
npm install
npm run dev --workspace @ai-research-os/web   # http://localhost:3010/llb/search
```

## 연결 확인

- `GET /api/scholar/llb-status` → `connected`, `servedRows`, `sourceRows`, `percent`, `loading`
- 화면 왼쪽 메뉴 위의 상자가 같은 값을 보여 준다(적재 중 15초, 평소 60초 간격 갱신).
- `GET /api/scholar?corpus=llb&q=climate` 응답의 `fallback` 이 `false` 이고 `sources` 가 `LLB (openalex.lit_papers)` 면 ClickHouse 를 쓴 것이다.
  `fallback: true` 면 연결 실패로 공개 API 결과로 대체된 것이며 `llbError` 에 이유가 있다.

## 적재 중일 때

- 적재되지 않은 논문은 검색되지 않는다 → 화면에 "적재 진행 중 — 결과 불완전" 표시.
- 적재 중에는 검색이 5초 → 수 분으로 느려진다(측정은 적재가 끝난 뒤에 할 것).
- 적재 순서와 재개 방법은 `src/lit-service.js` 의 `lit_build:all` → `lit_citable` → `lit_confidence` → `lit_cohort` → `lit_facets` → `lit_check`.

## 외부 인터넷(Vercel)에서 E: 드라이브 DB 검색하기

앱 코드는 이미 `CLICKHOUSE_URL`/`USER`/`PASSWORD`(Basic 인증)를 지원하므로 앱 수정은 없다. 필요한 것은 DB를 안전하게 인터넷에 내놓는 일이다.

```
Vercel → HTTPS 터널(cloudflared) → scripts/llb-gateway.mjs(127.0.0.1:18124) → ClickHouse ch-v2(127.0.0.1:18123; 데이터 C:\CH_v2\data·E:\CH_ch2_data)
```

1. 한 번만: `powershell -ExecutionPolicy Bypass -File scripts\llb-expose-setup.ps1` — 읽기 전용 계정 `llb_ro`(SELECT만, 메모리·시간·분당 질의 수 제한)와 비밀번호를 만든다. 비밀번호는 `E:\CH_lit\llb-access.env`.
2. 터널 도구: `winget install Cloudflare.cloudflared`
3. 켤 때마다: `powershell -ExecutionPolicy Bypass -File scripts\llb-start.ps1` — 컨테이너·게이트웨이·터널을 켜고 `https://….trycloudflare.com` 주소를 보여 준다(임시 주소라 재시작하면 바뀜. 고정하려면 Cloudflare 계정에서 이름 있는 터널 사용).
4. Vercel 환경변수: `CLICKHOUSE_URL`=위 https 주소, `CLICKHOUSE_USER`=`llb`, `CLICKHOUSE_PASSWORD`=`llb-access.env` 의 `GATEWAY_PASSWORD`, `LLB_TIMEOUT_S`=`30`. 재배포.
5. 확인: 배포 주소의 `/api/scholar/llb-status` 의 `connected` 가 true, `/api/scholar?corpus=llb&q=climate` 의 `fallback` 이 false.

주의: 이 PC가 켜져 있고 Docker·게이트웨이·터널이 돌고 있을 때만 외부 검색이 된다. 꺼져 있으면 `fallback: true`(공개 API 대체)로 표시된다. 게이트웨이는 SELECT 외 모든 문장을 거부하며 ClickHouse 포트(8123/9000)는 계속 127.0.0.1 에만 열려 있다.

## 배포 제약

Vercel 은 사설 ClickHouse 에 직접 접근할 수 없다. LLB 는 로컬 실행이나 ClickHouse 에 닿는 서버(터널·VPN 포함)에서만 동작한다.
Vercel 에서는 `fallback: true` 로 공개 API 결과가 나온다.

## 생성 파일 주의

`apps/web/lib/literature/llb-search.ts` 는 `lit-serving/gen-llb-ts.js` 가 만든다. 직접 고치지 말고 원본 JS 를 고쳐 다시 생성한다.
적재 상태(`llb-status.ts`)는 생성 파일이 아니므로 직접 수정해도 된다.
