"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { usePermissions } from "@/hooks/use-permissions";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { mountOrb, mountField, type OrbState } from "@/components/assistant/orb-canvas";
import { BASE_CSS } from "@/components/assistant/assistant-css";
import { WINDOW_CSS } from "@/components/assistant/orb-window-css";
import VoiceSettingsPanel from "@/components/assistant/voice-settings";
import { classifyIntent, type TaskItem } from "@/components/dashboard/sidebar-items";
import { touchSession } from "@/lib/workspace/history-store";
import { SIDEBAR_EVENT } from "@/components/dashboard/sidebar";

/* ══════════════════════════════════════════════════════════════════════
   ove-3 · 연구 어시스턴트 — 오브 + SCHOLAR-DOS(CRT) 대화창

   [ove-3]
   1. 대화창 외형 = ove-1/s-renew-17 CRT(SCHOLAR-DOS · 스캔라인 · 덱)
   2. 기능 = ove-2 그대로
        · 플로팅 드래그·리사이즈·글자배율·핀 · 모바일 바텀시트
        · 음성(권한 프라이밍 → 브라우저 STT → 서버 전사)
        · 의도 분류로 메뉴 이동
   3. 오브 크기: 대기(center) 조금 작게, 연구(dock) 조금 더 크게·선명하게
   ══════════════════════════════════════════════════════════════════════ */

type Kind = "q" | "a" | "sys" | "err";
interface Line {
  id: number;
  kind: Kind;
  text: string;
}

type WinMode = "center" | "docked";
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SCALES = [0.85, 0.925, 1.0, 1.1, 1.25, 1.4];
const DEFAULT_SCALE_IDX = 2;

const WIN_SPEC: Record<WinMode, { w: number; h: number; minW: number; minH: number }> = {
  docked: { w: 480, h: 620, minW: 360, minH: 420 },
  /* ove-4: 대기 화면 대화창 높이를 절반으로 — 폭은 유지 */
  center: { w: 960, h: 340, minW: 560, minH: 260 },
};

const STORE_KEY = "ui.orbWindow.v4";
const MOBILE_Q = "(max-width: 767px)";

/* ove-6 · 답변 후 복귀 / 음성 유휴 타임아웃 */
const SHORT_ANSWER_CHARS = 160;
const PAUSE_SHORT_MS = 3_000;
const PAUSE_LONG_MS = 5_000;
const VOICE_IDLE_MS = 10_000;
const DBL_TAP_MS = 380;

interface Persisted {
  center?: Rect;
  docked?: Rect;
  scaleIdx?: number;
  pinned?: boolean;
}

function readStore(): Persisted {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Persisted;
  } catch {
    return {};
  }
}
function writeStore(patch: Persisted) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), ...patch }));
  } catch {
    /* 저장 실패는 무시한다 */
  }
}

function maxSize(mode: WinMode) {
  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  return mode === "center"
    ? { w: Math.min(1280, vw * 0.92), h: Math.min(vh * 0.88, 960) }
    : { w: Math.min(900, vw - 32), h: Math.min(vh * 0.88, 1000) };
}

/** 저장값이 없거나 화면 밖이면 기본 자리로 되돌린다 */
function defaultRect(mode: WinMode, sidebar: number): Rect {
  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  const spec = WIN_SPEC[mode];
  const cap = maxSize(mode);
  const w = Math.min(spec.w, cap.w);
  const h = Math.min(spec.h, cap.h);
  if (mode === "center") {
    /* 오브 바로 위·가운데에 앉힌다 (첨부 점선 위치) */
    return {
      x: sidebar + (vw - sidebar - w) / 2,
      y: Math.max(48, vh - h - (mobileGuess() ? 168 : 220)),
      w,
      h,
    };
  }
  return { x: Math.max(16, vw - w - 28), y: Math.max(16, vh - h - 108), w, h };
}

function mobileGuess() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_Q).matches;
}

function clampRect(r: Rect, mode: WinMode): Rect {
  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  const spec = WIN_SPEC[mode];
  const cap = maxSize(mode);
  const w = Math.max(spec.minW, Math.min(r.w, cap.w));
  const h = Math.max(spec.minH, Math.min(r.h, cap.h));
  /* 헤더가 최소 80px 는 화면 안에 남게 한다 */
  const x = Math.max(80 - w, Math.min(r.x, vw - 80));
  const y = Math.max(0, Math.min(r.y, vh - 44));
  return { x, y, w, h };
}

export default function ResearchAssistant({
  sidebarWidth = 0,
  contentMaxWidth = 0,
  /** S0 대기 화면이면 오브가 전체메뉴 아래 중앙에 놓인다 */
  centered = false,
}: {
  sidebarWidth?: number;
  contentMaxWidth?: number;
  centered?: boolean;
} = {}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { can } = usePermissions();

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<OrbState>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [candidates, setCandidates] = useState<TaskItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [scaleIdx, setScaleIdx] = useState(DEFAULT_SCALE_IDX);
  const [pinned, setPinned] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  /* 대기 화면에서 페이지가 지정한 오브 자리(힌트 문구 바로 아래) */
  const [orbPos, setOrbPos] = useState<{ x: number; y: number } | null>(null);
  /* 모바일 바텀시트 높이 단계 (0 = 낮게, 1 = 기본, 2 = 크게) */
  const [sheetStep, setSheetStep] = useState(1);
  /* 가상 키보드가 가린 높이 */
  const [kb, setKb] = useState(0);

  const mode: WinMode = centered ? "center" : "docked";
  const modeRef = useRef<WinMode>(mode);

  const orbRef = useRef<HTMLCanvasElement | null>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const monRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const winRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<OrbState>("idle");
  const seq = useRef(0);
  const rectsRef = useRef<Record<WinMode, Rect | null>>({ center: null, docked: null });
  /* ove-6: 음성인식 모드(더블클릭·웨이크) — 대화창은 질문 시에만 연다 */
  const voiceModeRef = useRef(false);
  const fromVoiceRef = useRef(false);
  const voiceDeadlineRef = useRef(0);
  const lastOrbTapRef = useRef(0);
  const orbSingleTapTimerRef = useRef<number | null>(null);
  const wakeArmedRef = useRef(false);
  const suppressRestartRef = useRef(false);
  const postTimersRef = useRef<{ pause: number | null; idle: number | null }>({
    pause: null,
    idle: null,
  });
  const [voiceMode, setVoiceMode] = useState(false);

  stateRef.current = state;

  const clearPostTimers = useCallback(() => {
    if (postTimersRef.current.pause != null) {
      window.clearTimeout(postTimersRef.current.pause);
      postTimersRef.current.pause = null;
    }
    if (postTimersRef.current.idle != null) {
      window.clearTimeout(postTimersRef.current.idle);
      postTimersRef.current.idle = null;
    }
  }, []);

  /* ── 음성 입력 ─────────────────────────────────────────────── */
  const submitRef = useRef<(text: string) => void | Promise<void>>(() => undefined);
  const handleVoiceText = useCallback((text: string) => {
    fromVoiceRef.current = true;
    setDraft("");
    void submitRef.current(text);
  }, []);
  const handleWake = useCallback(() => {
    /* 웨이크 → 음성인식 모드만 (대화창은 발화 후 오픈) */
    voiceModeRef.current = true;
    setVoiceMode(true);
    setState("listening");
    voiceDeadlineRef.current = Date.now() + VOICE_IDLE_MS;
  }, []);
  const voice = useVoiceInput(handleVoiceText, handleWake);
  const levelRef = useRef(0);
  levelRef.current = voice.level;
  /* 대화창이 열려 있으면 CRT(SCHOLAR-DOS) 스킨을 항상 켠다 */
  const term = open || state === "typing" || state === "answering" || voice.listening;
  const voiceStartRef = useRef(voice.start);
  const voiceStopRef = useRef(voice.stop);
  const voiceStartWakeRef = useRef(voice.startWake);
  const voiceStopWakeRef = useRef(voice.stopWake);
  voiceStartRef.current = voice.start;
  voiceStopRef.current = voice.stop;
  voiceStartWakeRef.current = voice.startWake;
  voiceStopWakeRef.current = voice.stopWake;

  useEffect(() => {
    wakeArmedRef.current = voice.wakeArmed;
  }, [voice.wakeArmed]);

  const cancelOrbSingleTap = useCallback(() => {
    if (orbSingleTapTimerRef.current) {
      window.clearTimeout(orbSingleTapTimerRef.current);
      orbSingleTapTimerRef.current = null;
    }
  }, []);

  const exitVoiceMode = useCallback(() => {
    clearPostTimers();
    voiceModeRef.current = false;
    setVoiceMode(false);
    voiceDeadlineRef.current = 0;
    suppressRestartRef.current = false;
    voiceStopRef.current();
    setState((s) => (s === "answering" ? s : "idle"));
  }, [clearPostTimers]);

  /** ove-7 · 오브 단일 클릭/탭 → 음성 인식 중지 (더블은 enterVoiceMode 유지) */
  const stopOrbVoiceListening = useCallback(() => {
    cancelOrbSingleTap();
    if (voiceModeRef.current || voice.listening) {
      fromVoiceRef.current = false;
      suppressRestartRef.current = true;
      exitVoiceMode();
      return;
    }
    if (wakeArmedRef.current) {
      voiceStopWakeRef.current();
      setState("idle");
    }
  }, [cancelOrbSingleTap, exitVoiceMode, voice.listening]);

  const enterVoiceMode = useCallback(() => {
    cancelOrbSingleTap();
    clearPostTimers();
    voiceModeRef.current = true;
    setVoiceMode(true);
    suppressRestartRef.current = false;
    setState("listening");
    voiceDeadlineRef.current = Date.now() + VOICE_IDLE_MS;
    /* 대화창은 열지 않음 — 질문 인식 시에만 연다 */
    if (!voiceStartRef.current) return;
    voiceStopWakeRef.current();
    voiceStartRef.current();
  }, [clearPostTimers, cancelOrbSingleTap]);

  const openChatOnly = useCallback(() => {
    clearPostTimers();
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 260);
  }, [clearPostTimers]);

  /* 인식 중간 결과를 입력창에 실시간으로 비춘다 */
  useEffect(() => {
    if (voice.partial) setDraft(voice.partial);
  }, [voice.partial]);

  /* 음성모드에서 말하기 시작하면 응답창(대화창)을 연다 */
  useEffect(() => {
    if (!voice.partial || !voiceModeRef.current) return;
    voiceDeadlineRef.current = Date.now() + VOICE_IDLE_MS;
    setOpen(true);
  }, [voice.partial]);

  useEffect(() => {
    if (voice.listening) {
      setState((s) => (s === "answering" ? s : "listening"));
      return;
    }
    if (stateRef.current === "answering") return;
    if (suppressRestartRef.current || postTimersRef.current.pause != null) return;
    /* 음성모드: 세션이 끝나도 기한 안이면 재청취, 지나면 오프(오브 UI 유지) */
    if (voiceModeRef.current) {
      const left = voiceDeadlineRef.current - Date.now();
      if (left <= 0) {
        exitVoiceMode();
        return;
      }
      const id = window.setTimeout(() => {
        if (!voiceModeRef.current) return;
        if (Date.now() >= voiceDeadlineRef.current) {
          exitVoiceMode();
          return;
        }
        if (stateRef.current === "answering") return;
        voiceStartRef.current();
      }, 220);
      return () => window.clearTimeout(id);
    }
    if (stateRef.current === "listening") {
      setState(lines.length ? "typing" : "idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.listening, exitVoiceMode]);

  useEffect(() => () => cancelOrbSingleTap(), [cancelOrbSingleTap]);

  /* ── 창 기하 ───────────────────────────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_Q);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    const st = readStore();
    if (typeof st.scaleIdx === "number" && SCALES[st.scaleIdx]) setScaleIdx(st.scaleIdx);
    setPinned(!!st.pinned);
    rectsRef.current = {
      center: st.center ? clampRect(st.center, "center") : null,
      docked: st.docked ? clampRect(st.docked, "docked") : null,
    };
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  /* 모드가 바뀌면 그 모드에 저장된 크기를, 없으면 기본값을 쓴다 (모프의 목표 값) */
  useEffect(() => {
    modeRef.current = mode;
    const saved = rectsRef.current[mode];
    setRect(clampRect(saved ?? defaultRect(mode, sidebarWidth), mode));
  }, [mode, sidebarWidth]);

  /* ══════════════════════════════════════════════════════════════
     ove-2 · 오브를 페이지가 지정한 자리에 정확히 앉힌다.
     대기 화면은 힌트 문구 바로 아래에 [data-orb-slot] 을 두고,
     여기서 그 사각형의 중심을 재서 오브를 그 위에 얹는다.
     사이드바 폭·창 크기·스크롤이 바뀌어도 따라간다.
     ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!centered) {
      setOrbPos(null);
      return;
    }
    let raf = 0;
    let ro: ResizeObserver | null = null;
    const measure = () => {
      const el = document.querySelector<HTMLElement>("[data-orb-slot]");
      if (!el) return setOrbPos(null);
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      setOrbPos((prev) => {
        /* ove-9 · 슬롯이 세로로 길면(캡션 공간) 오브를 상단 정사각에 앉힌다 */
        const next = { x: r.left + r.width / 2, y: r.top + Math.min(r.width, r.height) / 2 };
        if (prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5) return prev;
        return next;
      });
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };
    measure();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener(SIDEBAR_EVENT, schedule as EventListener);
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(schedule);
      const el = document.querySelector("[data-orb-slot]");
      if (el) ro.observe(el);
      ro.observe(document.body);
    }
    /* 첫 렌더 직후 폰트·이미지 로딩으로 레이아웃이 흔들리는 구간 보정 */
    const timers = [60, 200, 500, 1200].map((d) => window.setTimeout(measure, d));
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener(SIDEBAR_EVENT, schedule as EventListener);
      ro?.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [centered, sidebarWidth]);

  /* 화면 크기가 바뀌면 창을 화면 안으로 되돌린다 */
  useEffect(() => {
    const onResize = () => {
      setRect((r) => (r ? clampRect(r, modeRef.current) : r));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persistRect = useCallback((r: Rect) => {
    const m = modeRef.current;
    rectsRef.current[m] = r;
    writeStore({ [m]: r } as Persisted);
  }, []);

  /* ── 드래그 이동 / 리사이즈 ────────────────────────────────── */
  const beginPointer = useCallback(
    (
      e: React.PointerEvent,
      kind: "move" | "e" | "s" | "se",
    ) => {
      if (mobile) {
        /* 모바일은 이동·리사이즈 대신 위아래로 끌어 단계를 바꾼다 */
        if (kind !== "move") return;
        const el = winRef.current;
        if (!el) return;
        const startY = e.clientY;
        const startStep = sheetStep;
        el.dataset.interacting = "1";
        el.dataset.dragging = "1";
        let dy = 0;
        const move = (ev: PointerEvent) => {
          dy = ev.clientY - startY;
          el.style.transform = `translateY(${Math.max(-24, dy)}px)`;
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          el.style.transform = "";
          delete el.dataset.interacting;
          delete el.dataset.dragging;
          const vh = window.innerHeight || 1;
          if (dy > vh * 0.28) {
            /* 아래로 크게 끌면 닫는다 */
            voiceStopRef.current();
            setOpen(false);
            return;
          }
          if (dy < -60) setSheetStep(Math.min(2, startStep + 1));
          else if (dy > 60) setSheetStep(Math.max(0, startStep - 1));
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        return;
      }
      const el = winRef.current;
      if (!el || !rect) return;
      if (kind === "move") {
        const target = e.target as HTMLElement;
        if (target.closest("[data-no-drag]")) return; /* 버튼·핸들과 충돌 방지 */
      }
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      el.dataset.interacting = "1";
      el.dataset.dragging = kind === "move" ? "1" : "0";
      document.body.style.userSelect = "none";
      document.body.style.cursor =
        kind === "move" ? "grabbing" : kind === "se" ? "nwse-resize" : kind === "e" ? "ew-resize" : "ns-resize";

      const start = { px: e.clientX, py: e.clientY, ...rect };
      let raf = 0;
      let next = { ...rect };

      const apply = () => {
        raf = 0;
        el.style.setProperty("--wx", `${next.x}px`);
        el.style.setProperty("--wy", `${next.y}px`);
        el.style.width = `${next.w}px`;
        el.style.height = `${next.h}px`;
      };

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - start.px;
        const dy = ev.clientY - start.py;
        let r: Rect;
        if (kind === "move") {
          r = { ...start, x: start.x + dx, y: start.y + dy };
          /* 화면 가장자리 자석 (Alt 로 해제) */
          if (!ev.altKey) {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            if (Math.abs(r.x) < 16) r.x = 0;
            if (Math.abs(vw - (r.x + r.w)) < 16) r.x = vw - r.w;
            if (Math.abs(r.y) < 16) r.y = 0;
            if (Math.abs(vh - (r.y + r.h)) < 16) r.y = vh - r.h;
          }
        } else {
          r = {
            ...start,
            w: kind === "s" ? start.w : start.w + dx,
            h: kind === "e" ? start.h : start.h + dy,
          };
        }
        next = clampRect(r, modeRef.current);
        if (!raf) raf = requestAnimationFrame(apply);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        if (raf) cancelAnimationFrame(raf);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        /* 다음 프레임에 전환을 되살린다 */
        requestAnimationFrame(() => {
          if (el) {
            delete el.dataset.interacting;
            delete el.dataset.dragging;
          }
        });
        setRect(next);
        persistRect(next);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [mobile, rect, persistRect, sheetStep],
  );

  const resetRect = useCallback(() => {
    const r = clampRect(defaultRect(modeRef.current, sidebarWidth), modeRef.current);
    setRect(r);
    persistRect(r);
  }, [sidebarWidth, persistRect]);

  /* ── 글자 크기 ─────────────────────────────────────────────── */
  const setScale = useCallback((idx: number) => {
    const i = Math.max(0, Math.min(SCALES.length - 1, idx));
    setScaleIdx(i);
    writeStore({ scaleIdx: i });
    /* 읽던 지점을 비율로 보존한다 */
    const el = scrollRef.current;
    if (el && el.scrollHeight > el.clientHeight) {
      const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight);
      requestAnimationFrame(() => {
        if (scrollRef.current)
          scrollRef.current.scrollTop = ratio * (scrollRef.current.scrollHeight - scrollRef.current.clientHeight);
      });
    }
  }, []);

  const voiceStop = voice.stop;
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) return setShowSettings(false);
        voiceStop();
        clearPostTimers();
        fromVoiceRef.current = false;
        setOpen(false);
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setScale(scaleIdx + 1);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setScale(scaleIdx - 1);
      } else if (e.key === "0") {
        e.preventDefault();
        setScale(DEFAULT_SCALE_IDX);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, scaleIdx, setScale, showSettings, voiceStop, clearPostTimers]);

  /* ══════════════════════════════════════════════════════════════
     ove-2 · 모바일 가상 키보드 대응
     키보드가 올라온 만큼 시트를 들어올려 입력창이 가려지지 않게 한다.
     ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!mobile || !open) {
      setKb(0);
      return;
    }
    const vv = (window as unknown as { visualViewport?: VisualViewport }).visualViewport;
    if (!vv) return;
    const sync = () => {
      const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKb(hidden > 90 ? Math.round(hidden) : 0);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [mobile, open]);

  /* ══════════════════════════════════════════════════════════════
     ove-5 · 스페이스바 푸시투토크
     대기 화면(닫힌 오브)에서는 「오브」웨이크 전 음성인식 금지.
     대화창이 열린 뒤에만 Space 로 본 인식을 시작한다.
     ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!centered) return;
    const typingTarget = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      if (!n) return false;
      const tag = n.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || n.isContentEditable;
    };
    let held = false;
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || held) return;
      if (typingTarget(e.target)) return;
      /* 대기 화면 + 대화창 닫힘 → 웨이크워드만 허용, Space 로 본 인식 금지 */
      if (!open) return;
      held = true;
      e.preventDefault();
      voiceStartRef.current();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !held) return;
      held = false;
      e.preventDefault();
      voiceStopRef.current();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [centered, open]);

  /* ── 대화 ──────────────────────────────────────────────────── */
  const push = useCallback((kind: Kind, text: string) => {
    const id = ++seq.current;
    setLines((p) => [...p, { id, kind, text }]);
    return id;
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const openTask = useCallback(
    (item: TaskItem) => {
      setCandidates([]);
      push("sys", `${t(item.labelKey)} ${t("orb.opening")}`);
      void touchSession({
        href: item.href,
        taskId: item.href.replace(/^\//, ""),
        title: t(item.labelKey),
      });
      window.setTimeout(() => router.push(item.href), 220);
    },
    [push, router, t],
  );

  const typeOut = useCallback(
    (full: string, onDone?: () => void) => {
      const id = push("a", "");
      let i = 0;
      const step = () => {
        if (i >= full.length) {
          setState("typing");
          onDone?.();
          return;
        }
        i += 3;
        const slice = full.slice(0, i);
        setLines((p) => p.map((l) => (l.id === id ? { ...l, text: slice } : l)));
        window.setTimeout(step, 16);
      };
      step();
    },
    [push],
  );

  /** ove-6: 답변 후 3/5초 대기 → 오브 대기(음성 재청취) → 10초 무입력 시 음성 오프 */
  const scheduleReturnToOrbStandby = useCallback(
    (answerLen: number) => {
      clearPostTimers();
      suppressRestartRef.current = true;
      const pause = answerLen >= SHORT_ANSWER_CHARS ? PAUSE_LONG_MS : PAUSE_SHORT_MS;
      postTimersRef.current.pause = window.setTimeout(() => {
        postTimersRef.current.pause = null;
        setOpen(false);
        setShowSettings(false);
        voiceModeRef.current = true;
        setVoiceMode(true);
        suppressRestartRef.current = false;
        setState("listening");
        voiceDeadlineRef.current = Date.now() + VOICE_IDLE_MS;
        voiceStopWakeRef.current();
        voiceStartRef.current();
      }, pause);
    },
    [clearPostTimers],
  );

  const askGemini = useCallback(
    async (q: string) => {
      setState("answering");
      const pending = push("sys", t("orb.searching"));
      const key =
        typeof window !== "undefined"
          ? localStorage.getItem("gemini-api-key") || localStorage.getItem("ai-api-key")
          : null;
      const savedModel = typeof window !== "undefined" ? localStorage.getItem("gemini-model") : null;
      const model = savedModel && savedModel.startsWith("gemini") ? savedModel : undefined;
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(key ? { "X-Gemini-Key": key } : {}) },
          body: JSON.stringify({ question: q, locale, model }),
        });
        const data = await res.json().catch(() => ({}));
        setLines((p) => p.filter((l) => l.id !== pending));
        if (!res.ok) {
          const msg =
            res.status === 401 && !key ? t("assistant.needKey") : (data?.error ?? `HTTP ${res.status}`);
          push("err", msg);
          setState("typing");
          if (fromVoiceRef.current) scheduleReturnToOrbStandby(msg.length);
          return;
        }
        const answer = String(data?.answer ?? "");
        typeOut(answer, () => {
          if (fromVoiceRef.current) scheduleReturnToOrbStandby(answer.length);
        });
      } catch {
        setLines((p) => p.filter((l) => l.id !== pending));
        push("err", t("assistant.netError"));
        setState("typing");
        if (fromVoiceRef.current) scheduleReturnToOrbStandby(40);
      }
    },
    [locale, push, scheduleReturnToOrbStandby, t, typeOut],
  );

  /** 발화·입력 공통 진입점 — 메뉴면 화면 이동, 아니면 질문 */
  const submit = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      clearPostTimers();
      voiceDeadlineRef.current = Date.now() + VOICE_IDLE_MS;
      if (fromVoiceRef.current) suppressRestartRef.current = true;
      setOpen(true);
      setCandidates([]);
      setDraft("");
      push("q", q);
      setState("typing");

      const intent = classifyIntent(q, (i) => can(i.perm));
      if (intent.item) {
        fromVoiceRef.current = false;
        exitVoiceMode();
        return openTask(intent.item);
      }
      if (intent.candidates.length > 1) {
        setCandidates(intent.candidates);
        push("sys", t("orb.clarify"));
        if (fromVoiceRef.current) scheduleReturnToOrbStandby(40);
        return;
      }
      await askGemini(q);
    },
    [askGemini, can, clearPostTimers, exitVoiceMode, openTask, push, scheduleReturnToOrbStandby, t],
  );

  submitRef.current = submit;

  useEffect(() => () => clearPostTimers(), [clearPostTimers]);

  /* ── 캔버스 ────────────────────────────────────────────────── */
  useEffect(() => {
    const stop = mountOrb(orbRef.current, stateRef, levelRef);
    return () => stop?.();
  }, [centered, open]);

  /* ove-6: 대기 — 웨이크워드만. 음성모드·대화창·본인식 중에는 웨이크 중지.
     더블클릭/웨이크 후에만 본 인식. 센터·도크 공통으로 웨이크 가능. */
  useEffect(() => {
    if (open || voice.listening || voiceMode) {
      voiceStopWakeRef.current();
      return;
    }
    voiceStartWakeRef.current();
    return () => voiceStopWakeRef.current();
  }, [open, voice.listening, voiceMode]);

  useEffect(() => {
    if (!open) return;
    const stop = mountField(bgRef.current, monRef, stateRef);
    return () => stop?.();
  }, [open]);

  /* 고정하지 않았고 도킹 상태면 12초 뒤 접는다 (내용은 보존) —
     음성 답변 후 자동 복귀 타이머와 겹치지 않게 fromVoice 는 제외 */
  useEffect(() => {
    if (!open || pinned || centered || mobile) return;
    if (state === "answering" || voice.listening || fromVoiceRef.current) return;
    const id = window.setTimeout(() => {
      if (!inputRef.current?.value.trim()) setOpen(false);
    }, 12_000);
    return () => window.clearTimeout(id);
  }, [open, pinned, centered, mobile, state, voice.listening, lines.length]);

  /* 서버 전사 경로인데 키가 없으면, 누르기 전에 미리 알려 준다 */
  const [hasKey, setHasKey] = useState(true);
  useEffect(() => {
    const check = () =>
      setHasKey(
        !!(localStorage.getItem("gemini-api-key") || localStorage.getItem("ai-api-key")),
      );
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, [showSettings]);
  const needsKeyNotice = !voice.caps.browserSTT && !hasKey;

  const scale = SCALES[scaleIdx] ?? 1;
  const statusText = voice.listening || voiceMode
    ? voice.phase === "priming"
      ? t("orb.priming")
      : t("assistant.listening")
    : state === "answering"
      ? t("orb.working")
      : state === "typing"
        ? t("orb.ready")
        : t("assistant.idle");

  const rootStyle = {
    "--ra-sidebar": `${sidebarWidth}px`,
    "--ra-maxw": contentMaxWidth ? `${contentMaxWidth}px` : "100vw",
    "--fw-scale": String(scale),
    "--lvl": String(Math.round(voice.level * 100) / 100),
    /* 주의: 루트에 transform 을 걸면 안 된다.
       transform 이 걸린 조상은 position:fixed 자식(대화창)의 기준이 되어
       바텀시트·플로팅 좌표가 통째로 어긋난다. 중심 맞추기는 안쪽
       .ra-orbanchor 가 대신한다. */
    ...(centered && orbPos
      ? { left: `${orbPos.x}px`, top: `${orbPos.y}px`, right: "auto", bottom: "auto" }
      : null),
  } as React.CSSProperties;

  /* ove-2 · 모바일 시트 높이 3단.
     기본값은 화면 절반보다 작게 잡아, 뒤 화면이 계속 보이도록 한다.
     더 길게 읽고 싶으면 손잡이를 위로 끌거나 두 번 눌러 키운다. */
  const SHEET_H = ["min(34dvh, 280px)", "min(52dvh, 430px)", "92dvh"];
  const winStyle = mobile
    ? ({ "--sheet-h": SHEET_H[sheetStep], "--kb": `${kb}px` } as React.CSSProperties)
    : rect
      ? ({
          "--wx": `${rect.x}px`,
          "--wy": `${rect.y}px`,
          width: `${rect.w}px`,
          height: `${rect.h}px`,
        } as React.CSSProperties)
      : undefined;

  return (
    <div
      className={`ra-root ${centered ? "ra-center" : "ra-dock"}${open ? " ra-open" : ""}${
        term ? " ra-term" : ""
      }${state === "answering" ? " ra-busy" : ""}${
        voice.listening || voiceMode ? " ra-listening" : ""
      }${centered && orbPos ? " ra-slot" : ""}`}
      style={rootStyle}
    >
      <style>{BASE_CSS}</style>
      <style>{WINDOW_CSS}</style>

      {/* 오브 — 캡션=대화창 / 더블=음성 시작 / 단일=음성 중지 */}
      <div className="ra-orbanchor">
      <div className="ra-orbwrap">
        <button
          type="button"
          className="ra-orb"
          aria-label={t("orb.voiceModeHint")}
          title={t("orb.voiceStopHint")}
          onDoubleClick={(e) => {
            e.preventDefault();
            cancelOrbSingleTap();
            lastOrbTapRef.current = 0;
            enterVoiceMode();
          }}
          onClick={(e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastOrbTapRef.current < DBL_TAP_MS) {
              cancelOrbSingleTap();
              lastOrbTapRef.current = 0;
              enterVoiceMode();
              return;
            }
            lastOrbTapRef.current = now;
            cancelOrbSingleTap();
            orbSingleTapTimerRef.current = window.setTimeout(() => {
              orbSingleTapTimerRef.current = null;
              lastOrbTapRef.current = 0;
              if (
                voiceModeRef.current ||
                voice.listening ||
                wakeArmedRef.current
              ) {
                stopOrbVoiceListening();
              }
            }, DBL_TAP_MS + 48);
          }}
        >
          <canvas ref={orbRef} />
          <span className="ra-ring" aria-hidden />
        </button>
        <button
          type="button"
          className="ra-cap"
          onClick={(e) => {
            e.stopPropagation();
            openChatOnly();
          }}
        >
          {voice.listening || voiceMode ? t("assistant.listening") : t("orb.openChat")}
        </button>
      </div>
      </div>

      {/* 대화창 — CRT(SCHOLAR-DOS) 스킨 + ove-2 플로팅/시트 기능 */}
      <div
        ref={winRef}
        className="ra-win"
        data-mode={mode}
        style={winStyle}
        role="dialog"
        aria-modal="false"
        aria-label={t("assistant.title")}
      >
        <canvas className="ra-bg" ref={bgRef} aria-hidden />

        <div
          className="ra-wh"
          onPointerDown={(e) => beginPointer(e, "move")}
          onDoubleClick={() => mobile && setSheetStep((v) => (v === 2 ? 1 : 2))}
          role={mobile ? "button" : undefined}
          aria-label={mobile ? t("orb.sheetExpand") : undefined}
        >
          <span className="ra-badge">SCHOLAR-DOS</span>
          <span className="ra-wh-st">{statusText}</span>
          <span className="ra-wh-grp" data-no-drag>
            <button
              type="button"
              className="ra-wb"
              onClick={() => setScale(scaleIdx - 1)}
              disabled={scaleIdx === 0}
              aria-label={t("orb.fontSmaller")}
            >
              A−
            </button>
            <button
              type="button"
              className="ra-wscale"
              onClick={() => setScale(DEFAULT_SCALE_IDX)}
              aria-label={t("orb.fontReset")}
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              className="ra-wb"
              onClick={() => setScale(scaleIdx + 1)}
              disabled={scaleIdx === SCALES.length - 1}
              aria-label={t("orb.fontLarger")}
            >
              A+
            </button>
            <button
              type="button"
              className={`ra-wb${pinned ? " on" : ""}`}
              onClick={() => {
                setPinned((v) => {
                  writeStore({ pinned: !v });
                  return !v;
                });
              }}
              aria-pressed={pinned}
              aria-label={t("orb.pin")}
              data-desktop-only
            >
              ⌾
            </button>
            <button
              type="button"
              className={`ra-wb${showSettings ? " on" : ""}`}
              onClick={() => setShowSettings((v) => !v)}
              aria-label={t("voice.set.title")}
            >
              ⚙
            </button>
            <button
              type="button"
              className="ra-wb"
              data-desktop-only
              onClick={resetRect}
              aria-label={t("orb.resetSize")}
            >
              ⤢
            </button>
            <button
              type="button"
              className="ra-wb"
              onClick={() => {
                fromVoiceRef.current = false;
                clearPostTimers();
                voice.stop();
                setOpen(false);
              }}
              aria-label={t("assistant.close")}
            >
              ×
            </button>
          </span>
        </div>

        <div className="ra-wbody">
          <div className="ra-mon" ref={monRef}>
            <div className="ra-bezel">
              <div className="ra-screen">
                <span className="ra-sweep" aria-hidden />
                {lines.length === 0 ? (
                  <div className="ra-wempty">
                    <h4>{t("assistant.hintTitle")}</h4>
                    <p>{t("assistant.hintSub")}</p>
                    {needsKeyNotice && (
                      <button type="button" className="ra-keywarn" onClick={() => setShowSettings(true)}>
                        {t("orb.needKeyForVoice")}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="ra-wscroll" ref={scrollRef}>
                    {lines.map((l) => (
                      <p key={l.id} className={`ra-msg ${l.kind}`}>
                        {l.kind === "q" ? "> " : ""}
                        {l.text}
                        {l.kind === "a" && state === "answering" && <span className="ra-caret" />}
                      </p>
                    ))}
                  </div>
                )}
                <div className="ra-pbar" aria-hidden>
                  <i style={{ width: state === "answering" ? "72%" : "0%" }} />
                </div>
              </div>
              <span className="ra-vent" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <i key={i} />
                ))}
              </span>
            </div>
            <div className="ra-chin">
              <span className="ra-led" aria-hidden />
              <span className="ra-brand">SCHOLAR-84</span>
              <span className="ra-knob" aria-hidden />
            </div>
          </div>

          {candidates.length > 0 && (
            <div className="ra-chips">
              {candidates.map((c) => (
                <button key={c.href} type="button" className="ra-chip" onClick={() => openTask(c)}>
                  {t(c.labelKey)}
                </button>
              ))}
            </div>
          )}

          {showSettings && <VoiceSettingsPanel onClose={() => setShowSettings(false)} />}
        </div>

        <div className="ra-wnote">
          {voice.notice && (
            <>
              <span>{voice.notice}</span>{" "}
              <button type="button" className="ra-wnote-act" onClick={() => setShowSettings(true)}>
                {t("orb.openDiagnostics")}
              </button>
            </>
          )}
        </div>

        <div className="ra-wft">
          <button
            type="button"
            className={`ra-wtool${voice.listening ? " rec" : ""}`}
            onClick={() => voice.toggle()}
            aria-pressed={voice.listening}
            aria-label={t("assistant.mic")}
            title={voice.supported ? t("assistant.mic") : t("voice.err.unsupported")}
          >
            <MicIcon />
          </button>

          <div className="ra-wfield">
            <span className="ra-prompt" aria-hidden>
              &gt;
            </span>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              placeholder={t("assistant.placeholder")}
              onFocus={() => state !== "answering" && setState("typing")}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  fromVoiceRef.current = false;
                  void submitRef.current(draft);
                }
              }}
            />
          </div>

          <button
            type="button"
            className="ra-wsend"
            onClick={() => {
              fromVoiceRef.current = false;
              void submitRef.current(draft);
            }}
            disabled={!draft.trim()}
            aria-label={t("assistant.send")}
          >
            <SendIcon />
          </button>
        </div>

        <div className="ra-rs e" data-no-drag onPointerDown={(e) => beginPointer(e, "e")} />
        <div className="ra-rs s" data-no-drag onPointerDown={(e) => beginPointer(e, "s")} />
        <div
          className="ra-rs se"
          data-no-drag
          onPointerDown={(e) => beginPointer(e, "se")}
          onDoubleClick={resetRect}
          role="separator"
          aria-label={t("orb.resize")}
        />
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 9 9" width="17" height="17" fill="currentColor" aria-hidden>
      <rect x="3" y="1" width="3" height="3" />
      <rect x="2" y="4" width="1" height="1" />
      <rect x="6" y="4" width="1" height="1" />
      <rect x="3" y="4" width="3" height="1" />
      <rect x="2" y="5" width="5" height="1" />
      <rect x="4" y="6" width="1" height="1" />
      <rect x="3" y="7" width="3" height="1" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 9 9" width="17" height="17" fill="currentColor" aria-hidden>
      <rect x="2" y="1" width="1" height="7" />
      <rect x="3" y="2" width="1" height="5" />
      <rect x="4" y="3" width="1" height="3" />
      <rect x="5" y="4" width="1" height="1" />
      <rect x="6" y="4" width="1" height="1" />
    </svg>
  );
}
