import type { ResearchOS } from "../os/ResearchOS";
import type { OSEvent } from "../kernels/types";

/**
 * BaseEngine
 * - 엔진은 콘텐츠/기능을 제공하고, 결과를 커널로 emit한다.
 * - 엔진은 커널 상태를 직접 쓰지 않고 반드시 os.dispatch()를 통한다.
 */
export abstract class BaseEngine {
  abstract readonly key: string;
  abstract readonly title: string;
  abstract readonly modules: string[];
  constructor(protected os: ResearchOS) {}

  protected emit(userId: string, type: string, payload: Record<string, unknown>) {
    const event: OSEvent = { type, userId, source: this.key, payload, ts: Date.now() };
    return this.os.dispatch(event);
  }
}
