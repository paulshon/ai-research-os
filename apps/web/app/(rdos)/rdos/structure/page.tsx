import { auth } from "@clerk/nextjs/server";
import { getMenuProgress } from "@/lib/rdos/state-server";
import { RDOS_LESSON_CONTENT } from "@/lib/rdos/lesson-content";
import RdosLessonView from "@/components/rdos/rdos-lesson-view";

export const dynamic = "force-dynamic";

export default async function RdosMenu_structure() {
  const { userId } = await auth().catch(() => ({ userId: null }));
  const done = await getMenuProgress(userId ?? "rdos-learner", "structure");
  return <RdosLessonView content={RDOS_LESSON_CONTENT["structure"]} initialDone={done} />;
}
