import { PLANS } from "../membership/plans";
import { can, type Account } from "../membership/entitlements";
import { TRACKS, type TrackId } from "../membership/tracks";
import { RDOS_MENUS } from "./rdos";
import { AROS_FEATURES } from "./aros";

export interface ResolvedPlatform {
  track: TrackId;
  service: string;
  home: string;                       // 진입 라우트
  menu: { label: string; route: string; engine: string | null }[];
}

/**
 * 승인된 계정을 트랙에 맞는 플랫폼으로 분기하고,
 * 플랜 권한(can)으로 필터링된 메뉴만 노출한다.
 *   RDOS  → /rdos
 *   AROS  → /aros
 */
export function resolvePlatform(account: Account): ResolvedPlatform {
  const plan = PLANS[account.planId];
  const track = plan.track;
  if (track === "rdos") {
    return {
      track, service: TRACKS.rdos.serviceName, home: "/rdos",
      menu: RDOS_MENUS.filter(m => can(account, m.feature))
        .map(m => ({ label: m.label, route: m.route, engine: m.engine })),
    };
  }
  return {
    track, service: TRACKS.aros.serviceName, home: "/aros",
    menu: AROS_FEATURES.filter(f => can(account, f.feature))
      .map(f => ({ label: f.label, route: f.route, engine: f.engine })),
  };
}
