# CHANGELOG v63

## 1. 등급(plan)별 기본 메뉴 접근권한 + "표시하되 비활성"
- **free 등급**: 대시보드 · 연구 설계 · 문헌 연구 · 논문 작성(양적·질적만) 접근 가능.
  그 외 메뉴(검토·검증/논문일정/논문구조엔진/연구방법/논문분석/논문크리틱/문장라이브러리/참고문헌)는
  **메뉴는 보이되 비활성(클릭/이동 불가, 자물쇠 표시)** 처리.
- **유료 등급(scholar/university 등)**: 전체 메뉴 허용.
- 구현:
  - `lib/menu-catalog.ts` — 코드 기반 카탈로그 + `FREE_ALLOWED` / `defaultAllowedFor(plan)`.
  - `app/api/permissions/me/route.ts` — 등급 기본 허용집합 → 회원 오버라이드 적용(true 추가/false 제거),
    관리자 전체 허용. 응답 `{ isAdmin, all, allowed[] }`.
  - `hooks/use-permissions.ts` — `can(code)` (로딩/관리자/all → true, 그 외 allowed 포함 여부).
  - `components/dashboard/sidebar.tsx` — 메뉴를 **숨기지 않고** `disabled` 로 렌더(자물쇠 아이콘).
  - `components/dashboard/dashboard-shell.tsx` — 상단 탭바도 차단 항목을 비활성 표시 + 라우트 가드로
    URL 직접 접근 차단(→ /dashboard).
  - 논문 작성(`app/(dashboard)/writing/page.tsx`) — 연구유형 선택에서 free 는 양적/질적만 선택 가능,
    그 외 유형은 비활성(자물쇠). `engine.writing.others` 권한 필요.

## 2. 논문구조엔진 — 관리자 진입 버튼 계정 제한
- `/structure` 좌측 ⬡ 버튼(관리자 페이지 진입)을 **s***@gmail.com** 계정에만 활성화.
  다른 계정은 비활성(클릭/이동 불가)으로 표시.

## 3. 관리자 — 전체 메뉴(+하위메뉴) 차단/허용
- **원인:** 패널이 DB `permissions` 테이블을 읽어, 시드가 부분 적용된 환경에서는 `engine.apa`
  한 줄만 보였음.
- **수정:** 패널을 **코드 기반 카탈로그**로 전환 — DB 시드 상태와 무관하게 **항상 전체 메뉴**가 표시.
  - `app/api/admin/member-permissions/route.ts` GET → `MENU_CATALOG`(상위+하위) + 회원 오버라이드 +
    등급 기본 허용상태 반환.
  - `components/admin/member-permission-panel.tsx` → **계층형 UI**(상위 메뉴 ▸ 펼치면 하위메뉴),
    각 항목 [허용]·[차단]·[기본] 토글. 오버라이드는 `user_permission_overrides` 에 저장(코드 키).

## 검증
- 권한 계산 단위 테스트: free 기본(4메뉴+양적/질적) / 유료=전체 / 관리자=전체 / 오버라이드 가감 — **5/5 PASS**.
- `tsc --noEmit` (apps/web): **에러 0건**.
- `next build` (apps/web): **Compiled successfully**, exit 0.
> 실제 화면·계정별 동작 최종 확인은 Clerk·Supabase 연결 배포 환경에서 이뤄집니다
> (관리자 패널·사이드바는 채팅 미리보기로 확인). DB 마이그레이션 0009 적용은 선택(이번 패널은 DB 비의존).
