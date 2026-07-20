# AI Research OS v55

실제 배포된 Supabase 상태(profiles 18컬럼·plans에 enterprise·requesting_user_id/has_permission/my_permissions 함수·대부분 RLS off)에 맞춰
멱등(idempotent)·추가(additive) 방식으로 반영했습니다.

## 1. 회원별 메뉴 권한 (관리자)
- 마이그레이션 `0008`: `user_permission_overrides`(user_id, permission_code, allowed) 테이블 + RLS.
- `has_permission()`/`my_permissions()` 재작성 → **오버라이드 우선 → 관리자 → plan∪role**.
- API `app/api/admin/member-permissions`(GET 카탈로그+오버라이드+상속기본, POST 허용/차단/기본).
- 관리자 페이지에 회원별 **[메뉴 권한]** 패널(메뉴마다 허용·차단·기본 토글).

## 2. APA 인용 자동화 시스템
- `components/apa/apa-automation-system.tsx`: 참고문헌 정리 페이지의 **[APA 인용 자동화 시스템 열기]** 버튼 → 모달.
- 첨부 IA 권장의 심플 9메뉴(대시보드·참고문헌·본문인용·APA검사·AI도우미·지식베이스·가져오기·내보내기·설정).
- 실행 엔진: APA7 참고문헌 생성(7유형, 저자 21+ et al·DOI https://doi.org/), 본문인용(서술/괄호/직접/블록),
  APA 검사(DOI/URL/연도/이탤릭/저자수), 가져오기(RIS·BibTeX 파싱), 내보내기(복사·.txt).

## 3. Clerk → Supabase 동기화
- `app/api/profile/ensure`(로그인/온보딩 시 호출): profiles 없으면 생성, 있으면 동기화. 신규+기존 사용자 모두 연동.
- `app/api/admin/sync-clerk-users`: 기존 Clerk 사용자 일괄 백필(관리자 시크릿).
- 온보딩 진입 시 자동 ensure 호출(가입 시 선택 플랜 반영).

## 4. 랜딩 플랜 / 가입 흐름
- 플랜 **FREE · BASIC · PRO · University** (금액 미표시, 4열 그리드).
- 각 플랜 버튼 → `/signup?plan=<code>` → Clerk 가입 → `/onboarding?plan=` → Supabase 연동.

## 5. 권한 매핑 정비
- Plan: FREE·BASIC·PRO·University (enterprise→university 멱등 개편, 충돌-안전).
- Role: Student·Researcher·Professor·Admin.
- `engine.apa` 권한 추가(basic/pro/university·researcher/professor 매핑).

## 6. 메테오(유성) 인트로 수정
- 화면 밖에서 머리가 앞장서 날아드는 자연스러운 곡선 낙하(사진처럼 뜨던 문제 해결).
- 머리 앵커링으로 로고에 정확히 도달, 임팩트 플래시 + 로고 점화가 잔광과 **오버랩**.
