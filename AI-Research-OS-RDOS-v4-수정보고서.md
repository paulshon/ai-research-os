# AI Research OS + RDOS v4 — 수정 보고서 (감사 대응 + 구조 정밀화)

대상: `AI-Research-OS_RDOS-v3.zip` → `AI-Research-OS+RDOS-v4`
근거: `AI-Research-OS-RDOS-v3-감사보고서.md`, 논문가이드 5-4, index(3).html

---

## 1. 감사 결함 → 수정 대응표

| # | 심각도 | 결함 | 수정 | 변경 파일 |
|---|---|---|---|---|
| 2.1 | Critical | 실시간 인증 스텁 + 저장 안 됨 | Clerk JWKS JWT 검증 + 소유자 확인 + Supabase 영속화 | `apps/realtime/server/index.ts`, `supabase/migrations/20260609000000_collab_documents.sql`, `apps/realtime/package.json`(jose) |
| 2.2 | Critical | 프로젝트 API 인증·소유권 없음(IDOR) | 인증 의존성 + owner_id 스코프 + 프록시 auth 게이트 | `apps/api/app/auth.py`, `apps/api/routes/projects.py`, `apps/web/app/api/projects/route.ts`, `apps/web/app/api/ai/route.ts` |
| 2.3 | Critical | 관리자 비밀번호 평문 노출 | 하드코딩 폴백 제거(환경변수만) + 체인지로그 마스킹 | `apps/web/lib/admin-auth.ts`, `CHANGELOG-v56/58/63/64.md`, `CHANGELOG-RDOS-v2.md` |
| 2.4 | Critical | 세션 토큰 고정값(재생공격) | `{uid,exp,nonce}` HMAC 서명 + 만료 검증 | `apps/web/lib/admin-auth.ts`, `apps/web/app/api/admin/login/route.ts` |
| 2.5 | Critical | AI 프록시 오픈 릴레이 | Clerk 인증 + 사용자별 레이트리밋 | `apps/web/app/api/ai/route.ts` |
| 3.1 | High | 프로젝트 스키마 불일치(생성 실패) | 실제 컬럼 정합(data jsonb) + owner_id 주입, chapters/sections 참조 제거 | `apps/api/routes/projects.py` |
| 3.2 | High | 환경변수명 불일치 | `SUPABASE_SERVICE_ROLE_KEY` 통일 | `apps/api/app/config.py`, `routes/projects.py` |
| 3.3 | High | CORS 와일드카드 미동작 | `allow_origin_regex` 사용 | `apps/api/main.py` |
| 3.4 | High | CI pnpm/npm 불일치 | npm 으로 통일 | `.github/workflows/web.yml` |
| 3.5 | High | 죽은 코드(Supabase Auth) | 삭제 | `services/auth.service.ts`, `services/project.service.ts` |
| 3.7 | High | 워크스페이스 누락 + 죽은 스크립트 | realtime/desktop 포함, turbo/db 스크립트 정정 | `package.json` |
| M | Medium | 대시보드 매 이동 DB 왕복 | 세션당 1회(쿠키 캐시) | `apps/web/app/(dashboard)/layout.tsx` |
| M | Medium | 시크릿 폴백 체인 | 단일 출처(`ADMIN_API_SECRET`) | `apps/web/lib/admin-auth.ts` |
| M | Medium | 슈퍼관리자 이메일 하드코딩 | 환경변수화 | `apps/web/lib/admin-config.ts`, `contact/route.ts`, `structure/page.tsx` |
| M | Medium | 전역 CORS `*` | 화이트리스트 | `apps/web/next.config.ts` |
| M | Medium | `user.deleted` 미처리 | 핸들러 추가 | `apps/web/app/api/webhooks/clerk/route.ts` |
| M | Medium | 버전/런타임 혼란 | 4.0.0 통일, Python 3.11 정합 | `package.json`, `apps/web/package.json`, `.github/workflows/api.yml` |
| M | Medium | 테스트/마이그레이션 공허 | 실제 pytest 5건, `db:migrate=supabase db push` | `apps/api/tests/test_projects.py`, `requirements.txt`, `package.json` |

> RLS(감사 3.6)는 서버가 service_role 로 우회하는 현 설계를 유지하되, 클라이언트 직접
> 조회 경로(죽은 코드)를 제거하여 RLS 차단 충돌 가능성을 없앴다. Clerk↔Supabase
> Third-Party Auth 통합은 운영 결정 사항으로 남겨둠(.env 가이드에 명시).

## 2. RDOS 구조 정밀화 (논문가이드 + index(3))

- 0단계(논문가이드 원천지식)를 코드 데이터로 구조화: 8개 장(서술구조·핵심원리) + 31개 용어.
  → `apps/web/lib/rdos/knowledge-core.ts`, 화면 `/rdos/knowledge`.
- 각 RDOS 메뉴(8개)에 본문 + 퀴즈를 갖춘 레슨 3개씩 탑재(index(3) 콘텐츠 이식·확장).
  → `apps/web/lib/rdos/lesson-content.ts`, 화면 `components/rdos/rdos-lesson-view.tsx`.
- 7단계 졸업 시스템(Research-Ready Scholar): 5개 인증 + 포트폴리오 + Passport + 준비도 지수.
  → `/rdos/scholar`, `components/rdos/rdos-scholar-view.tsx`.

### IA 흐름 (첫 번째 문서 대응)
```
논문가이드(L0 Knowledge Core: 8장 + 31용어)   ← knowledge-core.ts / /rdos/knowledge
   → 레슨(본문+퀴즈)                          ← lesson-content.ts / RdosLessonView
   → 퀘스트·XP·역량(커널 도출)                 ← rdos-core deriveRdosState
   → 8개 학습 메뉴 + 성장 로드맵(L0~L9)
   → Research-Ready Scholar(연구 준비자 인증)  ← /rdos/scholar
```

## 3. 검증 결과
- **Python**: `pytest tests/` 5/5 통과 · 전체 `py_compile` OK · `app.auth`/`app.config`/`routes.projects` 임포트 OK.
- **TypeScript**: `apps/web` `tsc --noEmit` **clean** · `apps/realtime` `tsc --noEmit` **clean**.
- **구문**: 변경/신규 19개 파일 esbuild 변환 clean.
- **의존성**: `npm install` 942 packages 정상(`jose`,`yjs`,`@hocuspocus/server`,`@supabase/supabase-js` 확인).

## 4. 배포 시 필수 조치
1. `.env` 에 `ADMIN_API_SECRET`, `ADMIN_USERNAME/PASSWORD`, `CLERK_ISSUER`,
   `INTERNAL_API_KEY`, `SUPER_ADMIN_EMAILS` 설정(미설정 시 관리자/실시간/프록시 신뢰 비활성).
2. 노출되었던 과거 자격증명 **즉시 회전**(코드·체인지로그에서 제거됨, 깃 히스토리는 BFG/filter-repo 권장).
3. 신규 마이그레이션 적용: `supabase db push`.
