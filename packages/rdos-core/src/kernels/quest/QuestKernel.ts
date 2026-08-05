import { BaseKernel } from "../BaseKernel";
import type { KernelKey, OSEvent, KernelDelta } from "../types";

/** QuestKernel — "무엇을 해야 하는가?" */
export class QuestKernel extends BaseKernel {
  readonly key: KernelKey = "quest";
  readonly question = "무엇을 해야 하는가?";

  protected initial() { return { active: null as string | null, completed: [] as string[], queue: [] as string[] }; }
  async react(e: OSEvent): Promise<KernelDelta | null> {
    const s = this.get(e.userId);
    if (e.type === "quest.complete") {
      const { questId } = e.payload as { questId: string };
      (s.completed as string[]).push(questId);
      s.active = (s.queue as string[]).shift() ?? null;
      return { kernel: this.key, changes: { completed: questId, nextActive: s.active } };
    }
    if (e.type === "quest.enqueue") {
      const { questId } = e.payload as { questId: string };
      (s.queue as string[]).push(questId);
      return { kernel: this.key, changes: { enqueued: questId } };
    }
    return null;
  }
}
