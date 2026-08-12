# CHANGELOG v64

## s***@gmail.com 슈퍼관리자(super-admin) 지정
지정 이메일로 로그인하면 등급(plan)·DB role 설정과 무관하게 즉시 **관리자** 로 인식되어:
- 무료 등급 제한을 받지 않고 **전체 메뉴 접근**(사이드바 전부 활성).
- 사이드바에 **관리자 메뉴** 노출.
- **별도 관리자 비밀번호 없이** 관리자 패널에서 회원별 메뉴/하위메뉴 허용·차단 관리 가능.

### 구현
- 신규 `apps/web/lib/admin-config.ts` — `SUPER_ADMIN_EMAILS = ["s***@gmail.com"]`,
  `isSuperAdminEmail(email)` (대소문자 무시).
- `app/api/permissions/me/route.ts` — Clerk `currentUser()` 이메일이 슈퍼관리자면 전체 허용
  (등급/DB 무관). 기존 role=admin 경로 유지.
- `components/dashboard/sidebar.tsx` — 슈퍼관리자 이메일이면 `isAdmin=true` (관리자 메뉴 노출,
  메뉴는 권한 훅에 의해 전부 활성).
- `lib/admin-auth.ts` — `isAdminAuthorized(req)` (비동기) 추가: 세션 쿠키/x-admin-secret **또는**
  Clerk 슈퍼관리자 이메일이면 허용.
- 관리자 API 전환: `app/api/admin/members`, `member-permissions`(GET·POST), `approve-member`
  → `isAdminAuthorized` 사용. 슈퍼관리자는 `/admin` 진입 시 **비밀번호 입력 없이 자동 인증**
  (회원 목록 자동 로드).
- `app/(dashboard)/layout.tsx` — 슈퍼관리자 이메일 로그인 시 Supabase `profiles.role='admin'`,
  `approval_status='approved'` 로 **영구 승격**(member 목록·패널 표시 일관성).

### 관리 흐름 (요구사항 충족)
s***@gmail.com 로 로그인 → `/admin`(또는 구조엔진 ⬡ 버튼) → 회원의 「메뉴 권한」 →
free 등급에 기본 차단된 상위메뉴(검토·검증/논문일정/논문구조엔진/연구방법/논문분석/논문크리틱/
문장라이브러리/참고문헌)와 하위메뉴를 **[허용]·[차단]·[기본]** 으로 회원별 관리.
(오버라이드는 등급 기본값보다 우선 적용되어 사이드바·라우트에 즉시 반영.)

## 검증
- 슈퍼관리자 인식 단위 테스트(정확 일치/대소문자/타계정/null) — PASS.
- 배선 점검: `isSuperAdminEmail` (permissions/me·sidebar·layout·admin-auth),
  `isAdminAuthorized` (members·member-permissions·approve-member) 적용 확인.
- `tsc --noEmit` (apps/web): **에러 0건**.
- `next build` (apps/web): **Compiled successfully**, exit 0.
> 실제 계정 동작 최종 확인은 Clerk·Supabase 연결 배포 환경에서 이뤄집니다.
