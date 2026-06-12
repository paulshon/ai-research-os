# v54 — 로고 교체 · 유성 인트로 · Supabase 회원등급 RBAC

## 1) 로고 전면 교체 (모든 버전)
- 새 펜촉(R) 로고로 교체: 인앱 브랜드 마크(데스크탑 사이드바·태블릿 레일·모바일 상단바·마케팅 내비/랜딩) → 공용 `BrandLogo` 컴포넌트.
- 앱/플랫폼 아이콘 신규 생성: `app/icon.png`(favicon), `app/apple-icon.png`(iOS), PWA `icon-192/512/maskable`(Android) + manifest 연결.
- 에셋: `public/images/logo.png`(투명 펜촉), 아이콘 PNG 세트.

## 2) Framer Motion 인트로 개편 (유성 시나리오)
- `splash-screen.tsx` 재작성: 밤하늘 → 유성(`/images/meteor.png`, screen 블렌드)이 곡선 비행 → 로고 지점 도착 시 로고+텍스트 발현 → 글로우 → 약 1.5초 정지 → 약 1초 페이드아웃 → 랜딩.
- 데스크탑/태블릿/모바일(안드로이드·iOS) 반응형, `prefers-reduced-motion` 지원. `SplashGate` API 유지.

## 3) Supabase 회원등급 RBAC (코드→터미널 업로드 / Migration)
- `supabase/migrations/0001~0007` + `seed.sql` + `config.toml` + `README.md`.
- 인증: Clerk(`profiles.id` = Clerk user id), RLS 는 JWT `sub` 사용.
- Plan(FREE/BASIC/PRO/ENTERPRISE) · Role(Student/Researcher/Professor/Admin),
  유효권한 = plan ∪ role, 관리자 전체 허용.
- 매핑(`plan_permissions`/`role_permissions`)은 **관리자가 토글 수정** 가능(RLS: 공개 읽기·admin 쓰기).
- 함수 `has_permission()`/`my_permissions()`/`is_admin()`, 엔진/모듈/서비스 레지스트리, 사용량 한도/로그.
- 배포: `npm run supabase:push` (또는 psql / SQL Editor). npm 스크립트 `supabase:link/push/reset/diff/lint` 추가.
- 검증: PostgreSQL 16 전체 적용 무오류, RBAC union·admin·미인증·토글·RLS 동작 확인.
