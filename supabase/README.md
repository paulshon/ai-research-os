# Supabase — 회원 등급(RBAC) 데이터베이스

AI-Research-OS 의 회원 등급/역할/권한 구조를 **코드(SQL)로 작성해 터미널에서 한 번에
업로드**하는 방식입니다. Dashboard 의 Table Editor 로 하나씩 만들지 않습니다.

```
supabase/
├─ config.toml                     # 로컬/링크 설정
├─ migrations/                     # 순서대로 적용되는 스키마 변경 이력(= DB의 Git commit)
│  ├─ 0001_profiles.sql            # 프로필(Clerk user id = profiles.id)
│  ├─ 0002_plans_roles.sql         # Plan(FREE/BASIC/PRO/ENTERPRISE) · Role(Student/Researcher/Professor/Admin)
│  ├─ 0003_permissions.sql         # 권한 카탈로그
│  ├─ 0004_rbac_mappings.sql       # plan_permissions · role_permissions (관리자 토글)
│  ├─ 0005_engines_modules_services.sql  # 엔진/모듈/서비스 레지스트리
│  ├─ 0006_projects_usage.sql      # 프로젝트 · 사용량 한도/로그 · 활동로그
│  └─ 0007_functions_rls.sql       # has_permission()/my_permissions()/is_admin() + RLS
└─ seed.sql                        # 기본 등급·역할·권한·매핑·레지스트리 데이터
```

## 인증 모델
이 앱은 **Clerk** 로 인증합니다. 따라서 `profiles.id` 는 Supabase `auth.users` 의 uuid 가
아니라 **Clerk user id(text)** 입니다. RLS 는 Clerk JWT 의 `sub` 클레임
(`request.jwt.claims ->> 'sub'`)을 `profiles.id` 와 비교합니다. (Clerk 를 Supabase 의
서드파티 인증 토큰으로 연결하면 동작합니다.)

## 권한 구조 (요청 매핑)
- **Plan**: FREE → BASIC → PRO → ENTERPRISE (등급별 누적)
- **Role**: Student → Researcher → Professor → Admin
- **유효 권한 = Plan 매핑 ∪ Role 매핑** (둘 중 하나라도 allow 하면 부여). Admin 은 전체 허용.
- 기본 매핑은 `seed.sql` 에 정의되어 있으며, 이후 **관리자가
  `plan_permissions`·`role_permissions` 의 `allowed` 를 직접 수정(토글)** 할 수 있습니다.
  (RLS: 카탈로그·매핑은 공개 읽기, 쓰기는 `admin` 만 가능)

앱에서 사용:
```ts
// 단일 권한 확인
const { data: ok } = await supabase.rpc("has_permission", { perm_code: "engine.method" });
// 부팅 시 유효 권한 일괄 로드
const { data: perms } = await supabase.rpc("my_permissions");
```

## 터미널 업로드 (3가지 방법)

### 방법 1 — Supabase CLI (권장)
```bash
# 1) 원격 프로젝트 연결 (최초 1회)
export SUPABASE_PROJECT_REF=<your-project-ref>
npm run supabase:link            # = supabase link --project-ref $SUPABASE_PROJECT_REF

# 2) 마이그레이션 + 시드 적용
npm run supabase:push            # = supabase db push   (migrations/*.sql 순서대로 반영)
# 로컬 개발 DB 초기화+시드:
npm run supabase:reset           # = supabase db reset  (config.toml 의 seed.sql 자동 실행)
```

### 방법 2 — psql 로 직접 실행
```bash
for f in supabase/migrations/*.sql supabase/seed.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

### 방법 3 — Dashboard SQL Editor
`supabase/migrations/*.sql` 내용을 순서대로 붙여넣고 실행 → 마지막에 `seed.sql` 실행.

## 관리자 부트스트랩
최초 관리자는 가입(Clerk) 후 1회 승격합니다:
```sql
update public.profiles set role = 'admin', approval_status = 'approved'
where email = 'you@example.com';
```

## 변경 추가 (이후 엔진/권한 확장 시)
새 변경은 새 마이그레이션 파일로 누적합니다(예: `0008_qmethod_engine.sql`). Migration 은
"데이터베이스의 Git commit" 이며, 순서대로 실행하면 전체 DB를 재현/복원할 수 있습니다.

## 검증 완료 (v54)
PostgreSQL 16 에 `migrations/* → seed.sql` 전체를 무오류로 적용하고 다음을 확인:
플랜·역할 union 권한, 관리자 전체 허용, 미인증 차단, 매핑 토글 반영,
RLS(본인 행만 조회 / 비관리자 매핑 쓰기 차단 / 관리자 전체 조회).
