import type { OSEvent } from "../kernels/types";

type Handler = (e: OSEvent) => void | Promise<void>;

/** 단순 인메모리 이벤트 버스. 운영 시 Redis/Queue(L15)로 교체 가능. */
export class EventBus {
  private handlers = new Set<Handler>();
  subscribe(h: Handler) { this.handlers.add(h); return () => this.handlers.delete(h); }
  async publish(e: OSEvent) {
    for (const h of this.handlers) await h(e);
  }
}
