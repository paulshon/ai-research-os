// L2 Kernel Layer — shared contracts
// 모든 커널은 시스템 이벤트를 구독(react)하고, 자신의 상태를 갱신한다.

export type KernelKey =
  | "identity"
  | "knowledge"
  | "competency"
  | "quest"
  | "motivation"
  | "analytics"
  | "alignment";

/** 엔진/에이전트가 발행하는 시스템 이벤트 */
export interface OSEvent<P = Record<string, unknown>> {
  type: string;            // 예: "language.concept.mastered"
  userId: string;
  source: string;          // 발행한 엔진/에이전트 키
  payload: P;
  ts: number;
}

/** 커널 갱신 결과 (Analytics로 흘러가는 추적 단위) */
export interface KernelDelta {
  kernel: KernelKey;
  changes: Record<string, unknown>;
}

export interface Kernel {
  readonly key: KernelKey;
  readonly question: string;          // 이 커널이 답하는 질문
  hydrate(userId: string): Promise<void>;
  react(event: OSEvent): Promise<KernelDelta | null>;
  snapshot(userId: string): Record<string, unknown>;
}
