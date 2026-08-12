# s-renew-13 — 첨부 그림 4건 반영 + 히어로 i18n + 모바일 동기화

## 그림 1 — RDOS 사이드바에 「학습 메뉴」 + 하위 레슨 삽입·연동
- 신규 `lib/rdos/learning-tree.ts` — 대시보드 「학습 메뉴」 카드와 사이드바가 **같은 원본**(RDOS_LESSON_CONTENT)을 보도록 트리 구성
- 사이드바 배치: **① 대시보드 → ② 학습 메뉴(8종, 각 하위 레슨 펼침) → ③ 지식·성장·인증 → ④ RDOS 관리자**
- 하위 레슨 클릭 → `/rdos/<menu>?lesson=<id>` 진입, `rdos-lesson-view` 가 해당 레슨 모달을 바로 연다
- 현재 경로의 학습 메뉴는 자동 펼침, 활성 레슨 하이라이트
- 모바일 「전체메뉴」 시트도 동일 그룹(학습 메뉴 / 인증)으로 재구성 + 레슨 수 배지

## 그림 2 — 스플래시 워드마크
- `AI Research OS` → **StudiumR** : 글자 크기 `text-3xl md:text-5xl` **기존 그대로**, 색만 신규(Studium=페이퍼 `#F4F1EA`, R=브라스 `#E0A73E`)
- 태그라인 → **AI Research Operating System for Scholars** : 크기 `text-[11px] md:text-[13px]`·색 `text-white/35` **기존 유지**, 문구만 교체
- 심볼 글로우/라인도 보라 → 브라스 계열로 정리

## 그림 3 — 연구자 플랜
- **창 제목**: `AI Research OS - Studium R — …` → **`StudiumR`**
  (Electron `title` + `page-title-updated` 고정, 웹 `metadata.title`, manifest 동시 반영)
- **연구 흐름 6단계 → 8단계**: 연구방법·검토검증 편입
  `1 연구 설계 → 2 문헌 연구 → 3 연구방법 → 4 논문 작성 → 5 논문 분석 → 6 논문 크리틱 → 7 검토·검증 → 8 참고문헌 정리`
  (사이드바·리본 스테퍼·모바일 탭/시트·플랜 게이지·진행 추적 전부 8단계로 동기화)
- **「전문 엔진」 섹션 사이드바에서 삭제** — 해당 엔진은 각 흐름 화면의 EXPERT 버튼으로 진입.
  논문일정은 상단 유틸바에 상시 노출해 접근성 유지.

## 그림 4 — EXPERT 화면
- **큰 프레임(히어로) 설명 전면 제거**: `PageMeta.hero` 플래그 도입, EXPERT 목적지 5종(`structure`·`literature-review`·`method/basic-stats`·`editor`·`library`)은 `hero:false`
  → 히어로 대신 얇은 복귀 바(BackChip + 엔진명)만 두어 작업 공간 확보
- **문헌연구 AI 분석 패널 이동**: 화면 위에 떠 있던 `fixed right-6 top-[64px]` 패널을
  **본문 흐름 안(탭 바 바로 아래 우측)** 으로 이동 — 히어로/콘텐츠를 가리지 않는다

## 히어로 카피 i18n 분리 (요청 반영)
- 신규 `lib/i18n/locales/{ko,en,zh}-hero.ts` — 히어로 29종 × 3개 언어
  키: `hero.<id>.{eyebrow,title,lead,m1v/m1u/m1l,m2*,m3*}`, `expert.<id>.{name,back}`
- `page-meta.ts` 는 **구조(라우트·강조색·아이콘·순번·hero 플래그·EXPERT 링크)만** 보유 → 문구 0개
- KO/EN/ZH 전환 시 히어로 카피·EXPERT 캡슐·복귀 라벨이 함께 전환됨 (검증 스크립트로 누락 0 확인)

## 모바일(React) 동기화
- 모바일 디자인은 이미 React 셸(앱바 + 리본 스테퍼 + 하단 탭바 + 드로어/시트)로 구현되어 있으며,
  본 버전에서 8단계·EXPERT 히어로 제거·RDOS 학습 트리를 모바일에도 동일 적용
- 하단 탭 4개 + Tools 시트에서 **흐름 8단계 전체 + 전문 엔진** 접근 (단계 번호 배지 표시)
- safe-area(iOS 노치·홈 인디케이터 / Android 펀치홀·제스처바), 44×44 터치타깃, 오버레이 스크롤 잠금 유지

## 검증
- `tsc --noEmit` → **0 오류**
- `next build` → **Compiled successfully / 34 페이지 정적 생성**
- 프로덕션 서버 기동: `<title>StudiumR</title>`, 워드마크·태그라인 렌더 확인
- i18n 검증 스크립트: 히어로 29 id × 3 언어 + EXPERT 5 키 × 3 언어 **누락 0**
