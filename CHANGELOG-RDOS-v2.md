# AI-Research-OS + RDOS — v2.0.0

v1 대비 4가지 요구사항을 반영했습니다. (문서1의 커널 체계 + 문서2의 듀얼 회원 구조)

## 1. 랜딩 가격 섹션 → 2개 플랜 구조 (`apps/web/app/page.tsx`)
기존 단일 4카드(Free/Basic/Scholar/University)를 **두 플랜**으로 재구성:
- **연구자 플랜 (AI-Research-OS)** — Free / Basic / Scholar / University 4티어, 사양서 7절의 등급별 기능을 정확히 표기
  (Free: 양적·질적 / Basic: +혼합·실험·검토검증·일정·분석·크리틱 / Scholar: +8개 연구유형·문장라이브러리·참고문헌 / University: +연구방법엔진·교육·기관라이선스·연구실협업·교수관리)
- **연구준비자 플랜 (RDOS)** — 사양서 6절의 10개 학습 메뉴(제공 내용) 그리드, "연구준비자로 시작하기" → 7단계 가입

## 2. 연구준비자 7단계 회원가입 (`apps/web/app/(marketing)/rdos-signup/page.tsx`)
사양서 4절 인증 프로세스를 위저드로 구현:
`1 플랜선택 → 2 정보입력 → 3 학위/논문정보 → 4 이메일인증 → 5 로그인(Google/GitHub/Email) → 6 관리자승인 → 7 서비스진입`
- 연구준비자 폼 필드(이름·이메일·소속대학·학과·석사과정여부·지도교수[선택]·관심분야)
- 가입 조건 검증: 석사과정 재학/입학예정 + 학위정보 필수

## 3. RDOS 접근 제한 — s***@gmail.com 전용 (`apps/web/app/(rdos)/layout.tsx`)
- 서버 컴포넌트로 전환, Clerk `currentUser()` 이메일을 `isSuperAdminEmail`로 검사
- 현재 모든 회원(연구자 가입자)은 `/rdos/*` 접근 시 "접근 제한" 화면 → AI-Research-OS로 유도
- 슈퍼관리자 이메일만 진입 허용

## 4. RDOS 대시보드 = 학습현황 ↔ 미션현황 연동 시각 상황판 (`apps/web/app/(rdos)/rdos/page.tsx`)
문서1 커널 체계를 시각화:
- 레벨/XP/연속학습(Motivation) · 전체 진행률 · 미션 카운트
- **미션 현황(Quest)** 패널: 각 학습 메뉴 = 미션, 학습 진행이 미션 진행과 직접 연동(해금 로직 포함)
- 성장 곡선(Analytics SVG) · 배지 · 6대 역량 리터러시(Competency) · 연구 정합성 체인+충돌(Alignment)
- 학습자 상태 모델 신설: `apps/web/lib/rdos/state.ts`

### 부가
- 각 학습 메뉴 페이지 정교화: 진행률·학습목표·레슨 상태(완료/진행/잠금)·미션 보상(커널 연동) — 8개 페이지
- 사이드바 하단 링크(← 플랜 선택으로 / AI-Research-OS(연구자) →) 삭제 (`components/rdos/rdos-shell.tsx`)

## 검증
- 로직 15개 단언 통과 (트랙 분기, 120XP→L1 연구 탐색자[이미지 일치], 미션-학습 연동/해금, 7/24 레슨, 정합성 충돌)
- 신규/수정 TSX·TS 21개 파일 esbuild 트랜스파일 통과
- import 해결·Clerk 서버 컨벤션 일치·하단 링크 삭제 확인

## 실행
```bash
npm install
npm run dev:web   # / (가격 2플랜) · /rdos-signup (7단계) · /rdos (게이트) · /dashboard
```
