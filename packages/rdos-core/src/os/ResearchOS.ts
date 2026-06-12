import { EventBus } from "./EventBus";
import { createKernels } from "../kernels";
import type { Kernel, KernelKey, OSEvent, KernelDelta } from "../kernels/types";

/**
 * ResearchOS (L1)
 * ----------------------------------------------------------------------------
 * AI Research OS의 중앙 운영체제.
 *   - 모든 커널을 부팅하고 EventBus에 연결한다.
 *   - 엔진이 dispatch한 이벤트를 모든 커널에 순서대로 전달한다(react).
 *   - 커널이 만들어낸 delta는 Analytics 커널로 다시 흘려보내 추적한다.
 *
 * 첨부 설계서의 파이프라인을 그대로 구현:
 *   언어 학습 완료 → Knowledge → Competency → Quest → Motivation → Analytics → Alignment
 */
export class ResearchOS {
  readonly bus = new EventBus();
  private kernels: Kernel[];
  private byKey = new Map<KernelKey, Kernel>();

  constructor() {
    this.kernels = createKernels();
    for (const k of this.kernels) this.byKey.set(k.key, k);
  }

  kernel<K extends Kernel = Kernel>(key: KernelKey): K {
    return this.byKey.get(key) as K;
  }

  async boot(userId: string) {
    for (const k of this.kernels) await k.hydrate(userId);
  }

  /** 엔진/에이전트가 호출하는 단일 진입점. 발생한 모든 delta를 반환한다. */
  async dispatch(event: OSEvent): Promise<KernelDelta[]> {
    const deltas: KernelDelta[] = [];
    // 정해진 순서로 커널 반응(설계서의 흐름 보장)
    const order: KernelKey[] = ["identity", "knowledge", "competency", "quest", "motivation", "alignment"];
    for (const key of order) {
      const k = this.byKey.get(key);
      if (!k) continue;
      const delta = await k.react(event);
      if (delta) deltas.push(delta);
    }
    // Analytics는 항상 마지막에 모든 것을 기록
    const a = this.byKey.get("analytics");
    if (a) { const d = await a.react(event); if (d) deltas.push(d); }
    await this.bus.publish(event);
    return deltas;
  }

  /** 사용자의 전체 상태 스냅샷 (대시보드/Analytics용) */
  state(userId: string) {
    const out: Record<string, unknown> = {};
    for (const k of this.kernels) out[k.key] = k.snapshot(userId);
    return out;
  }
}
