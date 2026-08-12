import { BaseKernel } from "../BaseKernel";
import type { KernelKey, OSEvent, KernelDelta } from "../types";

/** AnalyticsKernel — "어떻게 성장하는가?" */
export class AnalyticsKernel extends BaseKernel {
  readonly key: KernelKey = "analytics";
  readonly question = "어떻게 성장하는가?";

  protected initial() { return { events: [] as unknown[], timeOnTask: 0, growthCurve: [] as number[] }; }
  async react(e: OSEvent): Promise<KernelDelta | null> {
    const s = this.get(e.userId);
    (s.events as unknown[]).push({ type: e.type, ts: e.ts, source: e.source });
    if (e.type === "session.tick") s.timeOnTask = (s.timeOnTask as number) + (e.payload.seconds as number ?? 0);
    return { kernel: this.key, changes: { recorded: e.type } };
  }
}
