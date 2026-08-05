# CHANGELOG — AI Research OS + RDOS v5

v4 기반. 슈퍼관리자 진입·RDOS 관리자 기능·메뉴 권한 적용 결함·사이드바 가독성을 해결.

## 과제 1 — 슈퍼관리자 RDOS 진입 + RDOS 관리자 페이지
- **슈퍼관리자 내장 기본값 복원** (`lib/admin-config.ts`): `s***@gmail.com` 을
  내장 기본 슈퍼관리자로 지정(환경변수 `SUPER_ADMIN_EMAILS` 와 병합·확장 가능).
  → AI-Research-OS 관리자 페이지·RDOS 양쪽에 환경설정 없이 즉시 로그인/진입 가능.
- **RDOS 관리자 페이지 추가** (`/rdos/admin`, 슈퍼관리자 전용):
  - 가입 **승인 / 거절** (승인 대기 탭)
  - 회원 **접근 차단 / 재승인 / 퇴출(완전 삭제)** (회원 탭)
  - **메뉴 관리**: RDOS 메뉴 전역 활성/비활성 토글(대시보드는 항상 활성)
- API: `/api/admin/rdos/menus`(GET·POST) 신설, `/api/admin/rdos/approve` 에 `remove` 액션 추가.
- RDOS 셸: 슈퍼관리자에게 'RDOS 관리자' 링크 노출, 비활성 메뉴 숨김.
- 마이그레이션 `0011_rdos_menu_config.sql`(RDOS 메뉴 설정 테이블).

## 과제 2 — 메뉴 허용/차단이 적용되지 않던 문제 해결
- **근본 원인**: `user_permission_overrides.permission_code` 가 `permissions(code)` 를
  외래키로 참조하는데, `MENU_CATALOG` 의 하위 코드(예: `engine.literature.search`)가
  `permissions` 에 시드돼 있지 않아 차단/허용 저장이 FK 위반으로 **실패** → 적용 안 됨.
- **수정**:
  - `/api/admin/member-permissions` POST 가 저장 직전 해당 코드를 `permissions` 에
    self-heal upsert(없으면 생성) → FK 항상 만족(시드 상태와 무관하게 동작).
  - 마이그레이션 `0010_seed_all_menu_codes.sql` 로 전체 카탈로그 코드(상위+하위) 시드.
  - 권한 패널이 저장 실패를 가시화(이전엔 `res.ok` 가 아니면 조용히 무시).
- 적용 경로는 기존대로 동작: `/api/permissions/me`(유효 권한) → 사이드바 비활성 +
  `dashboard-shell` 라우트 가드(차단 메뉴 URL 직접 접근 시 대시보드로 리다이렉트).

## 과제 3 — 사이드바 전체 메뉴 글자 +1.5pt
- `components/dashboard/sidebar.tsx` 메뉴 글자 `13.5px → 15px`(활성/비활성 항목 모두).

## 검증
- `apps/web` 전체 `tsc --noEmit` clean. 변경/신규 11개 파일 esbuild 변환 clean.
- 슈퍼관리자 판정 로직 런타임 검증(기본값 동작 + env 병합 + 대소문자 무시).

## 신규 환경변수(선택)
- `NEXT_PUBLIC_SUPER_ADMIN_EMAILS`: 클라이언트에서도 슈퍼관리자 판정이 필요한 경우 병합.
  (내장 기본값으로 `s***@gmail.com` 은 설정 없이도 동작)
