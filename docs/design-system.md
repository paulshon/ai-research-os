# Design System — AI Research OS · RDOS renew-1

정본은 `apps/web/app/globals.css` 의 `:root` 블록과 `RDOS-Redesign/assets/rdos.css` 이다.

## 토큰

| 종류 | 값 |
|---|---|
| 배경 | `--bg-0` `#04060e` · `--bg-1` `#080c18` · `--bg-2` `#0d1324` |
| 글래스 | `--glass-1/2/3` · `--stroke` · `--stroke-2` · `--hairline` |
| 텍스트 | `--t1` `#eef1f8` (17.9:1) · `--t2` `#aab4ca` (9.73:1) · `--t3` `#7f8aa3` (5.85:1) |
| 트랙 | 연구자 `--track-r` `#6d8dff` · 연구준비자 `--track-d` `#3ecfb2` |
| 상태 | `--ok` · `--warn` · `--danger` · `--info` |
| 폰트 크기 | 12 / 13 / 15 / 17 / 22 / 30 px |
| 라운드 | 8 / 12 / 18 / 24 px |
| 간격 | 4px 그리드 (4·8·12·16·20·24·32·40) |

## 컴포넌트

`components/ui/` — Glass, Card, Kpi, Badge, Button, Input/Select/Textarea/Field, Segmented, ProgressBar/Row, Gauge, Steps, DataList, Table, EmptyState, Sparkline, Icon

`components/inspector/` — Inspector, InspectorSection, PropertyRow, Toggle, Slider, EvidenceCard, ConfidenceMeter, NextStepLinks

`components/bench/` — Bench, BenchPane, Marker, PageRail

`components/shell/` — AppShell, Page

## 사용 금지

1. 컴포넌트 코드에 `#rrggbb` / `rgb()` / `rgba()` 리터럴
2. `text-[13.5px]` · `rounded-[Npx]` 임의값
3. `text-white/20` 처럼 불투명도로 텍스트를 흐리게 만들기
4. 이모지를 아이콘으로 사용
5. 메뉴에 개별 색 배정
6. 근거 없는 AI 출력 표시
7. glass 안에 glass 중첩 (flat 만 허용)
8. 폰트에 없는 문자(㉛~㉞, ⌘, U+2212)
