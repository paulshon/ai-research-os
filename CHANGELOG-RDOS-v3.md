# AI-Research-OS + RDOS — v3.0.0

v2의 두 가지 한계를 실제 구현으로 해소했습니다.

## 1. RDOS 학습 상태 실연동 (데모값 → 커널 + Supabase)
이전에는 `lib/rdos/state.ts`의 상수였던 XP·역량·미션·정합성을 **`packages/rdos-core`의 커널 파이프라인에서 도출**하고, 원천 데이터는 **Supabase**에 저장하도록 바꿨습니다.

- `packages/rdos-core/src/derive.ts` — 신규. 학습 진행(메뉴별 완료 레슨)을 `ResearchOS` 커널에 이벤트로 재생(replay)하여
  XP(Motivation) · 6대 역량(Competency) · 지식 노드 숙련(Knowledge) · 미션/해금(Quest) · 정합성 체인·충돌(Alignment) · 성장 곡선(Analytics)을 계산. rdos-core에서 export.
- `apps/web/lib/rdos/state-server.ts` — 신규(server-only). Supabase `rdos_progress`에서 진행을 읽어 `deriveRdosState`로 상태 도출. Supabase 미설정 시 시드값으로 graceful fallback.
- `apps/web/lib/rdos/lesson-content.ts` — 메뉴 학습 콘텐츠 데이터.
- Supabase 마이그레이션 `supabase/migrations/20260608000000_rdos.sql` — `rdos_enrollment`(가입/승인) · `rdos_progress`(완료 레슨) + RLS.
- 대시보드/메뉴/로드맵을 **서버 컴포넌트(실데이터 fetch) + 클라이언트 뷰**로 전환:
  `app/(rdos)/rdos/page.tsx`, `rdos/<menu>/page.tsx`(8), `rdos/roadmap/page.tsx`
  뷰: `components/rdos/rdos-dashboard-view.tsx`, `rdos-lesson-view.tsx`, `rdos-roadmap-view.tsx`
- 레슨 완료 시 `/api/rdos/complete`로 진행 저장 → 대시보드(커널 도출)에 반영.
- 데모 모듈 `lib/rdos/state.ts` 제거.
- rdos-core를 워크스페이스로 import 가능하게 설정(exports→src, web 의존성, `transpilePackages`).

## 2. 승인 기반 동적 게이팅 (sarangred777 외 회원도 승인 시 진입)
RDOS 진입 조건을 "슈퍼관리자 전용"에서 **"슈퍼관리자 OR 승인된 연구준비자"**로 확장했습니다.

- `app/(rdos)/layout.tsx` — `isRdosAllowed({email,userId})` = 슈퍼관리자 이메일 OR `rdos_enrollment.status ∈ {approved, active}`.
- 연구준비자 7단계 가입: 로그인(Step 5) 시 `/api/rdos/enroll` 호출 → `pending` 등록.
- 관리자 승인:
  - `app/api/admin/rdos/enrollments` (GET, 슈퍼관리자) — 신청 목록
  - `app/api/admin/rdos/approve` (POST, 슈퍼관리자) — 승인/거절
  - `app/(dashboard)/admin/rdos/page.tsx` + `components/admin/rdos-approval-list.tsx` — 승인 관리 UI
- 승인되면 해당 회원의 enrollment.status=approved → RDOS 진입 허용.

## 검증
- rdos-core 커널 도출 테스트(tsx): 시드(7/24레슨→115XP·L1·정합성 충돌) / 빈 진행(0) / 전체 완료(100%, 충돌 0) 모두 통과.
- 신규·수정 TSX·TS 26개 파일 esbuild 트랜스파일 통과.
- 워크스페이스 import(rdos-core), `@/` 경로, transpilePackages 등록 확인.

## 실행
```bash
npm install
# Supabase 연결 시:
npm run supabase:push    # rdos_enrollment / rdos_progress 마이그레이션 적용
npm run dev:web
#  /  → 2플랜 가격
#  /rdos-signup → 7단계 가입(로그인 시 승인 신청 생성)
#  /dashboard/admin/rdos → (슈퍼관리자) 승인
#  /rdos → 승인 회원만 진입, 커널 도출 학습 상황판
```
