/**
 * ove-5 정적 검증 — 웨이크 게이트 · 고감도 · 원클릭 설정 · 펄스
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps", "web");
let failed = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => {
  failed++;
  console.error(`  FAIL  ${m}`);
};

const checks = [
  [
    "high sensitivity defaults",
    join(web, "lib/voice/speech.ts"),
    ["threshold: 0.004", "HIGH_SENSITIVITY_PRESET", "noiseSuppression: false", "quickSetupVoice"],
  ],
  [
    "wake gate (strict match + alts)",
    join(web, "lib/voice/speech.ts"),
    ["matchesWakeWord", "WakeWordWatcher", "maxAlternatives = 3", "오브"],
  ],
  [
    "wake level pulse boost",
    join(web, "lib/voice/speech.ts"),
    ["boosted", "threshold * 0.35"],
  ],
  [
    "voice hook wake API",
    join(web, "hooks/use-voice-input.ts"),
    ["startWake", "stopWake", "wakeArmed", "onWake"],
  ],
  [
    "standby: wake only, no Space STT",
    join(web, "components/assistant/research-assistant.tsx"),
    ["if (!open) return", "voiceStartWakeRef", "웨이크워드"],
  ],
  [
    "orb pulse to dashed bound",
    join(web, "components/assistant/orb-canvas.ts"),
    ["boundR", "maxPulse", "smoothLvl", "setLineDash"],
  ],
  [
    "one-click setup UI",
    join(web, "components/assistant/voice-settings.tsx"),
    ["quickSetupVoice", "runQuickSetup", "voice.set.quickSetup"],
  ],
  [
    "i18n ko quick + caption",
    join(web, "lib/i18n/locales/ko-ove.ts"),
    ["원클릭 음성 설정", "클릭하면 대화창으로 이동", "quickOk"],
  ],
  [
    "i18n en/zh quick keys",
    join(web, "lib/i18n/locales/en-ove.ts"),
    ["One-click voice setup", "quickFailDenied"],
  ],
];

console.log("=== ove-5 verification ===\n");
for (const [label, path, needles] of checks) {
  if (!existsSync(path)) {
    bad(`${label}: missing file`);
    continue;
  }
  const txt = readFileSync(path, "utf8");
  const missing = needles.filter((n) => !txt.includes(n));
  if (missing.length) bad(`${label}: missing ${missing.join(", ")}`);
  else ok(label);
}

/* zh locale */
{
  const path = join(web, "lib/i18n/locales/zh-ove.ts");
  const txt = readFileSync(path, "utf8");
  if (txt.includes("一键语音设置") && txt.includes("quickFailDenied")) ok("i18n zh quick keys");
  else bad("i18n zh quick keys");
}

console.log(`\n=== ${failed === 0 ? "ALL PASSED" : failed + " FAILED"} ===`);
process.exit(failed === 0 ? 0 : 1);
