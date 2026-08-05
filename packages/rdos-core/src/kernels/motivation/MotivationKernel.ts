import { BaseKernel } from "../BaseKernel";
import type { KernelKey, OSEvent, KernelDelta } from "../types";

/** MotivationKernel — "왜 계속 하는가?" */
export class MotivationKernel extends BaseKernel {
  readonly key: KernelKey = "motivation";
  readonly question = "왜 계속 하는가?";

  protected initial() { return { xp: 0, level: 0, badges: [] as string[], streakDays: 0 }; }
  async react(e: OSEvent): Promise<KernelDelta | null> {
    const s = this.get(e.userId);
    const p = e.payload as { xp?: number; badge?: string };
    const changes: Record<string, unknown> = {};
    if (p.xp) { s.xp = (s.xp as number) + p.xp; s.level = Math.floor((s.xp as number) / 100); changes.xp = s.xp; changes.level = s.level; }
    if (p.badge) { (s.badges as string[]).push(p.badge); changes.badge = p.badge; }
    return Object.keys(changes).length ? { kernel: this.key, changes } : null;
  }
}
