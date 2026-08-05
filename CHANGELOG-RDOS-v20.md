# CHANGELOG — RDOS / AI-Research-OS v20 (s20)

## 연구설계 · 문헌연구 → 논문작성 연동

- 연구설계 6개 기능(주제탐색, 연구질문, 개념맵핑, 방법론설계, 연구로드맵, 연구기억) 실행 결과를 섹션별로 보존하고 논문작성과 연동.
- 문헌연구 논문검색 갭분석 결과 + 논문 전체 리스트/링크를 논문작성과 연동.
- 상세문헌엔진(검색, 네트워크분석, 연구갭, 연구설계, 학자군집이론분석) 결과를 논문작성과 연동.
- 브리지 스토어: `aros:writing:linked-results` + `aros:linked-results-changed` 이벤트.

## 논문작성 하단 패널 UI

- 에디터 하단에 리사이즈 가능한 연동 결과 패널 추가 (점선 드래그 핸들).
- 아코디언 UI: 한 번에 하나의 결과만 펼침.
- 결과 본문·논문 링크 표시, 에디터 삽입, 원본 메뉴 이동 지원.
- KO / EN / ZH 문구 추가 (`writingPage.linked.*`).

## 파일

- `apps/web/lib/writing/linked-results-bridge.ts` (신규)
- `apps/web/components/writing/linked-results-panel.tsx` (신규)
- `apps/web/app/(dashboard)/writing/page.tsx`
- `apps/web/app/(dashboard)/research/page.tsx`
- `apps/web/app/(dashboard)/literature/page.tsx`
- `apps/web/app/(dashboard)/literature-review/page.tsx`
- `apps/web/lib/project-save.ts` (프로젝트 리셋 시 브리지 초기화)
- `apps/web/lib/i18n/locales/{ko,en,zh}-dash3.ts`

## Verification

- `apps/web`: `npm run typecheck`
- `apps/web`: `npm run build`
