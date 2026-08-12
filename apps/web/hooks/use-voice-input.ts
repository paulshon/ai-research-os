"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  VoiceSession,
  WakeWordWatcher,
  detectVoiceCapabilities,
  ensureDefaultMicrophone,
  loadVoiceSettings,
  VOICE_ERROR_KEY,
  VOICE_SETTINGS_EVENT,
  type VoiceCapabilities,
  type VoiceErrorCode,
  type VoicePhase,
  type VoiceSettings,
} from "@/lib/voice/speech";

/* ══════════════════════════════════════════════════════════════════════
   ove-4 · 음성 입력 훅
   · 본 인식(PTT/마이크 버튼)
   · 대기 화면 웨이크워드("오브") — startWake / stopWake
   ══════════════════════════════════════════════════════════════════════ */

export interface UseVoiceInput {
  phase: VoicePhase;
  listening: boolean;
  /** 0~1 입력 레벨 — 오브 코어 펄스에 매핑한다 */
  level: number;
  partial: string;
  notice: string;
  caps: VoiceCapabilities;
  settings: VoiceSettings;
  supported: boolean;
  /** 웨이크워드 상시 청취 중인가 */
  wakeArmed: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  startWake: () => void;
  stopWake: () => void;
  clearNotice: () => void;
}

export function useVoiceInput(
  onText: (text: string) => void,
  onWake?: () => void,
): UseVoiceInput {
  const { t, locale } = useTranslation();
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [level, setLevel] = useState(0);
  const [partial, setPartial] = useState("");
  const [notice, setNotice] = useState("");
  const [wakeArmed, setWakeArmed] = useState(false);
  const [settings, setSettings] = useState<VoiceSettings>(() => loadVoiceSettings());
  const [caps, setCaps] = useState<VoiceCapabilities>(() => ({
    secure: true, mediaDevices: true, browserSTT: true, recorder: true,
    serverSTT: true, usable: true, platform: "unknown", embedded: false, desktopApp: false,
  }));

  const sessionRef = useRef<VoiceSession | null>(null);
  const wakeRef = useRef<WakeWordWatcher | null>(null);
  const onTextRef = useRef(onText);
  const onWakeRef = useRef(onWake);
  onTextRef.current = onText;
  onWakeRef.current = onWake;

  useEffect(() => {
    setCaps(detectVoiceCapabilities());
    setSettings(loadVoiceSettings());
    void ensureDefaultMicrophone().then((s) => setSettings(s));
  }, []);

  useEffect(() => {
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : null;
    if (!md?.addEventListener) return;
    const onChange = () => {
      void ensureDefaultMicrophone().then((s) => setSettings(s));
      setCaps(detectVoiceCapabilities());
    };
    md.addEventListener("devicechange", onChange);
    return () => md.removeEventListener("devicechange", onChange);
  }, []);

  useEffect(() => {
    const h = () => setSettings(loadVoiceSettings());
    window.addEventListener(VOICE_SETTINGS_EVENT, h as EventListener);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(VOICE_SETTINGS_EVENT, h as EventListener);
      window.removeEventListener("storage", h);
    };
  }, []);

  const stopWake = useCallback(() => {
    wakeRef.current?.stop();
    wakeRef.current = null;
    setWakeArmed(false);
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    stopWake();
    if (sessionRef.current) {
      sessionRef.current.dispose();
      sessionRef.current = null;
    }
    setPartial("");
    setNotice("");
    const s = new VoiceSession(
      {
        onPhase: (p) => setPhase(p),
        onPartial: (txt) => setPartial(txt),
        onLevel: (v) => setLevel(v),
        onNotice: (m) => setNotice(m),
        onFinal: (txt) => {
          setPartial("");
          setPhase("idle");
          sessionRef.current = null;
          onTextRef.current(txt);
        },
        onError: (code: VoiceErrorCode, detail) => {
          sessionRef.current = null;
          setPhase("idle");
          setPartial("");
          setLevel(0);
          if (code === "aborted") return setNotice("");
          const msg = t(VOICE_ERROR_KEY[code]);
          setNotice(detail && code === "server-failed" ? `${msg} (${detail})` : msg);
        },
      },
      locale as string,
    );
    sessionRef.current = s;
    void s.start();
  }, [locale, t, stopWake]);

  const startWake = useCallback(() => {
    if (sessionRef.current) return;
    if (wakeRef.current?.running) return;
    wakeRef.current?.stop();
    const w = new WakeWordWatcher(
      {
        onWake: () => {
          setWakeArmed(false);
          wakeRef.current = null;
          onWakeRef.current?.();
          /* 웨이크 직후 바로 본 인식 시작 */
          window.setTimeout(() => {
            if (!sessionRef.current) start();
          }, 120);
        },
        onLevel: (v) => setLevel(v),
        onNotice: () => {
          /* 웨이크 불가 안내는 조용히 무시 — 클릭/Space 가 대체한다 */
        },
      },
      locale as string,
    );
    wakeRef.current = w;
    setWakeArmed(true);
    void w.start();
  }, [locale, start]);

  const toggle = useCallback(() => {
    if (sessionRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(
    () => () => {
      sessionRef.current?.dispose();
      sessionRef.current = null;
      wakeRef.current?.stop();
      wakeRef.current = null;
    },
    [],
  );

  return {
    phase,
    listening: phase === "listening" || phase === "priming",
    level,
    partial,
    notice,
    caps,
    settings,
    supported: caps.usable,
    wakeArmed,
    start,
    stop,
    toggle,
    startWake,
    stopWake,
    clearNotice: () => setNotice(""),
  };
}
