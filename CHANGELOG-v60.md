# CHANGELOG v60

v59 정밀 검증 결과 발견한 누락을 보완하고, 스플래시를 그림에 더 정밀히 맞춤.

## 1. 랜딩 전 모션(스플래시) — 그림 정밀 보정
`apps/web/components/marketing/splash-screen.tsx`
- 유성 착지 지점을 **로고 위치(화면 중앙에서 약간 위, y: -7vh)** 로 보정 — 유성이 로고에
  정확히 내려앉도록.
- 임팩트 플래시를 착지 지점(`top: calc(50% - 7vh)`)에 정렬.
- 곡선(아래로 볼록한 호)·로고 전용 심장박동(lub-dub ×3, 느리게)·좌→우 라인 시퀀스는 유지.
- 채팅 미리보기로 3단계(곡선 낙하 → 로고/글자 등장 + 심장박동 → 좌→우 선 → 페이드)를
  시각 확인 완료.

## 2. 관리자 차단/허용 — "전체 메뉴"·"전 표면"으로 확장 + 라우트 가드
**v59 정밀 검증에서 발견한 문제:** 권한 게이팅이 사이드바·태블릿 레일에만 적용되어,
대시보드 셸의 **데스크탑 상단 탭바·모바일 하단 탭·AI Tools 시트·상단 참고문헌 바로가기**
는 여전히 차단된 메뉴를 노출했고, 차단된 메뉴도 **URL 직접 접근**이 가능했음.

**조치 (`apps/web/components/dashboard/dashboard-shell.tsx`):**
- `usePermissions().can()` 으로 다음 모든 내비게이션 표면을 게이팅:
  데스크탑 상단 탭바(Research Flow), 상단 참고문헌 바로가기, 모바일 하단 Research Flow 탭,
  모바일 AI Tools 슬라이드업 시트.
- **라우트 가드** 추가: 권한 로드 후 현재 경로가 차단된 메뉴면 `/dashboard` 로 리다이렉트
  (URL 직접 접근 차단). 메뉴 외 경로(대시보드/설정 등)는 영향 없음. 권한 조회 실패·관리자·
  전체허용 시에는 가드가 동작하지 않아 잠금(lock-out)되지 않음(fail-open).
- 결과: 사이드바·태블릿 레일·상단 탭바·모바일 내비 **모든 표면**에서 차단/허용이 일관 적용.

## 정밀 검증 (이번 라운드)
- **권한 코드 정합성**: 사이드바/레일/셸에서 사용하는 11개 메뉴 권한이 모두
  `supabase/seed.sql` 카탈로그에 존재 — 자동 대조 **PASS**(누락 0).
- **오버라이드 병합 로직** 단위 테스트(admin=전체 / plan∪role / false=제거 / true=추가 /
  오버라이드 우선) — **5/5 PASS**.
- **RBAC 스키마**: `plan_permissions`·`role_permissions` 의 `allowed` 컬럼 존재 확인
  (조용한 실패 가능성 없음).
- **메뉴 렌더 표면 전수 점검**: `RESEARCH_FLOW_ITEMS`/`ENGINE_ITEMS` 를 렌더하는 3개 파일
  (sidebar·tablet-rail·dashboard-shell)의 모든 렌더 map 이 `can()` 으로 게이팅됨.
- `tsc --noEmit` (apps/web): **에러 0건**.
- `next build` (apps/web): **Compiled successfully**, 정적 28/28, exit 0.

> 한계: 실제 메뉴 차단/스플래시 렌더는 Clerk·Supabase 가 연결된 배포 환경에서 최종 확인
> 필요(샌드박스는 외부 인증/DB·브라우저 렌더 불가). 스플래시 모션은 채팅 미리보기로 확인.
