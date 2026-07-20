# CHANGELOG v61

## 1. 스플래시 모션 — 유성 제거
`apps/web/components/marketing/splash-screen.tsx`
- **유성(곡선 낙하)을 완전히 제거.** 관련 motion value/transform/이미지/머리 글로우 모두 삭제.
- 시퀀스: ① 임팩트 플래시 후 로고·텍스트 등장 → ② 로고만 scale + glow(boxShadow)를
  동기화한 lub-dub 키프레임으로 **3박, 느리게** 심장박동 → ③ 선이 `origin-left` +
  `scaleX 0→1` 로 좌→우로 그어진 뒤 전체 페이드아웃 → 랜딩페이지 전환.
- `prefers-reduced-motion` 유지. 안전 타임아웃 9s.
- 미사용이 된 `public/images/meteor.png`(556KB) 제거.

## 2. "본페이지에서 전체 메뉴가 사라지는" 문제 수정 (핵심)
**원인:** v59/v60의 권한 게이팅이 **허용목록(allowlist)** 방식이었음. 즉 사이드바가
`plan_permissions ∪ role_permissions` 에 포함된 메뉴만 표시 → 기본 플랜(free 등) 사용자는
대부분의 메뉴가 사라짐(로딩 직후 잠깐 보였다가 권한 조회 후 사라지는 "자꾸 사라짐" 증상).

**수정:** **차단목록(blocklist)** 방식으로 전환.
- `apps/web/app/api/permissions/me/route.ts` — 이제 `{ isAdmin, blocked }` 반환.
  `blocked` = 해당 회원의 `user_permission_overrides` 중 **allowed=false(명시적 차단)** 만.
  관리자/조회 실패/DB 미구성 시 `blocked=[]`.
- `apps/web/hooks/use-permissions.ts` — `can(code)` = 차단되지 않았으면 true.
  로딩 중·관리자·실패 시 전부 노출(fail-open).
- 결과: **기본은 모든 메뉴 노출.** 관리자가 회원별로 "차단"한 메뉴만 숨겨진다.
  ("허용"/"기본" 은 모두 노출.)
- 사이드바·태블릿 레일·대시보드 셸(상단 탭/모바일 내비/AI Tools 시트)·라우트 가드는
  동일하게 `can()` 사용 — 호출부 변경 없이 시맨틱만 안전하게 변경됨.

## 검증
- 차단목록 `can()` 로직 단위 테스트: 일반 사용자/로딩/관리자/조회실패 → **전 메뉴 노출**,
  특정 메뉴 차단 시 **그 메뉴만 숨김** — **5/5 PASS**.
- 스플래시에 유성 잔재(meteor/useMotionValue/useTransform/progress) **0건** 확인.
- `tsc --noEmit` (apps/web): **에러 0건**.
- `next build` (apps/web): **Compiled successfully**, exit 0.
> 실제 화면 렌더·메뉴 동작 최종 확인은 Clerk·Supabase 연결 배포 환경에서 필요
> (스플래시 모션은 채팅 미리보기로 확인).
