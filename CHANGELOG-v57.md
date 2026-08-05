# CHANGELOG v57

요청된 9개 항목을 모두 반영했습니다.

## 1. Pro → Scholar 플랜명 변경
- `apps/web/lib/i18n/locales/{ko,en,zh}.ts` 의 `plans.pro.name` 을 `Scholar` 로 변경.
- 별도 `apps/web/app/(marketing)/pricing/page.tsx` 의 플랜명도 `Scholar` 로 정합.

## 2. Scholar(구 Pro) 플랜 기능 개편
- 삭제: 전체 AI 엔진 해제 · 실시간 협업(CRDT) · 인용 자동화 + Zotero 연동 · AI 멘토링 무제한 · 우선 기술 지원
- 추가: **연구방법자동화프로그램(5가지)제공**
- 최종: 무제한 프로젝트 · 전체 검증 엔진 · 연구방법자동화프로그램(5가지)제공 (3개 항목)

## 3. Basic 플랜 기능 개편
- 삭제: AI 기본+ (작성·일정·구조)
- 추가: **연구방법자동화프로그램(양적연구)제공**
- 최종: 프로젝트 10개 · 로컬 저장(Local First) · 기본 검증 엔진 · 논문 크리틱 월 20회 · 참고문헌 정리 · 연구방법자동화프로그램(양적연구)제공 (6개 항목)

## 4. University 플랜 기능 개편
- 삭제: 관리자 대시보드 · 전용 온보딩 지원 · SLA 보장
- 추가: **연구방법자동화프로그램(10가지)제공**
- 최종: 무제한 멤버 · 교수-학생 권한 체계 · 기관 SSO / ORCID · 연구방법자동화프로그램(10가지)제공 (4개 항목)

> 위 변경에 맞춰 랜딩 `apps/web/app/page.tsx` 의 `featureCount` 로직을
> free=5 · basic=6 · scholar=3 · university=4 로 조정했습니다. 3개 로케일 항목 수도 일치합니다.

## 5. 랜딩페이지 회원가입 버튼 신설
- `common.signupNav`("회원가입"/"Sign up"/"注册") 번역 키를 ko/en/zh 에 추가.
- 랜딩 navbar(데스크탑·모바일) 및 마케팅 navbar 의 로그인 버튼 옆 버튼을
  명시적 **"회원가입"** 라벨로 표기하고 `/signup` 으로 연동.

## 6. Framer Motion 스플래시 재구성 (첨부 시안 반영)
`apps/web/components/marketing/splash-screen.tsx` 시퀀스:
1. **유성 곡선 낙하** — x는 거의 선형, y는 늦게 가속(ease)하도록 분리하여
   합성 경로가 아래로 볼록한 곡선이 되게 함.
2. **로고+텍스트 등장 후 로고만 "심장 박동(heartbeat)" glow** —
   더블 thump(lub-dub) keyframe(scale + boxShadow 동기)을 2회 반복.
3. **선이 왼쪽→오른쪽으로 그어진 뒤** 페이드아웃 → 랜딩 노출
   (`origin-left` + `scaleX 0→1`). 안전 타임아웃 7s→9s.
- `prefers-reduced-motion` 대응 유지.

## 7. 파일 구조 정비 (872MB → 33MB)
- 미사용 폰트 제거: `.otf` 14종(13MB) — 코드/CSS는 `.ttf` 만 참조함을 검증 후 삭제.
- 빌드 산출물/캐시 제거: `.next`, `.turbo`, `dist`, `out`, `*.tsbuildinfo`, `.DS_Store`.
- `node_modules` 제거(재생성 가능). `package-lock.json` 유지로 결정적 설치 보장.
  > 설치: 루트에서 `npm install` (Vercel `installCommand` 와 동일).
- 워크스페이스(`apps/web`, `packages/*`) 및 배포 경로(vercel.json)는 변경 없음.
- `apps/api`, `apps/desktop`, `apps/realtime` 은 npm 워크스페이스 외부의 별도
  서비스로, 웹 배포에 포함되지 않으나 시스템 구성요소이므로 보존했습니다.

## 8. Clerk → Supabase 회원 연동 견고화
**진단:** 웹훅 코드/미들웨어 공개경로/스키마는 정상. 그러나 온보딩에 도달한
신규 가입만 `/api/profile/ensure` 가 호출되어, **웹훅 미설정/실패** 또는
**웹훅 이전 가입(기존 Clerk 회원)** 의 데이터가 Supabase 로 연동되지 않았음.

**조치:**
- `apps/web/lib/membership-server.ts` 에 `ensureMembershipProfile()` 추가 —
  프로필이 없으면 생성(free·student·승인대기), 있으면 기본정보만 보강(멱등).
- `apps/web/app/(dashboard)/layout.tsx` 를 서버 컴포넌트로 전환하여,
  **인증된 모든 사용자가 첫 대시보드 접속 시 1회 자동 동기화**되도록 호출.
  → 신규/기존 회원 구분 없이 Supabase `profiles` 로 연동됨.
- 기존 다량 백필이 필요하면 `POST /api/admin/sync-clerk-users`
  (헤더 `x-admin-secret: $ADMIN_API_SECRET`) 로 일괄 동기화 가능.

**운영 체크리스트(코드 외 설정):**
1. Clerk Dashboard → Webhooks → Endpoint 추가:
   `https://<도메인>/api/webhooks/clerk`, 이벤트 `user.created`,`user.updated`.
   서명 시크릿을 `CLERK_WEBHOOK_SECRET` 환경변수로 설정.
2. `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정.
3. Supabase 마이그레이션(특히 0008)이 적용되어 있어야 함
   (`avatar_url`, `gemini_model`, `language`, `theme` 컬럼 보장).

## 9. 회원별 메뉴 차단/수정 (이미 구현 — 위치 안내)
- **있음.** 관리자는 회원별로 각 메뉴(권한)를 [허용]·[차단]·[기본(plan/role 상속)]
  으로 선택수정할 수 있습니다.
- **위치:** `/admin` → 관리자 로그인 → 회원 목록의 각 회원 **"메뉴 권한"** 버튼
  → `MemberPermissionPanel` 에서 메뉴별 토글.
- **구성:**
  - UI: `apps/web/components/admin/member-permission-panel.tsx`
  - API: `apps/web/app/api/admin/member-permissions/route.ts`
    (GET 권한 카탈로그+오버라이드, POST `{userId, permission_code, allowed|null}`)
  - DB: `public.user_permission_overrides` 테이블, `has_permission()` 가
    회원별 오버라이드를 plan/role 매핑보다 **최우선** 적용 (migration 0008).

## 검증
- `tsc --noEmit` (apps/web): **에러 0건** (사전 누락된 `@types/node` 보강 후 확인).
- 3개 로케일 플랜 항목 수와 `featureCount` 로직 일치 확인.
