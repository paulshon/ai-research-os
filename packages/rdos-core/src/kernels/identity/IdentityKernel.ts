import { BaseKernel } from "../BaseKernel";
import type { KernelKey, OSEvent, KernelDelta } from "../types";

/** IdentityKernel — "사용자는 누구인가?" */
export class IdentityKernel extends BaseKernel {
  readonly key: KernelKey = "identity";
  readonly question = "사용자는 누구인가?";

  protected initial() { return { degree: null, interests: [], researchParadigm: null }; }
  async react(e: OSEvent): Promise<KernelDelta | null> {
    if (e.type !== "identity.set") return null;
    const s = this.get(e.userId);
    Object.assign(s, e.payload);
    return { kernel: this.key, changes: { ...e.payload } };
  }
}
