# AI Research OS v64 — System Architecture

**Researcher Development Operating System** — 초보 연구자를 *Research-Ready Scholar(연구 준비자, L9)* 로 성장시키는 운영체제형 학습 플랫폼.

이 패키지는 첨부 설계서의 **7 Kernel + 14 Engine** 아키텍처를 **L0–L15 16계층**으로 정규화하여 `ai-research-os-v64`에 그대로 이식할 수 있도록 패키징한 것입니다. 일반 LMS가 아니라, 게임 엔진의 *Game State Manager* 와 학습분석의 *Learner Model* 을 결합한 구조입니다.

---

## 핵심 원리 — 단방향 이벤트 파이프라인

엔진은 콘텐츠/기능을 제공하고, 결과를 **이벤트**로만 발행합니다. 커널은 그 이벤트를 듣고 자신의 상태를 갱신합니다. 엔진은 커널 상태를 직접 쓰지 않습니다.

```
Engine.emit() → ResearchOS.dispatch() → Kernel.react() ×N → Analytics 기록 → 추천 생성
```

설계서의 예시가 코드에서 그대로 재현됩니다 (`demo/pipeline.demo.ts` 실행 가능):

```
개념 학습 완료
  → Knowledge Kernel    : research-problem 숙련 +5
  → Competency Kernel   : researchLiteracy +5
  → Quest Kernel        : 다음 미션 오픈
  → Motivation Kernel   : XP +20
  → Analytics Kernel    : 이벤트 기록
  → Alignment Kernel    : 연구질문↔방법론 불일치 경고
```

---

## L0–L15 → 코드 매핑

| Level | 계층 | 위치 | 비고 |
|-------|------|------|------|
| **L0** | Vision | `docs/PRD.md` | Mission/Target/Differentiation |
| **L1** | Operating System | `src/os/` | `ResearchOS`, `EventBus` (커널·엔진 부팅·라우팅) |
| **L2** | Kernel | `src/kernels/` | 7 커널 + `BaseKernel` + 이벤트 react |
| **L3** | Engine | `src/engines/` | 14 엔진 + `BaseEngine` |
| **L4** | Module | 각 엔진의 `modules[]` 필드 | 예: Language → ConceptDictionary 등 |
| **L5** | Service / 성장모델 | `src/growth/levels.ts` | L0~L9 레벨 + XP 매핑 |
| **L6** | Workflow | `demo/pipeline.demo.ts` | 학습→퀴즈→XP→다음미션 흐름 |
| **L7** | Page | `docs/IA.md` | 라우트 맵 (`/dashboard`, `/language` …) |
| **L8** | UI Component | `docs/IA.md` | Sidebar/QuestCard/XPWidget 명세 |
| **L9** | AI Agent | `src/agents/` | 9 에이전트 + `BaseAgent` |
| **L10** | Multi-Agent | `src/agents/Orchestrator.ts` | Professor→Methodology→Reviewer 협업 |
| **L11** | Knowledge | `src/knowledge/knowledge-map.ts` | 지식 노드 + 선수관계 그래프 |
| **L12** | Database | `database/schema.sql` | 커널-엔진 매핑 핵심 테이블 |
| **L13** | API | `src/api/routes.ts`, `handlers.ts` | 선언적 라우트 + 참조 핸들러 |
| **L14** | Analytics | `src/analytics/` | 이벤트 스트림 집계 뷰 |
| **L15** | Infrastructure | `infra/` | Next.js/Supabase/Clerk/AI/Vercel |

---

## L2 — 7 Kernels

| 커널 | 답하는 질문 | 관리 상태 |
|------|------------|-----------|
| Identity | 사용자는 누구인가? | degree, interests, paradigm |
| Knowledge | 무엇을 알고 있는가? | nodeMastery |
| Competency | 무엇을 할 수 있는가? | 6 literacy scores |
| Quest | 무엇을 해야 하는가? | active / completed / queue |
| Motivation | 왜 계속 하는가? | xp / level / badges / streak |
| Analytics | 어떻게 성장하는가? | events / timeOnTask / growthCurve |
| **Alignment** | **연구가 논리적으로 연결되는가?** | chain + conflicts (가장 중요) |

## L3 — 14 Engines

Orientation · Research Motivation · Research Language · Adaptive Scaffolding · Research Quest · Human Meaning · Cognitive · Academic Thinking · Research Foundation · Research Tutor · Research Design Studio · Research Alignment · Academic Writing · Defense

## L9 — 9 Agents

Professor · Tutor · Methodology · Statistics · Writing · Reviewer · Alignment · Defense · Quest

---

## 이식(설계서 권장) 우선순위

설계서가 강조하듯, 코딩보다 다음 5개 모델 설계가 먼저입니다 — 이 패키지는 그 5개를 코드로 고정해 둡니다:

1. **Research Kernel** → `src/os` + `src/kernels`
2. **성장모델(Level System)** → `src/growth/levels.ts`
3. **Competency Model** → `CompetencyKernel`
4. **Knowledge Map** → `src/knowledge/knowledge-map.ts`
5. **Quest System** → `QuestKernel` + `ResearchQuestEngine`

이 5개가 고정되면 14개 엔진이 하나의 "연구자 육성 운영체제"로 유기적으로 연결됩니다.

## 빌드 / 실행

```bash
npm install
npm run typecheck      # 전체 타입 검증
npm run demo           # 핵심 파이프라인 실행 데모
npm run build          # dist/ 산출
```
