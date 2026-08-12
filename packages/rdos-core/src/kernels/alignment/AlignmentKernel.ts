import { BaseKernel } from "../BaseKernel";
import type { KernelKey, OSEvent, KernelDelta } from "../types";

/** AlignmentKernel — "연구가 논리적으로 연결되는가?" */
export class AlignmentKernel extends BaseKernel {
  readonly key: KernelKey = "alignment";
  readonly question = "연구가 논리적으로 연결되는가?";

  protected initial() {
    return { chain: { problem: null, purpose: null, question: null, method: null, conclusion: null } as Record<string, unknown>,
             conflicts: [] as string[] };
  }
  async react(e: OSEvent): Promise<KernelDelta | null> {
    if (e.type !== "alignment.set" && e.type !== "alignment.check") return null;
    const s = this.get(e.userId);
    if (e.type === "alignment.set") Object.assign(s.chain as object, e.payload);
    const chain = s.chain as Record<string, unknown>;
    // 단순 정합성 규칙: 방법론이 있는데 연구질문이 비어있으면 불일치
    const conflicts: string[] = [];
    if (chain.method && !chain.question) conflicts.push("연구질문과 방법론 불일치");
    if (chain.purpose && !chain.problem) conflicts.push("연구목적이 연구문제와 연결되지 않음");
    s.conflicts = conflicts;
    return { kernel: this.key, changes: { conflicts } };
  }
}
