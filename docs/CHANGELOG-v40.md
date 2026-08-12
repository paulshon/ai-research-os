# CHANGELOG — v40

세 가지 이슈를 수정했습니다.
1) 로그인·전체 메뉴 이동 시 발생하던 성능 병목 제거,
2) 전체 메뉴에 마우스 hover / 터치 시 강조색이 들어가도록 개선,
3) 논문 크리틱 모바일 화면에서 "크리틱 생성" 버튼이 잘려 안 눌리던 문제 해결.

> 참고: "데스크탑/태블릿/모바일 버전"은 별도 빌드가 아니라 하나의 Next.js 웹앱의
> 반응형 레이아웃입니다.

---

## 1. 로그인·페이지 이동 병목 제거 (성능)

증상: 랜딩에서 로그인할 때부터 갑자기 느려지고, 로그인 후 메뉴(대시보드·연구·집필·
크리틱 등)에 들어갈 때마다 계속 지연됨.

원인: Clerk v6는 `publicMetadata`를 세션 토큰(`sessionClaims`)에 **기본으로 포함하지
않는다.** 그래서 미들웨어가 보호 경로로 이동할 때마다 `meta.approvalStatus`가 항상
비어 있어 `getMembershipProfile(userId)`로 **Supabase(미국 리전) DB를 매번 왕복 조회**했다.
한국 사용자는 로그인 직후 + 모든 메뉴 클릭마다 이 왕복(한국→Vercel(미국)→DB→복귀)을
체감하게 된다. 빌드/번들에는 이상이 없으므로(빌드 로그 정상) 런타임 인증 경로의 문제였다.

수정(`apps/web/middleware.ts`, `apps/web/lib/supabase.ts`):
- 승인 상태 조회 우선순위를 **세션 클레임 → 서명된 쿠키 캐시 → DB(최후 1회)** 로 변경.
  - (1) 세션 클레임에서 읽기: 네트워크 0회. `metadata`/`publicMetadata`/`public_metadata`
    세 형태를 모두 지원하므로, Clerk 대시보드의 Session token에
    `{"metadata":"{{user.public_metadata}}"}` 한 줄만 추가하면 **이후 DB 조회가 영구히
    사라진다(권장 설정).**
  - (2) 서명된 httpOnly 쿠키 캐시(`aros_appr`): 네트워크 0회. `HMAC-SHA256(secret, userId:status)`
    로 서명하여 **위·변조 및 타 사용자 재사용을 차단.** approved는 30분, 그 외(pending/
    rejected)는 20초만 캐싱하여 승인 즉시 반영을 보장.
  - (3) 위 둘 다 없을 때만 DB를 1회 조회하고 결과를 쿠키에 캐싱.
- `getServiceSupabase()`가 요청마다 `createClient()`를 새로 만들던 것을 **모듈 스코프에
  캐싱**(웜 인스턴스 재사용)하여 클라이언트 생성 오버헤드 제거.
- 결과: "메뉴 이동마다 DB 왕복" → "캐시 만료 시 최대 1회"로 감소. 인증 가드 동작
  (미승인 → `/pending-approval`, 비로그인 → `/login`)은 그대로 유지.

## 2. 전체 메뉴 hover/터치 강조색 (그림 1)

증상: 사이드바·탭 메뉴에 마우스를 올려도 색이 거의 안 들어옴
(`hover:bg-white/[0.03]` = 3% 흰색이라 사실상 비가시).

수정(데스크탑 사이드바·태블릿 레일·상단 탭바·모바일 하단/시트 전반):
- 각 메뉴 항목의 강조색을 CSS 변수(`--ac` 등)로 주입하고, `hover:`와 `active:`
  (터치 누름) 양쪽에 **해당 메뉴 색의 틴트 배경 + 색상 텍스트 + 아이콘 박스 채색**을 적용.
- `apps/web/components/dashboard/sidebar.tsx` — `SidebarLink`: hover/터치 시 항목 색이
  명확히 들어가고, 활성 항목도 고정 파랑 대신 **항목 고유색**으로 통일.
- `apps/web/components/dashboard/tablet-rail.tsx` — `RailLink`: 동일 적용.
- `apps/web/components/dashboard/dashboard-shell.tsx` — 상단 연구흐름 탭, 모바일 하단
  주 탭, AI Tools 슬라이드업 시트 항목에 강조색 hover/터치 피드백 적용.

## 3. 논문 크리틱 "크리틱 생성" 버튼 잘림 (그림 2)

증상: 모바일에서 변환텍스트를 드래그 선택하면 하단 액션 시트가 뜨는데, 마지막
"크리틱 #N 생성" 버튼이 **하단 내비게이션 바에 가려 보이지 않아 누를 수 없음.**

원인: 선택 액션 시트가 `fixed bottom-0 z-[60]`인데, 모바일 하단 내비게이션 바는
`z-[7500]`로 시트보다 위에 그려진다. 시트 맨 아래의 생성 버튼이 내비 바 뒤로 깔렸다.

수정(`apps/web/app/(dashboard)/critique/page.tsx`):
- 모바일 선택 시트를 내비 높이만큼 위로 올림
  (`bottom-[calc(3.5rem_+_env(safe-area-inset-bottom,0px))]`) → 내비 위에 온전히 노출.
- z-index를 내비 바 위(`z-[8200]`)로 상향하여 어떤 경우에도 가려지지 않도록 보강.
- 내비가 없는 태블릿(md~lg)에선 `md:bottom-0`으로 화면 하단에 그대로 고정.

---

## 검증

- `tsc --noEmit` 타입체크 통과(에러 0).
- `next build` 프로덕션 빌드 성공(51개 라우트, 21/21 정적 페이지, 경고/에러 없음).
  미들웨어 번들 141 kB(기존 140 kB, +1 kB로 영향 미미), `/critique` 12.4 kB 동일.
- 런타임 스모크 테스트(`next start`):
  - public 라우트 `/`·`/login`·`/pricing`·`/features` → 200.
  - 보호 라우트 `/dashboard`·`/critique`·`/research`·`/writing`·`/library`
    → 307 → `/login?redirect=…` (인증 가드 정상).
- CSS 번들 확인: 메뉴 hover/active 강조색 유틸(`var(--ac*)`, `group-hover/active`)과
  크리틱 시트 `z-index:8200`·`bottom:calc(3.5rem + env(safe-area-inset-bottom,0px))`
  규칙 생성 확인.
- 미들웨어 쿠키 서명 로직 단위 테스트: 정상 왕복 / 타 사용자 재사용 차단 / status 위조
  차단 / 손상 쿠키 안전 처리 — 5/5 통과.
