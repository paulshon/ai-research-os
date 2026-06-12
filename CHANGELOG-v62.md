# CHANGELOG v62

## 1. 스플래시 — 임팩트 제거
`apps/web/components/marketing/splash-screen.tsx`
- 임팩트 플래시(요소 + 애니메이션) **완전 제거**.
- 새 시퀀스: **로고·텍스트 페이드인 → 로고만 scale+glow 동기화 lub-dub 3박(느리게)
  → 선이 origin-left + scaleX 0→1 로 좌→우 → 페이드아웃 → 랜딩**.

## 2. 관리자 — 전체 메뉴(+하위) 차단/허용
**원인:** 권한 패널에 `engine.apa` 한 줄만 보였던 건, 사용자 DB의 `permissions`
카탈로그에 그 행만 존재했기 때문(시드/마이그레이션 부분 적용).
**수정:**
- 멱등 마이그레이션 `supabase/migrations/0009_menu_permissions_catalog.sql` 추가 —
  사이드바 전 메뉴(연구설계·문헌연구·논문작성·검토검증·논문일정·논문구조엔진·연구방법·
  논문분석·논문크리틱·문장라이브러리·참고문헌정리) + 하위(문헌리뷰·APA) 권한 코드를
  `ON CONFLICT (code) DO NOTHING` 으로 보장. 기존 행은 보존.
- 패널(`/api/admin/member-permissions`)은 카탈로그 전체를 반환하므로, 적용 후 **모든 메뉴**가
  목록에 표시되고 회원별 [허용]·[차단]·[기본] 토글 가능.
- enforcement 는 v61 의 blocklist 방식(기본 노출, "차단"한 것만 숨김)과 일치하도록,
  패널의 "기본" 표시를 전 메뉴 **허용**으로 통일.

## 3. 사이드바 디자인 변경 (두 번째 그림)
`apps/web/components/dashboard/sidebar.tsx`
- **Research Flow / AI Tools 섹션 헤더 및 아코디언(접기/펼치기) 제거.**
- 대시보드 + 11개 메뉴를 **한 줄 평면 목록**으로 표시 (`FLAT_MENU_ITEMS`).
- 행 높이·아이콘·폰트를 축소(py 10→7px, icon 18→16, text 15→13.5px, 간격 6→3px)하여
  **컴팩트·스마트**하게 재디자인.

## 4. Clerk ↔ Supabase 회원명부 불일치 해결
**원인:** `/api/admin/members` 가 Supabase profiles 만 조회 → Clerk 에는 있으나
Supabase 에 프로필이 없는 회원(웹훅 실패/대시보드 미방문)은 명부에서 누락.
**수정:** `/api/admin/members` 를 **Clerk 명부를 단일 진실원본**으로 재작성.
- Clerk 사용자 전체(페이지네이션) + Supabase profiles 를 병합하여 반환.
- Clerk 에만 있는 회원은 즉시 **백필(upsert, 승인 대기)** 하여 두 명부를 일치시킴.
- Clerk 에서 삭제된(Supabase 에만 있는) 프로필도 표시하여 명부 완전성 확보.
- 각 회원에 `source`(clerk+supabase / clerk-only / supabase-only) 표기.
- 보완: 대량 일괄 동기화는 기존 `POST /api/admin/sync-clerk-users` 사용 가능.

## 검증
- `tsc --noEmit` (apps/web): **에러 0건**.
- `next build` (apps/web): **Compiled successfully**, exit 0. `/api/admin/members`·
  `/api/permissions/me` 정상 빌드.
- 스플래시 임팩트 잔재 0 / 사이드바 아코디언 코드 0 / 마이그레이션 메뉴코드 13 / 멤버 병합·백필 로직 확인.
> 실제 화면·회원 동기화 최종 확인은 Clerk·Supabase 연결 배포 + 마이그레이션 0009 적용
> 환경에서 이뤄집니다(스플래시·사이드바는 채팅 미리보기로 확인).
