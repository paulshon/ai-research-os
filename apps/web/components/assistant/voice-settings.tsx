"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  DEFAULT_VOICE_SETTINGS,
  HIGH_SENSITIVITY_PRESET,
  acquireMicStream,
  detectVoiceCapabilities,
  listMicrophones,
  loadVoiceSettings,
  queryMicPermission,
  quickSetupVoice,
  releaseStream,
  saveVoiceSettings,
  voiceDiagnostics,
  encodeWavBase64,
  type VoiceCapabilities,
  type VoiceSettings,
} from "@/lib/voice/speech";

/* ══════════════════════════════════════════════════════════════════════
   ove-1 · 음성 입력 설정 패널
   "기기마다 설정이 달라 인식이 안 되는" 문제를 사용자가 직접 해결하도록,
   진단 → 권한 → 장치 선택 → 테스트를 한 자리에 모았다.
   선택 값은 이 기기에 저장되고 앱 전체가 같은 값을 쓴다.
   ══════════════════════════════════════════════════════════════════════ */

export default function VoiceSettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [s, setS] = useState<VoiceSettings>(() => loadVoiceSettings());
  const [caps, setCaps] = useState<VoiceCapabilities | null>(null);
  const [perm, setPerm] = useState<string>("unknown");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [testing, setTesting] = useState(false);
  const [testLevel, setTestLevel] = useState(0);
  const [testMsg, setTestMsg] = useState("");
  /* 서버 전사에 쓰는 Gemini 키 — 어시스턴트와 같은 저장소를 쓴다 */
  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [sttTesting, setSttTesting] = useState(false);
  const [sttResult, setSttResult] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickMsg, setQuickMsg] = useState("");

  const refresh = useCallback(async () => {
    setCaps(detectVoiceCapabilities());
    setPerm(await queryMicPermission());
    setDevices(await listMicrophones());
  }, []);

  const runQuickSetup = useCallback(async () => {
    if (quickBusy) return;
    setQuickBusy(true);
    setQuickMsg(t("voice.set.quickRunning"));
    try {
      const r = await quickSetupVoice();
      setS(loadVoiceSettings());
      await refresh();
      if (r.ok) {
        setQuickMsg(
          t("voice.set.quickOk")
            .replace("{browser}", r.browser)
            .replace("{device}", r.deviceLabel || t("voice.set.deviceDefault"))
            .replace("{n}", String(r.deviceCount)),
        );
      } else {
        setQuickMsg(t(r.messageKey));
      }
    } catch (e) {
      setQuickMsg((e as Error)?.message || t("voice.set.quickFailUnknown"));
    } finally {
      setQuickBusy(false);
    }
  }, [quickBusy, refresh, t]);

  useEffect(() => {
    void refresh();
    try {
      setApiKey(
        localStorage.getItem("gemini-api-key") || localStorage.getItem("ai-api-key") || "",
      );
    } catch {
      /* noop */
    }
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    const onChange = () => void refresh();
    md.addEventListener("devicechange", onChange);
    return () => md.removeEventListener("devicechange", onChange);
  }, [refresh]);

  const saveKey = useCallback(() => {
    const v = apiKey.trim();
    try {
      if (v) {
        localStorage.setItem("gemini-api-key", v);
        localStorage.setItem("ai-api-key", v);
      } else {
        localStorage.removeItem("gemini-api-key");
        localStorage.removeItem("ai-api-key");
      }
      setKeySaved(true);
      window.setTimeout(() => setKeySaved(false), 2_000);
    } catch {
      /* noop */
    }
  }, [apiKey]);

  /* 3초 녹음 → /api/stt → 받아쓴 문장을 그대로 보여준다.
     "정말 되는가"를 사용자가 직접 눈으로 확인하는 마지막 관문이다. */
  const runSttTest = useCallback(async () => {
    if (sttTesting) return;
    setSttTesting(true);
    setSttResult(t("voice.set.sttRecording"));
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    try {
      stream = await acquireMicStream(loadVoiceSettings());
      const AC: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (ev) => chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
      const mute = ctx.createGain();
      mute.gain.value = 0;
      src.connect(node);
      node.connect(mute);
      mute.connect(ctx.destination);
      await new Promise((r) => window.setTimeout(r, 3_200));
      node.disconnect();
      node.onaudioprocess = null;

      const rate = ctx.sampleRate;
      const total = chunks.reduce((a, c) => a + c.length, 0);
      const merged = new Float32Array(total);
      let off = 0;
      for (const c of chunks) {
        merged.set(c, off);
        off += c.length;
      }
      releaseStream(stream);
      stream = null;
      await ctx.close().catch(() => undefined);
      ctx = null;

      const audio = await encodeWavBase64(merged, rate);
      const key = localStorage.getItem("gemini-api-key") || localStorage.getItem("ai-api-key");
      const res = await fetch("/api/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(key ? { "X-Gemini-Key": key } : {}) },
        body: JSON.stringify({ audio, mimeType: "audio/wav", lang: s.lang || "ko-KR" }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) setSttResult(`✕ ${data?.error ?? `HTTP ${res.status}`}`);
      else setSttResult(data?.text ? `✓ "${data.text}"` : t("voice.set.sttEmpty"));
    } catch (e) {
      releaseStream(stream);
      await ctx?.close().catch(() => undefined);
      setSttResult(`✕ ${(e as Error)?.message ?? ""}`);
    } finally {
      setSttTesting(false);
    }
  }, [sttTesting, s.lang, t]);

  const patch = useCallback((p: Partial<VoiceSettings>) => {
    setS(saveVoiceSettings(p));
  }, []);

  /** 권한 요청 + 장치 목록 갱신 (라벨은 권한 승인 후에야 보인다) */
  const grant = useCallback(async () => {
    setTestMsg("");
    try {
      const st = await acquireMicStream(loadVoiceSettings());
      releaseStream(st);
      setTestMsg(t("voice.set.granted"));
    } catch (e) {
      setTestMsg((e as Error)?.message || t("voice.err.denied"));
    }
    void refresh();
  }, [refresh, t]);

  /** 10초 동안 실제 입력 레벨을 보여준다 — 마이크가 살아 있는지 눈으로 확인 */
  const runTest = useCallback(async () => {
    if (testing) return;
    setTesting(true);
    setTestMsg("");
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let peak = 0;
    try {
      stream = await acquireMicStream(loadVoiceSettings());
      const AC: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      const t0 = performance.now();
      const tick = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        peak = Math.max(peak, rms);
        setTestLevel(Math.min(1, rms * 12));
        if (performance.now() - t0 < 10_000) raf = requestAnimationFrame(tick);
        else finish();
      };
      const finish = () => {
        cancelAnimationFrame(raf);
        setTestLevel(0);
        setTesting(false);
        releaseStream(stream);
        void ctx?.close().catch(() => undefined);
        setTestMsg(peak > 0.02 ? t("voice.set.testOk") : t("voice.set.testSilent"));
      };
      raf = requestAnimationFrame(tick);
    } catch (e) {
      cancelAnimationFrame(raf);
      releaseStream(stream);
      void ctx?.close().catch(() => undefined);
      setTesting(false);
      setTestLevel(0);
      setTestMsg((e as Error)?.message || t("voice.err.unknown"));
    }
  }, [testing, t]);

  const row = "flex items-center justify-between gap-3 py-2";
  const label = "text-[12px] text-white/60";
  const ctl =
    "text-[12px] bg-black/40 border border-white/15 rounded-md px-2 py-1 text-white/85 outline-none focus:border-[#6c8cff] max-w-[62%]";

  return (
    <div className="ra-settings" role="group" aria-label={t("voice.set.title")}>
      <div className="flex items-center justify-between mb-1.5">
        <b className="text-[12.5px] text-white/85">{t("voice.set.title")}</b>
        <button type="button" className="ra-mini" onClick={onClose}>
          {t("voice.set.done")}
        </button>
      </div>

      {/* ove-5 · 원클릭 — Chrome/Edge 권한 + 로컬 고감도 프리셋 */}
      <button
        type="button"
        className="w-full mb-2 px-3 py-2.5 rounded-lg text-[13px] font-semibold
          bg-[#4a6cf7] text-white hover:bg-[#5a78ff] disabled:opacity-50
          shadow-[0_4px_14px_rgba(74,108,247,.35)]"
        disabled={quickBusy}
        onClick={() => void runQuickSetup()}
      >
        {quickBusy ? t("voice.set.quickRunning") : t("voice.set.quickSetup")}
      </button>
      {quickMsg && (
        <p className="text-[11px] text-[#9fd0ff] leading-snug mb-2 whitespace-pre-wrap">{quickMsg}</p>
      )}
      <p className="text-[10.5px] text-white/40 leading-snug mb-2">{t("voice.set.quickHint")}</p>

      {/* 진단 */}
      <div className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 mb-2">
        <Diag ok={!!caps?.secure} label={t("voice.set.diagSecure")} hint="https / localhost" />
        <Diag ok={!!caps?.mediaDevices} label={t("voice.set.diagMic")} hint="getUserMedia" />
        <Diag
          ok={!!caps?.browserSTT}
          label={t("voice.set.diagBrowserStt")}
          hint={caps?.browserSTT ? "SpeechRecognition" : t("voice.set.diagFallback")}
          warnOnly
        />
        <Diag ok={perm === "granted"} label={t("voice.set.diagPerm")} hint={perm} warnOnly />
      </div>

      {/* 이 기기에서 실제로 쓰이는 경로를 한 줄로 알려준다 */}
      <p className="text-[11px] text-white/45 leading-snug mb-2">
        {caps?.desktopApp
          ? t("voice.set.pathDesktop")
          : caps?.browserSTT
            ? t("voice.set.pathBrowser")
            : t("voice.set.pathServer")}
      </p>

      <div className={row}>
        <span className={label}>{t("voice.set.engine")}</span>
        <select
          className={ctl}
          value={s.engine}
          onChange={(e) => patch({ engine: e.target.value as VoiceSettings["engine"] })}
        >
          <option value="auto">{t("voice.set.engineAuto")}</option>
          <option value="browser">{t("voice.set.engineBrowser")}</option>
          <option value="server">{t("voice.set.engineServer")}</option>
        </select>
      </div>

      <div className={row}>
        <span className={label}>{t("voice.set.device")}</span>
        <select
          className={ctl}
          value={s.deviceId}
          onChange={(e) => patch({ deviceId: e.target.value })}
        >
          <option value="">{t("voice.set.deviceDefault")}</option>
          {devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              {d.label || `${t("voice.set.device")} ${i + 1}`}
            </option>
          ))}
        </select>
      </div>

      <div className={row}>
        <span className={label}>{t("voice.set.lang")}</span>
        <select className={ctl} value={s.lang} onChange={(e) => patch({ lang: e.target.value })}>
          <option value="">{t("voice.set.langAuto")}</option>
          <option value="ko-KR">한국어 (ko-KR)</option>
          <option value="en-US">English (en-US)</option>
          <option value="zh-CN">中文 (zh-CN)</option>
          <option value="ja-JP">日本語 (ja-JP)</option>
        </select>
      </div>

      <div className={row}>
        <span className={label}>{t("voice.set.autoStop")}</span>
        <input
          type="checkbox"
          checked={s.autoStop}
          onChange={(e) => patch({ autoStop: e.target.checked })}
          className="w-4 h-4 accent-[#6c8cff]"
        />
      </div>

      <div className={row}>
        <span className={label}>{t("voice.set.sensitivity")}</span>
        <input
          type="range"
          min={2}
          max={60}
          step={1}
          value={Math.round(s.threshold * 1000)}
          onChange={(e) => patch({ threshold: Number(e.target.value) / 1000 })}
          className="w-[55%] accent-[#6c8cff]"
        />
      </div>

      <div className={row}>
        <span className={label}>{t("voice.set.noise")}</span>
        <input
          type="checkbox"
          checked={s.noiseSuppression}
          onChange={(e) =>
            patch({ noiseSuppression: e.target.checked, echoCancellation: e.target.checked })
          }
          className="w-4 h-4 accent-[#6c8cff]"
        />
      </div>

      {/* 서버 전사용 Gemini 키 — 여기서 바로 넣을 수 있게 한다 */}
      <div className="mt-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
        <p className="text-[11.5px] text-white/60 mb-1.5">{t("voice.set.key")}</p>
        <div className="flex items-center gap-1.5">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="flex-1 min-w-0 text-[12px] bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-white/85 outline-none focus:border-[#6c8cff]"
          />
          <button type="button" className="ra-mini" onClick={saveKey}>
            {keySaved ? t("voice.set.keySaved") : t("voice.set.keySave")}
          </button>
        </div>
        <p className="mt-1 text-[10.5px] text-white/30 leading-snug">{t("voice.set.keyNote")}</p>
      </div>

      {/* 테스트 */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button type="button" className="ra-mini" onClick={grant}>
          {t("voice.set.grant")}
        </button>
        <button type="button" className="ra-mini" onClick={runTest} disabled={testing}>
          {testing ? t("voice.set.testing") : t("voice.set.test")}
        </button>
        <button type="button" className="ra-mini" onClick={runSttTest} disabled={sttTesting}>
          {sttTesting ? t("voice.set.sttTesting") : t("voice.set.sttTest")}
        </button>
        <button
          type="button"
          className="ra-mini"
          onClick={() =>
            setS(saveVoiceSettings({ ...DEFAULT_VOICE_SETTINGS, ...HIGH_SENSITIVITY_PRESET }))
          }
        >
          {t("voice.set.reset")}
        </button>
        <button
          type="button"
          className="ra-mini"
          onClick={() => {
            const d = voiceDiagnostics();
            void navigator.clipboard?.writeText(d).catch(() => undefined);
            setTestMsg(d);
          }}
        >
          {t("voice.set.copyDiag")}
        </button>
      </div>

      {sttResult && (
        <p className="mt-2 text-[11.5px] text-white/70 leading-snug break-words">{sttResult}</p>
      )}

      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <i
          className="block h-full rounded-full transition-[width] duration-75"
          style={{
            width: `${Math.round(testLevel * 100)}%`,
            background: "linear-gradient(90deg,#6c8cff,#3ecfb2)",
          }}
        />
      </div>
      {testMsg && <p className="mt-1.5 text-[11px] text-white/55 leading-snug">{testMsg}</p>}
      <p className="mt-1.5 text-[10.5px] text-white/35 leading-snug">{t("voice.set.note")}</p>
    </div>
  );
}

function Diag({
  ok,
  label,
  hint,
  warnOnly,
}: {
  ok: boolean;
  label: string;
  hint?: string;
  warnOnly?: boolean;
}) {
  const color = ok ? "#3ecfb2" : warnOnly ? "#e8b84b" : "#ff7066";
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span className="text-[11.5px] text-white/65 flex-1 truncate">{label}</span>
      {hint && <span className="text-[10px] text-white/30 truncate max-w-[45%]">{hint}</span>}
    </div>
  );
}
