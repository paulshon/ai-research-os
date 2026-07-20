import { auth } from "@clerk/nextjs/server";
import { getLearnerState } from "@/lib/rdos/state-server";
import RdosScholarView from "@/components/rdos/rdos-scholar-view";

export const dynamic = "force-dynamic";

/* RDOS 최종 단계 — Research-Ready Scholar(연구 준비자) 인증.
   학습 상태(역량·미션)에서 5개 인증과 연구 준비도 지수를 도출한다. */
export default async function RdosScholarPage() {
  const { userId } = await auth().catch(() => ({ userId: null }));
  const data = await getLearnerState(userId ?? "rdos-learner");
  return <RdosScholarView data={data} />;
}
