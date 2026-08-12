# AI Research OS — v56 Changelog

## 🐛 Bug Fixes

### 1. 스플래시 화면 무한 루프 / 랜딩 페이지 미표시 수정
- **증상**: v55에서 유성 애니메이션이 재생된 후 랜딩 페이지가 열리지 않고 스플래시 화면에 영구적으로 멈추는 현상
- **원인**: `page.tsx`의 `onDone={() => setShowSplash(false)}`가 인라인 화살표 함수로 매 렌더링마다 새 참조를 생성 → 스플래시 `useEffect`의 dependency에 `onComplete`가 포함되어 있어 부모 컴포넌트 리렌더링 시 애니메이션 시퀀스가 계속 취소·재시작됨
- **수정**:
  - `onComplete`를 `useRef`로 래핑 → 최신 콜백을 참조하되 effect 재실행 없음
  - `useEffect` dependency array를 `[]`(빈 배열)로 변경 → 마운트 시 1회만 실행
  - `try/finally` 블록으로 애니메이션 실패 시에도 `onComplete()` 반드시 호출
  - 안전 타임아웃 7초 추가 → 어떤 상황에서도 최대 7초 후 랜딩 페이지 진입 보장

### 2. 관리자 페이지 로그인 자격증명 변경
- **파일**: `apps/web/app/(dashboard)/admin/page.tsx`
- **변경**: 아이디 `sarang` → `sarangred`, 비밀번호 `[REDACTED-v4]` → `[REDACTED-v4]`

## ✅ 검증
- TypeScript 컴파일 오류 없음 (`tsc --noEmit` 통과)
- `next build` 성공 (라우트 테이블 이전 버전과 동일)
