# LLB 네트워크 분석

화면: `/llb/network` · 코드: `apps/web/components/literature/network-explorer.tsx`

## 구조
```
브라우저 ── GET /api/scholar/network?q&kind&scope&sort&maxNodes[&필터] ──► route.ts
   route.ts → llb-network.getNetwork()
      1) searchLlb(limit 1)            전체 일치 편수(검색 화면과 같은 기준)
      2) topWids(opts, N)              검색 화면과 같은 순위(단계식)로 상위 N편의 wid
      3) loadRecords(wids)             5,000개씩 lit_papers 조회(저자·키워드·기관·국가·후원기관·MeSH·개념)
      4) network-graph.buildGraph()    11종 중 요청한 종류의 노드·엣지 (인용·서지결합은 papers_v2 참고문헌, 상위 200편)
      5) network-graph.summarize()     표본 요약
   ◄── { matched, sampleSize, graph, summary, ms, note }
브라우저: analyzeGraph(지표·Louvain) → layoutComponents(배치) → SVG
```
같은 표본은 서버 메모리에 5분 캐시한다(종류만 바꿀 때는 즉시).

## 파라미터
| 이름 | 값 |
|---|---|
| `q` | 검색어(따옴표 구문 가능) |
| `kind` | `coauthor` `coword` `authorkw` `journal` `institution` `country` `funder` `mesh` `concept` `citation` `coupling` |
| `scope` | 40·100·200·500·1000·5000·10000 (최대 10,000) |
| `sort` | `relevance` `cited` `fwci` `year` — 인용 네트워크는 `cited` 가 구조를 잘 보여 줌 |
| `maxNodes` | 20–200(기본 120) |
| 필터 | `yearFrom` `yearTo` `lang` `indexes` `minJif` `jifQuartile` `oaOnly` `hasAbstract` `citableOnly` `area` `types` `region` |

## 지표
연결 수, 가중 연결, 매개 중심성(Brandes), 근접 중심성(Wasserman–Faust), PageRank(가중, d=0.85), 군집계수, 전이성, 밀도, 평균 경로, 지름, 연결 요소, **Louvain 군집·모듈성 Q**.

## 제약(읽기 전용 계정 `llb_ro`)
- 결과 행 ≤ 100,000, 질의 시간 ≤ 120초, 메모리 ≤ 6 GB, 분당 120질의.
- 게이트웨이는 질의를 URL 항목으로 ClickHouse 에 넘기고 항목 하나가 128 KB 를 넘으면 거부 → wid 목록은 5,000개씩.
- 읽을 수 있는 표: `openalex.lit_*`, `openalex.papers_v2`.

## 시험 방법(웹앱 의존성 없이)
`lib/literature/network-graph.ts` 는 순수 TypeScript 라 `node --experimental-strip-types` 로 바로 시험할 수 있다. 화면은 vite 로 `network-explorer.tsx` 만 묶어 서버 함수(`getNetwork`)를 감싼 작은 HTTP 서버와 함께 띄워 확인했다.
