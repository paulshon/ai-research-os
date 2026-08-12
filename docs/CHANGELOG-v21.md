# AI Research OS v21 — Changelog

## v21: 안드로이드/모바일 전면 호환성 개선

### 🔧 핵심 수정 사항

#### 1. 레이아웃 / 스크롤 (Critical Fix)
- **DashboardShell**: `<main>` overflow 모델 전면 재설계
  - `overflow-hidden` → `overflow-y-auto` 전환으로 모바일 스크롤 정상화
  - iOS safe-area-inset 지원 추가 (`env(safe-area-inset-bottom)`)
  - 하단 탭바 공간 확보 패딩 추가 (`.h-16.lg:hidden`)
- **모든 Dashboard 페이지**: `flex-1 overflow-y-auto` → 표준 블록 레이아웃으로 변경
  - `height: "100%"`, `overflow: "hidden"` 스타일 제거
  - `min-h-0` 필요 없는 위치에서 제거

#### 2. 모바일 메뉴 접근성 (Feature Fix)
- **하단 탭바 확장**: AI Engines 토글 패널 추가
  - 🤖 버튼으로 `workflow`, `structure`, `chat`, `analyzer`, `advisor`, `library`, `literature-review`, `critique` 메뉴 즉시 접근
  - ⚙ 설정 단축 버튼 추가
  - 엔진 패널 토글 시 슬라이드 애니메이션 적용

#### 3. 페이지별 모바일 UI 추가
- **Writing 페이지**: `🤖 Copilot` 버튼 추가 → AI 패널 모바일 오버레이
- **Structure 페이지**: `AI Copilot` 버튼 추가 → AI 패널 모바일 오버레이
- **Library 페이지**: 상단 드롭다운으로 논문유형·챕터 모바일 선택기 추가
- **Advisor 페이지**: 상단 드롭다운으로 어드바이저 모바일 선택기 추가
- **Critique 페이지**: 기존 mobilePane 탭 유지 + overflow 수정

#### 4. iOS 입력 관련 수정
- 모든 `<input>`, `<textarea>`, `<select>`: 최소 `font-size: 16px` 적용 → iOS 자동 zoom 방지
- `-webkit-overflow-scrolling: touch` 추가 → 관성 스크롤 지원

#### 5. localStorage 안정성 (Mobile Browser Fix)
- `use-gemini.ts`: `resolveStoredApiKey()` try-catch 추가
- `use-gemini.ts`: `generate()` 내 localStorage 접근 try-catch 래핑
- `settings/page.tsx`: 초기화 및 저장 로직 try-catch 래핑
- iOS Safari 개인정보 모드에서 앱 크래시 방지

#### 6. CSS 개선 (`globals.css`)
- `.page-scroll-container`: 모바일 공용 스크롤 컨테이너 클래스
- `.touch-scroll`: iOS 관성 스크롤 헬퍼
- `.tab-scroll`: 탭 영역 가로 스크롤 최적화
- `@keyframes slide-down`: AI 엔진 패널 등장 애니메이션

### 📋 변경 파일 목록
- `apps/web/components/dashboard/dashboard-shell.tsx` — 전면 재작성
- `apps/web/app/globals.css` — 모바일 CSS 추가
- `apps/web/hooks/use-gemini.ts` — localStorage 안정화
- `apps/web/app/(dashboard)/writing/page.tsx` — Copilot 모바일 패널
- `apps/web/app/(dashboard)/structure/page.tsx` — AI 패널 모바일 토글
- `apps/web/app/(dashboard)/library/page.tsx` — 모바일 챕터 선택기
- `apps/web/app/(dashboard)/advisor/page.tsx` — 모바일 어드바이저 선택기
- `apps/web/app/(dashboard)/advisor/page.tsx` — overflow 수정
- `apps/web/app/(dashboard)/analyzer/page.tsx` — overflow 수정
- `apps/web/app/(dashboard)/chat/page.tsx` — 스크롤 수정
- `apps/web/app/(dashboard)/critique/page.tsx` — overflow 수정
- `apps/web/app/(dashboard)/literature/page.tsx` — overflow 수정
- `apps/web/app/(dashboard)/literature-review/page.tsx` — overflow 수정
- `apps/web/app/(dashboard)/validation/page.tsx` — overflow 수정
- `apps/web/app/(dashboard)/workflow/page.tsx` — overflow 수정
- `apps/web/app/(dashboard)/settings/page.tsx` — localStorage 안정화
- `apps/web/app/(dashboard)/dashboard/page.tsx` — 버전 업데이트

---
*AI Research OS v21 — 2026년 5월*
