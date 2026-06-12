# CHANGELOG — AI Research OS + RDOS v4

v3 감사보고서(`AI-Research-OS-RDOS-v3-감사보고서.md`)의 결함을 해소하고,
논문가이드(논문가이드 5-4) + index(3).html 개선안을 적용해 RDOS 학습 구조를
정밀화한 릴리스. 버전을 4.0.0 으로 통일.

## A. 보안·동작 결함 수정 (감사 대응)

### Critical
- **2.1 실시간 협업 인증/영속화** — `apps/realtime/server/index.ts` 재작성.
  - `onAuthenticate`: Clerk JWT 를 JWKS(`jose`)로 실제 검증 + 문서 접근권한
    (프로젝트 소유자) 확인. (이전: TODO 스텁, 임의 토큰 통과)
  - `onLoadDocument`/`onStoreDocument`: Supabase `collab_documents` 에 Yjs CRDT
    상태를 base64 로 실제 로드/저장. (이전: console.log 뿐)
  - 신규 마이그레이션 `supabase/migrations/20260609000000_collab_documents.sql`.
- **2.2 프로젝트 API 인가(IDOR)** — `apps/api/app/auth.py` 추가(Clerk JWT 검증
  또는 신뢰된 내부 프록시). `routes/projects.py` 모든 엔드포인트가 인증을 요구하고
  `owner_id` 스코프를 강제. Next 프록시(`/api/projects`, `/api/ai`)에 `auth()` 게이트 추가.
- **2.3 관리자 비밀번호 노출** — `lib/admin-auth.ts` 하드코딩 폴백(`[REDACTED-v4]`) 제거.
  자격은 `ADMIN_USERNAME`/`ADMIN_PASSWORD` 환경변수에서만. 체인지로그의 평문 비밀번호 마스킹.
- **2.4 관리자 세션 토큰** — 고정 상수 → `{uid, exp, nonce}` HMAC 서명 + 만료 검증으로
  재설계(재생공격 방지, 사용자 바인딩).
- **2.5 AI 프록시 오픈 릴레이** — `/api/ai` 에 Clerk 인증 + 사용자별 레이트리밋(분당 30회) 추가.

### High
- **3.1 스키마 불일치** — `ProjectCreate`/insert 를 실제 컬럼(`owner_id`, `title`,
  `workspace_id`, `data` jsonb)에 정합. 존재하지 않는 `chapters`/`sections` 참조 제거(구조는 data 보관).
- **3.2 환경변수명** — `SUPABASE_SERVICE_ROLE_KEY` 로 통일(`config.py` 갱신).
- **3.3 FastAPI CORS** — `allow_origin_regex` 로 Vercel 프리뷰 매칭(이전 `https://*.vercel.app` 리터럴은 무효).
- **3.4 CI 패키지 매니저** — `web.yml` pnpm → npm(`npm ci` + `npx turbo`)으로 통일.
- **3.5 죽은 코드 제거** — `services/auth.service.ts`, `services/project.service.ts`(Supabase Auth 경로) 삭제.
- **3.7 워크스페이스/스크립트** — `apps/realtime`,`apps/desktop` 을 workspaces 에 포함.
  Python 타깃 turbo 스크립트를 직접 실행으로 교체. `db:migrate` 를 `supabase db push` 로.

### Medium
- 대시보드 레이아웃: 매 이동 `currentUser()`+Supabase 동기화 → 세션당 1회(쿠키 캐시).
- 시크릿 폴백 체인 제거(관리자 서명은 `ADMIN_API_SECRET` 단일 출처).
- 슈퍼관리자/문의/구조엔진 진입 이메일 하드코딩 제거 → 환경변수화(`SUPER_ADMIN_EMAILS` 등).
- `next.config` 전역 CORS `*` → 화이트리스트(`ALLOWED_ORIGINS`).
- Clerk 웹훅 `user.deleted` 핸들러 추가(profiles 고아 방지).
- 버전 통일(루트/web 4.0.0). Dockerfile/CI Python 3.11 정합.
- 실제 pytest 테스트 추가(`apps/api/tests/test_projects.py`, 5건). `requirements.txt` 에 pytest.

## B. RDOS 학습 구조 정밀화 (논문가이드 + index(3) 적용)

- **레슨 콘텐츠** — `lib/rdos/lesson-content.ts` 를 8개 메뉴 × 3레슨, 각 레슨에
  **학습 본문(HTML) + 이해도 퀴즈(2문항)** 로 확장. 출처: 논문가이드 8개 장 서술구조 +
  index(3).html 개선안.
- **학습 화면** — `components/rdos/rdos-lesson-view.tsx` 재작성: 본문 탭 + 퀴즈 모달,
  **퀴즈 통과 시에만 레슨 완료**. 완료는 `/api/rdos/complete` → 커널(`deriveRdosState`)로 도출.
- **L0 지식 코어** — `lib/rdos/knowledge-core.ts` 신설: 논문 8개 핵심 장(서술구조·핵심원리) +
  31개 연구용어 해설(정의·비유/예시·활용). `/rdos/knowledge` 브라우저 페이지 추가.
- **졸업 시스템** — `/rdos/scholar` Research-Ready Scholar(연구 준비자) 인증 페이지 추가.
  학습 상태(역량·미션)에서 5개 인증(지식/사고/연구/작성/심사)·포트폴리오·Scholar Passport·
  연구 준비도 지수를 도출(첫 번째 문서의 7단계 IA 구현).
- RDOS 메뉴에 `지식 코어`, `연구 준비자 인증` 추가. 레슨 본문 CSS 추가.

## 검증
- Python: `pytest` 5/5 통과, 전체 `py_compile` OK, 핵심 모듈 임포트 OK.
- TypeScript: `apps/web` 전체 `tsc --noEmit` clean, `apps/realtime` `tsc --noEmit` clean.
- 변경/신규 19개 파일 esbuild 변환 clean. 의존성 설치(942 packages) 정상.

## 신규/변경 환경변수
`CLERK_ISSUER`(또는 `CLERK_JWKS_URL`), `INTERNAL_API_KEY`, `ADMIN_API_SECRET`(필수),
`SUPER_ADMIN_EMAILS`, `NEXT_PUBLIC_ADMIN_ENTRY_EMAIL`, `CONTACT_ADMIN_EMAIL`,
`ALLOWED_ORIGINS`, `SUPABASE_URL`(realtime). 자세한 내용은 `.env.example` 참고.
