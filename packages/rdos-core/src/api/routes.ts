// L13 — API Layer (선언적 라우트 명세)
export const API_ROUTES = [
  { method: "GET", path: "/api/user/:id", desc: "사용자 + 전체 커널 스냅샷" },
  { method: "POST", path: "/api/identity", desc: "Identity Kernel 설정" },
  { method: "GET", path: "/api/quest/:userId", desc: "활성/대기 퀘스트 조회" },
  { method: "POST", path: "/api/quest/complete", desc: "퀘스트 완료 → 파이프라인 트리거" },
  { method: "POST", path: "/api/concept/master", desc: "개념 숙련 완료 이벤트" },
  { method: "GET", path: "/api/competency/:userId", desc: "역량 점수 조회" },
  { method: "POST", path: "/api/alignment/check", desc: "연구 정합성 검사" },
  { method: "POST", path: "/api/agents/consult", desc: "멀티 에이전트 자문" },
  { method: "GET", path: "/api/analytics/:userId", desc: "학습분석 데이터" },
  { method: "POST", path: "/api/writing", desc: "글쓰기 프로젝트 저장" },
  { method: "POST", path: "/api/defense", desc: "디펜스 세션" },
] as const;

// --- Dual Platform / Membership routes ---
export const MEMBERSHIP_ROUTES = [
  { method: "GET",  path: "/api/plans/:track",        desc: "트랙별 플랜 목록(랜딩)" },
  { method: "POST", path: "/api/signup/start",        desc: "온보딩 시작 + 플랜 선택" },
  { method: "POST", path: "/api/signup/info",         desc: "가입 정보 입력" },
  { method: "POST", path: "/api/signup/credentials",  desc: "논문 링크/학위 검증" },
  { method: "POST", path: "/api/signup/verify-email", desc: "이메일 인증" },
  { method: "POST", path: "/api/auth/login",          desc: "Google/GitHub/Email 로그인" },
  { method: "POST", path: "/api/admin/approve",       desc: "관리자 승인/거절" },
  { method: "GET",  path: "/api/platform/resolve",    desc: "승인 후 플랫폼 분기 + 메뉴" },
] as const;
