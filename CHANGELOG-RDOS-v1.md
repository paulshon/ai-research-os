# AI-Research-OS + RDOS — v1.0.0

가입 후 하나의 랜딩에서 **연구준비자(RDOS)** 와 **연구자(AI-Research-OS)** 두 트랙으로 분기하는 Dual Platform 통합.

## 추가/변경
1. **상위 메뉴 + 중간 랜딩 진입 버튼** — `apps/web/app/page.tsx`
   - 네비게이션에 `연구준비자 플랜`(/rdos) · `연구자 플랜`(/dashboard) 추가
   - 히어로 하단에 두 트랙 카드 + 진입 버튼 섹션(#tracks) 삽입
2. **플랜 선택 게이트웨이** — `apps/web/app/(marketing)/start/page.tsx`
   - 두 플랜을 비교·선택하는 중간 랜딩(상위 메뉴 + 두 버튼)
3. **RDOS 플랫폼(연구준비자)** — `apps/web/app/(rdos)/`
   - 자립형 사이드바 레이아웃 + Dashboard + 사양서 6절 10개 메뉴 페이지
   - 성장 로드맵(L0 입문자 → L9 연구 준비자)
4. **RDOS 로직 이식** — `apps/web/lib/rdos/`
   - `menus.ts`(메뉴↔엔진 매핑) · `gateway.ts`(트랙 분기) · `growth.ts` · `tracks.ts`
5. **RDOS 코어 패키지** — `packages/rdos-core/`
   - 7 Kernel · 14 Engine · 9 Agent 풀 스캐폴드(연구준비자 OS)

## 분기 흐름
```
랜딩(/) → 플랜 선택(/start) → 회원가입 → 인증 → 관리자 승인
   ├─ 연구준비자 → RDOS            (/rdos)
   └─ 연구자     → AI-Research-OS  (/dashboard)
```

## 검증
- 트랙 분기/메뉴/성장모델 로직: 9개 단언 전부 통과 (tsx)
- 신규 TSX/TS 18개 파일 esbuild 트랜스파일 통과 (JSX/TS 구문 유효)

## 실행
```bash
npm install      # 모노레포 (turbo)
npm run dev:web  # http://localhost:3000  → /  · /start · /rdos · /dashboard
```
