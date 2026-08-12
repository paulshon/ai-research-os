# CHANGELOG v58

v57 대비 변경 — **관리자 인증 정비** (회원별 메뉴 권한 기능이 실제로 동작하도록 수정).

## 배경 (v57까지의 문제)
- 관리자 비밀번호(`sarangred` / `[REDACTED-v4]`)가 **클라이언트 번들에 하드코딩**되어 노출.
- 로그인 성공 시 클라이언트가 `adminSecret` 을 고정 문자열 `"ADMIN_AUTHENTICATED"` 로
  설정 → 서버의 `=== process.env.ADMIN_API_SECRET` 검사와 불일치하여
  `/api/admin/*` 호출이 전부 **403 Forbidden** → 회원 목록·메뉴 권한 토글이 동작하지 않음.

## 변경 사항

### 1) 서버 검증 + 서명된 httpOnly 세션 쿠키
- 신규 `apps/web/lib/admin-auth.ts`
  - `verifyAdminCredentials()` — 자격은 **서버에서만** 검증.
    환경변수 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 사용.
    운영(production)은 환경변수 미설정 시 로그인 거부(하드코딩 비밀번호 없음),
    개발 환경에서만 기존 계정으로 폴백(서버 전용, 브라우저 비노출).
  - `makeAdminSessionToken()` — `ADMIN_API_SECRET` 으로 HMAC-SHA256 서명한 세션 토큰.
  - `isAdminRequest()` — 관리자 권한 검증. ①서명된 세션 쿠키(`aros_admin`) 또는
    ②서버-투-서버용 `x-admin-secret`/`?secret` 헤더(=`ADMIN_API_SECRET`). `timingSafeEqual` 사용.
- 신규 `apps/web/app/api/admin/login/route.ts`
  - `POST` — Clerk 로그인 사용자가 자격 검증 통과 시 **httpOnly·SameSite=Lax·Secure(prod)**
    세션 쿠키 발급(8시간). 비밀번호/시크릿이 브라우저로 전달되지 않음.
  - `DELETE` — 세션 쿠키 제거(로그아웃).

### 2) 관리자 API 인증 일원화 (`isAdminRequest`)
- `app/api/admin/members/route.ts`
- `app/api/admin/member-permissions/route.ts` (GET·POST)
- `app/api/admin/approve-member/route.ts` (`Request`→`NextRequest`)
- `app/api/admin/sync-clerk-users/route.ts` (`Request`→`NextRequest`)
  → 모두 `isAdminRequest(req)` 로 통일. 쿠키 세션 또는 헤더 시크릿 모두 허용.

### 3) 클라이언트에서 시크릿/비밀번호 제거
- `app/(dashboard)/admin/page.tsx`
  - 하드코딩 `ADMIN_ID`/`ADMIN_PW` 및 `adminSecret` 상태 제거.
  - 로그인은 `POST /api/admin/login` 으로 위임, 성공 시 쿠키로 후속 호출 인증.
  - 마운트 시 기존 세션 쿠키가 유효하면 자동으로 회원 목록 로드.
  - 모든 관리자 fetch 는 `credentials: "same-origin"` (쿠키 전송), `?secret`/`x-admin-secret` 제거.
- `components/admin/member-permission-panel.tsx`
  - `adminSecret` prop 제거. 쿠키 기반 fetch 로 전환(GET·POST).

### 4) 환경변수 문서화
- `.env.example` 에 `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME`,
  `ADMIN_PASSWORD`, `ADMIN_API_SECRET` 추가.

## 사용 방법 (회원별 메뉴 권한 — "어디서 하나")
1. 상단 navbar 👑 아이콘 또는 `/admin` 접속(먼저 Clerk 로그인+승인 필요).
2. 페이지 내 관리자 로그인(아이디/비밀번호) → 서버 검증 후 세션 쿠키 발급.
3. 회원 목록의 각 회원 **「메뉴 권한」** 버튼 → `MemberPermissionPanel` 펼침.
4. 메뉴마다 **[허용]·[차단]·[기본(plan/role 상속)]** 선택 → `user_permission_overrides` 에 저장,
   `has_permission()` 이 plan/role 매핑보다 우선 적용.

## 운영 설정 체크리스트
- `ADMIN_API_SECRET` : 길고 무작위한 문자열(쿠키 서명·백필 호출용). **필수.**
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` : 운영 환경에서 **반드시 설정**(미설정 시 로그인 불가).
- (변경 없음) Clerk 웹훅·Supabase 키 등은 CHANGELOG-v57 의 체크리스트 참고.

## 검증
- `tsc --noEmit` (apps/web): **에러 0건**.
- `next build` (apps/web): **Compiled successfully**, 정적 페이지 28/28 생성, exit 0.
  새 `/api/admin/login` 포함 모든 `/api/admin/*` 라우트 정상 빌드 확인.
- 클라이언트/앱 코드에서 `adminSecret`·`ADMIN_AUTHENTICATED`·하드코딩 비밀번호 잔재 없음
  (서버 전용 개발 폴백 제외).

> 비고: 빌드/타입 검증은 통과했으나, 실제 로그인 동작은 Clerk·Supabase·관리자
> 환경변수가 설정된 배포 환경에서 최종 확인이 필요합니다(샌드박스에서는 외부 인증/DB
> 연동을 실제 호출할 수 없음).
