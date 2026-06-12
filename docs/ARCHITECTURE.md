# AI Research OS — Architecture Document

> Cloud-Collaborative, Local-First AI Research Operating System

## 시스템 개요

AI Research OS는 단일 Electron 데스크톱 앱(ai_research_studio)을 **분산 SaaS + Local First + AI Research OS**로 재설계한 프로젝트입니다.

## 모노레포 구조

```
ai-research-os/
├── apps/
│   ├── web/          → Next.js 15 App Router (Vercel)
│   ├── api/          → FastAPI (Railway)
│   ├── realtime/     → Hocuspocus CRDT Server
│   └── desktop/      → Electron (Local First)
├── packages/
│   ├── ui/               → Button, Input, Badge, Card + CVA
│   ├── shared-types/     → 전체 도메인 TypeScript 타입
│   ├── editor-core/      → Tiptap + Yjs 에디터 설정
│   ├── ai-core/          → 9개 엔진 시스템 프롬프트 + Gemini 빌더
│   ├── citation-core/    → APA7/MLA9/Chicago/IEEE/Vancouver 포맷터
│   ├── auth-core/        → 역할 권한 + 플랜 제한
│   ├── collaboration-core/ → Yjs 문서 유틸리티 + Awareness
│   └── config/           → 디자인 토큰, 상수, 엔진 메타데이터
├── infrastructure/
│   ├── docker/       → Docker Compose + Dockerfiles
│   ├── nginx/        → 서브도메인 라우팅
│   ├── scripts/      → PostgreSQL 스키마 (11 테이블, RLS, 트리거)
│   └── monitoring/   → Prometheus/Grafana (예정)
├── .github/workflows/ → CI/CD (web.yml, api.yml)
└── docs/              → 이 문서
```

## 배포 아키텍처

| 서비스 | 호스팅 | 도메인 | 기술 |
|--------|--------|--------|------|
| Frontend | Vercel | app.domain.com | Next.js 15 |
| AI Backend | Railway | api.domain.com | FastAPI |
| Auth & DB | Supabase | Managed | PostgreSQL + RLS |
| Realtime | Railway | ws.domain.com | Hocuspocus + Yjs |
| Desktop | 사용자 PC | Local | Electron |

## 핵심 아키텍처 결정

### 1. Local First + Cloud Metadata
- **파일 저장**: 사용자 PC (Electron 앱의 filesystem)
- **메타데이터**: Supabase PostgreSQL
- **이유**: 서버 저장 비용 절감, 오프라인 작업 가능, 개인정보 보호

### 2. 사용자 소유 API 키
- Gemini AI 비용을 사용자가 직접 관리
- API 키는 FastAPI를 통해 프록시 (보안)
- 원본 앱: 클라이언트에서 직접 Gemini 호출 → 보안 위험

### 3. 9개 전문 엔진

| 엔진 | 목적 | Temperature |
|------|------|-------------|
| Structure | 논문 구조 설계 | 0.5 |
| Chat | 범용 연구 질의 | 0.7 |
| Editor | 작문 보조 | 0.6 |
| Analyzer | 논문 분석 | 0.4 |
| Validation | 7-카테고리 검증 | 0.3 |
| Workflow | 태스크 관리 | 0.5 |
| Advisor | AI 멘토링 | 0.7 |
| Library | 문장 패턴 | 0.6 |
| Critique | 심층 첨삭 | 0.4 |

### 4. CRDT 실시간 협업
- Yjs + Hocuspocus로 실시간 공동 편집
- 각 섹션이 독립적인 Y.XmlFragment로 관리
- 사용자별 커서 색상 표시 (Awareness)

## 데이터베이스 스키마 (PostgreSQL)

11개 테이블: `profiles`, `workspaces`, `workspace_members`, `projects`, `chapters`, `sections`, `citations`, `validation_results`, `workflow_tasks`, `annotations`, `ai_usage`

모든 테이블에 RLS 적용. `updated_at` 자동 갱신 트리거.

## FastAPI 라우트

| 경로 | 모듈 | 상태 |
|------|------|------|
| `/ai/generate` | AI Proxy (Gemini) | ✅ 구현 |
| `/projects/*` | 프로젝트 CRUD + 챕터/섹션 | ✅ 구현 |
| `/citations/*` | DOI 검색 (CrossRef) + CRUD | ✅ 구현 |
| `/validation/run` | AI 기반 7-카테고리 검증 | ✅ 구현 |
| `/workflows/*` | 8단계 워크플로우 + 진행률 | ✅ 구현 |
| `/parsers/*` | PDF/DOCX 파싱 + AI 구조 분석 | ✅ 구현 |

## 프론트엔드 페이지

### Public (Marketing)
- `/` — 랜딩 (Hero, Features, Architecture, Workflow, Pricing, CTA, Footer)
- `/features`, `/pricing`, `/tutorials`, `/docs`, `/blog`, `/contact`

### Auth
- `/login`, `/signup`, `/forgot-password`, `/onboarding` (4단계 마법사)

### Dashboard (App)
- `/projects` — 대시보드 홈
- `/workspace/[id]` — 워크스페이스 상세
- `/editor/[id]` — 논문 에디터 (3-패널)
- `/settings` — 설정 (API 키, 모델, 에디터, 계정)
- `/billing` — 구독 관리 (TASK 4)
- `/team` — 멤버 관리
- `/notifications` — 알림

## 원본→신규 마이그레이션 매핑

| 원본 (index.html) | 신규 위치 |
|--------------------|-----------|
| 전역 `state` 객체 | `apps/web/store/app-store.ts` (Zustand) |
| `fetch(geminiUrl)` 직접 호출 | `packages/ai-core` → `apps/api/routes/ai.py` |
| 하드코딩 CSS (4330줄) | `tailwind.config.ts` + `globals.css` |
| 9개 탭 UI | Next.js App Router 페이지별 분리 |
| `localStorage` | Supabase + Electron LocalFS |
| 단일 사용자 | CRDT 실시간 협업 (Yjs + Hocuspocus) |

## 성장 전략

```
Phase 1 (MVP)     → Monolith: Next.js + FastAPI + Supabase
Phase 2 (Collab)  → Realtime Split: Hocuspocus 독립 배포
Phase 3 (Scale)   → AI Worker Split: Celery + Redis 큐
Phase 4 (Micro)   → Microservices: 도메인별 분리 (필요 시)
```

## 개발 워크플로우

```bash
pnpm install
pnpm dev        # web(3000), api(8000), realtime(1234) 동시 실행
pnpm build      # Turborepo 병렬 빌드
pnpm lint       # 전체 린트
psql $DATABASE_URL < infrastructure/scripts/schema.sql
```
