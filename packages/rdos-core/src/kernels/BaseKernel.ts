import type { Kernel, KernelKey, OSEvent, KernelDelta } from "./types";

/**
 * BaseKernel
 * - userId 단위로 상태를 보관(인메모리 → Repository로 교체 가능)
 * - react()는 하위 커널이 오버라이드한다.
 */
export abstract class BaseKernel implements Kernel {
  abstract readonly key: KernelKey;
  abstract readonly question: string;
  protected store = new Map<string, Record<string, unknown>>();

  async hydrate(userId: string): Promise<void> {
    if (!this.store.has(userId)) this.store.set(userId, this.initial());
  }

  protected abstract initial(): Record<string, unknown>;
  abstract react(event: OSEvent): Promise<KernelDelta | null>;

  protected get(userId: string) {
    if (!this.store.has(userId)) this.store.set(userId, this.initial());
    return this.store.get(userId)!;
  }

  snapshot(userId: string) {
    return { ...this.get(userId) };
  }
}
