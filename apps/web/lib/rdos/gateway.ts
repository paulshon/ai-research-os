// Dual Platform 게이트웨이 — 회원가입/승인 후 트랙을 선택해 각 플랫폼으로 분기.
//   Track A (연구준비자) → RDOS (/rdos)
//   Track B (연구자)     → AI-Research-OS (/dashboard)
export type TrackId = "rdos" | "aros";

export interface TrackEntry {
  id: TrackId;
  title: string;        // 플랜명
  service: string;      // 서비스명
  audience: string;     // 대상
  purpose: string;      // 목적
  accessLevel: string;  // 접근 수준
  enterRoute: string;   // 진입 라우트
  cta: string;
  accent: string;
}

export const TRACK_ENTRIES: Record<TrackId, TrackEntry> = {
  rdos: {
    id: "rdos",
    title: "연구준비자 플랜",
    service: "RDOS · Researcher Development OS",
    audience: "대학원 진학 예정자 · 석사과정생 · 연구 입문자",
    purpose: "논문 및 연구 역량 개발 (교육 중심)",
    accessLevel: "교육 중심",
    enterRoute: "/rdos",
    cta: "RDOS 입장",
    accent: "#3ecfb2",
  },
  aros: {
    id: "aros",
    title: "연구자 플랜",
    service: "AI-Research-OS",
    audience: "석사 이상 연구 경험자 · 논문 저자 · 교수 · 연구원",
    purpose: "실제 연구 수행 및 논문 생산 (연구 생산성 향상)",
    accessLevel: "연구 수행 중심",
    enterRoute: "/dashboard",
    cta: "AI-Research-OS 입장",
    accent: "#ff7a00",
  },
};

/** 승인된 사용자를 선택한 트랙의 진입 라우트로 분기 */
export function resolveEntry(track: TrackId): string {
  return TRACK_ENTRIES[track].enterRoute;
}
