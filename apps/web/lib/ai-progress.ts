"use client";

/**
 * ════════════════════════════════════════════════════════════════
 *  Global AI Progress Bus (v11)
 * ----------------------------------------------------------------
 *  모든 메뉴(연구설계·문헌연구·논문작성·검토검증·구조엔진·연구방법·
 *  논문분석·논문크리틱·문장라이브러리 등)에서 발생하는 AI 분석 작업의
 *  진행 상태를 단일 전역 버스로 모은다. 상단 메뉴바의 GlobalAiProgress가
 *  이 버스를 구독하여 10단계 상태바 + 퍼센트를 표시한다.
 *
 *  설계 원칙
 *   · 외부 의존 없는 모듈 레벨 싱글톤(pub/sub) → 어떤 컴포넌트(셸/페이지)
 *     에서도 Provider 배선 없이 즉시 사용 가능.
 *   · LLM 호출은 단발 fetch(토큰 스트리밍 카운트 불가)이므로, 명시 퍼센트가
 *     없으면 "시뮬레이션 진행"(가속 후 90%에서 대기 → 완료 시 100%)을 사용.
 *   · 문서 추출/PDF 렌더처럼 실제 진척률을 아는 작업은 set(percent)로 구동.
 *   · 동시 작업 카운트를 유지하여, 마지막 작업이 끝날 때만 바를 숨긴다.
 * ════════════════════════════════════════════════════════════════
 */

export interface AiProgressState {
  active: boolean;
  /** 0~100 정수 */
  percent: number;
  /** 현재 진행 중인 작업 라벨(예: "AI 분석 중") */
  label: string;
}

type Listener = () => void;

const SIM_CEILING = 92; // 시뮬레이션 모드에서 자동 도달 상한
const TICK_MS = 220;

class AiProgressBus {
  private state: AiProgressState = { active: false, percent: 0, label: "" };
  private listeners = new Set<Listener>();
  private activeCount = 0;
  private explicit = false; // 명시 퍼센트(set) 사용 여부
  private timer: ReturnType<typeof setInterval> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;

  /** 캐시된 스냅샷(useSyncExternalStore의 getSnapshot 안정성 보장) */
  private snapshot: AiProgressState = this.state;

  getSnapshot = (): AiProgressState => this.snapshot;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private commit(next: Partial<AiProgressState>) {
    this.state = { ...this.state, ...next };
    this.snapshot = this.state;
    this.listeners.forEach((l) => l());
  }

  private startSim() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.explicit) return;
      const p = this.state.percent;
      if (p >= SIM_CEILING) return;
      // 남은 거리에 비례한 가변 증가(처음 빠르게, 90% 근처에서 느리게)
      const step = Math.max(0.6, (SIM_CEILING - p) * 0.14);
      this.commit({ percent: Math.min(SIM_CEILING, Math.round((p + step) * 10) / 10) });
    }, TICK_MS);
  }

  private stopSim() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 작업 시작. 반환된 토큰을 end()에 전달한다.
   * @param label 표시 라벨
   */
  begin(label = "AI 분석 중"): number {
    this.seq += 1;
    const token = this.seq;
    this.activeCount += 1;
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.activeCount === 1) {
      this.explicit = false;
      this.commit({ active: true, percent: 4, label });
      this.startSim();
    } else {
      // 다중 작업: 라벨만 갱신, 퍼센트는 더 낮은 쪽으로 되돌리지 않음
      this.commit({ active: true, label });
    }
    return token;
  }

  /** 실제 진척률(0~100)을 직접 구동(문서 추출/PDF 렌더 등) */
  set(percent: number, label?: string) {
    this.explicit = true;
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    this.commit({
      active: true,
      percent: p,
      ...(label !== undefined ? { label } : {}),
    });
  }

  /** 라벨만 갱신 */
  setLabel(label: string) {
    if (this.state.active) this.commit({ label });
  }

  /** 작업 종료. 마지막 작업이면 100%로 마감 후 바를 숨긴다. */
  end(_token?: number) {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount > 0) return;
    this.stopSim();
    this.explicit = false;
    this.commit({ percent: 100 });
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.commit({ active: false, percent: 0, label: "" });
      this.hideTimer = null;
    }, 600);
  }

  /** 강제 초기화(오류 복구용) */
  reset() {
    this.stopSim();
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.activeCount = 0;
    this.explicit = false;
    this.commit({ active: false, percent: 0, label: "" });
  }
}

export const aiProgress = new AiProgressBus();

/**
 * 비동기 작업을 전역 진행바로 감싸는 헬퍼.
 * 시작 시 begin(), 종료(성공/실패 무관) 시 end()를 보장한다.
 */
export async function withAiProgress<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const token = aiProgress.begin(label);
  try {
    return await fn();
  } finally {
    aiProgress.end(token);
  }
}
