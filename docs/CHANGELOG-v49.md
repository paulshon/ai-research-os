# CHANGELOG — v49

세 가지를 반영한 릴리스입니다. ① iOS 모바일 버전 추가, ② 모든 메뉴 작업의 임시저장·자동저장
연동(프로젝트 저장에 전부 포함), ③ 전 버전(데스크탑/태블릿/모바일/iOS) 글자 −1.5pt 통일.

---

## 1. iOS 모바일 버전 추가

기존 데스크탑·태블릿·모바일(안드로이드)에 더해 **iOS(아이폰·아이패드)** 전용 처리를 추가했습니다.

- **플랫폼 감지**: `app/layout.tsx`에 페인트 전 실행되는 스크립트로 iOS/iPadOS/Android/standalone을
  판별하여 `<html data-os="ios|android|web" [data-standalone]>` 설정. iPadOS(데스크톱 모드)도
  `MacIntel + maxTouchPoints>1`로 감지. 런타임용 `lib/use-platform.ts`(usePlatform) 훅 추가.
- **세이프에어리어(노치·홈 인디케이터)**: iOS에서 `env(safe-area-inset-*)`이 동작하려면 필수인
  **`viewport-fit=cover`** 를 `viewport` export에 추가. 모바일 상단 로고 헤더에 상단 인셋
  (`env(safe-area-inset-top)`) 적용, 하단 내비게이션은 기존 하단 인셋 유지 → 노치/홈바에 안 가림.
- **PWA(홈 화면 추가)**: `app/manifest.ts`(standalone, 테마색 #0d0f14) 신설 +
  `appleWebApp`(capable, black-translucent, title) 메타. 홈 화면에 추가 시 앱처럼 전체화면 실행.
- **iOS 사파리 보정**(`globals.css`, `html[data-os="ios"]`에만):
  입력 포커스 자동 확대 방지(모바일 입력 폰트 16px 고정), 동적 툴바 대응 `100dvh`,
  탭 하이라이트 제거, 관성 스크롤/바운스 격리, 가로 전환 글자 튐 방지.
- 셸 루트에 `min-h-[100dvh]` 추가(iOS 주소창 변동 대응).

## 2. 모든 메뉴 작업의 임시저장·자동저장 연동

증상: 각 메뉴(특히 논문 작성)에서 작업한 내용이 임시저장/프로젝트 저장에 포함되지 않음.

- 원인: 논문작성(writing)·문헌연구(literature)는 드래프트 **불러오기(usePagePersistence)** 만 있고
  **저장 등록(PageSaveRegistration)** 이 없어, `aros:page:*` 드래프트가 기록되지 않아 프로젝트
  스냅샷 집계에서 빠졌음.
- 수정:
  - **writing·literature·research** 페이지에 `PageSaveRegistration`(저장 등록) 추가.
    이로써 저장 등록 페이지: research·literature·writing·structure·validation·schedule·analyzer·
    critique·library·literature-review·editor — 즉 작업이 발생하는 모든 메뉴.
  - `research`를 `PageId`/`ALL_PAGE_IDS`에 추가하여 연구설계 작업도 프로젝트 저장에 포함.
  - **자동저장 강화**(`hooks/use-page-save-registration.ts`): 4초 주기 변경 감지 자동저장 +
    탭/앱 백그라운드 전환(visibilitychange)·새로고침/종료(pagehide·beforeunload)·메뉴 이동
    (언마운트) 시 즉시 저장. 모바일에서 앱이 백그라운드로 가도 유실 없음.
  - **프로젝트 단위 자동저장**(`components/save/project-save-panel.tsx`): 8초 주기 +
    백그라운드 전환/종료 시 모든 페이지를 모아 임시 스냅샷(projectTemp) 자동 저장.
    사이드바에 "자동저장 HH:MM" 표시(파란 점) 추가.
- 결과: 어떤 메뉴에서 작업하든 → 자동/임시 저장 → 최종 프로젝트 저장(.aros)에 **모든 데이터 포함**.

## 3. 전 버전 글자 −1.5pt 통일 (데스크탑/태블릿/모바일/iOS)

- 기존: 모바일(≤767px)만 −1.5pt(v43). 데스크탑·태블릿은 미적용.
- 추가: `@media (min-width: 768px)` 블록(32개 규칙)으로 데스크탑·태블릿의 `text-[Npx]`(≥12px)를
  −2px(≈−1.5pt)로 축소. 모바일/iOS는 기존 ≤767px 규칙만 적용되어 **이중 축소 없음**.
- 결과: 모든 뷰포트(데스크탑·태블릿·모바일 안드로이드·iOS)가 동일하게 −1.5pt.
  12px 미만 보조 라벨은 가독성 위해 유지.

---

### 검증
- `tsc --noEmit`: 통과(0 errors)
- `next build`: 성공. 랜딩 `/` 정적 프리렌더(○), `/manifest.webmanifest` 생성,
  `/writing`·`/literature`·`/research`·`/settings` 정상.
- 점검: ALL_PAGE_IDS에 research 포함, 글자 축소 블록 2종(≤767 / ≥768) 공존,
  writing·literature·research 저장 등록 확인, iOS viewport/메타/감지 배선 확인.
