# CHANGELOG — AI Research OS + RDOS v9

v8 기반. RDOS 관리자 오류 해결·랜딩 모션·통합 관리자 허브·지식코어 학습화·콘텐츠 대폭 강화. 9.0.0.

## 1. RDOS 관리자 "RDOS 허용" 오류 해결
- 증상: "Could not find the table 'public.rdos_enrollment' in the schema cache" → 해당 테이블이
  원격 DB에 없거나 PostgREST 스키마 캐시가 오래됨.
- 해결: **통합 설정 SQL `supabase/migrations/0014_consolidated_setup.sql`** 추가 —
  RDOS/연구자/문의에 필요한 모든 테이블(rdos_enrollment, rdos_progress, rdos_menu_config,
  researcher_enrollment, contact_inquiries)을 멱등 생성하고, 끝에서 `notify pgrst, 'reload schema'`
  로 스키마 캐시를 즉시 갱신. 이 SQL 1회 실행이면 승인/거부/메뉴/승급이 모두 정상 동작.
- 승인 API 가 테이블 부재/스키마 캐시 오류를 감지하면 "0014 SQL 실행" 안내 메시지를 반환.

## 2. 랜딩 뒤로가기 모션 반복 해결
- 스플래시(인트로 모션)를 세션당 1회만 재생. 메뉴 진입 후 뒤로가기로 랜딩 재진입 시
  `sessionStorage` 플래그로 스플래시를 건너뛰고 랜딩을 즉시 표시.

## 3. 통합 관리자 허브 (슈퍼관리자 전용)
- `sarangred777@gmail.com` 로그인 → **`/control` 통합 관리자** 페이지로 진입(비슈퍼관리자는 대시보드로).
- 허브 안에 4개 카드: ① AI-Research-OS 관리자(`/admin`) ② RDOS 관리자(`/rdos/admin`)
  ③ AI-Research-OS 본페이지(`/dashboard`) ④ RDOS 본페이지(`/rdos`).

## 4. 지식 코어 — 학습 모듈 클릭형 + 콘텐츠/퀴즈
- 지식 코어 "학습 목표·모듈" 탭의 **L0 12개 도메인을 클릭형 학습 레슨**으로 전환.
- 각 도메인 클릭 시 모달로 **풍부한 학습 내용(쉬운 설명+예시) + 20문항 퀴즈** 제공.
  (논문가이드 8개 장·31개 용어·방법론 카탈로그 분석 적용. 총 240문항)

## 5. 8개 메뉴 학습 콘텐츠 대폭 강화
- Research Basics·논문 구조 학습·연구설계 기초·연구방법론 기초·논문 읽기 훈련·APA 학습·
  학술 글쓰기 훈련·AI 튜터 의 **모든 학습 모듈 본문을 대폭 확장** —
  쉬운 설명·비유·예시 문장·흔한 오해·한 줄 요약·셀프 체크 등 추가(모듈 평균 ~1,640자).
- 60개 모듈 × 20문항(총 1,200문항) 유지.

## 점검 (통합 관리자 → 각 관리 페이지)
- 승인/거부/메뉴 관리/미션 승급이 참조하는 모든 테이블이 0014 에 포함됨을 확인.
- `apps/web` 전체 `tsc --noEmit` clean. 레슨·지식 데이터 무결성(20문항/모듈, 정답·중복·콘텐츠) 전수 통과.

## 배포 시 (중요)
- Supabase SQL Editor 에서 **`0014_consolidated_setup.sql` 1회 실행**(또는 `supabase db push`).
  → "schema cache" 오류 해소 + 모든 관리 기능 활성화.
