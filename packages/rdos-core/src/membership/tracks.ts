// 듀얼 플랫폼: 하나의 브랜드(AI-Research-OS) 아래 두 트랙으로 분기
export type TrackId = "rdos" | "aros";

export interface Track {
  id: TrackId;
  serviceName: string;
  audience: string;     // 대상
  purpose: string;      // 목적
  accessLevel: string;  // 접근 수준
}

export const TRACKS: Record<TrackId, Track> = {
  rdos: {
    id: "rdos",
    serviceName: "RDOS (Researcher Development Operating System)",
    audience: "연구준비자 — 대학원 진학 예정자/석사과정생/연구 입문자",
    purpose: "논문 및 연구 역량 개발",
    accessLevel: "교육 중심",
  },
  aros: {
    id: "aros",
    serviceName: "AI-Research-OS",
    audience: "연구자 — 석사 이상 연구 경험자/논문 저자/교수/연구원",
    purpose: "실제 연구 수행 및 논문 생산 (연구 생산성 향상)",
    accessLevel: "연구 수행 중심",
  },
};
