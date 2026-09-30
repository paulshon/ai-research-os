# AI-Research-OS RDOS · LLB v1

## 요약
문헌검색·문헌연구엔진에 **L1 / LLB** 코퍼스 모드를 분리했습니다.

- **L1**: 기존 공개 API 문헌검색·문헌연구엔진 (`/literature`, `/literature-review`)
- **LLB**: 로컬문헌기반 Scholar Stack (`/llb/*`) — F·L·K

## Scholar Stack
| 드라이브 | 역할 | 명명 |
|---------|------|------|
| F: | OpenAlex 원본 메타 | Corpus Vault / 메타원천고 |
| L: | Crossref·PubMed·DataCite + ClickHouse | Index Hub / 검색허브 |
| K: | OA 전문 텍스트 | Fulltext Store / 전문저장고 |

## UI
- `/literature` 검색: L1·LLB 옵션 버튼으로 검색 (`corpus=llb` 지원)
- `/literature-review`: 타이틀 옆 L1(현행) / LLB(→ `/llb/search`) 토글
- `/llb`: 검색 · DB 목록 · 네트워크분석 · 데이터분석 · 연구 인사이트 · 연구갭 · 연구설계 · 군집분석

## API
- `GET /api/scholar?corpus=llb` — ClickHouse(`openalex.papers`) 우선, 미적재 시 공개 API 보강
