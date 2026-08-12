import { BaseKernel } from "../BaseKernel";
import type { KernelKey, OSEvent, KernelDelta } from "../types";

/** KnowledgeKernel — "무엇을 알고 있는가?" */
export class KnowledgeKernel extends BaseKernel {
  readonly key: KernelKey = "knowledge";
  readonly question = "무엇을 알고 있는가?";

  protected initial() { return { nodeMastery: {} as Record<string, number> }; }
  async react(e: OSEvent): Promise<KernelDelta | null> {
    // 개념 학습/숙련 이벤트를 듣고 노드 숙련도를 올린다
    if (!e.type.endsWith(".concept.mastered") && e.type !== "knowledge.gain") return null;
    const { nodeId, gain = 5 } = e.payload as { nodeId: string; gain?: number };
    const s = this.get(e.userId);
    const m = s.nodeMastery as Record<string, number>;
    m[nodeId] = Math.min(100, (m[nodeId] ?? 0) + gain);
    return { kernel: this.key, changes: { nodeId, mastery: m[nodeId] } };
  }
}
