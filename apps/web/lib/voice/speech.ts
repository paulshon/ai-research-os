/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 음성 입력 엔진 (데스크탑 · 안드로이드 공통)

   기존 구현이 인식되지 않던 원인과 대응
   ─────────────────────────────────────────────────────────────────────
   1) 보안 컨텍스트           http://192.168.x.x 로 접속하면 SpeechRecognition·
                              getUserMedia 가 조용히 실패한다 → 사전 진단 후 안내.
   2) 마이크 권한 미프라이밍   webkitSpeechRecognition 만 호출하면 안드로이드·
                              PWA·WebView 에서 권한 창이 뜨지 않는다
                              → getUserMedia 로 권한을 먼저 확보한다.
   3) 장치 충돌               안드로이드 크롬은 getUserMedia 스트림이 열려 있으면
                              SR 이 audio-capture 오류를 낸다
                              → 권한 확인 후 스트림을 즉시 반납하고 SR 을 켠다.
   4) 조기 종료               안드로이드는 짧은 무음에도 onend 가 뜬다
                              → 사용자가 멈추기 전까지 자동 재시작한다.
   5) 엔진 부재               Electron 데스크탑·Firefox·Safari·삼성인터넷·인앱
                              브라우저에는 SR 자체가 없거나 network 오류가 난다
                              → WAV 녹음 후 서버(/api/stt) 전사로 자동 폴백한다.
   6) 기기별 설정             입력 장치·언어·엔진·감도를 기기마다 저장하고
                              모든 화면이 같은 설정을 공유한다(aros:voice-settings).
   ══════════════════════════════════════════════════════════════════════ */

export type VoiceEngine = "auto" | "browser" | "server";
export type VoicePhase = "idle" | "priming" | "listening" | "processing";

export type VoiceErrorCode =
  | "insecure-context"
  | "no-mic-api"
  | "permission-denied"
  | "desktop-permission"
  | "no-device"
  | "device-busy"
  | "no-speech"
  | "network"
  | "unsupported"
  | "server-failed"
  | "aborted"
  | "unknown";

export interface VoiceSettings {
  /** auto = 브라우저 STT 우선, 실패 시 서버 전사로 자동 전환 */
  engine: VoiceEngine;
  /** 입력 장치 deviceId. "" 면 시스템 기본 장치 */
  deviceId: string;
  /** "" 면 앱 언어를 따른다 */
  lang: string;
  /** 무음이 이어지면 자동으로 마무리한다 */
  autoStop: boolean;
  /** 무음 판정 임계값 (0.005 ~ 0.08). 값이 작을수록 예민하다 */
  threshold: number;
  /** 브라우저 오디오 전처리 */
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export const VOICE_SETTINGS_KEY = "aros:voice-settings";
export const VOICE_SETTINGS_EVENT = "aros:voice-settings-changed";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  engine: "auto",
  deviceId: "",
  lang: "",
  autoStop: true,
  /* ove-5: 최고 감도 — 작은 말도 잡히도록 */
  threshold: 0.004,
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: true,
};

/** 원클릭 고감도 프리셋 (Chrome / Edge / Electron 공통) */
export const HIGH_SENSITIVITY_PRESET: Partial<VoiceSettings> = {
  engine: "auto",
  threshold: 0.004,
  autoStop: true,
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: true,
};

export const STT_LANG: Record<string, string> = { ko: "ko-KR", en: "en-US", zh: "zh-CN" };

/* ── 설정 저장소 ───────────────────────────────────────────────────── */

export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") return { ...DEFAULT_VOICE_SETTINGS };
  try {
    const raw = window.localStorage.getItem(VOICE_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_VOICE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    return { ...DEFAULT_VOICE_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

export function saveVoiceSettings(patch: Partial<VoiceSettings>): VoiceSettings {
  const next = { ...loadVoiceSettings(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(VOICE_SETTINGS_EVENT, { detail: next }));
    } catch {
      /* 저장 실패는 무시하고 메모리 값으로 계속 쓴다 */
    }
  }
  return next;
}

/* ── 환경 진단 ─────────────────────────────────────────────────────── */

export interface VoiceCapabilities {
  /** https 또는 localhost 인가 */
  secure: boolean;
  /** navigator.mediaDevices.getUserMedia 존재 */
  mediaDevices: boolean;
  /** window.SpeechRecognition | webkitSpeechRecognition 존재 */
  browserSTT: boolean;
  /** MediaRecorder 또는 AudioContext 로 녹음 가능 */
  recorder: boolean;
  /** 서버 전사 폴백을 쓸 수 있는가 */
  serverSTT: boolean;
  /** 어떤 방식으로도 입력이 불가능한가 */
  usable: boolean;
  platform: "android" | "ios" | "desktop" | "unknown";
  /** Electron 등 내장 브라우저 */
  embedded: boolean;
  /** Electron 데스크탑 앱 — 브라우저 STT 가 원천적으로 동작하지 않는다 */
  desktopApp: boolean;
}

function getSR(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => any) | null;
}

export function detectVoiceCapabilities(): VoiceCapabilities {
  if (typeof window === "undefined") {
    return {
      secure: false, mediaDevices: false, browserSTT: false, recorder: false,
      serverSTT: false, usable: false, platform: "unknown", embedded: false, desktopApp: false,
    };
  }
  const host = window.location.hostname;
  const ua = navigator.userAgent || "";
  /* Electron 데스크탑 앱은 내장 Next 서버를 127.0.0.1 로 띄운다.
     app:/file: 커스텀 스킴까지 안전한 출처로 본다. */
  const desktopApp = /electron/i.test(ua) || typeof (window as any).electronAPI !== "undefined";
  const secure =
    window.isSecureContext === true ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    window.location.protocol === "file:" ||
    window.location.protocol === "app:" ||
    desktopApp;
  const platform: VoiceCapabilities["platform"] = /android/i.test(ua)
    ? "android"
    : /iphone|ipad|ipod/i.test(ua)
      ? "ios"
      : /windows|macintosh|linux|cros/i.test(ua)
        ? "desktop"
        : "unknown";
  const embedded = desktopApp || /wv\)|; wv|fban|fbav|instagram|kakaotalk|naver|line\//i.test(ua);
  const mediaDevices = !!navigator.mediaDevices?.getUserMedia;
  /* Electron 에는 SpeechRecognition 객체가 있어도 구글 음성 서비스 키가 없어
     항상 network 오류로 죽는다. 헛돌지 않도록 처음부터 없는 것으로 취급한다. */
  const browserSTT = !!getSR() && secure && !desktopApp;
  const recorder = mediaDevices && typeof (window as any).AudioContext !== "undefined";
  const serverSTT = recorder;
  return {
    secure, mediaDevices, browserSTT, recorder, serverSTT,
    usable: secure && mediaDevices && (browserSTT || serverSTT),
    platform, embedded, desktopApp,
  };
}

export async function listMicrophones(opts?: { prime?: boolean }): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
  try {
    /* 라벨이 비어 있으면(권한 전) 짧게 프라이밍해 Windows/안드로이드 장치명을 확보한다 */
    if (opts?.prime !== false) {
      const peek = await navigator.mediaDevices.enumerateDevices();
      const inputs = peek.filter((d) => d.kind === "audioinput");
      const unlabeled = inputs.length === 0 || inputs.every((d) => !d.label);
      if (unlabeled && navigator.mediaDevices.getUserMedia) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          releaseStream(s);
        } catch {
          /* 권한 거부는 빈 목록/기본 장치로 계속 */
        }
      }
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === "audioinput");
  } catch {
    return [];
  }
}

/** 저장된 deviceId 가 사라졌거나 비어 있으면 시스템 기본(첫) 녹음장치를 고른다 */
export async function ensureDefaultMicrophone(): Promise<VoiceSettings> {
  const cur = loadVoiceSettings();
  const mics = await listMicrophones({ prime: true });
  if (!mics.length) return cur;
  if (cur.deviceId && mics.some((d) => d.deviceId === cur.deviceId)) return cur;
  /* deviceId "" = 브라우저/OS 기본. Windows 기본 녹음장치를 그대로 쓴다 */
  if (!cur.deviceId) return cur;
  return saveVoiceSettings({ deviceId: "" });
}

/** 브라우저가 이미 마이크 권한을 갖고 있는지 (지원 브라우저에 한함) */
export async function queryMicPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  if (typeof navigator === "undefined" || !("permissions" in navigator)) return "unknown";
  try {
    const st = await (navigator.permissions as any).query({ name: "microphone" });
    return (st?.state as "granted" | "denied" | "prompt") ?? "unknown";
  } catch {
    return "unknown";
  }
}

/* ── 마이크 확보 ───────────────────────────────────────────────────── */

export class VoiceError extends Error {
  code: VoiceErrorCode;
  constructor(code: VoiceErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "VoiceError";
  }
}

function mapGumError(e: unknown): VoiceError {
  const name = (e as { name?: string })?.name ?? "";
  const msg = (e as { message?: string })?.message ?? "";
  if (name === "NotAllowedError" || name === "SecurityError" || /denied|dismiss/i.test(msg))
    return new VoiceError(
      detectVoiceCapabilities().desktopApp ? "desktop-permission" : "permission-denied",
      msg,
    );
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return new VoiceError("no-device", msg);
  if (name === "NotReadableError" || name === "AbortError")
    return new VoiceError("device-busy", msg);
  return new VoiceError("unknown", msg || name);
}

/**
 * 권한을 확보하고 스트림을 돌려준다.
 * 지정한 장치를 열 수 없으면 기본 장치로 한 번 더 시도한다.
 */
export async function acquireMicStream(s: VoiceSettings): Promise<MediaStream> {
  const caps = detectVoiceCapabilities();
  if (!caps.secure) throw new VoiceError("insecure-context");
  if (!caps.mediaDevices) throw new VoiceError("no-mic-api");

  const base: MediaTrackConstraints = {
    echoCancellation: s.echoCancellation,
    noiseSuppression: s.noiseSuppression,
    autoGainControl: s.autoGainControl,
  };
  const tries: MediaStreamConstraints[] = [];
  if (s.deviceId) tries.push({ audio: { ...base, deviceId: { exact: s.deviceId } } });
  tries.push({ audio: base });
  tries.push({ audio: true });

  let last: VoiceError = new VoiceError("unknown");
  for (const c of tries) {
    try {
      return await navigator.mediaDevices.getUserMedia(c);
    } catch (e) {
      last = mapGumError(e);
      /* 권한 거부는 장치를 바꿔도 소용없다 */
      if (last.code === "permission-denied" || last.code === "insecure-context") throw last;
    }
  }
  throw last;
}

export function releaseStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* noop */
    }
  }
}

/* ── WAV 인코딩 (서버 전사용) ──────────────────────────────────────── */

/** 16 kHz 모노 16-bit PCM WAV. Gemini 가 확실히 받는 형식이다. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const w = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  w(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new VoiceError("server-failed", "read"));
    fr.onload = () => {
      const s = String(fr.result ?? "");
      resolve(s.slice(s.indexOf(",") + 1));
    };
    fr.readAsDataURL(blob);
  });
}

/* ── 세션 ──────────────────────────────────────────────────────────── */

export interface VoiceHandlers {
  onPhase?: (phase: VoicePhase) => void;
  /** 인식 중간 결과 */
  onPartial?: (text: string) => void;
  /** 최종 결과 — 이 값으로 질문을 보낸다 */
  onFinal?: (text: string) => void;
  onError?: (code: VoiceErrorCode, detail?: string) => void;
  /** 0~1 정규화된 입력 레벨. 오브 링 반경에 매핑한다 */
  onLevel?: (level: number) => void;
  /** 사용자에게 보여줄 짧은 안내 (엔진 전환 등) */
  onNotice?: (message: string) => void;
}

const MAX_SESSION_MS = 60_000;
const SILENCE_MS = 1_400;
const SERVER_MAX_MS = 30_000;

export class VoiceSession {
  private h: VoiceHandlers;
  private settings: VoiceSettings;
  private lang: string;

  private rec: any = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;

  private chunks: Float32Array[] = [];
  private recording = false;
  private stopped = false;
  private finished = false;
  private startedAt = 0;
  private lastVoiceAt = 0;
  private sawVoice = false;
  /** 임계값에 못 미치는 약한 소리라도 들어온 시각 */
  private faintAt = 0;
  private noSpeechCount = 0;
  private transcript = "";
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private guardTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(handlers: VoiceHandlers, appLocale = "ko") {
    this.h = handlers;
    this.settings = loadVoiceSettings();
    this.lang = this.settings.lang || STT_LANG[appLocale] || "ko-KR";
  }

  private phase(p: VoicePhase) {
    this.h.onPhase?.(p);
  }

  private fail(code: VoiceErrorCode, detail?: string) {
    if (this.finished) return;
    this.finished = true;
    this.cleanup();
    this.phase("idle");
    this.h.onError?.(code, detail);
  }

  private done(text: string) {
    if (this.finished) return;
    const clean = text.trim();
    if (!clean) {
      this.fail("no-speech");
      return;
    }
    this.finished = true;
    this.cleanup();
    this.phase("idle");
    this.h.onFinal?.(clean);
  }

  /** 사용자가 멈춤을 눌렀을 때 — 지금까지 인식된 내용으로 마무리한다 */
  stop(): void {
    if (this.finished) return;
    this.stopped = true;
    if (this.rec) {
      try {
        this.rec.stop();
      } catch {
        /* noop */
      }
      /* onend 가 오지 않는 브라우저 대비 */
      setTimeout(() => {
        if (!this.finished) {
          if (this.transcript.trim()) this.done(this.transcript);
          else this.fail("no-speech");
        }
      }, 900);
      return;
    }
    if (this.recording) {
      void this.finishServerRecording();
      return;
    }
    this.abort();
  }

  /** 결과 없이 즉시 종료 */
  abort(): void {
    if (this.finished) return;
    this.finished = true;
    this.stopped = true;
    this.cleanup();
    this.phase("idle");
    this.h.onError?.("aborted");
  }

  dispose(): void {
    this.finished = true;
    this.stopped = true;
    this.cleanup();
  }

  private cleanup() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.guardTimer) clearTimeout(this.guardTimer);
    this.restartTimer = null;
    this.guardTimer = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.rec) {
      try {
        this.rec.onresult = null;
        this.rec.onerror = null;
        this.rec.onend = null;
        this.rec.abort?.();
      } catch {
        /* noop */
      }
      this.rec = null;
    }
    if (this.node) {
      try {
        this.node.disconnect();
        this.node.onaudioprocess = null;
      } catch {
        /* noop */
      }
      this.node = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        /* noop */
      }
      this.analyser = null;
    }
    if (this.ctx) {
      const c = this.ctx;
      this.ctx = null;
      void c.close().catch(() => undefined);
    }
    releaseStream(this.stream);
    this.stream = null;
    this.recording = false;
    this.h.onLevel?.(0);
  }

  /** 진입점 — 반드시 사용자 제스처(클릭·키다운) 안에서 호출한다 */
  async start(): Promise<void> {
    const caps = detectVoiceCapabilities();
    if (!caps.secure) return this.fail("insecure-context");
    if (!caps.mediaDevices) return this.fail("no-mic-api");

    this.startedAt = Date.now();
    this.phase("priming");

    /* ① 권한 프라이밍 — 안드로이드·PWA·WebView 에서 권한 창을 확실히 띄운다 */
    let stream: MediaStream;
    try {
      stream = await acquireMicStream(this.settings);
    } catch (e) {
      const err = e instanceof VoiceError ? e : new VoiceError("unknown");
      return this.fail(err.code, err.message);
    }
    if (this.finished) {
      releaseStream(stream);
      return;
    }

    const wantBrowser =
      this.settings.engine === "browser" ||
      (this.settings.engine === "auto" && caps.browserSTT && !caps.embedded);

    if (wantBrowser && caps.browserSTT) {
      /* ② 안드로이드 크롬은 스트림이 열려 있으면 SR 이 audio-capture 로 죽는다.
            권한만 확인하고 장치를 즉시 반납한 뒤 SR 을 켠다. */
      releaseStream(stream);
      this.stream = null;
      this.startBrowser();
      return;
    }

    if (this.settings.engine === "browser" && !caps.browserSTT) {
      releaseStream(stream);
      return this.fail("unsupported");
    }

    /* ③ 서버 전사 — Electron·Firefox·Safari·인앱 브라우저 경로 */
    this.stream = stream;
    this.startServer();
  }

  /* ── 브라우저 STT ────────────────────────────────────────────── */
  private startBrowser() {
    const SR = getSR();
    if (!SR) return this.startServerFallback("no-engine");

    let rec: any;
    try {
      rec = new SR();
    } catch {
      return this.startServerFallback("ctor");
    }
    rec.lang = this.lang;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    /* 연속 모드는 데스크탑에서만 안정적이다. 모바일은 재시작 루프로 이어 붙인다. */
    rec.continuous = detectVoiceCapabilities().platform === "desktop";

    rec.onstart = () => {
      this.startedAt = Date.now();
      this.phase("listening");
      this.pulseLevel();
    };

    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) {
        this.noSpeechCount = 0;
        this.transcript = (this.transcript + " " + final).trim();
        this.h.onPartial?.(this.transcript);
        /* 첫 확정 발화로 바로 질문을 보낸다 */
        this.done(this.transcript);
        return;
      }
      if (interim) {
        this.noSpeechCount = 0;
        this.h.onPartial?.((this.transcript + " " + interim).trim());
      }
    };

    rec.onerror = (e: any) => {
      const code = String(e?.error ?? "unknown");
      if (code === "no-speech") {
        this.noSpeechCount += 1;
        return; /* onend 에서 재시작 판단 */
      }
      if (code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        /* 권한은 이미 받았는데 SR 이 거부 — 서버 전사로 넘긴다 */
        return this.startServerFallback(code);
      }
      if (code === "network" || code === "audio-capture" || code === "bad-grammar") {
        return this.startServerFallback(code);
      }
      this.startServerFallback(code);
    };

    rec.onend = () => {
      if (this.finished) return;
      if (this.stopped) {
        if (this.transcript.trim()) this.done(this.transcript);
        else this.fail("no-speech");
        return;
      }
      if (this.noSpeechCount >= 3) return this.fail("no-speech");
      if (Date.now() - this.startedAt > MAX_SESSION_MS) {
        if (this.transcript.trim()) this.done(this.transcript);
        else this.fail("no-speech");
        return;
      }
      /* 안드로이드 조기 종료 대응 — 짧은 간격을 두고 이어서 듣는다 */
      this.restartTimer = setTimeout(() => {
        if (this.finished || this.stopped) return;
        try {
          this.rec?.start();
        } catch {
          this.startServerFallback("restart");
        }
      }, 220);
    };

    this.rec = rec;
    try {
      rec.start();
    } catch (e) {
      this.startServerFallback((e as Error)?.message ?? "start");
      return;
    }

    /* 4초 안에 onstart 조차 오지 않으면 엔진이 죽은 것으로 본다 */
    this.guardTimer = setTimeout(() => {
      if (this.finished) return;
      if (!this.transcript) {
        /* onstart 는 왔는데 아무 반응이 없는 경우까지 포함해 폴백 */
        const dead = !this.rec;
        if (dead) this.startServerFallback("timeout");
      }
    }, 4_000);
  }

  /** 브라우저 STT 실패 → 서버 전사로 갈아탄다 */
  private async startServerFallback(reason: string) {
    if (this.finished) return;
    if (this.settings.engine === "browser") return this.fail("unsupported", reason);
    if (this.rec) {
      try {
        this.rec.onend = null;
        this.rec.onerror = null;
        this.rec.abort?.();
      } catch {
        /* noop */
      }
      this.rec = null;
    }
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.h.onNotice?.("SERVER STT");
    try {
      this.stream = await acquireMicStream(this.settings);
    } catch (e) {
      const err = e instanceof VoiceError ? e : new VoiceError("unknown");
      return this.fail(err.code, err.message);
    }
    if (this.finished) return releaseStream(this.stream);
    this.startedAt = Date.now();
    this.stopped = false;
    this.startServer();
  }

  /* ── 서버 전사 (WAV 녹음 → /api/stt) ─────────────────────────── */
  private startServer() {
    const stream = this.stream;
    if (!stream) return this.fail("no-device");
    const AC: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return this.fail("unsupported");

    let ctx: AudioContext;
    try {
      ctx = new AC();
    } catch {
      return this.fail("unsupported");
    }
    this.ctx = ctx;
    void ctx.resume().catch(() => undefined);

    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    this.analyser = analyser;
    src.connect(analyser);

    const node = ctx.createScriptProcessor(4096, 1, 1);
    this.node = node;
    this.chunks = [];
    this.recording = true;
    this.sawVoice = false;
    /* 권한 창을 늦게 눌러도 불리해지지 않도록 여기서 다시 잡는다 */
    this.startedAt = Date.now();
    this.lastVoiceAt = this.startedAt;
    this.phase("listening");

    node.onaudioprocess = (ev) => {
      if (!this.recording) return;
      const input = ev.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(input));

      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / input.length);
      this.h.onLevel?.(Math.min(1, rms * 22));

      const now = Date.now();
      if (rms > this.settings.threshold) {
        this.sawVoice = true;
        this.lastVoiceAt = now;
      }
      if (rms > this.settings.threshold * 0.4) this.faintAt = now;

      const elapsed = now - this.startedAt;
      const silent = now - this.lastVoiceAt;
      if (elapsed > SERVER_MAX_MS) return void this.finishServerRecording();
      if (this.settings.autoStop && this.sawVoice && silent > SILENCE_MS) {
        void this.finishServerRecording();
      }
      /* 12초 동안 어떤 소리도 잡히지 않으면 마이크가 잘못 선택된 것으로 본다.
         약하게라도 소리가 들어오면 끝까지 듣고 서버로 보낸다. */
      if (!this.sawVoice && !this.faintAt && elapsed > 12_000) this.fail("no-speech");
    };

    src.connect(node);
    /* 일부 브라우저는 destination 에 연결해야 onaudioprocess 가 돈다.
       무음 게인을 거쳐 연결하여 사용자에게 소리가 새지 않게 한다. */
    const mute = ctx.createGain();
    mute.gain.value = 0;
    node.connect(mute);
    mute.connect(ctx.destination);
  }

  private async finishServerRecording() {
    if (!this.recording || this.finished) return;
    this.recording = false;
    this.phase("processing");

    const rate = this.ctx?.sampleRate ?? 48_000;
    const total = this.chunks.reduce((a, c) => a + c.length, 0);
    /* 0.25초 미만이면 보낼 것이 없다. 그 이상이면 약한 소리라도 서버에 맡긴다. */
    if (total < rate * 0.25) return this.fail("no-speech");

    const merged = new Float32Array(total);
    let off = 0;
    for (const c of this.chunks) {
      merged.set(c, off);
      off += c.length;
    }
    this.chunks = [];

    const pcm = downsample(merged, rate, 16_000);
    const wav = encodeWav(pcm, 16_000);

    /* 마이크는 전사 전에 반납한다 — 안드로이드에서 마이크 표시등이 남는 것을 막는다 */
    releaseStream(this.stream);
    this.stream = null;

    try {
      const audio = await blobToBase64(wav);
      const key =
        typeof window !== "undefined"
          ? window.localStorage.getItem("gemini-api-key") ||
            window.localStorage.getItem("ai-api-key")
          : null;
      const res = await fetch("/api/stt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { "X-Gemini-Key": key } : {}),
        },
        body: JSON.stringify({ audio, mimeType: "audio/wav", lang: this.lang }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) return this.fail("server-failed", data?.error ?? `HTTP ${res.status}`);
      this.done(String(data?.text ?? ""));
    } catch (e) {
      this.fail("server-failed", (e as Error)?.message);
    }
  }

  /** 브라우저 STT 경로에서는 원시 오디오를 볼 수 없어 부드러운 의사 레벨을 낸다 */
  private pulseLevel() {
    const t0 = performance.now();
    const tick = () => {
      if (this.finished || this.rec === null) return;
      const t = (performance.now() - t0) / 1000;
      const v = 0.42 + 0.3 * Math.sin(t * 5.1) + 0.14 * Math.sin(t * 11.7);
      this.h.onLevel?.(Math.max(0, Math.min(1, v)));
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   ove-4 · 웨이크워드 ("오브")
   대기 화면에서 백그라운드로 듣고, "오브" / "오브야" / "orb" 가 들리면
   본 인식 세션을 시작한다. Chrome·Edge 의 브라우저 STT 를 우선한다.
   ══════════════════════════════════════════════════════════════════════ */

export const WAKE_WORDS = ["오브", "오브야", "orb", "hey orb", "ok orb"];

export function matchesWakeWord(raw: string): boolean {
  const t = raw
    .normalize("NFC")
    .toLowerCase()
    .replace(/[.,!?~"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;
  /* 짧은 호출만 — 긴 문장 속 우연 포함은 피하고, 호출어 중심 매칭 */
  const compact = t.replace(/\s/g, "");
  return WAKE_WORDS.some((w) => {
    const ww = w.toLowerCase().replace(/\s/g, "");
    if (compact === ww) return true;
    if (compact.startsWith(ww) && compact.length <= ww.length + 4) return true;
    if (compact.includes(ww) && compact.length <= ww.length + 6) return true;
    return false;
  });
}

export interface WakeWordHandlers {
  onWake: () => void;
  onLevel?: (v: number) => void;
  onNotice?: (msg: string) => void;
}

/**
 * 웨이크워드 상시 청취.
 * · 브라우저 STT 가 있으면 continuous recognition
 * · 없으면 Analyser 레벨만 보여 주고, 클릭/Space 로 본 인식을 유도한다
 */
export class WakeWordWatcher {
  private h: WakeWordHandlers;
  private lang: string;
  private settings: VoiceSettings;
  private rec: any = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private alive = false;
  private fired = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(h: WakeWordHandlers, locale = "ko") {
    this.h = h;
    this.lang = locale;
    this.settings = loadVoiceSettings();
  }

  get running() {
    return this.alive;
  }

  async start(): Promise<void> {
    if (this.alive) return;
    this.alive = true;
    this.fired = false;
    this.settings = loadVoiceSettings();
    const caps = detectVoiceCapabilities();
    if (!caps.secure || !caps.mediaDevices) {
      this.h.onNotice?.("wake-unavailable");
      this.alive = false;
      return;
    }
    try {
      this.stream = await acquireMicStream(this.settings);
      this.attachLevelMeter(this.stream);
    } catch (e) {
      const err = e instanceof VoiceError ? e : new VoiceError("unknown");
      this.h.onNotice?.(err.code);
      this.alive = false;
      return;
    }

    if (caps.browserSTT) {
      this.startBrowserWake();
    } else {
      /* Electron 등 — 레벨 미터만 돌리고, 클릭/Space 가 본 인식을 연다 */
      this.h.onNotice?.("wake-level-only");
    }
  }

  stop(): void {
    this.alive = false;
    this.cleanup();
  }

  private startBrowserWake() {
    const SR = getSR();
    if (!SR || !this.alive) return;
    try {
      const rec = new SR();
      rec.lang = this.settings.lang || STT_LANG[this.lang] || "ko-KR";
      rec.continuous = true;
      rec.interimResults = true;
      /* 감도↑ — 대안 후보에서도 「오브」를 찾는다 */
      rec.maxAlternatives = 3;
      rec.onresult = (ev: any) => {
        if (!this.alive || this.fired) return;
        let chunk = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const alts = ev.results[i];
          const n = Math.min(alts?.length ?? 1, 3);
          for (let a = 0; a < n; a++) chunk += ` ${alts?.[a]?.transcript ?? ""}`;
        }
        if (matchesWakeWord(chunk)) {
          this.fired = true;
          this.h.onWake();
          this.stop();
        }
      };
      rec.onerror = () => {
        /* network 등 — 잠시 뒤 재시작 */
        if (!this.alive || this.fired) return;
        this.scheduleRestart();
      };
      rec.onend = () => {
        if (!this.alive || this.fired) return;
        this.scheduleRestart();
      };
      this.rec = rec;
      rec.start();
    } catch {
      this.h.onNotice?.("wake-unavailable");
    }
  }

  private scheduleRestart() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.alive || this.fired) return;
      try {
        this.rec?.start?.();
      } catch {
        this.startBrowserWake();
      }
    }, 280);
  }

  private attachLevelMeter(stream: MediaStream) {
    try {
      const AC: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      const src = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      src.connect(this.analyser);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      /* ove-5: 매우 낮은 임계 + 증폭 — 작은 목소리에도 점선 경계까지 펄스 */
      const thr = Math.max(0.0015, this.settings.threshold * 0.35);
      const tick = () => {
        if (!this.alive || !this.analyser) return;
        this.analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const boosted = Math.min(1, Math.max(0, (rms - thr) * 18));
        this.h.onLevel?.(boosted);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    } catch {
      /* analyser 실패는 무시 */
    }
  }

  private cleanup() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.rec) {
      try {
        this.rec.onresult = null;
        this.rec.onerror = null;
        this.rec.onend = null;
        this.rec.abort?.();
      } catch {
        /* noop */
      }
      this.rec = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        /* noop */
      }
      this.analyser = null;
    }
    if (this.ctx) {
      const c = this.ctx;
      this.ctx = null;
      void c.close().catch(() => undefined);
    }
    releaseStream(this.stream);
    this.stream = null;
    this.h.onLevel?.(0);
  }
}

/** 문제 신고용 한 줄 진단 — 설정 패널에서 복사할 수 있다 */
export function voiceDiagnostics(): string {
  const c = detectVoiceCapabilities();
  const s = loadVoiceSettings();
  const hasKey =
    typeof window !== "undefined" &&
    !!(window.localStorage.getItem("gemini-api-key") || window.localStorage.getItem("ai-api-key"));
  return [
    `platform=${c.platform}`,
    `desktopApp=${c.desktopApp}`,
    `embedded=${c.embedded}`,
    `secure=${c.secure}`,
    `mediaDevices=${c.mediaDevices}`,
    `browserSTT=${c.browserSTT}`,
    `serverSTT=${c.serverSTT}`,
    `engine=${s.engine}`,
    `device=${s.deviceId ? "custom" : "default"}`,
    `lang=${s.lang || "auto"}`,
    `geminiKey=${hasKey}`,
    `origin=${typeof window === "undefined" ? "-" : window.location.origin}`,
  ].join(" · ");
}

/* ── 오류 메시지 ───────────────────────────────────────────────────── */

export interface QuickSetupResult {
  ok: boolean;
  permission: "granted" | "denied" | "prompt" | "unknown";
  deviceLabel: string;
  deviceCount: number;
  browser: string;
  messageKey: string;
  detail?: string;
}

/**
 * ove-5 · 원클릭 음성 설정
 * Chrome / Edge 권한 창을 띄우고, 로컬 고감도 프리셋을 저장한다.
 */
export async function quickSetupVoice(locale = "ko"): Promise<QuickSetupResult> {
  const caps = detectVoiceCapabilities();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /chrome\//i.test(ua) && !/edg\//i.test(ua)
      ? "Chrome"
      : caps.desktopApp
        ? "Desktop"
        : "Browser";

  if (!caps.secure) {
    return {
      ok: false, permission: "unknown", deviceLabel: "", deviceCount: 0, browser,
      messageKey: "voice.set.quickFailInsecure",
    };
  }
  if (!caps.mediaDevices) {
    return {
      ok: false, permission: "unknown", deviceLabel: "", deviceCount: 0, browser,
      messageKey: "voice.set.quickFailNoApi",
    };
  }

  const lang =
    loadVoiceSettings().lang ||
    (locale.startsWith("en") ? "en-US" : locale.startsWith("zh") ? "zh-CN" : "ko-KR");

  let stream: MediaStream | null = null;
  try {
    /* ① Chrome/Edge 권한 프롬프트 — 클릭 한 번에 시스템·브라우저 마이크 허용 */
    stream = await acquireMicStream({
      ...loadVoiceSettings(),
      ...HIGH_SENSITIVITY_PRESET,
      lang,
    });
  } catch (e) {
    const err = e instanceof VoiceError ? e : new VoiceError("unknown");
    return {
      ok: false,
      permission: err.code === "permission-denied" || err.code === "desktop-permission" ? "denied" : "unknown",
      deviceLabel: "",
      deviceCount: 0,
      browser,
      messageKey:
        err.code === "permission-denied" || err.code === "desktop-permission"
          ? "voice.set.quickFailDenied"
          : "voice.set.quickFailUnknown",
      detail: err.message,
    };
  }

  const trackLabel = stream.getAudioTracks()[0]?.label || "";
  releaseStream(stream);
  stream = null;

  const mics = await listMicrophones({ prime: false });
  const preferred =
    mics.find((d) => d.label && trackLabel && d.label === trackLabel) ||
    mics.find((d) => d.label) ||
    mics[0];

  saveVoiceSettings({
    ...HIGH_SENSITIVITY_PRESET,
    lang,
    deviceId: preferred?.deviceId || "",
  });

  /* Windows 개인정보 마이크 설정 안내(가능하면) */
  try {
    if (/windows/i.test(ua)) {
      window.open("ms-settings:privacy-microphone", "_blank");
    }
  } catch {
    /* noop */
  }

  return {
    ok: true,
    permission: "granted",
    deviceLabel: preferred?.label || trackLabel || "default",
    deviceCount: mics.length,
    browser,
    messageKey: "voice.set.quickOk",
  };
}

export const VOICE_ERROR_KEY: Record<VoiceErrorCode, string> = {
  "insecure-context": "voice.err.insecure",
  "no-mic-api": "voice.err.noApi",
  "permission-denied": "voice.err.denied",
  "desktop-permission": "voice.err.desktopDenied",
  "no-device": "voice.err.noDevice",
  "device-busy": "voice.err.busy",
  "no-speech": "voice.err.noSpeech",
  network: "voice.err.network",
  unsupported: "voice.err.unsupported",
  "server-failed": "voice.err.server",
  aborted: "voice.err.aborted",
  unknown: "voice.err.unknown",
};

/** 설정 패널의 전사 테스트에서 쓰는 WAV(base64) 인코더 */
export async function encodeWavBase64(samples: Float32Array, sampleRate: number): Promise<string> {
  const pcm = downsample(samples, sampleRate, 16_000);
  return blobToBase64(encodeWav(pcm, 16_000));
}
