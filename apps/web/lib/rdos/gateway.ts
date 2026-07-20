// Dual Platform 게이트웨이 — 회원가입/승인 후 트랙을 선택해 각 플랫폼으로 분기.
//   Track A (연구준비자) → RDOS (/rdos)
//   Track B (연구자)     → AI-Research-OS (/dashboard)
export type TrackId = "rdos" | "aros";

export interface TrackEntry {
  id: TrackId;
  titleKey: string;     // 플랜명 (i18n 키, startPage.*)
  service: string;      // 서비스명 (브랜드명이라 번역하지 않음)
  audienceKey: string;  // 대상 (i18n 키)
  purposeKey: string;   // 목적 (i18n 키)
  accessLevel: string;  // 접근 수준
  enterRoute: string;   // 진입 라우트
  ctaKey: string;       // i18n 키
  accent: string;
}

export const TRACK_ENTRIES: Record<TrackId, TrackEntry> = {
  rdos: {
    id: "rdos",
    titleKey: "startPage.rdosTitle",
    service: "RDOS · Researcher Development OS",
    audienceKey: "startPage.rdosAudience",
    purposeKey: "startPage.rdosPurpose",
    accessLevel: "교육 중심",
    enterRoute: "/rdos",
    ctaKey: "startPage.rdosCta",
    accent: "#3ecfb2",
  },
  aros: {
    id: "aros",
    titleKey: "startPage.arosTitle",
    service: "AI-Research-OS",
    audienceKey: "startPage.arosAudience",
    purposeKey: "startPage.arosPurpose",
    accessLevel: "연구 수행 중심",
    enterRoute: "/dashboard",
    ctaKey: "startPage.arosCta",
    accent: "#ff7a00",
  },
};

/** 승인된 사용자를 선택한 트랙의 진입 라우트로 분기 */
export function resolveEntry(track: TrackId): string {
  return TRACK_ENTRIES[track].enterRoute;
}
