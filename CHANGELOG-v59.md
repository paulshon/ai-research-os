# CHANGELOG v59

v58 대비 2가지 수정.

## 1. 랜딩 진입 전 모션(스플래시) — 시안 정밀 반영
`apps/web/components/marketing/splash-screen.tsx` 를 첨부 그림 3단계에 맞춰 다시 작성.

1. **유성 곡선 낙하** — x(ease-out)와 y(ease-in)에 서로 다른 가속을 주고
   4-키프레임 경로(`66vw→30vw→12vw→0`, `-72vh→-46vh→-22vh→0`)로
   "아래로 볼록한 호(곡선)"를 그리며 낙하. 머리를 진행 방향으로 살짝 회전(rotate)시켜
   비행감을 강화.
2. **로고+텍스트 등장 후 로고만 심장 박동(heartbeat)** — 임팩트 플래시와 함께
   로고·텍스트가 점화된 뒤, **로고만** scale + glow(boxShadow)를 동기화한
   더블 thump(lub-dub) 키프레임으로 **3박(repeat:2) 느리게 박동**.
3. **선이 왼쪽 → 오른쪽으로 그어짐** — `origin-left` + `scaleX 0→1` 로 라인을
   좌측부터 그린 뒤 페이드아웃 → 랜딩 노출. 안전 타임아웃 9s→10s.
- `prefers-reduced-motion` 대응 유지.

## 2. 관리자 권한 — 차단/허용이 "전체 메뉴"에 실제로 적용되게 수정
**문제:** 사이드바가 권한과 무관하게 모든 메뉴를 렌더링 → 관리자가 「메뉴 권한」에서
"차단"해도 메뉴가 그대로 노출되어 차단/허용이 무의미했음. (권한 데이터만 저장될 뿐
UI 에 반영 안 됨.)

**조치:**
- 신규 `apps/web/app/api/permissions/me/route.ts` — 현재 로그인 사용자의 **유효 메뉴 권한**
  목록을 반환. 우선순위: 회원별 오버라이드(`user_permission_overrides`) > 관리자(전체 허용)
  > `plan_permissions ∪ role_permissions`. (DB 미구성 시 잠금 방지를 위해 전체 허용)
- 신규 `apps/web/hooks/use-permissions.ts` — `can(code)` 제공. 로딩 중에는 메뉴를 가리지
  않아 깜빡임/빈 사이드바를 방지.
- `apps/web/components/dashboard/sidebar.tsx`, `tablet-rail.tsx` — 각 메뉴에 권한 코드를
  매핑하고 `can(perm)` 으로 **필터링**. 이제 차단된 메뉴는 사이드바에서 사라짐.
  - 매핑: research→`engine.research`, literature→`engine.literature`, writing→`engine.writing`,
    validation→`engine.validation`, schedule→`engine.schedule`, structure→`engine.structure`,
    method→`engine.method`, analyzer→`engine.analyzer`, critique→`engine.critique`,
    library→`engine.library`, references→`engine.references`.
  - dashboard/settings 등 권한 코드가 없는 메뉴는 항상 노출. admin 링크는 기존대로 관리자 전용.
- 권한 카탈로그(`supabase/seed.sql`)는 위 11개 메뉴 권한을 모두 포함하므로,
  관리자 「메뉴 권한」 패널에 **전체 메뉴**가 표시되고 [허용]·[차단]·[기본]이
  사이드바에 즉시 반영된다.

> 비고: 이번 변경은 "메뉴 노출(사이드바/레일)" 차원의 차단/허용입니다. URL 직접 접근까지
> 막는 라우트 레벨 강제는 후속 enhancement 로 남겨둡니다(미들웨어 권한 조회 비용 고려).

## 사용 방법 (재확인)
1. 👑 또는 `/admin` → 관리자 로그인(서버 검증 + 세션 쿠키, v58).
2. 회원의 **「메뉴 권한」** → 메뉴별 [허용]·[차단]·[기본]. 저장 즉시 해당 회원의
   사이드바에 반영(다음 로드 시).

## 검증
- `tsc --noEmit` (apps/web): **에러 0건**.
- `next build` (apps/web): **Compiled successfully**, 정적 28/28 생성, exit 0.
  신규 `/api/permissions/me` 포함 라우트 정상 빌드.
> 실제 메뉴 차단 반영은 Clerk·Supabase 가 연결된 배포 환경에서 최종 확인 필요
> (샌드박스에서는 외부 DB 조회 불가).
