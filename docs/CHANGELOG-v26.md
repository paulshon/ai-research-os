# CHANGELOG v26 — 모바일 UX 수정 · 반응형 아키텍처 · 테마 전환

## 1. 첨부 스크린샷 3건 수정 (안드로이드/모바일)

### 1-a. 문헌연구 — 검색 입력란이 안 보임
검색어 입력창이 **좌측 드로어 안에만** 존재해, 모바일에서 드로어를 열지 않으면
키워드 검색이 불가능했습니다.
→ **검색 탭 본문 상단에 항상 보이는 검색 입력창**을 추가. 드로어를 열지 않아도
   바로 검색 가능. (DB 선택은 "DB 선택" 링크로 드로어 호출)
- 파일: `app/(dashboard)/literature-review/page.tsx`

### 1-b. 문장 라이브러리 — 페이지가 비어 보임
챕터 선택 UI가 드로어에 숨어 있어 모바일에서 빈 화면처럼 보였습니다.
→ 빈 상태에 **"챕터 선택하기" 버튼**(모바일 전용)을 추가하여 드로어를 바로 열도록
   개선. 아이콘도 정상 아웃라인 아이콘으로 교체.
- 파일: `app/(dashboard)/library/page.tsx`

### 1-c. 설정 — API 키 입력창이 화면 밖으로 넘침
프로바이더 행이 `라벨 + 입력창 + 발급링크`를 한 줄(`flex`)에 배치해 좁은 화면에서
가로로 잘렸습니다.
→ 모바일에서는 **세로 스택**(`flex-col`), 태블릿 이상에서 가로 배치(`sm:flex-row`).
   입력창에 `min-w-0`로 넘침 방지, 라벨/발급링크를 모바일에서 한 줄에 정리.
- 파일: `app/(dashboard)/settings/page.tsx`

## 2. 반응형 웹 프레임 아키텍처 (Desktop First + Tablet Adaptive + Mobile Responsive)

기존 구조는 `lg`(1024px) 하나로만 갈라져, 태블릿이 모바일 취급을 받아
하단 탭바만 쓰며 공간을 낭비했습니다. **3계층 적응형 구조**로 재편:

| 계층 | 폭 | 내비게이션 |
|------|-----|------------|
| Desktop | ≥ 1024px (`lg`) | 풀 사이드바(256px) + 상단 연구흐름 탭바 |
| Tablet | 768–1024px (`md`~`lg`) | **신규 아이콘 레일(64px)** + 상단 탭바 |
| Mobile | < 768px (`md` 미만) | 하단 탭 내비게이션 + 햄버거 풀 사이드바 |

- **신규 컴포넌트** `components/dashboard/tablet-rail.tsx` — 아이콘 전용 컴팩트 레일,
  호버 시 라벨 툴팁, Research Flow / AI Tools / 설정 전체 접근
- 상단 탭바 `lg:` → `md:` (태블릿에도 표시)
- 하단 탭바·스페이서 `lg:hidden` → `md:hidden` (태블릿은 레일 사용)
- 파일: `components/dashboard/dashboard-shell.tsx`, `tablet-rail.tsx`

## 3. 테마 전환 (Light / Gray / Dark)

- **신규** `components/theme/theme-provider.tsx` — 3개 테마 컨텍스트, localStorage
  영속화, 시스템 선호도 폴백, SSR 깜빡임 방지 인라인 스크립트
- **신규** `components/theme/theme-switcher.tsx` — 설정용 세그먼트 스위처 +
  상단바용 컴팩트 토글(순환)
- `globals.css`: `:root`(다크) / `[data-theme="light"]` / `[data-theme="gray"]`
  토큰 정의 + **하드코딩 색상(bg-[#0d0f14] 등) 재매핑 레이어**.
  앱 전반이 Tailwind 임의값을 쓰므로, 테마별로 해당 클래스를 토큰으로 override하여
  실제 색상이 전환되도록 구현 (light에서는 흰색 텍스트→어두운 텍스트 반전 포함)
- 설정 페이지 최상단에 "테마 (화면 모드)" 섹션 추가, 상단바에 토글 배치
- i18n 키 `settings.themeTitle/themeDesc` (ko/en/zh) 추가
- 파일: `app/layout.tsx`, `components/providers.tsx`,
  `app/(dashboard)/settings/page.tsx`, `components/dashboard/dashboard-shell.tsx`,
  `app/globals.css`, `lib/i18n/locales/*`

## 검증
- `npm run build -w @ai-research-os/web` → 성공(EXIT 0), 정적 페이지 21개
- `tsc --noEmit` → 타입 에러 0건
- 빌드 산출 CSS에서 light/gray/dark 토큰 및 color override 규칙 존재 확인
- 클린 복사본 fresh install + build 통과

## 버전
- 0.25.0 → 0.26.0 (루트 및 apps/web)
