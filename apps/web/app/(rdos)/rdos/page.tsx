import { auth } from "@clerk/nextjs/server";
import { getLearnerState } from "@/lib/rdos/state-server";
import RdosDashboardView from "@/components/rdos/rdos-dashboard-view";

export const dynamic = "force-dynamic";

/* RDOS Dashboard (v3) — 서버에서 커널 도출 상태를 가져와 시각 상황판으로 렌더 */
export default async function RdosDashboardPage() {
  const { userId } = await auth().catch(() => ({ userId: null }));
  const data = await getLearnerState(userId ?? "rdos-learner");
  return <RdosDashboardView data={data} />;
}
