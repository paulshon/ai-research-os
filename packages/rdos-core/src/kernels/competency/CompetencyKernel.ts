import { BaseKernel } from "../BaseKernel";
import type { KernelKey, OSEvent, KernelDelta } from "../types";

/** CompetencyKernel — "무엇을 할 수 있는가?" */
export class CompetencyKernel extends BaseKernel {
  readonly key: KernelKey = "competency";
  readonly question = "무엇을 할 수 있는가?";

  protected initial() {
    return { scores: { researchLiteracy: 0, academicLiteracy: 0, thinkingLiteracy: 0,
                       methodLiteracy: 0, writingLiteracy: 0, aiLiteracy: 0 } as Record<string, number> };
  }
  async react(e: OSEvent): Promise<KernelDelta | null> {
    const map = e.payload as { competency?: string; gain?: number };
    if (!map.competency) return null;
    const s = this.get(e.userId);
    const sc = s.scores as Record<string, number>;
    sc[map.competency] = Math.min(100, (sc[map.competency] ?? 0) + (map.gain ?? 1));
    return { kernel: this.key, changes: { [map.competency]: sc[map.competency] } };
  }
}
