import { auth } from "@clerk/nextjs/server";
import { getLearnerState } from "@/lib/rdos/state-server";
import { GROWTH_LEVELS } from "@/lib/rdos/growth";
import RdosRoadmapView from "@/components/rdos/rdos-roadmap-view";

export const dynamic = "force-dynamic";

export default async function RdosRoadmapPage() {
  const { userId } = await auth().catch(() => ({ userId: null }));
  const data = await getLearnerState(userId ?? "rdos-learner");
  return <RdosRoadmapView levels={GROWTH_LEVELS} xp={data.xp} currentCode={data.level.code} />;
}
